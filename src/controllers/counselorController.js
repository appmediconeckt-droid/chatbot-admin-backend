import User from "../models/User.js";

// SVGDefsElement

export const getAllCounselors = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, specialization, status } = req.query;
    const skip = (page - 1) * limit;

    let filter = { role: "counsellor" };

    if (search) {
      filter.$or = [
        { fullName: new RegExp(search, "i") },
        { email: new RegExp(search, "i") }
      ];
    }

    if (specialization) {
      filter.specialization = { $elemMatch: { $regex: specialization, $options: "i" } };
    }

    if (status === "verified") filter.isVerified = true;
    if (status === "unverified") filter.isVerified = false;
    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;

    const counselors = await User.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 })
      .lean();

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: counselors,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCounselorById = async (req, res) => {
  try {
    const counselor = await User.findById(req.params.id);
    if (!counselor || counselor.role !== "counsellor") {
      return res.status(404).json({ success: false, message: "Counselor not found" });
    }
    res.json({ success: true, data: counselor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateCounselor = async (req, res) => {
  try {
    const counselor = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!counselor) {
      return res.status(404).json({ success: false, message: "Counselor not found" });
    }
    res.json({ success: true, data: counselor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteCounselor = async (req, res) => {
  try {
    const counselor = await User.findByIdAndDelete(req.params.id);
    if (!counselor) {
      return res.status(404).json({ success: false, message: "Counselor not found" });
    }
    res.json({ success: true, message: "Counselor deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const approveCounselors = async (req, res) => {
  try {
    const { ids } = req.body;
    const result = await User.updateMany(
      { _id: { $in: ids } },
      { isVerified: true }
    );
    res.json({
      success: true,
      message: `${result.modifiedCount} counselors approved`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const rejectCounselors = async (req, res) => {
  try {
    const { ids } = req.body;
    const result = await User.updateMany(
      { _id: { $in: ids } },
      { isVerified: false, isActive: false }
    );
    res.json({
      success: true,
      message: `${result.modifiedCount} counselors rejected`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCounselorStats = async (req, res) => {
  try {
    const total = await User.countDocuments({ role: "counsellor" });
    const verified = await User.countDocuments({ role: "counsellor", isVerified: true });
    const active = await User.countDocuments({ role: "counsellor", isActive: true });
    const newThisMonth = await User.countDocuments({
      role: "counsellor",
      createdAt: { $gte: new Date(new Date().setDate(1)) }
    });
    const noSpecialization = await User.countDocuments({
      role: "counsellor",
      $or: [{ specialization: null }, { specialization: "" }]
    });

    const topRated = await User.find({ role: "counsellor" })
      .sort({ rating: -1 })
      .limit(5);

    res.json({
      success: true,
      data: { total, verified, active, newThisMonth, topRated, noSpecialization }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getCounselorsWithoutSpecialization = async (req, res) => {
  try {
    const counselors = await User.find({
      role: "counsellor",
      $or: [{ specialization: null }, { specialization: "" }]
    }).select("fullName email specialization experience isVerified isActive");

    res.json({
      success: true,
      count: counselors.length,
      data: counselors
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
