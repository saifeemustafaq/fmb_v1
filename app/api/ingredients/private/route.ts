import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { addPrivateIngredient } from "@/lib/ingredients";
import { dbNameForSession, runWithAppDb } from "@/lib/session-db";

const privateIngredientSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  defaultUnit: z.string().min(1),
  notes: z.string().optional(),
});

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
    const parsed = privateIngredientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    return runWithAppDb(dbNameForSession(user), async () => {
      const ingredient = await addPrivateIngredient(
        {
          name: parsed.data.name,
          category: parsed.data.category,
          defaultUnit: parsed.data.defaultUnit,
          notes: parsed.data.notes || "",
          storeId: null,
          status: "pending",
          visibility: "private",
          ownerUserId: null,
        },
        new ObjectId(user.id)
      );

      return NextResponse.json(
        {
          ingredient: {
            ...ingredient,
            _id: ingredient._id!.toString(),
            storeId: ingredient.storeId?.toString() || null,
            ownerUserId: ingredient.ownerUserId?.toString() || null,
            createdBy: ingredient.createdBy?.toString() || null,
          },
          message: "Private ingredient created (pending approval)",
        },
        { status: 201 }
      );
    });
  } catch (error) {
    console.error("Error creating private ingredient:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
