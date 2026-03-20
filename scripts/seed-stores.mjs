#!/usr/bin/env node

/**
 * Seed stores into MongoDB
 * Usage: npm run seed:stores
 * 
 * Creates a list of default stores where ingredients can be sourced from.
 * Stores should be created before ingredients (ingredients reference storeId).
 */

import { MongoClient } from "mongodb";
import { loadProjectEnv } from "./load-project-env.mjs";

loadProjectEnv();

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "fmb";

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not defined in .env or .env.local");
  process.exit(1);
}

// Hardcoded store list
const STORES = [
  {
    name: "Indian Market",
    address: "123 Main St",
    notes: "Specializes in Indian spices and produce",
    isActive: true,
  },
  {
    name: "Whole Foods",
    address: "456 Oak Ave",
    notes: "Organic vegetables and dry goods",
    isActive: true,
  },
  {
    name: "Local Farmer's Market",
    address: "Central Plaza",
    notes: "Fresh seasonal produce",
    isActive: true,
  },
  {
    name: "General Grocery",
    address: "789 Pine Rd",
    notes: "General purpose grocery store",
    isActive: true,
  },
  {
    name: "Spice Hub",
    address: "321 Elm St",
    notes: "Specialty spices and seasonings",
    isActive: true,
  },
];

async function seedStores() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log(`✓ Connected to MongoDB (${MONGODB_DB})`);

    const db = client.db(MONGODB_DB);
    const stores = db.collection("stores");

    // Add createdAt timestamp to each store
    const storesWithTimestamp = STORES.map((store) => ({
      ...store,
      createdAt: new Date(),
    }));

    // Upsert: if store with same name exists, update; otherwise insert
    let upserted = 0;
    let inserted = 0;

    for (const store of storesWithTimestamp) {
      const result = await stores.updateOne(
        { name: store.name },
        { $set: store },
        { upsert: true }
      );

      if (result.upsertedId) {
        inserted++;
      } else if (result.modifiedCount > 0) {
        upserted++;
      }
    }

    console.log(`\n📍 Stores seeded:`);
    console.log(`   ✓ Inserted: ${inserted}`);
    console.log(`   ✓ Upserted: ${upserted}`);
    console.log(`   ✓ Total: ${STORES.length}`);

    // List all stores
    const allStores = await stores.find({}).toArray();
    console.log(`\n📋 All stores in database:`);
    allStores.forEach((store, idx) => {
      console.log(
        `   ${idx + 1}. ${store.name} (${store._id.toString().slice(0, 8)}...)`
      );
    });

    console.log(`\n✅ Store seeding completed!\n`);
  } catch (error) {
    console.error("❌ Error seeding stores:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedStores();
