import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

// Deployment variables take priority, followed by root .env, then legacy src/.env.
// Resolve paths from this module so startup does not depend on the working directory.
dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });
dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)) });

export const mongoUri =
  process.env.MONGO_URI?.trim() || process.env.MONGODB_URI?.trim();

if (!mongoUri) {
  throw new Error(
    "MongoDB configuration missing: set MONGO_URI (or MONGODB_URI) in Railway Variables, admin-backend/.env, or admin-backend/src/.env."
  );
}
