import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { getUsersCollection } from "@/lib/users";
import { dbNameForSession, runWithAppDb } from "@/lib/session-db";

export async function GET(request: Request) {
  try {
    // Verify authentication and admin role
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifySessionToken(token.value);
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const its = searchParams.get("its");
    const excludeUserId = searchParams.get("excludeUserId");

    if (!its) {
      return NextResponse.json(
        { error: "ITS number is required" },
        { status: 400 }
      );
    }

    const itsNumber = parseInt(its, 10);
    if (isNaN(itsNumber) || itsNumber <= 0) {
      return NextResponse.json(
        { error: "ITS must be a positive number" },
        { status: 400 }
      );
    }

    return runWithAppDb(dbNameForSession(user), async () => {
      const users = await getUsersCollection();
      const query: Record<string, unknown> = { its: itsNumber };

      if (excludeUserId && ObjectId.isValid(excludeUserId)) {
        query._id = { $ne: new ObjectId(excludeUserId) };
      }

      const exists = await users.countDocuments(query);

      return NextResponse.json({ available: exists === 0 });
    });
  } catch (error) {
    console.error("Error checking ITS:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
