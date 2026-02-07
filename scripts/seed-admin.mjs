import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const uri = process.env.MONGODB_URI;
const itsRaw = process.env.ADMIN_ITS;
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME || "Admin";
const phoneOrEmail = process.env.ADMIN_CONTACT || "";

if (!uri) {
  console.error("Missing MONGODB_URI in environment.");
  process.exit(1);
}

if (!itsRaw || !password) {
  console.error("Missing ADMIN_ITS or ADMIN_PASSWORD in environment.");
  process.exit(1);
}

const its = Number.parseInt(itsRaw, 10);
if (!Number.isFinite(its)) {
  console.error("ADMIN_ITS must be a valid number.");
  process.exit(1);
}

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db();
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
    console.log("Admin user created.");
  } else {
    console.log("Admin user updated.");
  }
} catch (error) {
  console.error("Failed to seed admin:", error);
  process.exit(1);
} finally {
  await client.close();
}
