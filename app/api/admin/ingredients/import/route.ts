import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { createIngredient } from "@/lib/ingredients";
import { dbNameForSession, runWithAppDb } from "@/lib/session-db";

const importItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  defaultUnit: z.string().min(1, "Unit is required"),
  storeId: z.string().nullable().optional(),
  notes: z.string().optional(),
});

const importBodySchema = z.object({
  ingredients: z.array(importItemSchema),
});

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
    const parsed = importBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { ingredients: items } = parsed.data;
    const createdBy = user.id ? new ObjectId(user.id) : undefined;

    return runWithAppDb(dbNameForSession(user), async () => {
      const errors: { index: number; message: string }[] = [];
      let created = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
          await createIngredient(
            {
              name: item.name,
              category: item.category,
              defaultUnit: item.defaultUnit,
              storeId: item.storeId ? new ObjectId(item.storeId) : null,
              notes: item.notes ?? "",
            },
            createdBy
          );
          created++;
        } catch (err) {
          errors.push({
            index: i,
            message: err instanceof Error ? err.message : "Failed to create",
          });
        }
      }

      return NextResponse.json({ created, errors });
    });
  } catch (error) {
    console.error("Error importing ingredients:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
