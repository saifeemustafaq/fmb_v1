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
