import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  const [result] = await connection.execute(`
    SELECT
      clientName, totalKg, productType
    FROM (
      SELECT
        i.clientName,
        SUM(CAST(i.kgInvoiced AS DECIMAL(14,2))) as totalKg,
        CASE
          WHEN SUM(CASE WHEN i.productCategory = 'digital' THEN 1 ELSE 0 END) > 0 THEN 'digital'
          WHEN SUM(CAST(i.kgInvoiced AS DECIMAL(14,2))) = 0 AND SUM(CASE WHEN i.productCategory = 'digital' THEN 1 ELSE 0 END) = 0 THEN 'devolucao'
          ELSE 'nutricao'
        END as productType
      FROM invoices i
      GROUP BY i.clientName
    ) t
    WHERE clientName LIKE '%CLAUDIA MARIA%'
  `);
  
  console.log("Resultado:");
  console.log(JSON.stringify(result, null, 2));
  
  await connection.end();
}

main().catch(console.error);
