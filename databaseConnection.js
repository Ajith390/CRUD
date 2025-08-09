import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();
// Database connection string
const connectionString = process.env.DB_CONNECTION;

// Create a connection pool
const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test database connection
async function connectDB() {
  try {
    const client = await pool.connect();
    console.log("✅ Connected to Neon database successfully!");

    // Test query
    const result = await client.query("SELECT NOW()");
    console.log("⏰ Database time:", result.rows[0].now);

    client.release();
    return true;
  } catch (err) {
    console.error("❌ Database connection error:", err.message);
    return false;
  }
}

export { pool, connectDB };
