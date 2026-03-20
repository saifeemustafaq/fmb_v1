import { NextResponse } from "next/server";
import { z } from "zod";
import { findUserByITS } from "@/lib/users";
import {
  createSessionToken,
  getSessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";
import {
  DEMO_SESSION_MAX_AGE_SECONDS,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/constants";
import { DEMO_APP_DB, runWithAppDb } from "@/lib/app-db-context";

const loginSchema = z.object({
  its: z.coerce.number().int().positive(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { its, password } = parsed.data;

  const demoItsRaw = process.env.DEMO_ITS;
  const demoIts = demoItsRaw ? Number.parseInt(demoItsRaw, 10) : NaN;
  const isDemoLogin =
    Number.isFinite(demoIts) && its === demoIts && process.env.DEMO_PASSWORD;

  async function finishLogin() {
    const user = await findUserByITS(its);

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await createSessionToken({
      id: user._id.toString(),
      its: user.its,
      role: user.role,
      name: user.name,
      ...(isDemoLogin ? { demo: true } : {}),
    });

    const response = NextResponse.json({
      user: {
        id: user._id.toString(),
        its: user.its,
        role: user.role,
        name: user.name,
        ...(isDemoLogin ? { demo: true } : {}),
      },
    });

    response.cookies.set(
      SESSION_COOKIE_NAME,
      token,
      getSessionCookieOptions(
        isDemoLogin ? DEMO_SESSION_MAX_AGE_SECONDS : undefined
      )
    );
    return response;
  }

  if (isDemoLogin) {
    return runWithAppDb(DEMO_APP_DB, finishLogin);
  }

  return finishLogin();
}
