import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  // Verificar colunas da tabela
  const [columns] = await connection.execute(`
    DESCRIBE invoices
  `);
  
  console.log("Colunas da tabela invoices:");
  columns.forEach(col => console.log(`- ${col.Field} (${col.Type})`));
  
  await connection.end();
}

main().catch(console.error);
