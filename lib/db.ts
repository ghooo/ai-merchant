import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'data', 'app.db'));

export interface SKU {
  id: number;
  sku_number: string;
  sku_name: string;
  current_inventory: number;
  daily_forecasted_sales: number;
  safety_days: number;
  lead_time_days: number;
  restock_cadence_days: number;
  created_at: string;
  updated_at: string;
}

export function getAllSkus(): SKU[] {
  return db.prepare('SELECT * FROM skus').all() as SKU[];
}

export function getSkuByNumber(sku_number: string): SKU | undefined {
  return db.prepare('SELECT * FROM skus WHERE sku_number = ?').get(sku_number) as SKU | undefined;
}

export default db;
