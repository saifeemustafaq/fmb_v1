import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { getCartById } from "@/lib/carts";
import { getWeekPlanById } from "@/lib/week-plans";
import { getUsersCollection } from "@/lib/users";
import type { CartItemRecord } from "@/lib/interfaces/cart";

function weekLabelFromPlan(
  weekStartDate: Date,
  days: Array<{ date: Date }>
): string {
  const start =
    weekStartDate instanceof Date
      ? weekStartDate
      : new Date(weekStartDate as unknown as string);
  if (days.length === 1) {
    const d = days[0]?.date;
    const date = d instanceof Date ? d : new Date(d as unknown as string);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  return `Week of ${start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cartId: string }> }
) {
  try {
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

    if (
      user.role !== "admin" &&
      cart.cookId.toString() !== user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const cartPayload = {
      ...cart,
      _id: cart._id!.toString(),
      weekPlanId: cart.weekPlanId.toString(),
      cookId: cart.cookId.toString(),
    };

    if (user.role === "admin") {
      const [cookUser, plan] = await Promise.all([
        getUsersCollection().then((u) => u.findOne({ _id: cart.cookId })),
        getWeekPlanById(cart.weekPlanId),
      ]);
      (cartPayload as Record<string, unknown>).cookName = cookUser?.name ?? "Unknown";
      (cartPayload as Record<string, unknown>).weekLabel = plan
        ? weekLabelFromPlan(plan.weekStartDate, plan.days ?? [])
        : null;
    }

    return NextResponse.json({
      cart: cartPayload,
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
