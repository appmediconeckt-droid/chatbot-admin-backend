import User from "../models/User.js";
import { generateAdminToken, verifyAdminPassword, hashPassword } from "../middleware/simpleAdminAuth.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email !== process.env.ADMIN_EMAIL) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const isPasswordValid = await verifyAdminPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const token = generateAdminToken(email);
    res.json({
      success: true,
      message: "Login successful",
      token,
      admin: { email }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: err.message
    });
  }
};

export const getAdminProfile = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    res.json({
      success: true,
      admin: { email: process.env.ADMIN_EMAIL },
      token
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to get profile"
    });
  }
};

export const adminLogout = (req, res) => {
  res.json({
    success: true,
    message: "Logout successful"
  });
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long"
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New passwords do not match"
      });
    }

    const isCurrentPasswordValid = await verifyAdminPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password"
      });
    }

    const hashedPassword = await hashPassword(newPassword);

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const envPath = path.join(__dirname, "../../.env");
    let envContent = fs.readFileSync(envPath, "utf8");
    envContent = envContent.replace(
      /ADMIN_PASSWORD_HASH=.*/,
      `ADMIN_PASSWORD_HASH=${hashedPassword}`
    );
    fs.writeFileSync(envPath, envContent, "utf8");

    process.env.ADMIN_PASSWORD_HASH = hashedPassword;

    res.json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (err) {
    console.error("Password change error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to change password"
    });
  }
};
