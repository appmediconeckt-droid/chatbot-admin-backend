import Payout from "../models/Payout.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";

// Helper: Generate unique payout ID
const generatePayoutId = () => {
  return `PAYOUT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Get all payouts with filters
export const getAllPayouts = async (req, res) => {
  try {
    const { status, page = 1, limit = 10, counselorId, sortBy = "createdAt" } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (counselorId) filter.counselorId = counselorId;

    const skip = (page - 1) * limit;

    const [payouts, total] = await Promise.all([
      Payout.find(filter)
        .sort({ [sortBy]: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("approvedBy", "email")
        .populate("processedBy", "email"),
      Payout.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: payouts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error("Error in getAllPayouts:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get pending payouts
export const getPendingPayouts = async (req, res) => {
  try {
    const payouts = await Payout.find({ status: "PENDING" })
      .sort({ createdAt: -1 })
      .populate("counselorId", "fullName email");

    const totalPending = payouts.reduce((sum, p) => sum + p.amount, 0);

    res.json({
      success: true,
      count: payouts.length,
      totalAmount: totalPending,
      data: payouts
    });
  } catch (err) {
    console.error("Error in getPendingPayouts:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get payout statistics
export const getPayoutStats = async (req, res) => {
  try {
    const stats = await Payout.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" }
        }
      }
    ]);

    const total = await Payout.aggregate([
      {
        $group: {
          _id: null,
          totalPayouts: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
          totalTax: { $sum: "$taxAmount" },
          totalNet: { $sum: "$netAmount" }
        }
      }
    ]);

    res.json({
      success: true,
      byStatus: stats,
      overall: total[0] || {
        totalPayouts: 0,
        totalAmount: 0,
        totalTax: 0,
        totalNet: 0
      }
    });
  } catch (err) {
    console.error("Error in getPayoutStats:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get specific payout
export const getPayoutById = async (req, res) => {
  try {
    const payout = await Payout.findById(req.params.id)
      .populate("counselorId")
      .populate("approvedBy", "email")
      .populate("processedBy", "email");

    if (!payout) {
      return res.status(404).json({ success: false, error: "Payout not found" });
    }

    res.json({ success: true, data: payout });
  } catch (err) {
    console.error("Error in getPayoutById:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Create payout from counselor earnings
export const createPayout = async (req, res) => {
  try {
    const { counselorId, amount, period, taxAmount = 0, notes } = req.body;

    if (!counselorId || !amount) {
      return res.status(400).json({
        success: false,
        error: "counselorId and amount are required"
      });
    }

    // Get counselor details
    const counselor = await User.findById(counselorId);
    if (!counselor) {
      return res.status(404).json({ success: false, error: "Counselor not found" });
    }

    // Create payout
    const payout = new Payout({
      payoutId: generatePayoutId(),
      counselorId,
      counselorName: counselor.fullName,
      counselorEmail: counselor.email,
      amount,
      taxAmount,
      period,
      notes
    });

    await payout.save();

    res.json({
      success: true,
      message: "Payout created successfully",
      data: payout
    });
  } catch (err) {
    console.error("Error in createPayout:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Update bank details
export const updatePayoutBankDetails = async (req, res) => {
  try {
    const { bankDetails, paymentMethod } = req.body;

    const payout = await Payout.findByIdAndUpdate(
      req.params.id,
      {
        bankDetails,
        paymentMethod
      },
      { new: true }
    );

    if (!payout) {
      return res.status(404).json({ success: false, error: "Payout not found" });
    }

    res.json({
      success: true,
      message: "Bank details updated",
      data: payout
    });
  } catch (err) {
    console.error("Error in updatePayoutBankDetails:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Approve payout
export const approvePayout = async (req, res) => {
  try {
    const { notes } = req.body;
    const adminId = req.adminId; // From token

    const payout = await Payout.findByIdAndUpdate(
      req.params.id,
      {
        status: "APPROVED",
        approvedBy: adminId,
        approvedAt: new Date(),
        notes
      },
      { new: true }
    );

    if (!payout) {
      return res.status(404).json({ success: false, error: "Payout not found" });
    }

    res.json({
      success: true,
      message: "Payout approved",
      data: payout
    });
  } catch (err) {
    console.error("Error in approvePayout:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Process/Send payout
export const processPayout = async (req, res) => {
  try {
    const { transactionReference } = req.body;
    const adminId = req.adminId;

    const payout = await Payout.findById(req.params.id);
    if (!payout) {
      return res.status(404).json({ success: false, error: "Payout not found" });
    }

    if (payout.status !== "APPROVED") {
      return res.status(400).json({
        success: false,
        error: "Only approved payouts can be processed"
      });
    }

    // In real system, integrate with payment gateway here
    // For now, just mark as completed
    payout.status = "COMPLETED";
    payout.processedBy = adminId;
    payout.processedAt = new Date();
    payout.completedAt = new Date();
    payout.transactionReference = transactionReference;

    await payout.save();

    res.json({
      success: true,
      message: "Payout processed successfully",
      data: payout
    });
  } catch (err) {
    console.error("Error in processPayout:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Reject payout
export const rejectPayout = async (req, res) => {
  try {
    const { failureReason } = req.body;

    const payout = await Payout.findByIdAndUpdate(
      req.params.id,
      {
        status: "CANCELLED",
        failureReason
      },
      { new: true }
    );

    if (!payout) {
      return res.status(404).json({ success: false, error: "Payout not found" });
    }

    res.json({
      success: true,
      message: "Payout cancelled",
      data: payout
    });
  } catch (err) {
    console.error("Error in rejectPayout:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get payout history for a counselor
export const getPayoutHistory = async (req, res) => {
  try {
    const { counselorId } = req.params;

    const payouts = await Payout.find({ counselorId })
      .sort({ createdAt: -1 })
      .populate("approvedBy", "email")
      .populate("processedBy", "email");

    const stats = {
      totalPayouts: payouts.length,
      totalAmount: payouts.reduce((sum, p) => sum + p.amount, 0),
      completedAmount: payouts
        .filter(p => p.status === "COMPLETED")
        .reduce((sum, p) => sum + p.amount, 0),
      pendingAmount: payouts
        .filter(p => p.status === "PENDING")
        .reduce((sum, p) => sum + p.amount, 0),
      approvedAmount: payouts
        .filter(p => p.status === "APPROVED")
        .reduce((sum, p) => sum + p.amount, 0)
    };

    res.json({
      success: true,
      stats,
      data: payouts
    });
  } catch (err) {
    console.error("Error in getPayoutHistory:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
