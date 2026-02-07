import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { getCookAssignedWeekPlan } from "@/lib/week-plans";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ cookId: string }> }
) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifySessionToken(token.value);
    const { cookId } = await params;

    // Verify user has access (cook can only see their own, admin can see all)
    if (user.role !== "admin" && user.id !== cookId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!ObjectId.isValid(cookId)) {
      return NextResponse.json({ error: "Invalid cook ID" }, { status: 400 });
    }

    const cookObjectId = new ObjectId(cookId);
    const weekPlan = await getCookAssignedWeekPlan(cookObjectId);

    if (!weekPlan) {
      return NextResponse.json(
        { weekPlan: null, message: "No assigned week plan" },
        { status: 200 }
      );
    }

    return NextResponse.json({
      weekPlan: {
        ...weekPlan,
        _id: weekPlan._id!.toString(),
        createdByAdminId: weekPlan.createdByAdminId.toString(),
        assignedCookId: weekPlan.assignedCookId.toString(),
      },
    });
  } catch (error) {
    console.error("Error fetching week plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
