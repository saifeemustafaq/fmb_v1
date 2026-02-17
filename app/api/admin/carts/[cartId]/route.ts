import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { verifySessionToken } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { updateCartStatus, updateCartNotes } from "@/lib/carts";

const patchSchema = z.object({
  status: z.enum(["submitted", "finalized"]).optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ cartId: string }> }
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

    const { cartId } = await params;
    if (!ObjectId.isValid(cartId)) {
      return NextResponse.json({ error: "Invalid cart ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const cartObjectId = new ObjectId(cartId);

    if (parsed.data.status !== undefined) {
      const success = await updateCartStatus(cartObjectId, parsed.data.status);
      if (!success) {
        return NextResponse.json(
          { error: "Cart not found or status transition not allowed" },
          { status: 404 }
        );
      }
    }

    if (parsed.data.notes !== undefined) {
      const success = await updateCartNotes(
        cartObjectId,
        parsed.data.notes
      );
      if (!success) {
        return NextResponse.json(
          { error: "Cart not found" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({ message: "Cart updated" });
  } catch (error) {
    console.error("Error updating cart:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
