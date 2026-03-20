import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import {
  getAllIngredientsForAdmin,
  getStoresList,
  createIngredient,
} from "@/lib/ingredients";

const createIngredientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  defaultUnit: z.string().min(1, "Unit is required"),
  storeId: z.string().nullable().optional(),
  notes: z.string().optional(),
  visibility: z.enum(["global", "private"]).optional(),
  status: z.enum(["active", "pending"]).optional(),
  stockOnHand: z.number().nullable().optional(),
  reorderThreshold: z.number().nullable().optional(),
});

function serializeIngredient(ing: Awaited<ReturnType<typeof createIngredient>>, storeById: Record<string, string>) {
  return {
    _id: ing._id!.toString(),
    name: ing.name,
    category: ing.category,
    defaultUnit: ing.defaultUnit,
    storeId: ing.storeId?.toString() ?? null,
    storeName: ing.storeId ? storeById[ing.storeId.toString()] ?? null : null,
    notes: ing.notes ?? "",
    visibility: ing.visibility,
    status: ing.status,
    ownerUserId: ing.ownerUserId?.toString() ?? null,
    stockOnHand: ing.stockOnHand ?? null,
    reorderThreshold: ing.reorderThreshold ?? null,
    createdBy: ing.createdBy?.toString() ?? null,
    createdAt: ing.createdAt.toISOString(),
  };
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

    const [ingredients, stores] = await Promise.all([
      getAllIngredientsForAdmin(),
      getStoresList(),
    ]);

    const storeById = Object.fromEntries(
      stores.map((s) => [s._id.toString(), s.name])
    );

    const serialized = ingredients.map((ing) => ({
      _id: ing._id!.toString(),
      name: ing.name,
      category: ing.category,
      defaultUnit: ing.defaultUnit,
      storeId: ing.storeId?.toString() ?? null,
      storeName: ing.storeId ? storeById[ing.storeId.toString()] ?? null : null,
      notes: ing.notes ?? "",
      visibility: ing.visibility,
      status: ing.status,
      ownerUserId: ing.ownerUserId?.toString() ?? null,
      stockOnHand: ing.stockOnHand ?? null,
      reorderThreshold: ing.reorderThreshold ?? null,
      createdBy: ing.createdBy?.toString() ?? null,
      createdAt: ing.createdAt.toISOString(),
    }));

    const storesSerialized = stores.map((s) => ({
      _id: s._id.toString(),
      name: s.name,
    }));
    return NextResponse.json({
      ingredients: serialized,
      stores: storesSerialized,
    });
  } catch (error) {
    console.error("Error listing admin ingredients:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const parsed = createIngredientSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const created = await createIngredient(
      {
        name: data.name,
        category: data.category,
        defaultUnit: data.defaultUnit,
        storeId: data.storeId ? new ObjectId(data.storeId) : null,
        notes: data.notes,
        visibility: data.visibility,
        status: data.status,
        stockOnHand: data.stockOnHand,
        reorderThreshold: data.reorderThreshold,
      },
      user.id ? new ObjectId(user.id) : undefined
    );

    const stores = await getStoresList();
    const storeById = Object.fromEntries(
      stores.map((s) => [s._id.toString(), s.name])
    );

    return NextResponse.json({
      ingredient: serializeIngredient(created, storeById),
    });
  } catch (error) {
    console.error("Error creating ingredient:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
