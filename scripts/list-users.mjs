import { MongoClient } from "mongodb";
import { loadProjectEnv } from "./load-project-env.mjs";

loadProjectEnv();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db("fmb");
  const users = await db.collection("users").find({}).toArray();

  console.log("Users in database:");
  users.forEach((user) => {
    console.log({
      its: user.its,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      hasPassword: !!user.passwordHash,
    });
  });
} catch (error) {
  console.error("Failed to list users:", error);
} finally {
  await client.close();
}
