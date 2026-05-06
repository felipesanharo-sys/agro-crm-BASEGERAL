import mysql from "mysql2/promise";

const dbUrl = process.env.DATABASE_URL;
const connection = await mysql.createConnection(dbUrl);

// Verificar upload_logs para ver o último upload
const [logs] = await connection.execute(`
  SELECT id, fileName, createdAt, rowsInserted, status 
  FROM upload_logs 
  ORDER BY createdAt DESC 
  LIMIT 5
`);

console.log("Últimos 5 uploads:");
logs.forEach((log, i) => {
  console.log(`${i+1}. ${log.fileName} - ${log.rowsInserted} registros - ${log.createdAt} - ${log.status}`);
});

// Verificar quantos registros únicos existem por uploadId
const [uploads] = await connection.execute(`
  SELECT uploadId, COUNT(*) as count 
  FROM invoices 
  GROUP BY uploadId 
  ORDER BY uploadId DESC
`);

console.log("\nRegistros por uploadId:");
uploads.forEach(u => {
  console.log(`uploadId ${u.uploadId}: ${u.count} registros`);
});

await connection.end();
