import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { addItemToCart, getCartById } from "@/lib/carts";
import { getIngredientById } from "@/lib/ingredients";

const addItemSchema = z.object({
  ingredientId: z.string().refine((id) => ObjectId.isValid(id), {
    message: "Invalid ingredientId",
  }),
  quantity: z.number().positive(),
  unit: z.string().min(1),
});

export async function POST(
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

    // Parse request body
    const body = await request.json().catch(() => null);
    const parsed = addItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const cartObjectId = new ObjectId(cartId);
    const ingredientId = new ObjectId(parsed.data.ingredientId);

    // Verify cart exists and user has access
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

    // Finalized carts are locked for edits
    if (cart.status === "finalized") {
      return NextResponse.json(
        { error: "Cannot modify finalized cart" },
        { status: 400 }
      );
    }

    // Get ingredient details for snapshot
    const ingredient = await getIngredientById(ingredientId);
    if (!ingredient) {
      return NextResponse.json(
        { error: "Ingredient not found" },
        { status: 404 }
      );
    }

    // Add item to cart
    const itemId = await addItemToCart(
      cartObjectId,
      ingredient,
      parsed.data.quantity,
      parsed.data.unit,
      new ObjectId(user.id)
    );

    return NextResponse.json(
      {
        itemId: itemId.toString(),
        message: "Item added to cart",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding item to cart:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
