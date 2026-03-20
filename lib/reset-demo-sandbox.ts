import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import type { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { DEMO_APP_DB } from "@/lib/app-db-context";

const DEMO_STORES = [
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

function normalizeUnit(unit: string | undefined): string {
  if (unit === "Not Assigned" || !unit) return "pc";

  const unitMap: Record<string, string> = {
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
    ml: "pc",
    l: "pc",
    clove: "pc",
    tsp: "pc",
    tbsp: "pc",
  };

  const lower = unit.toLowerCase().trim();
  return unitMap[lower] || "pc";
}

/**
 * Drops the demo MongoDB database and re-seeds demo admin, stores, and ingredients
 * (same shape as scripts/seed-stores + seed-ingredients).
 */
export async function resetDemoSandbox(): Promise<void> {
  const demoItsRaw = process.env.DEMO_ITS;
  const password = process.env.DEMO_PASSWORD;
  const demoIts = demoItsRaw ? Number.parseInt(demoItsRaw, 10) : NaN;

  if (!Number.isFinite(demoIts) || !password) {
    throw new Error("DEMO_ITS and DEMO_PASSWORD must be set to reset the demo sandbox");
  }

  const client = await clientPromise;
  await client.db(DEMO_APP_DB).dropDatabase();

  const db = client.db(DEMO_APP_DB);
  const now = new Date();
  const passwordHash = await bcrypt.hash(password, 10);

  await db.collection("users").insertOne({
    name: process.env.DEMO_ADMIN_NAME || "Demo Admin",
    its: demoIts,
    passwordHash,
    phoneOrEmail: process.env.DEMO_CONTACT || "",
    role: "admin",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  await db.collection("stores").insertMany(
    DEMO_STORES.map((s) => ({ ...s, createdAt: now }))
  );

  const stores = await db.collection("stores").find({}).toArray();
  const storeMap: Record<string, ObjectId> = {};
  for (const store of stores) {
    storeMap[store.name.toLowerCase()] = store._id;
  }

  const productsPath = path.join(process.cwd(), "products.json");
  if (!fs.existsSync(productsPath)) {
    throw new Error(`products.json not found at ${productsPath}`);
  }

  const productsData = JSON.parse(
    fs.readFileSync(productsPath, "utf-8")
  ) as { products?: Record<string, unknown>[] };
  const products = productsData.products || [];

  const ingredients = products.map((prod) => {
    let storeId: ObjectId | null = null;
    const storeName = prod.store;
    if (
      typeof storeName === "string" &&
      storeName &&
      storeName !== "Not Assigned"
    ) {
      storeId = storeMap[storeName.toLowerCase()] ?? null;
    }

    const createdAtRaw = prod.createdAt;
    const createdAt =
      typeof createdAtRaw === "string" || createdAtRaw instanceof Date
        ? new Date(createdAtRaw as string | Date)
        : now;

    return {
      name: typeof prod.name === "string" ? prod.name : String(prod.name ?? ""),
      category: (prod.category as string) || "Uncategorized",
      defaultUnit: normalizeUnit(
        typeof prod.unit === "string" ? prod.unit : undefined
      ),
      storeId,
      notes: (prod.notes as string) || "",
      visibility: "global" as const,
      ownerUserId: null,
      status: "active" as const,
      stockOnHand: null,
      reorderThreshold: null,
      createdBy: null,
      createdAt,
    };
  });

  if (ingredients.length > 0) {
    await db.collection("ingredients").insertMany(ingredients, {
      ordered: false,
    });
  }
}
