import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  type Role,
} from "@/lib/auth/constants";

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("Missing JWT_SECRET in .env.local");
}

const secretKey = new TextEncoder().encode(jwtSecret);

export type SessionUser = {
  id: string;
  its: number;
  role: Role;
  name?: string | null;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    its: user.its,
    role: user.role,
    name: user.name ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<SessionUser> {
  const { payload } = await jwtVerify(token, secretKey);

  if (!payload.sub || typeof payload.role !== "string") {
    throw new Error("Invalid session token");
  }

  const itsValue =
    typeof payload.its === "number"
      ? payload.its
      : typeof payload.its === "string"
      ? Number.parseInt(payload.its, 10)
      : NaN;

  if (!Number.isFinite(itsValue)) {
    throw new Error("Invalid session token");
  }

  return {
    id: payload.sub,
    its: itsValue,
    role: payload.role as Role,
    name: typeof payload.name === "string" ? payload.name : null,
  };
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export { SESSION_COOKIE_NAME };
