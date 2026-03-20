import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { getIngredientById, updateIngredient, deleteIngredient } from "@/lib/ingredients";
import { dbNameForSession, runWithAppDb } from "@/lib/session-db";

const updateIngredientSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  defaultUnit: z.string().min(1).optional(),
  storeId: z.string().nullable().optional(),
  notes: z.string().optional(),
  visibility: z.enum(["global", "private"]).optional(),
  status: z.enum(["active", "pending"]).optional(),
  stockOnHand: z.number().nullable().optional(),
  reorderThreshold: z.number().nullable().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ingredient ID" }, { status: 400 });
    }

    return runWithAppDb(dbNameForSession(user), async () => {
      const ingredient = await getIngredientById(id);
      if (!ingredient) {
        return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
      }

      return NextResponse.json({
        ingredient: {
          _id: ingredient._id!.toString(),
          name: ingredient.name,
          category: ingredient.category,
          defaultUnit: ingredient.defaultUnit,
          storeId: ingredient.storeId?.toString() ?? null,
          notes: ingredient.notes ?? "",
          visibility: ingredient.visibility,
          status: ingredient.status,
          ownerUserId: ingredient.ownerUserId?.toString() ?? null,
          stockOnHand: ingredient.stockOnHand ?? null,
          reorderThreshold: ingredient.reorderThreshold ?? null,
          createdBy: ingredient.createdBy?.toString() ?? null,
          createdAt: ingredient.createdAt.toISOString(),
        },
      });
    });
  } catch (error) {
    console.error("Error fetching ingredient:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ingredient ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateIngredientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updates = parsed.data;
    const updatePayload: Parameters<typeof updateIngredient>[1] = {};
    if (updates.name !== undefined) updatePayload.name = updates.name;
    if (updates.category !== undefined) updatePayload.category = updates.category;
    if (updates.defaultUnit !== undefined) updatePayload.defaultUnit = updates.defaultUnit;
    if (updates.storeId !== undefined) {
      updatePayload.storeId = updates.storeId ? new ObjectId(updates.storeId) : null;
    }
    if (updates.notes !== undefined) updatePayload.notes = updates.notes;
    if (updates.visibility !== undefined) updatePayload.visibility = updates.visibility;
    if (updates.status !== undefined) updatePayload.status = updates.status;
    if (updates.stockOnHand !== undefined) updatePayload.stockOnHand = updates.stockOnHand;
    if (updates.reorderThreshold !== undefined) updatePayload.reorderThreshold = updates.reorderThreshold;

    return runWithAppDb(dbNameForSession(user), async () => {
      const updated = await updateIngredient(id, updatePayload);
      if (!updated) {
        return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
      }

      return NextResponse.json({
        ingredient: {
          _id: updated._id!.toString(),
          name: updated.name,
          category: updated.category,
          defaultUnit: updated.defaultUnit,
          storeId: updated.storeId?.toString() ?? null,
          notes: updated.notes ?? "",
          visibility: updated.visibility,
          status: updated.status,
          ownerUserId: updated.ownerUserId?.toString() ?? null,
          stockOnHand: updated.stockOnHand ?? null,
          reorderThreshold: updated.reorderThreshold ?? null,
          createdBy: updated.createdBy?.toString() ?? null,
          createdAt: updated.createdAt.toISOString(),
        },
      });
    });
  } catch (error) {
    console.error("Error updating ingredient:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ingredient ID" }, { status: 400 });
    }

    return runWithAppDb(dbNameForSession(user), async () => {
      const deleted = await deleteIngredient(id);
      if (!deleted) {
        return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    });
  } catch (error) {
    console.error("Error deleting ingredient:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
