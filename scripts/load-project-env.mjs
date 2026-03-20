import { config } from "dotenv";

/**
 * Load `.env` then `.env.local` (local overrides). Same idea as Next.js.
 */
export function loadProjectEnv() {
  config({ path: ".env" });
  config({ path: ".env.local", override: true });
}
