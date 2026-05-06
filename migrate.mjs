import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import fs from "fs";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const connection = await mysql.createConnection(dbUrl);
const sql = fs.readFileSync("drizzle/0003_backup_tables_only.sql", "utf-8");

try {
  const statements = sql.split(";").filter(s => s.trim());
  for (const stmt of statements) {
    if (stmt.trim()) {
      console.log("Executing:", stmt.substring(0, 50) + "...");
      await connection.execute(stmt);
    }
  }
  console.log("✓ Migration completed successfully");
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await connection.end();
}
