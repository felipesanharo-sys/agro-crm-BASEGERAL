import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  // Verificar produtos com 0 kg
  const [products] = await connection.execute(`
    SELECT DISTINCT productCode, productName, kgInvoiced
    FROM invoices
    WHERE kgInvoiced = 0
    LIMIT 20
  `);
  
  console.log("Produtos com 0 kg:");
  console.log(JSON.stringify(products, null, 2));
  
  // Verificar quantos clientes têm 0 kg
  const [clientsWithZeroKg] = await connection.execute(`
    SELECT COUNT(DISTINCT clientGroupCodeSAP) as clientCount
    FROM invoices
    WHERE kgInvoiced = 0
  `);
  
  console.log("\nClientes com 0 kg:", clientsWithZeroKg[0]);
  
  await connection.end();
}

main().catch(console.error);
