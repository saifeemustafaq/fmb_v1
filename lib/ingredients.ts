import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import type { IngredientRecord } from "@/lib/interfaces/ingredient";

/**
 * Get the ingredients collection from MongoDB
 */
export async function getIngredientsCollection() {
  const client = await clientPromise;
  return client.db("fmb").collection<IngredientRecord>("ingredients");
}

/**
 * Get the stores collection from MongoDB
 */
export async function getStoresCollection() {
  const client = await clientPromise;
  return client.db("fmb").collection("stores");
}

/**
 * Get all ingredients visible to a user (cook)
 *
 * Rules:
 * - Global ingredients (visibility="global")
 * - User's own private ingredients (visibility="private" AND ownerUserId=userId)
 *
 * @param userId - The cook's user ID (can be null for viewing only global)
 * @returns Array of IngredientRecord
 */
export async function getIngredientsByVisibility(userId?: ObjectId | null) {
  const ingredients = await getIngredientsCollection();

  if (!userId) {
    return ingredients.find({ visibility: "global" }).toArray();
  }

  return ingredients
    .find({
      $or: [
        { visibility: "global" as const },
        { visibility: "private" as const, ownerUserId: userId },
      ],
    } as any)
    .toArray();
}

/**
 * Search ingredients by name (for cook ingredient picker)
 *
 * Rules: same visibility as getIngredientsByVisibility
 *
 * @param searchQuery - Text to search in ingredient names
 * @param userId - The cook's user ID (optional)
 * @returns Array of matching IngredientRecord
 */
export async function searchIngredients(
  searchQuery: string,
  userId?: ObjectId | null
) {
  const ingredients = await getIngredientsCollection();

  const nameFilter = { $regex: searchQuery, $options: "i" as const };

  if (!userId) {
    return ingredients
      .find({ visibility: "global", name: nameFilter })
      .sort({ name: 1 })
      .toArray();
  }

  return ingredients
    .find({
      name: nameFilter,
      $or: [
        { visibility: "global" as const },
        { visibility: "private" as const, ownerUserId: userId },
      ],
    } as any)
    .sort({ name: 1 })
    .toArray();
}

/**
 * Get all ingredients grouped by category
 * Useful for UI that shows ingredients organized by category
 *
 * @param userId - The cook's user ID (optional)
 * @returns Map of category → ingredients[]
 */
export async function getIngredientsByCategory(userId?: ObjectId | null) {
  const ingredients = await getIngredientsByVisibility(userId);

  const grouped: Record<string, IngredientRecord[]> = {};
  ingredients.forEach((ing) => {
    const category = ing.category || "Uncategorized";
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(ing);
  });

  // Sort categories alphabetically, ingredients within each category by name
  Object.keys(grouped).forEach((category) => {
    grouped[category].sort((a, b) => a.name.localeCompare(b.name));
  });

  return grouped;
}

/**
 * Get a single ingredient by ID
 *
 * @param ingredientId - MongoDB ObjectId of the ingredient
 * @returns IngredientRecord or null
 */
export async function getIngredientById(ingredientId: ObjectId | string) {
  const ingredients = await getIngredientsCollection();
  const id = typeof ingredientId === "string" ? new ObjectId(ingredientId) : ingredientId;
  return ingredients.findOne({ _id: id });
}

/**
 * Add a new private ingredient (created by a cook)
 *
 * @param ingredient - Partial ingredient data (without _id, createdAt, createdBy)
 * @param userId - The cook's user ID
 * @returns The inserted ingredient with _id
 */
export async function addPrivateIngredient(
  ingredient: Omit<IngredientRecord, "_id" | "createdAt" | "createdBy">,
  userId: ObjectId
) {
  const ingredients = await getIngredientsCollection();

  const newIngredient: IngredientRecord = {
    ...ingredient,
    visibility: "private",
    ownerUserId: userId,
    status: "pending", // Awaiting admin approval
    createdBy: userId,
    createdAt: new Date(),
  };

  const result = await ingredients.insertOne(newIngredient);

  return {
    ...newIngredient,
    _id: result.insertedId,
  };
}

/**
 * Get all pending ingredients awaiting admin approval
 * (Admin view)
 *
 * @returns Array of pending private ingredients
 */
export async function getPendingIngredients() {
  const ingredients = await getIngredientsCollection();
  return ingredients
    .find({
      visibility: "private",
      status: "pending",
    })
    .sort({ createdAt: -1 })
    .toArray();
}

/**
 * Approve a private ingredient and make it global
 * (Admin only)
 *
 * @param ingredientId - The ingredient to approve
 * @returns Updated ingredient record or null if not found
 */
export async function approvePrivateIngredient(ingredientId: ObjectId | string) {
  const ingredients = await getIngredientsCollection();
  const id = typeof ingredientId === "string" ? new ObjectId(ingredientId) : ingredientId;

  const result = await ingredients.findOneAndUpdate(
    { _id: id },
    {
      $set: {
        visibility: "global" as const,
        ownerUserId: null,
        status: "active" as const,
      },
    },
    { returnDocument: "after" }
  );

  return result || null;
}

/**
 * Get all ingredients (admin only)
 * No visibility filter; returns every ingredient in the database
 *
 * @returns Array of IngredientRecord sorted by category then name
 */
export async function getAllIngredientsForAdmin() {
  const ingredients = await getIngredientsCollection();
  return ingredients
    .find({})
    .sort({ category: 1, name: 1 })
    .toArray();
}

/**
 * List stores for dropdowns (id + name)
 */
export async function getStoresList(): Promise<{ _id: ObjectId; name: string }[]> {
  const stores = await getStoresCollection();
  const list = await stores.find({}, { projection: { name: 1 } }).toArray();
  return list as { _id: ObjectId; name: string }[];
}

/**
 * Get all stores for admin (full documents)
 */
export async function getStoresForAdmin() {
  const stores = await getStoresCollection();
  const list = await stores.find({}).sort({ name: 1 }).toArray();
  return list as { _id: ObjectId; name: string; address?: string; notes?: string; isActive?: boolean; createdAt?: Date }[];
}

/**
 * Get a single store by ID
 */
export async function getStoreById(storeId: ObjectId | string) {
  const stores = await getStoresCollection();
  const id = typeof storeId === "string" ? new ObjectId(storeId) : storeId;
  return stores.findOne({ _id: id }) as Promise<{
    _id: ObjectId;
    name: string;
    address?: string;
    notes?: string;
    isActive?: boolean;
    createdAt?: Date;
  } | null>;
}

/**
 * Create a new store (admin only)
 */
export async function createStore(data: {
  name: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
}) {
  const stores = await getStoresCollection();
  const doc = {
    name: data.name.trim(),
    address: (data.address ?? "").trim() || undefined,
    notes: (data.notes ?? "").trim() || undefined,
    isActive: data.isActive ?? true,
    createdAt: new Date(),
  };
  const result = await stores.insertOne(doc);
  return { _id: result.insertedId, ...doc };
}

/**
 * Update a store by ID (admin only)
 */
export async function updateStore(
  storeId: ObjectId | string,
  updates: { name?: string; address?: string; notes?: string; isActive?: boolean }
) {
  const stores = await getStoresCollection();
  const id = typeof storeId === "string" ? new ObjectId(storeId) : storeId;
  const set: Record<string, unknown> = {};
  if (updates.name !== undefined) set.name = updates.name.trim();
  if (updates.address !== undefined) set.address = updates.address.trim() || "";
  if (updates.notes !== undefined) set.notes = updates.notes.trim() || "";
  if (updates.isActive !== undefined) set.isActive = updates.isActive;
  if (Object.keys(set).length === 0) return getStoreById(id);
  const result = await stores.findOneAndUpdate(
    { _id: id },
    { $set: set },
    { returnDocument: "after" }
  );
  return result as { _id: ObjectId; name: string; address?: string; notes?: string; isActive?: boolean; createdAt?: Date } | null;
}

/**
 * Delete a store by ID (admin only)
 */
export async function deleteStore(storeId: ObjectId | string) {
  const stores = await getStoresCollection();
  const id = typeof storeId === "string" ? new ObjectId(storeId) : storeId;
  const result = await stores.deleteOne({ _id: id });
  return result.deletedCount === 1;
}

/**
 * Update an ingredient by ID (admin only)
 *
 * @param ingredientId - The ingredient to update
 * @param updates - Fields to update (partial)
 * @returns Updated ingredient or null if not found
 */
export async function updateIngredient(
  ingredientId: ObjectId | string,
  updates: Partial<
    Pick<
      IngredientRecord,
      | "name"
      | "category"
      | "defaultUnit"
      | "storeId"
      | "notes"
      | "visibility"
      | "status"
      | "stockOnHand"
      | "reorderThreshold"
    >
  >
) {
  const ingredients = await getIngredientsCollection();
  const id = typeof ingredientId === "string" ? new ObjectId(ingredientId) : ingredientId;

  const set: Record<string, unknown> = {};
  if (updates.name !== undefined) set.name = updates.name;
  if (updates.category !== undefined) set.category = updates.category;
  if (updates.defaultUnit !== undefined) set.defaultUnit = updates.defaultUnit;
  if (updates.storeId !== undefined) set.storeId = updates.storeId;
  if (updates.notes !== undefined) set.notes = updates.notes;
  if (updates.visibility !== undefined) set.visibility = updates.visibility;
  if (updates.status !== undefined) set.status = updates.status;
  if (updates.stockOnHand !== undefined) set.stockOnHand = updates.stockOnHand;
  if (updates.reorderThreshold !== undefined) set.reorderThreshold = updates.reorderThreshold;

  if (Object.keys(set).length === 0) {
    return getIngredientById(id);
  }

  const result = await ingredients.findOneAndUpdate(
    { _id: id },
    { $set: set },
    { returnDocument: "after" }
  );

  return result || null;
}

/**
 * Create a new ingredient (admin only)
 */
export async function createIngredient(
  data: {
    name: string;
    category: string;
    defaultUnit: string;
    storeId?: ObjectId | null;
    notes?: string;
    visibility?: "global" | "private";
    status?: "active" | "pending";
    stockOnHand?: number | null;
    reorderThreshold?: number | null;
  },
  createdByAdminId?: ObjectId
) {
  const ingredients = await getIngredientsCollection();
  const doc: IngredientRecord = {
    name: data.name.trim(),
    category: data.category.trim(),
    defaultUnit: data.defaultUnit.trim(),
    storeId: data.storeId ?? null,
    notes: data.notes?.trim() ?? "",
    visibility: data.visibility ?? "global",
    status: data.status ?? "active",
    ownerUserId: null,
    stockOnHand: data.stockOnHand ?? null,
    reorderThreshold: data.reorderThreshold ?? null,
    createdBy: createdByAdminId,
    createdAt: new Date(),
  };
  const result = await ingredients.insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

/**
 * Delete an ingredient by ID (admin only)
 */
export async function deleteIngredient(ingredientId: ObjectId | string) {
  const ingredients = await getIngredientsCollection();
  const id = typeof ingredientId === "string" ? new ObjectId(ingredientId) : ingredientId;
  const result = await ingredients.deleteOne({ _id: id });
  return result.deletedCount === 1;
}
