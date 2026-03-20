import { AsyncLocalStorage } from "node:async_hooks";

const dbNameStorage = new AsyncLocalStorage<string>();

export const DEFAULT_APP_DB = process.env.MONGODB_DB ?? "fmb";
export const DEMO_APP_DB = process.env.MONGODB_DEMO_DB ?? "fmb_demo";

export function getAppDbName(): string {
  return dbNameStorage.getStore() ?? DEFAULT_APP_DB;
}

export async function runWithAppDb<T>(
  dbName: string,
  fn: () => Promise<T>
): Promise<T> {
  return dbNameStorage.run(dbName, fn);
}
