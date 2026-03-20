import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { getAllCartsForAdmin, getCartItemCount } from "@/lib/carts";
import { getWeekPlanById } from "@/lib/week-plans";
import { getUsersCollection } from "@/lib/users";
import { dbNameForSession, runWithAppDb } from "@/lib/session-db";

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

export async function GET() {
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

    return runWithAppDb(dbNameForSession(user), async () => {
      const carts = await getAllCartsForAdmin();
      const users = await getUsersCollection();
      const cookIds = [...new Set(carts.map((c) => c.cookId.toString()))];
      const weekPlanIds = [...new Set(carts.map((c) => c.weekPlanId.toString()))];

      const cookMap = new Map<string, string>();
      for (const id of cookIds) {
        const u = await users.findOne({ _id: new ObjectId(id) });
        if (u) cookMap.set(id, u.name);
      }

      const planMap = new Map<
        string,
        { weekStartDate: Date; days: Array<{ date: Date }> }
      >();
      for (const id of weekPlanIds) {
        const plan = await getWeekPlanById(new ObjectId(id));
        if (plan)
          planMap.set(id, {
            weekStartDate: plan.weekStartDate,
            days: plan.days ?? [],
          });
      }

      const cartsWithMeta = await Promise.all(
        carts.map(async (cart) => {
          const plan = planMap.get(cart.weekPlanId.toString());
          const weekLabel = plan
            ? weekLabelFromPlan(plan.weekStartDate, plan.days)
            : null;
          const itemCount = await getCartItemCount(cart._id!);
          return {
            _id: cart._id!.toString(),
            weekPlanId: cart.weekPlanId.toString(),
            cookId: cart.cookId.toString(),
            cookName: cookMap.get(cart.cookId.toString()) ?? "Unknown",
            status: cart.status,
            weekStartDate: plan?.weekStartDate
              ? (plan.weekStartDate instanceof Date
                  ? plan.weekStartDate.toISOString().slice(0, 10)
                  : String(plan.weekStartDate))
              : null,
            weekLabel: weekLabel ?? null,
            itemCount,
            createdAt: cart.createdAt.toISOString(),
            updatedAt: cart.updatedAt.toISOString(),
          };
        })
      );

      return NextResponse.json({ carts: cartsWithMeta });
    });
  } catch (error) {
    console.error("Error fetching admin carts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
