import { getDb } from "./server/db.ts";
import { sql } from "drizzle-orm";

const db = await getDb();
if (!db) {
  console.log("Database not available");
  process.exit(1);
}

try {
  const result = await db.execute(sql`SELECT COUNT(*) as count FROM forecast_data`);
  console.log("Total rows in forecast_data:", result);
  
  const data = await db.execute(sql`SELECT * FROM forecast_data LIMIT 5`);
  console.log("Sample data:", data);
} catch (error) {
  console.error("Error:", error.message);
}

process.exit(0);
