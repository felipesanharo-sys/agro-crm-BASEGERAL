import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  // Verificar dados do cliente CLAUDIA MARIA MESSIAS LIMA
  const [result] = await connection.execute(`
    SELECT 
      clientName,
      SUM(CAST(kgInvoiced AS DECIMAL(14,2))) as totalKg,
      SUM(CASE WHEN productCategory = 'digital' THEN 1 ELSE 0 END) as hasDigital,
      GROUP_CONCAT(DISTINCT productCategory) as categories
    FROM invoices
    WHERE clientName LIKE '%CLAUDIA MARIA MESSIAS LIMA%'
    GROUP BY clientName
  `);
  
  console.log("Dados do cliente:");
  console.log(JSON.stringify(result, null, 2));
  
  await connection.end();
}

main().catch(console.error);
