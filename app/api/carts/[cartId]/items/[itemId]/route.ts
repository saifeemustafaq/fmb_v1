import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
  updateCartItemQuantity,
  updateCartItemUnit,
  updateCartItemStoreAndCategory,
  removeItemFromCart,
  getCartById,
} from "@/lib/carts";

const updateItemSchema = z.object({
  quantity: z.number().min(0).optional(),
  unit: z.string().min(1).optional(),
  categorySnapshot: z.string().optional(),
  storeIdSnapshot: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ cartId: string; itemId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifySessionToken(token.value);
    const { cartId, itemId } = await params;

    if (!ObjectId.isValid(cartId)) {
      return NextResponse.json({ error: "Invalid cart ID" }, { status: 400 });
    }
    if (!ObjectId.isValid(itemId)) {
      return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = updateItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const hasStoreOrCategory =
      parsed.data.categorySnapshot !== undefined ||
      parsed.data.storeIdSnapshot !== undefined;
    const hasUnit = parsed.data.unit !== undefined;

    if ((hasStoreOrCategory || hasUnit) && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const cartResult = await getCartById(new ObjectId(cartId));
    if (!cartResult) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }
    const { cart, items } = cartResult;
    if (user.role !== "admin" && cart.cookId.toString() !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (cart.status === "finalized") {
      return NextResponse.json(
        { error: "Cannot modify finalized cart" },
        { status: 400 }
      );
    }
    const belongsToCart = items.some((item) => item._id?.toString() === itemId);
    if (!belongsToCart) {
      return NextResponse.json({ error: "Item not found in cart" }, { status: 404 });
    }

    const itemObjectId = new ObjectId(itemId);

    if (parsed.data.quantity !== undefined) {
      const success = await updateCartItemQuantity(
        itemObjectId,
        parsed.data.quantity
      );
      if (!success) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }
    }

    if (hasUnit) {
      const success = await updateCartItemUnit(
        itemObjectId,
        parsed.data.unit!
      );
      if (!success) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }
    }

    if (hasStoreOrCategory) {
      const updates: { categorySnapshot?: string; storeIdSnapshot?: ObjectId | null } = {};
      if (parsed.data.categorySnapshot !== undefined) {
        updates.categorySnapshot = parsed.data.categorySnapshot;
      }
      if (parsed.data.storeIdSnapshot !== undefined) {
        updates.storeIdSnapshot = parsed.data.storeIdSnapshot
          ? new ObjectId(parsed.data.storeIdSnapshot)
          : null;
      }
      const success = await updateCartItemStoreAndCategory(itemObjectId, updates);
      if (!success) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }
    }

    return NextResponse.json({
      message: "Item updated",
    });
  } catch (error) {
    console.error("Error updating cart item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ cartId: string; itemId: string }> }
) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifySessionToken(token.value);
    const { cartId, itemId } = await params;

    if (!ObjectId.isValid(cartId)) {
      return NextResponse.json({ error: "Invalid cart ID" }, { status: 400 });
    }
    if (!ObjectId.isValid(itemId)) {
      return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
    }

    const cartResult = await getCartById(new ObjectId(cartId));
    if (!cartResult) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }
    const { cart, items } = cartResult;
    if (user.role !== "admin" && cart.cookId.toString() !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (cart.status === "finalized") {
      return NextResponse.json(
        { error: "Cannot modify finalized cart" },
        { status: 400 }
      );
    }
    const belongsToCart = items.some((item) => item._id?.toString() === itemId);
    if (!belongsToCart) {
      return NextResponse.json({ error: "Item not found in cart" }, { status: 404 });
    }

    const itemObjectId = new ObjectId(itemId);
    const success = await removeItemFromCart(itemObjectId);

    if (!success) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Item removed from cart",
    });
  } catch (error) {
    console.error("Error deleting cart item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
