import mysql from "mysql2/promise";

const dbUrl = process.env.DATABASE_URL;
const connection = await mysql.createConnection(dbUrl);

console.log("Deletando registros do uploadId 120001...");

try {
  const [result] = await connection.execute(`
    DELETE FROM invoices WHERE uploadId = 120001
  `);
  
  console.log(`✓ ${result.affectedRows} registros deletados`);
  
  // Verificar quantos registros restaram
  const [remaining] = await connection.execute(`
    SELECT COUNT(*) as total FROM invoices
  `);
  
  console.log(`✓ Total de registros restantes: ${remaining[0].total}`);
  
} catch (err) {
  console.error("Erro ao deletar:", err.message);
}

await connection.end();
