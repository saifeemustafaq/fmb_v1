import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { getCartById } from "@/lib/carts";
import type { CartItemRecord } from "@/lib/interfaces/cart";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cartId: string }> }
) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifySessionToken(token.value);
    const { cartId } = await params;

    if (!ObjectId.isValid(cartId)) {
      return NextResponse.json({ error: "Invalid cart ID" }, { status: 400 });
    }

    const cartObjectId = new ObjectId(cartId);
    const result = await getCartById(cartObjectId);

    if (!result) {
      return NextResponse.json({ error: "Cart not found" }, { status: 404 });
    }

    const { cart, items } = result;

    // Verify user has access to this cart
    if (
      user.role !== "admin" &&
      cart.cookId.toString() !== user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      cart: {
        ...cart,
        _id: cart._id!.toString(),
        weekPlanId: cart.weekPlanId.toString(),
        cookId: cart.cookId.toString(),
      },
      items: items.map((item: CartItemRecord) => ({
        ...item,
        _id: item._id!.toString(),
        cartId: item.cartId.toString(),
        ingredientId: item.ingredientId.toString(),
        storeIdSnapshot: item.storeIdSnapshot?.toString() || null,
        addedByUserId: item.addedByUserId.toString(),
      })),
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
