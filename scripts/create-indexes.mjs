#!/usr/bin/env node

/**
 * Add MongoDB indexes for the users collection
 * Run with: node scripts/create-indexes.mjs
 */

import { MongoClient } from "mongodb";
import { loadProjectEnv } from "./load-project-env.mjs";

loadProjectEnv();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI environment variable is not set");
  process.exit(1);
}

async function createIndexes() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✓ Connected to MongoDB");

    const db = client.db("fmb");
    const usersCollection = db.collection("users");

    // Create indexes
    console.log("\n📑 Creating indexes...\n");

    // 1. Unique index on ITS
    console.log("  • Creating unique index on its...");
    await usersCollection.createIndex({ its: 1 }, { unique: true });
    console.log("    ✓ Unique index on 'its' created");

    // 2. Index on role
    console.log("  • Creating index on role...");
    await usersCollection.createIndex({ role: 1 });
    console.log("    ✓ Index on 'role' created");

    // 3. Index on isActive
    console.log("  • Creating index on isActive...");
    await usersCollection.createIndex({ isActive: 1 });
    console.log("    ✓ Index on 'isActive' created");

    // 4. Index on createdAt
    console.log("  • Creating index on createdAt...");
    await usersCollection.createIndex({ createdAt: -1 });
    console.log("    ✓ Index on 'createdAt' created");

    // 5. Index on name (for sorting)
    console.log("  • Creating index on name...");
    await usersCollection.createIndex({ name: 1 });
    console.log("    ✓ Index on 'name' created");

    // 6. Compound index: role + isActive
    console.log("  • Creating compound index on role + isActive...");
    await usersCollection.createIndex({ role: 1, isActive: 1 });
    console.log("    ✓ Compound index on 'role + isActive' created");

    // 7. Compound index: createdAt + role
    console.log("  • Creating compound index on createdAt + role...");
    await usersCollection.createIndex({ createdAt: -1, role: 1 });
    console.log("    ✓ Compound index on 'createdAt + role' created");

    console.log("\n✅ All indexes created successfully!\n");

    // List all indexes
    console.log("📋 Current indexes:");
    const indexes = await usersCollection.listIndexes().toArray();
    indexes.forEach((idx, i) => {
      console.log(`  ${i + 1}. ${JSON.stringify(idx.key)}`);
    });
  } catch (error) {
    console.error("❌ Error creating indexes:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("\n✓ Database connection closed");
  }
}

createIndexes();
