/**
 * Next.js instrumentation – runs once when the Node server boots.
 * Used to initialize the MongoDB connection before any API route runs.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initMongoDB } = await import("./lib/mongodb");
    await initMongoDB();
  }
}
