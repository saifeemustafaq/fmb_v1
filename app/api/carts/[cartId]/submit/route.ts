import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { submitCart, getCartById } from "@/lib/carts";
import { dbNameForSession, runWithAppDb } from "@/lib/session-db";

export async function PATCH(
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

    return runWithAppDb(dbNameForSession(user), async () => {
      const cartResult = await getCartById(cartObjectId);
      if (!cartResult) {
        return NextResponse.json({ error: "Cart not found" }, { status: 404 });
      }

      const { cart } = cartResult;

      if (
        user.role !== "admin" &&
        cart.cookId.toString() !== user.id
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const success = await submitCart(cartObjectId);

      if (!success) {
        return NextResponse.json(
          { error: "Cart already submitted or not found" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        message: "Cart submitted successfully",
      });
    });
  } catch (error) {
    console.error("Error submitting cart:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
