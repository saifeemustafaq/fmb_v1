#!/usr/bin/env node

/**
 * Seed ingredients from products.json into MongoDB
 * Usage: npm run seed:ingredients
 *
 * IMPORTANT: Run `npm run seed:stores` FIRST to create stores.
 *
 * Transforms products.json entries into the new ingredient schema:
 * - Maps store names to storeId references
 * - Sets visibility to "global", status to "active"
 * - Adds timestamps
 */

import fs from "fs";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "fmb";

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not defined in .env.local");
  process.exit(1);
}

/**
 * Maps product units to standardized unit shortNames.
 * Canonical list is in lib/constants/units.ts (ALLOWED_UNIT_VALUES).
 * Output must be one of: lbs, pkt, bunch, case, gal, oz, g, btl, can, pc, box, ct, kg.
 */
function normalizeUnit(unit) {
  if (unit === "Not Assigned" || !unit) return "pc";

  const unitMap = {
    lbs: "lbs",
    pounds: "lbs",
    pkt: "pkt",
    packet: "pkt",
    packets: "pkt",
    bunch: "bunch",
    bunches: "bunch",
    case: "case",
    cases: "case",
    gal: "gal",
    gallon: "gal",
    gallons: "gal",
    oz: "oz",
    ounce: "oz",
    ounces: "oz",
    g: "g",
    gram: "g",
    grams: "g",
    btl: "btl",
    bottle: "btl",
    bottles: "btl",
    can: "can",
    cans: "can",
    pc: "pc",
    pcs: "pc",
    piece: "pc",
    pieces: "pc",
    box: "box",
    boxes: "box",
    ct: "ct",
    count: "ct",
    kg: "kg",
    kilogram: "kg",
    kilograms: "kg",
    // Legacy / no longer in canonical list → default to pieces
    ml: "pc",
    l: "pc",
    clove: "pc",
    tsp: "pc",
    tbsp: "pc",
  };

  const lower = unit.toLowerCase().trim();
  return unitMap[lower] || "pc";
}

async function seedIngredients() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log(`✓ Connected to MongoDB (${MONGODB_DB})`);

    const db = client.db(MONGODB_DB);
    const ingredientsCol = db.collection("ingredients");
    const storesCol = db.collection("stores");

    // Load products.json
    const productsPath = path.join(__dirname, "..", "products.json");
    if (!fs.existsSync(productsPath)) {
      console.error(`❌ products.json not found at ${productsPath}`);
      process.exit(1);
    }

    const productsData = JSON.parse(fs.readFileSync(productsPath, "utf-8"));
    const products = productsData.products || [];

    console.log(`\n📦 Loaded ${products.length} products from products.json`);

    // Fetch all stores and create a map: storeName → storeId
    const stores = await storesCol.find({}).toArray();
    const storeMap = {};
    stores.forEach((store) => {
      storeMap[store.name.toLowerCase()] = store._id;
    });

    console.log(`✓ Found ${stores.length} stores in database`);

    // Transform products into ingredients
    const ingredients = products.map((prod) => {
      // Determine storeId: try to match store name, otherwise null
      let storeId = null;
      if (prod.store && prod.store !== "Not Assigned") {
        const normalized = prod.store.toLowerCase();
        storeId = storeMap[normalized] || null;
      }

      return {
        name: prod.name,
        category: prod.category || "Uncategorized",
        defaultUnit: normalizeUnit(prod.unit),
        storeId,
        notes: prod.notes || "",
        visibility: "global",
        ownerUserId: null,
        status: "active",
        stockOnHand: null,
        reorderThreshold: null,
        createdBy: null,
        createdAt: new Date(prod.createdAt || new Date()),
      };
    });

    console.log(`\n🔄 Transforming ${ingredients.length} products to ingredients...`);

    // Check for duplicates by name
    const nameCount = {};
    ingredients.forEach((ing) => {
      nameCount[ing.name] = (nameCount[ing.name] || 0) + 1;
    });
    const duplicates = Object.entries(nameCount).filter(([, count]) => count > 1);
    if (duplicates.length > 0) {
      console.warn(`⚠️  Found ${duplicates.length} duplicate ingredient names (will be inserted as-is)`);
    }

    // Clear existing ingredients (optional: comment out to preserve)
    // const deleteResult = await ingredientsCol.deleteMany({});
    // console.log(`   Deleted ${deleteResult.deletedCount} existing ingredients`);

    // Insert ingredients
    const insertResult = await ingredientsCol.insertMany(ingredients, {
      ordered: false, // Continue inserting even if one fails
    });

    console.log(`\n✅ Ingredients seeded:`);
    console.log(`   ✓ Inserted: ${insertResult.insertedCount}`);

    // Show stats
    const categoryCounts = {};
    ingredients.forEach((ing) => {
      categoryCounts[ing.category] = (categoryCounts[ing.category] || 0) + 1;
    });

    console.log(`\n📊 Breakdown by category:`);
    Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        console.log(`   • ${category}: ${count}`);
      });

    const storeAssigned = ingredients.filter((ing) => ing.storeId).length;
    console.log(`\n🏪 Store assignment:`);
    console.log(`   ✓ With store: ${storeAssigned}`);
    console.log(`   ✓ Without store (null): ${ingredients.length - storeAssigned}`);

    console.log(`\n✅ Ingredient seeding completed!\n`);
  } catch (error) {
    console.error("❌ Error seeding ingredients:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedIngredients();
