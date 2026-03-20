import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import type { CartRecord, CartItemRecord } from "./interfaces/cart";
import type { IngredientRecord } from "./interfaces/ingredient";

/**
 * Get carts collection
 */
export function getCartsCollection() {
  const db = getDb();
  return db.collection<CartRecord>("carts");
}

/**
 * Get cart_items collection
 */
export function getCartItemsCollection() {
  const db = getDb();
  return db.collection<CartItemRecord>("cart_items");
}

/**
 * Create a new cart for a cook's week plan
 */
export async function createCart(
  weekPlanId: ObjectId,
  cookId: ObjectId
): Promise<ObjectId> {
  const carts = getCartsCollection();

  const cart: CartRecord = {
    weekPlanId,
    cookId,
    status: "draft",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await carts.insertOne(cart);
  return result.insertedId;
}

/**
 * Get cart by ID with all items populated
 */
export async function getCartById(cartId: ObjectId) {
  const carts = getCartsCollection();
  const cartItems = getCartItemsCollection();

  const cart = await carts.findOne({ _id: cartId });
  if (!cart) return null;

  const items = await cartItems
    .find({ cartId })
    .sort({ categorySnapshot: 1, nameSnapshot: 1 })
    .toArray();

  return { cart, items };
}

/**
 * Get all carts for a cook
 */
export async function getCookCarts(cookId: ObjectId) {
  const carts = getCartsCollection();
  return carts
    .find({ cookId })
    .sort({ createdAt: -1 })
    .toArray();
}

/**
 * Get cart by week plan ID and cook ID (finds existing or returns null)
 */
export async function getCartByWeekAndCook(
  weekPlanId: ObjectId,
  cookId: ObjectId
) {
  const carts = getCartsCollection();
  return carts.findOne({ weekPlanId, cookId });
}

/**
 * Get all carts for a week plan (one per cook who has days in that plan)
 */
export async function getCartsByWeekPlan(weekPlanId: ObjectId) {
  const carts = getCartsCollection();
  return carts
    .find({ weekPlanId })
    .sort({ createdAt: 1 })
    .toArray();
}

/**
 * Get all carts for admin list (current and historical), sorted by updatedAt desc.
 */
export async function getAllCartsForAdmin() {
  const carts = getCartsCollection();
  return carts
    .find({})
    .sort({ updatedAt: -1 })
    .toArray();
}

/** Aggregated line for combined cart (merged by ingredientId + unit) */
export type CombinedCartItem = {
  ingredientId: ObjectId;
  nameSnapshot: string;
  categorySnapshot: string;
  storeIdSnapshot: ObjectId | null;
  quantityRequested: number;
  unit: string;
  quantityToBuy: number | null;
  /** Optional: which carts contributed (for admin transparency) */
  sourceCartIds?: ObjectId[];
  sourceCookIds?: ObjectId[];
};

/**
 * Get combined cart for a week plan: merge all cart items by ingredient
 * (same ingredientId + unit → sum quantities). Used for final shopping list / PDF.
 */
export async function getCombinedCartForWeekPlan(
  weekPlanId: ObjectId,
  options?: { includeSources?: boolean }
): Promise<CombinedCartItem[]> {
  const carts = getCartsCollection();
  const cartItems = getCartItemsCollection();

  const cartsForWeek = await carts.find({ weekPlanId }).toArray();
  if (cartsForWeek.length === 0) return [];

  const cartIds = cartsForWeek.map((c) => c._id!);
  const items = await cartItems
    .find({ cartId: { $in: cartIds } })
    .toArray();

  const includeSources = options?.includeSources ?? false;
  const byKey = new Map<
    string,
    {
      item: Omit<CombinedCartItem, "sourceCartIds" | "sourceCookIds">;
      sourceCartIds: ObjectId[];
      sourceCookIds: ObjectId[];
    }
  >();

  for (const it of items) {
    const cart = cartsForWeek.find((c) => c._id!.equals(it.cartId));
    const key = `${it.ingredientId.toString()}|${it.unit}`;
    const existing = byKey.get(key);
    const qtyToBuy = it.quantityToBuy ?? null;
    if (existing) {
      existing.item.quantityRequested += it.quantityRequested;
      const sumQtyToBuy =
        (existing.item.quantityToBuy ?? 0) + (qtyToBuy ?? 0);
      existing.item.quantityToBuy =
        sumQtyToBuy === 0 ? null : sumQtyToBuy;
      if (includeSources) {
        if (!existing.sourceCartIds.some((id) => id.equals(it.cartId))) {
          existing.sourceCartIds.push(it.cartId);
          if (cart && !existing.sourceCookIds.some((id) => id.equals(cart.cookId))) {
            existing.sourceCookIds.push(cart.cookId);
          }
        }
      }
    } else {
      byKey.set(key, {
        item: {
          ingredientId: it.ingredientId,
          nameSnapshot: it.nameSnapshot,
          categorySnapshot: it.categorySnapshot,
          storeIdSnapshot: it.storeIdSnapshot,
          quantityRequested: it.quantityRequested,
          unit: it.unit,
          quantityToBuy: qtyToBuy,
        },
        sourceCartIds: includeSources ? [it.cartId] : [],
        sourceCookIds: includeSources && cart ? [cart.cookId] : [],
      });
    }
  }

  const result: CombinedCartItem[] = [];
  for (const { item, sourceCartIds, sourceCookIds } of byKey.values()) {
    result.push({
      ...item,
      ...(includeSources && { sourceCartIds, sourceCookIds }),
    });
  }

  result.sort(
    (a, b) =>
      a.categorySnapshot.localeCompare(b.categorySnapshot) ||
      a.nameSnapshot.localeCompare(b.nameSnapshot)
  );
  return result;
}

/**
 * Add item to cart with ingredient snapshots
 */
export async function addItemToCart(
  cartId: ObjectId,
  ingredient: IngredientRecord,
  quantity: number,
  unit: string,
  addedByUserId: ObjectId
): Promise<ObjectId> {
  const cartItems = getCartItemsCollection();

  const item: CartItemRecord = {
    cartId,
    ingredientId: ingredient._id!,
    nameSnapshot: ingredient.name,
    categorySnapshot: ingredient.category,
    storeIdSnapshot: ingredient.storeId || null,
    quantityRequested: quantity,
    unit,
    stockOnHandSnapshot: null,
    quantityToBuy: null,
    addedByUserId,
    createdAt: new Date(),
  };

  const result = await cartItems.insertOne(item);
  
  // Update cart's updatedAt timestamp
  await getCartsCollection().updateOne(
    { _id: cartId },
    { $set: { updatedAt: new Date() } }
  );

  return result.insertedId;
}

/**
 * Update cart item quantity
 */
export async function updateCartItemQuantity(
  cartItemId: ObjectId,
  newQuantity: number
): Promise<boolean> {
  const cartItems = getCartItemsCollection();

  const result = await cartItems.updateOne(
    { _id: cartItemId },
    { $set: { quantityRequested: newQuantity } }
  );

  if (result.modifiedCount > 0) {
    // Update parent cart's updatedAt
    const item = await cartItems.findOne({ _id: cartItemId });
    if (item) {
      await getCartsCollection().updateOne(
        { _id: item.cartId },
        { $set: { updatedAt: new Date() } }
      );
    }
  }

  return result.modifiedCount > 0;
}

/**
 * Update cart item unit (e.g. kg, pcs). Admin use.
 */
export async function updateCartItemUnit(
  cartItemId: ObjectId,
  unit: string
): Promise<boolean> {
  const cartItems = getCartItemsCollection();

  const result = await cartItems.updateOne(
    { _id: cartItemId },
    { $set: { unit } }
  );

  if (result.modifiedCount > 0) {
    const item = await cartItems.findOne({ _id: cartItemId });
    if (item) {
      await getCartsCollection().updateOne(
        { _id: item.cartId },
        { $set: { updatedAt: new Date() } }
      );
    }
  }

  return result.modifiedCount > 0;
}

/**
 * Remove item from cart
 */
export async function removeItemFromCart(
  cartItemId: ObjectId
): Promise<boolean> {
  const cartItems = getCartItemsCollection();

  // Get item to find parent cart
  const item = await cartItems.findOne({ _id: cartItemId });
  
  const result = await cartItems.deleteOne({ _id: cartItemId });

  if (result.deletedCount > 0 && item) {
    // Update parent cart's updatedAt
    await getCartsCollection().updateOne(
      { _id: item.cartId },
      { $set: { updatedAt: new Date() } }
    );
  }

  return result.deletedCount > 0;
}

/**
 * Submit cart for admin review (changes status to "submitted")
 */
export async function submitCart(cartId: ObjectId): Promise<boolean> {
  const carts = getCartsCollection();

  const result = await carts.updateOne(
    { _id: cartId, status: "draft" },
    {
      $set: {
        status: "submitted",
        updatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount > 0;
}

/**
 * Update cart status (admin). Allowed: draft→submitted, submitted→finalized.
 */
export async function updateCartStatus(
  cartId: ObjectId,
  status: "submitted" | "finalized"
): Promise<boolean> {
  const carts = getCartsCollection();
  const fromStatus = status === "finalized" ? "submitted" : "draft";
  const result = await carts.updateOne(
    { _id: cartId, status: fromStatus },
    { $set: { status, updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

/**
 * Update cart notes (admin). Persists note on the cart for review and print.
 */
export async function updateCartNotes(
  cartId: ObjectId,
  notes: string | null
): Promise<boolean> {
  const carts = getCartsCollection();
  const result = await carts.updateOne(
    { _id: cartId },
    { $set: { notes: notes ?? null, updatedAt: new Date() } }
  );
  return result.modifiedCount > 0;
}

/**
 * Update cart item store and/or category (cart_items only; does not change ingredients).
 */
export async function updateCartItemStoreAndCategory(
  cartItemId: ObjectId,
  updates: { categorySnapshot?: string; storeIdSnapshot?: ObjectId | null }
): Promise<boolean> {
  const cartItems = getCartItemsCollection();
  const set: Record<string, unknown> = {};
  if (updates.categorySnapshot !== undefined) set.categorySnapshot = updates.categorySnapshot;
  if (updates.storeIdSnapshot !== undefined) set.storeIdSnapshot = updates.storeIdSnapshot;
  if (Object.keys(set).length === 0) return true;
  const result = await cartItems.updateOne(
    { _id: cartItemId },
    { $set: set }
  );
  if (result.modifiedCount > 0) {
    const item = await cartItems.findOne({ _id: cartItemId });
    if (item) {
      await getCartsCollection().updateOne(
        { _id: item.cartId },
        { $set: { updatedAt: new Date() } }
      );
    }
  }
  return result.modifiedCount > 0;
}

/**
 * Get all items in a cart grouped by category
 */
export async function getCartItemsGroupedByCategory(cartId: ObjectId) {
  const cartItems = getCartItemsCollection();

  const items = await cartItems
    .find({ cartId })
    .sort({ categorySnapshot: 1, nameSnapshot: 1 })
    .toArray();

  // Group by category
  const grouped = new Map<string, CartItemRecord[]>();
  for (const item of items) {
    const category = item.categorySnapshot;
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(item);
  }

  return grouped;
}

/**
 * Get cart item count
 */
export async function getCartItemCount(cartId: ObjectId): Promise<number> {
  const cartItems = getCartItemsCollection();
  return cartItems.countDocuments({ cartId });
}
