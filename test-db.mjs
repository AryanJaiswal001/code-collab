import { MongoClient } from "mongodb";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const uri = process.env.MONGO_URI;

if (!uri) {
  console.error("❌ MONGO_URI is missing in the .env file.");
  process.exit(1);
}

async function testConnection() {
  const client = new MongoClient(uri);

  try {
    console.log("⏳ Connecting to MongoDB...");
    await client.connect();
    console.log("✅ Successfully connected to MongoDB Atlas!");

    // Optional: List databases to verify read access
    const dbs = await client.db().admin().listDatabases();
    console.log(
      "Available databases:",
      dbs.databases.map((db) => db.name).join(", "),
    );
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB! Error details:");
    console.error(error);
  } finally {
    // Ensure the client will close when you finish/error
    await client.close();
    console.log("Connection closed.");
  }
}

testConnection();
