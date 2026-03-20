import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { getStoreById, updateStore, deleteStore } from "@/lib/ingredients";
import { dbNameForSession, runWithAppDb } from "@/lib/session-db";

const updateStoreSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

function serializeStore(s: {
  _id: ObjectId;
  name: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
  createdAt?: Date;
}) {
  return {
    _id: s._id.toString(),
    name: s.name,
    address: s.address ?? "",
    notes: s.notes ?? "",
    isActive: s.isActive ?? true,
    createdAt: s.createdAt ? (s.createdAt as Date).toISOString() : null,
  };
}

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
      return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });
    }

    return runWithAppDb(dbNameForSession(user), async () => {
      const store = await getStoreById(id);
      if (!store) {
        return NextResponse.json({ error: "Store not found" }, { status: 404 });
      }

      return NextResponse.json({ store: serializeStore(store) });
    });
  } catch (error) {
    console.error("Error fetching store:", error);
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
      return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateStoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    return runWithAppDb(dbNameForSession(user), async () => {
      const updated = await updateStore(id, parsed.data);
      if (!updated) {
        return NextResponse.json({ error: "Store not found" }, { status: 404 });
      }

      return NextResponse.json({ store: serializeStore(updated) });
    });
  } catch (error) {
    console.error("Error updating store:", error);
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
      return NextResponse.json({ error: "Invalid store ID" }, { status: 400 });
    }

    return runWithAppDb(dbNameForSession(user), async () => {
      const deleted = await deleteStore(id);
      if (!deleted) {
        return NextResponse.json({ error: "Store not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    });
  } catch (error) {
    console.error("Error deleting store:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
