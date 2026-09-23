import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import mongoose from "mongoose";

const walletPaymentFilter = {
  type: "credit",
  $or: [
    { description: /wallet\s*top-?up/i },
    { razorpayOrderId: { $exists: true, $ne: null } }
  ]
};

export const getWalletPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search = "" } = req.query;
    const safePage = Math.max(1, parseInt(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const filter = { ...walletPaymentFilter };

    if (status) filter.status = String(status).toLowerCase();

    const term = String(search).trim();
    if (term) {
      const [users, historicalCalls] = await Promise.all([
        User.find({
          $or: [
            { fullName: { $regex: term, $options: "i" } },
            { email: { $regex: term, $options: "i" } },
            { phone: { $regex: term, $options: "i" } }
          ]
        }).select("_id"),
        mongoose.connection.collection("calls").find({
          $or: [
            { callerName: { $regex: term, $options: "i" } },
            { receiverName: { $regex: term, $options: "i" } }
          ]
        }).project({ callerId: 1, receiverId: 1 }).limit(100).toArray()
      ]);
      const historicalUserIds = historicalCalls.flatMap(call => [call.callerId, call.receiverId]).filter(Boolean);
      filter.$and = [{
        $or: [
          { userId: { $in: [...users.map(user => user._id), ...historicalUserIds] } },
          { razorpayOrderId: { $regex: term, $options: "i" } },
          { razorpayPaymentId: { $regex: term, $options: "i" } }
        ]
      }];
    }

    const [paymentRows, total] = await Promise.all([
      Transaction.find(filter)
        .select("userId amount currency status description type razorpayOrderId razorpayPaymentId createdAt updatedAt")
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),
      Transaction.countDocuments(filter)
    ]);

    const userIds = [...new Set(paymentRows.map(payment => String(payment.userId)).filter(Boolean))];
    const objectIds = userIds.filter(mongoose.isValidObjectId).map(id => new mongoose.Types.ObjectId(id));
    const [users, historicalCalls] = await Promise.all([
      User.find({ _id: { $in: objectIds } }).select("fullName email phone").lean(),
      mongoose.connection.collection("calls").find({
        $or: [
          { callerId: { $in: objectIds } },
          { receiverId: { $in: objectIds } }
        ]
      }).project({ callerId: 1, callerName: 1, receiverId: 1, receiverName: 1 }).sort({ createdAt: -1 }).toArray()
    ]);

    const identityById = new Map(users.map(user => [String(user._id), user]));
    for (const call of historicalCalls) {
      const pairs = [[call.callerId, call.callerName], [call.receiverId, call.receiverName]];
      for (const [id, name] of pairs) {
        const key = String(id || "");
        if (key && name && !identityById.has(key)) {
          identityById.set(key, { _id: id, fullName: name, email: "", phone: "", isArchived: true });
        }
      }
    }

    const payments = paymentRows.map(payment => ({
      ...payment,
      userId: identityById.get(String(payment.userId)) || {
        _id: payment.userId,
        fullName: `User ${String(payment.userId || "").slice(-6)}`,
        email: "",
        phone: "",
        isArchived: true
      }
    }));

    res.json({
      success: true,
      data: payments,
      pagination: { total, page: safePage, limit: safeLimit, pages: Math.ceil(total / safeLimit) }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getWalletPaymentStats = async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [byStatus, monthly] = await Promise.all([
      Transaction.aggregate([
        { $match: walletPaymentFilter },
        { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$amount" } } }
      ]),
      Transaction.aggregate([
        { $match: { ...walletPaymentFilter, status: "completed", createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, amount: { $sum: "$amount" }, count: { $sum: 1 } } }
      ])
    ]);

    const completed = byStatus.find(row => row._id === "completed") || { count: 0, amount: 0 };
    const pending = byStatus.find(row => row._id === "pending") || { count: 0, amount: 0 };
    const failed = byStatus.find(row => row._id === "failed") || { count: 0, amount: 0 };

    res.json({
      success: true,
      data: {
        totalPayments: byStatus.reduce((sum, row) => sum + row.count, 0),
        completedCount: completed.count,
        completedAmount: completed.amount,
        pendingCount: pending.count,
        pendingAmount: pending.amount,
        failedCount: failed.count,
        failedAmount: failed.amount,
        thisMonthAmount: monthly[0]?.amount || 0,
        thisMonthCount: monthly[0]?.count || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
