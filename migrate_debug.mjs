import mysql from "mysql2/promise";
import fs from "fs";

const dbUrl = process.env.DATABASE_URL;
console.log("DATABASE_URL:", dbUrl);

const connection = await mysql.createConnection(dbUrl);
console.log("✓ Connected to database");

// Verificar se a tabela já existe
try {
  const [rows] = await connection.execute("SHOW TABLES LIKE 'upload_history'");
  if (rows.length > 0) {
    console.log("✓ Table upload_history already exists");
  } else {
    console.log("✗ Table upload_history does NOT exist");
  }
} catch (err) {
  console.error("Error checking table:", err.message);
}

const sql = fs.readFileSync("drizzle/0003_backup_tables_only.sql", "utf-8");
const statements = sql.split(";").filter(s => s.trim());

console.log(`\nExecuting ${statements.length} statements...`);

for (const stmt of statements) {
  if (stmt.trim()) {
    console.log("\n→ Executing:", stmt.substring(0, 60) + "...");
    try {
      const result = await connection.execute(stmt);
      console.log("  ✓ Success");
    } catch (err) {
      console.error("  ✗ Error:", err.message);
    }
  }
}

// Verificar novamente
try {
  const [rows] = await connection.execute("SHOW TABLES LIKE 'upload_history'");
  if (rows.length > 0) {
    console.log("\n✓ Table upload_history NOW exists");
  } else {
    console.log("\n✗ Table upload_history still does NOT exist");
  }
} catch (err) {
  console.error("Error checking table:", err.message);
}

await connection.end();
console.log("\n✓ Done");
