import bcryptjs from "bcryptjs";

async function generateHash() {
  const password = process.argv[2];

  if (!password) {
    console.log("❌ Error: Password not provided");
    console.log("\nUsage: node scripts/generatePasswordHash.js <new_password>");
    console.log("\nExample: node scripts/generatePasswordHash.js MyNewPassword123");
    process.exit(1);
  }

  if (password.length < 8) {
    console.log("❌ Error: Password must be at least 8 characters long");
    process.exit(1);
  }

  try {
    const hash = await bcryptjs.hash(password, 10);
    console.log("\n✅ Password Hash Generated Successfully!\n");
    console.log("New Password: " + password);
    console.log("\nHash to use in .env file:");
    console.log("───────────────────────────────────────");
    console.log(hash);
    console.log("───────────────────────────────────────\n");
    console.log("📋 Instructions:");
    console.log("1. Copy the hash above");
    console.log("2. Open .env file");
    console.log("3. Replace ADMIN_PASSWORD_HASH value with the hash");
    console.log("4. Save the file");
    console.log("5. Restart the backend server");
    console.log("6. Login with your new password\n");
  } catch (err) {
    console.error("❌ Error generating hash:", err.message);
    process.exit(1);
  }
}

generateHash();
