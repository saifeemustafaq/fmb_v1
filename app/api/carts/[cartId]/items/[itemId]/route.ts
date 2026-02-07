import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { updateCartItemQuantity, removeItemFromCart } from "@/lib/carts";
import { getCartItemsCollection } from "@/lib/carts";

const updateItemSchema = z.object({
  quantity: z.number().positive(),
});

export async function PATCH(
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

    await verifySessionToken(token.value);
    const { itemId } = await params;

    if (!ObjectId.isValid(itemId)) {
      return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
    }

    // Parse request body
    const body = await request.json().catch(() => null);
    const parsed = updateItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const itemObjectId = new ObjectId(itemId);
    const success = await updateCartItemQuantity(
      itemObjectId,
      parsed.data.quantity
    );

    if (!success) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Item quantity updated",
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

    await verifySessionToken(token.value);
    const { itemId } = await params;

    if (!ObjectId.isValid(itemId)) {
      return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
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
