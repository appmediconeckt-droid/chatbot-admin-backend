import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";

export const generateAdminToken = (email) => {
  return jwt.sign({ email }, process.env.ADMIN_JWT_SECRET, {
    expiresIn: "24h"
  });
};

export const verifyAdminToken = (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "No token provided"
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    req.user = { email: decoded.email, id: decoded.id || null };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};

export const verifyAdminPassword = async (password) => {
  return await bcryptjs.compare(password, process.env.ADMIN_PASSWORD_HASH);
};

export const hashPassword = async (password) => {
  return await bcryptjs.hash(password, 10);
};
