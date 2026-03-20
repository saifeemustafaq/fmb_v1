import type { SessionUser } from "@/lib/auth";
import {
  DEFAULT_APP_DB,
  DEMO_APP_DB,
  runWithAppDb,
} from "@/lib/app-db-context";

export function dbNameForSession(session: SessionUser): string {
  return session.demo ? DEMO_APP_DB : DEFAULT_APP_DB;
}

export { runWithAppDb };
