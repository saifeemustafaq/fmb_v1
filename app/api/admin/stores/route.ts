import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { getStoresForAdmin, createStore } from "@/lib/ingredients";

const createStoreSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

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

    const stores = await getStoresForAdmin();
    const serialized = stores.map((s) => ({
      _id: s._id.toString(),
      name: s.name,
      address: s.address ?? "",
      notes: s.notes ?? "",
      isActive: s.isActive ?? true,
      createdAt: s.createdAt ? (s.createdAt as Date).toISOString() : null,
    }));

    return NextResponse.json({ stores: serialized });
  } catch (error) {
    console.error("Error listing admin stores:", error);
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
    const parsed = createStoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const created = await createStore(parsed.data);
    return NextResponse.json({
      store: {
        _id: created._id.toString(),
        name: created.name,
        address: created.address ?? "",
        notes: created.notes ?? "",
        isActive: created.isActive ?? true,
        createdAt: created.createdAt ? (created.createdAt as Date).toISOString() : null,
      },
    });
  } catch (error) {
    console.error("Error creating store:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
