import { MongoClient } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI || ""; // Fallback to an empty string if undefined.

const options = {};

// Define variables for the MongoDB client and the connection promise.
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!global._mongoClientPromise) {
  // If no promise exists, create a new MongoClient instance and connect to MongoDB.
  client = new MongoClient(uri, options);
  global._mongoClientPromise = client.connect();
}

// Use the cached promise from the global object.
clientPromise = global._mongoClientPromise;

export default clientPromise;
