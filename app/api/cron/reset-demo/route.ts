import { NextResponse } from "next/server";
import { resetDemoSandbox } from "@/lib/reset-demo-sandbox";

/**
 * POST with header Authorization: Bearer <RESET_DEMO_SECRET>
 * Drops MONGODB_DEMO_DB and re-seeds demo user, stores, ingredients.
 */
export async function POST(request: Request) {
  const secret = process.env.RESET_DEMO_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "RESET_DEMO_SECRET is not configured" },
      { status: 503 }
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await resetDemoSandbox();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("reset-demo:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Reset failed" },
      { status: 500 }
    );
  }
}
