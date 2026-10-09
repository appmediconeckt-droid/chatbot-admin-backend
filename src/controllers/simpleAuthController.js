import AdminAccount from "../models/AdminAccount.js";
import bcryptjs from "bcryptjs";
import { generateAdminToken, verifyAdminPassword, hashPassword, getAdminRole } from "../middleware/simpleAdminAuth.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const adminLogin = async (req, res) => {
  try {
    const { password } = req.body;
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";

    if (!email || typeof password !== "string" || !password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const isOwner = email === process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const account = isOwner ? null : await AdminAccount.findOne({ email }).select("+passwordHash");
    const isPasswordValid = isOwner
      ? await verifyAdminPassword(password)
      : account ? await bcryptjs.compare(password, account.passwordHash) : false;
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
      admin: { email, role: getAdminRole(email) }
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
      admin: { email: req.user.email, role: req.user.role },
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

    if ([currentPassword, newPassword, confirmPassword].some(value => typeof value !== "string") || Buffer.byteLength(newPassword, "utf8") > 72) {
      return res.status(400).json({ success: false, message: "Invalid password format or length" });
    }
    const isOwner = req.user.email === process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const account = isOwner ? null : await AdminAccount.findOne({ email: req.user.email }).select("+passwordHash");
    const isCurrentPasswordValid = isOwner
      ? await verifyAdminPassword(currentPassword)
      : account ? await bcryptjs.compare(currentPassword, account.passwordHash) : false;
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

    if (account) {
      account.passwordHash = hashedPassword;
      await account.save();
      return res.json({ success: true, message: "Password changed successfully" });
    }

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

export const createAdmin = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    if (typeof name !== "string" || !name.trim() || name.trim().length > 100 ||
        typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        typeof password !== "string" || password.length < 8 || Buffer.byteLength(password, "utf8") > 72 ||
        password !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Enter a name, valid email, and matching passwords (at least 8 characters, at most 72 bytes)" });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail === process.env.ADMIN_EMAIL?.trim().toLowerCase() || await AdminAccount.exists({ email: normalizedEmail })) {
      return res.status(409).json({ success: false, message: "An admin with this email already exists" });
    }
    const account = await AdminAccount.create({
      name: name.trim(), email: normalizedEmail,
      passwordHash: await hashPassword(password), createdBy: req.user.email,
    });
    return res.status(201).json({ success: true, message: "Admin created successfully", admin: { id: account.id, name: account.name, email: account.email } });
  } catch (error) {
    return res.status(error.code === 11000 ? 409 : 500).json({ success: false, message: error.code === 11000 ? "An admin with this email already exists" : "Failed to create admin" });
  }
};
