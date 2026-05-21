import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import app from "./app.js";
import User from "./models/User.js";

const PORT = process.env.PORT || 5001;
import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("\n✅ MongoDB Connected Successfully!");

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`
╔════════════════════════════════════════════════════╗
║   🎯 ADMIN PANEL BACKEND - RUNNING                ║
╚════════════════════════════════════════════════════╝

🌐 Server:      http://localhost:${PORT}
📊 API Base:    http://localhost:${PORT}/api/admin
🔐 Auth:        Email + JWT Token (24h expiry)
💾 Database:    MongoDB Atlas (mediconeckt)
👤 Admin User:  admin@mindcrawller.com

📋 ENDPOINTS:

  🔓 Public (No Token)
  ├── POST   /api/admin/auth/login          Login
  └── GET    /api/admin/health              Health Check

  🔒 Protected (Need Token)
  ├── GET    /api/admin/auth/profile        Admin Profile
  ├── POST   /api/admin/auth/logout         Logout
  │
  ├── GET    /api/admin/users               List Users
  ├── GET    /api/admin/users/:id           Get User
  ├── GET    /api/admin/users/stats         User Stats
  ├── PUT    /api/admin/users/:id           Update User
  ├── DELETE /api/admin/users/:id           Delete User
  │
  ├── GET    /api/admin/counselors          List Counselors
  ├── GET    /api/admin/counselors/:id      Get Counselor
  ├── GET    /api/admin/counselors/stats    Counselor Stats
  ├── PUT    /api/admin/counselors/:id      Update Counselor
  ├── DELETE /api/admin/counselors/:id      Delete Counselor
  ├── POST   /api/admin/counselors/approve  Bulk Approve
  └── POST   /api/admin/counselors/reject   Bulk Reject

  ├── GET    /api/admin/dashboard/analytics Dashboard Analytics
  ├── GET    /api/admin/dashboard/growth    30-Day Growth
  ├── GET    /api/admin/dashboard/health    System Health
  └── GET    /api/admin/dashboard/activities Recent Activities

🔐 CREDENTIALS:
  Email:    admin@mindcrawller.com
  Password: adminvivek123

🧪 TEST LOGIN:
  curl -X POST http://localhost:${PORT}/api/admin/auth/login \\
    -H "Content-Type: application/json" \\
    -d '{"email":"admin@mindcrawller.com","password":"adminvivek123"}'

📖 Documentation: Read admin/README.md

✨ Ready for frontend at http://localhost:5173
════════════════════════════════════════════════════════════
      `);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Failed:", err.message);
    process.exit(1);
  });
