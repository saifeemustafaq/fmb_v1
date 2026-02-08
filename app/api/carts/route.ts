import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { createCart, getCartByWeekAndCook } from "@/lib/carts";

const createCartSchema = z.object({
  weekPlanId: z.string().refine((id) => ObjectId.isValid(id), {
    message: "Invalid weekPlanId",
  }),
});

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifySessionToken(token.value);
    if (user.role !== "cook" && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const weekPlanIdParam = searchParams.get("weekPlanId");
    if (!weekPlanIdParam || !ObjectId.isValid(weekPlanIdParam)) {
      return NextResponse.json(
        { error: "weekPlanId query is required and must be valid" },
        { status: 400 }
      );
    }

    const weekPlanId = new ObjectId(weekPlanIdParam);
    const cookId = new ObjectId(user.id);
    const cart = await getCartByWeekAndCook(weekPlanId, cookId);

    if (!cart) {
      return NextResponse.json({ cart: null }, { status: 200 });
    }

    return NextResponse.json({
      cart: {
        _id: cart._id!.toString(),
        weekPlanId: cart.weekPlanId.toString(),
        cookId: cart.cookId.toString(),
        status: cart.status,
        createdAt: cart.createdAt.toISOString(),
        updatedAt: cart.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifySessionToken(token.value);
    if (user.role !== "cook" && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse request body
    const body = await request.json().catch(() => null);
    const parsed = createCartSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const weekPlanId = new ObjectId(parsed.data.weekPlanId);
    const cookId = new ObjectId(user.id);

    // Check if cart already exists for this week and cook
    const existing = await getCartByWeekAndCook(weekPlanId, cookId);
    if (existing) {
      return NextResponse.json({
        cartId: existing._id!.toString(),
        message: "Cart already exists",
        existing: true,
      });
    }

    // Create new cart
    const cartId = await createCart(weekPlanId, cookId);

    return NextResponse.json(
      {
        cartId: cartId.toString(),
        message: "Cart created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating cart:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
