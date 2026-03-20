import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { getWeekPlanById } from "@/lib/week-plans";
import { getCombinedCartForWeekPlan } from "@/lib/carts";
import { dbNameForSession, runWithAppDb } from "@/lib/session-db";

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
    const { searchParams } = new URL(request.url);
    const includeSources = searchParams.get("includeSources") === "true";

    if (!ObjectId.isValid(weekPlanId)) {
      return NextResponse.json({ error: "Invalid week plan ID" }, { status: 400 });
    }

    const weekPlanObjectId = new ObjectId(weekPlanId);
    return runWithAppDb(dbNameForSession(user), async () => {
      const plan = await getWeekPlanById(weekPlanObjectId);
      if (!plan) {
        return NextResponse.json({ error: "Week plan not found" }, { status: 404 });
      }

      const items = await getCombinedCartForWeekPlan(weekPlanObjectId, {
        includeSources,
      });

      const serialized = items.map((item) => {
        const out: Record<string, unknown> = {
          ingredientId: item.ingredientId.toString(),
          nameSnapshot: item.nameSnapshot,
          categorySnapshot: item.categorySnapshot,
          storeIdSnapshot: item.storeIdSnapshot?.toString() ?? null,
          quantityRequested: item.quantityRequested,
          unit: item.unit,
          quantityToBuy: item.quantityToBuy,
        };
        if (item.sourceCartIds?.length) {
          out.sourceCartIds = item.sourceCartIds.map((id) => id.toString());
        }
        if (item.sourceCookIds?.length) {
          out.sourceCookIds = item.sourceCookIds.map((id) => id.toString());
        }
        return out;
      });

      return NextResponse.json({
        weekPlanId: weekPlanId,
        items: serialized,
      });
    });
  } catch (error) {
    console.error("Error fetching combined cart:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
