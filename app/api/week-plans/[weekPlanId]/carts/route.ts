import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { getWeekPlanById } from "@/lib/week-plans";
import { getCartsByWeekPlan } from "@/lib/carts";
import { getUsersCollection } from "@/lib/users";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ weekPlanId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifySessionToken(token.value);
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { weekPlanId } = await params;
    if (!ObjectId.isValid(weekPlanId)) {
      return NextResponse.json({ error: "Invalid week plan ID" }, { status: 400 });
    }

    const weekPlanObjectId = new ObjectId(weekPlanId);
    const plan = await getWeekPlanById(weekPlanObjectId);
    if (!plan) {
      return NextResponse.json({ error: "Week plan not found" }, { status: 404 });
    }

    const carts = await getCartsByWeekPlan(weekPlanObjectId);
    const users = await getUsersCollection();
    const cookIds = [...new Set(carts.map((c) => c.cookId.toString()))];
    const cookMap = new Map<string, { name: string }>();
    for (const id of cookIds) {
      const u = await users.findOne({ _id: new ObjectId(id) });
      if (u) cookMap.set(id, { name: u.name });
    }

    const cartsWithCook = carts.map((cart) => ({
      _id: cart._id!.toString(),
      weekPlanId: cart.weekPlanId.toString(),
      cookId: cart.cookId.toString(),
      cookName: cookMap.get(cart.cookId.toString())?.name ?? "Unknown",
      status: cart.status,
      createdAt: cart.createdAt.toISOString(),
      updatedAt: cart.updatedAt.toISOString(),
    }));

    return NextResponse.json({ carts: cartsWithCook });
  } catch (error) {
    console.error("Error fetching carts for week plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
