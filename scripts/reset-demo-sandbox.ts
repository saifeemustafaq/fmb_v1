import { loadProjectEnv } from "./load-project-env.mjs";

loadProjectEnv();

async function main() {
  const { resetDemoSandbox } = await import("../lib/reset-demo-sandbox");
  await resetDemoSandbox();
  console.log("Demo sandbox reset complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
