import { MongoClient, ServerApiVersion, Db } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("Please add your MongoDB URI to .env.local");
}

const uri = process.env.MONGODB_URI;
const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so the connection
  // is not recreated on every hot reload
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production mode, create a new client
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export the promise to get the connected client
export default clientPromise;

// Helper function to get database
export async function getDatabase(dbName: string = "fmb"): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

// Synchronous helper to get database (assumes connection is ready)
export function getDb(dbName: string = "fmb"): Db {
  if (!client) {
    throw new Error("MongoDB client not initialized. Call initMongoDB() first.");
  }
  return client.db(dbName);
}

// Initialize connection and verify it works
export async function initMongoDB() {
  try {
    const client = await clientPromise;
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Successfully connected to MongoDB!");
    return client;
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error);
    throw error;
  }
}
