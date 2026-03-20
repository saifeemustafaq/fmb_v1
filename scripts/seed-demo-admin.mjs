import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import { loadProjectEnv } from "./load-project-env.mjs";

loadProjectEnv();

const uri = process.env.MONGODB_URI;
const dbName =
  process.env.MONGODB_DB || process.env.MONGODB_DEMO_DB || "fmb_demo";
const itsRaw = process.env.DEMO_ITS;
const password = process.env.DEMO_PASSWORD;
const name = process.env.DEMO_ADMIN_NAME || "Demo Admin";
const phoneOrEmail = process.env.DEMO_CONTACT || "";

if (!uri) {
  console.error("Missing MONGODB_URI in environment.");
  process.exit(1);
}

if (!itsRaw || !password) {
  console.error("Missing DEMO_ITS or DEMO_PASSWORD in environment.");
  process.exit(1);
}

const its = Number.parseInt(itsRaw, 10);
if (!Number.isFinite(its)) {
  console.error("DEMO_ITS must be a valid number.");
  process.exit(1);
}

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(dbName);
  const users = db.collection("users");

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();

  const result = await users.updateOne(
    { its },
    {
      $set: {
        name,
        its,
        passwordHash,
        phoneOrEmail,
        role: "admin",
        isActive: true,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );

  if (result.upsertedId) {
    console.log("Demo admin user created.");
  } else {
    console.log("Demo admin user updated.");
  }
} catch (error) {
  console.error("Failed to seed demo admin:", error);
  process.exit(1);
} finally {
  await client.close();
}
