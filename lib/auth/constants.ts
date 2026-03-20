export const SESSION_COOKIE_NAME = "session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
/** Shorter session for public demo sandbox JWT + cookie */
export const DEMO_SESSION_MAX_AGE_SECONDS = 60 * 60;

export type Role = "admin" | "cook" | "volunteer";
