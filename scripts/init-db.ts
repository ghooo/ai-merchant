import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'data', 'app.db'));

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS skus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku_number TEXT UNIQUE NOT NULL,
    sku_name TEXT NOT NULL,
    current_inventory INTEGER NOT NULL,
    daily_forecasted_sales REAL NOT NULL,
    safety_days INTEGER NOT NULL,
    lead_time_days INTEGER NOT NULL,
    restock_cadence_days INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Seed data
const skus = [
  {
    sku_number: 'SKU-001',
    sku_name: 'Wireless Headphones',
    current_inventory: 1250,
    daily_forecasted_sales: 45,
    safety_days: 5,
    lead_time_days: 7,
    restock_cadence_days: 14,
  },
  {
    sku_number: 'SKU-002',
    sku_name: 'USB-C Cable',
    current_inventory: 180,
    daily_forecasted_sales: 80,
    safety_days: 3,
    lead_time_days: 5,
    restock_cadence_days: 7,
  },
  {
    sku_number: 'SKU-003',
    sku_name: 'Bluetooth Speaker',
    current_inventory: 45,
    daily_forecasted_sales: 30,
    safety_days: 5,
    lead_time_days: 10,
    restock_cadence_days: 14,
  },
  {
    sku_number: 'SKU-004',
    sku_name: 'Phone Case',
    current_inventory: 0,
    daily_forecasted_sales: 60,
    safety_days: 3,
    lead_time_days: 7,
    restock_cadence_days: 7,
  },
];

const insert = db.prepare(`
  INSERT OR REPLACE INTO skus (sku_number, sku_name, current_inventory, daily_forecasted_sales, safety_days, lead_time_days, restock_cadence_days)
  VALUES (@sku_number, @sku_name, @current_inventory, @daily_forecasted_sales, @safety_days, @lead_time_days, @restock_cadence_days)
`);

for (const sku of skus) {
  insert.run(sku);
}

console.log('Database initialized with seed data');
console.log(`Created ${skus.length} SKUs`);

db.close();
