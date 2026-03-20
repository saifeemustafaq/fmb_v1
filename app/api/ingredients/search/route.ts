import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { searchIngredients } from "@/lib/ingredients";
import { ObjectId } from "mongodb";
import { dbNameForSession, runWithAppDb } from "@/lib/session-db";

export async function GET(request: Request) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifySessionToken(token.value);
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    return runWithAppDb(dbNameForSession(user), async () => {
      const ingredients = await searchIngredients(query, new ObjectId(user.id));

      return NextResponse.json({
        ingredients: ingredients.map((ing) => ({
          ...ing,
          _id: ing._id!.toString(),
          storeId: ing.storeId?.toString() || null,
          ownerUserId: ing.ownerUserId?.toString() || null,
          createdBy: ing.createdBy?.toString() || null,
        })),
      });
    });
  } catch (error) {
    console.error("Error searching ingredients:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
