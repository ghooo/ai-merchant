import { getSkuByNumber, type SKU } from './db';

export interface RestockResult {
  sku_number: string;
  sku_name: string;
  current_inventory: number;
  daily_forecasted_sales: number;
  lead_time_days: number;
  safety_days: number;
  restock_cadence_days: number;
  coverage_days: number;
  required_stock: number;
  restock_amount: number;
  days_of_stock: number;
  health_status: 'Healthy' | 'Low' | 'Critical' | 'Out of Stock';
  formula_used: string;
}

export interface RestockOverrides {
  lead_time_days?: number;
  safety_days?: number;
  restock_cadence_days?: number;
  daily_forecasted_sales?: number;
}

export function calculateRestock(
  sku_number: string,
  overrides?: RestockOverrides
): RestockResult | null {
  const sku = getSkuByNumber(sku_number);
  if (!sku) return null;

  // Apply overrides
  const lead_time = overrides?.lead_time_days ?? sku.lead_time_days;
  const safety_days = overrides?.safety_days ?? sku.safety_days;
  const restock_cadence = overrides?.restock_cadence_days ?? sku.restock_cadence_days;
  const daily_sales = overrides?.daily_forecasted_sales ?? sku.daily_forecasted_sales;

  // Calculate
  const coverage_days = lead_time + safety_days + restock_cadence;
  const required_stock = daily_sales * coverage_days;
  const restock_amount = Math.max(0, Math.ceil(required_stock - sku.current_inventory));
  const days_of_stock = daily_sales > 0
    ? Math.floor(sku.current_inventory / daily_sales)
    : Infinity;

  // Determine health status
  let health_status: RestockResult['health_status'];
  if (sku.current_inventory === 0) {
    health_status = 'Out of Stock';
  } else if (days_of_stock < 15) {
    health_status = 'Critical';
  } else if (days_of_stock < 30) {
    health_status = 'Low';
  } else {
    health_status = 'Healthy';
  }

  return {
    sku_number: sku.sku_number,
    sku_name: sku.sku_name,
    current_inventory: sku.current_inventory,
    daily_forecasted_sales: daily_sales,
    lead_time_days: lead_time,
    safety_days,
    restock_cadence_days: restock_cadence,
    coverage_days,
    required_stock,
    restock_amount,
    days_of_stock,
    health_status,
    formula_used: `${daily_sales} × (${lead_time} + ${safety_days} + ${restock_cadence}) − ${sku.current_inventory} = ${restock_amount}`,
  };
}
