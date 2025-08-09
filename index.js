import express from "express";
import cors from "cors";
import { connectDB, pool } from "./databaseConnection.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database table
async function initTable() {
  try {
    const client = await pool.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        age INTEGER NOT NULL,
        rollnumber VARCHAR(50) UNIQUE NOT NULL,
        city VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    client.release();
    console.log("✅ Students table ready!");
  } catch (err) {
    console.error("❌ Error creating table:", err.message);
  }
}

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Student Management API",
    status: "Connected to Neon Database",
    endpoints: {
      "GET /students": "Get all students",
      "GET /students/:rollnumber": "Get student by roll number",
      "POST /students": "Create new student",
      "PUT /students/:rollnumber": "Update student",
      "DELETE /students/:rollnumber": "Delete student",
    },
  });
});

// GET - Get all students
app.get("/students", async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      "SELECT * FROM students ORDER BY rollnumber"
    );
    client.release();

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({
      success: false,
      message: "Error fetching students",
    });
  }
});

// GET - Get student by roll number
app.get("/students/:rollnumber", async (req, res) => {
  try {
    const { rollnumber } = req.params;
    const client = await pool.connect();
    const result = await client.query(
      "SELECT * FROM students WHERE rollnumber = $1",
      [rollnumber]
    );
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({
      success: false,
      message: "Error fetching student",
    });
  }
});

// POST - Create new student
app.post("/students", async (req, res) => {
  try {
    const { name, age, rollnumber, city } = req.body;

    if (!name || !age || !rollnumber || !city) {
      return res.status(400).json({
        success: false,
        message: "All fields required: name, age, rollnumber, city",
      });
    }

    const client = await pool.connect();
    const result = await client.query(
      "INSERT INTO students (name, age, rollnumber, city) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, age, rollnumber, city]
    );
    client.release();

    res.status(201).json({
      success: true,
      message: "Student created successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Error:", err.message);
    if (err.code === "23505") {
      res.status(409).json({
        success: false,
        message: "Roll number already exists",
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Error creating student",
      });
    }
  }
});

// PUT - Update student
app.put("/students/:rollnumber", async (req, res) => {
  try {
    const { rollnumber } = req.params;
    const { name, age, city } = req.body;

    const client = await pool.connect();
    const result = await client.query(
      `UPDATE students 
       SET name = COALESCE($1, name), 
           age = COALESCE($2, age), 
           city = COALESCE($3, city)
       WHERE rollnumber = $4 
       RETURNING *`,
      [name, age, city, rollnumber]
    );
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.json({
      success: true,
      message: "Student updated successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({
      success: false,
      message: "Error updating student",
    });
  }
});

// DELETE - Delete student
app.delete("/students/:rollnumber", async (req, res) => {
  try {
    const { rollnumber } = req.params;
    const client = await pool.connect();
    const result = await client.query(
      "DELETE FROM students WHERE rollnumber = $1 RETURNING *",
      [rollnumber]
    );
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.json({
      success: true,
      message: "Student deleted successfully",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).json({
      success: false,
      message: "Error deleting student",
    });
  }
});

// Start server and connect to database
async function startServer() {
  try {
    // Test database connection
    const connected = await connectDB();

    if (connected) {
      // Initialize table
      await initTable();

      app.listen(9000, () => {
        console.log("🚀 Server is listening on port 9000");
        console.log("🌐 Visit: http://localhost:9000");
        console.log("📚 API Routes:");
        console.log("   GET    /students");
        console.log("   GET    /students/:rollnumber");
        console.log("   POST   /students");
        console.log("   PUT    /students/:rollnumber");
        console.log("   DELETE /students/:rollnumber");
      });
    } else {
      console.error("❌ Failed to connect to database. Server not started.");
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
}

startServer();
