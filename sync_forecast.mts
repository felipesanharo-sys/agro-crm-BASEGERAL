import { getDb, syncForecastFromGoogleSheets } from "./server/db";

try {
  const result = await syncForecastFromGoogleSheets();
  console.log("Sync result:", result);
} catch (error) {
  console.error("Error:", error);
}

process.exit(0);
