import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import User from "../src/models/User.js";

async function fixSpecializations() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find all counselors with string specializations that need fixing
    const counselors = await User.find({ role: "counsellor" });

    let fixedCount = 0;
    let alreadyArrayCount = 0;
    let emptyCount = 0;

    for (const counselor of counselors) {
      // Skip if already an array
      if (Array.isArray(counselor.specialization)) {
        alreadyArrayCount++;
        continue;
      }

      // Handle empty/null
      if (!counselor.specialization || counselor.specialization === "") {
        counselor.specialization = [];
        emptyCount++;
      } else {
        // Split by common delimiters
        const specs = counselor.specialization
          .split(/[,;\/]|(?=[A-Z])/) // Split by comma, semicolon, slash, or capital letters
          .map(s => s.trim())
          .filter(s => s.length > 0)
          .map(s => s.charAt(0).toUpperCase() + s.slice(1)); // Capitalize first letter

        counselor.specialization = specs;
        fixedCount++;
      }

      await counselor.save();
    }

    console.log("\n📊 Specialization Fix Results:");
    console.log(`✅ Fixed (string → array): ${fixedCount}`);
    console.log(`ℹ️  Already array: ${alreadyArrayCount}`);
    console.log(`⚠️  Empty/null → []: ${emptyCount}`);
    console.log(`📈 Total counselors processed: ${counselors.length}`);

    // Show sample results
    console.log("\n📋 Sample Results:");
    const samples = await User.find({ role: "counsellor" }).limit(3);
    samples.forEach((counselor, idx) => {
      console.log(`\n${idx + 1}. ${counselor.fullName}`);
      console.log(`   Specializations: ${JSON.stringify(counselor.specialization)}`);
    });

    await mongoose.disconnect();
    console.log("\n✅ Migration complete!");

  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

fixSpecializations();
