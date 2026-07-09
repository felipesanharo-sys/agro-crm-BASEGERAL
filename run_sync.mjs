import { config } from 'dotenv';
config({ path: '.env' });

// Load env from webdev
import { readFileSync } from 'fs';
try {
  const envContent = readFileSync('/opt/.manus/webdev.sh.env', 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^export\s+(\w+)=["']?(.+?)["']?$/);
    if (match) process.env[match[1]] = match[2];
  }
} catch(e) {}

const { syncForecastFromGoogleSheets } = await import('./server/db.ts');

console.log('Executando sincronização...');
const result = await syncForecastFromGoogleSheets();
console.log('Resultado:', JSON.stringify(result, null, 2));
process.exit(0);
