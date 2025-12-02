import { NextResponse } from 'next/server';
import { getAllSkus } from '@/lib/db';
import { calculateRestock } from '@/lib/restock';

export async function GET() {
  try {
    const skus = getAllSkus();

    const inventory = skus.map(sku => {
      const restock = calculateRestock(sku.sku_number);
      return {
        ...sku,
        restock_amount: restock?.restock_amount ?? 0,
        health_status: restock?.health_status ?? 'Unknown',
        days_of_stock: restock?.days_of_stock ?? 0,
      };
    });

    return NextResponse.json({ inventory });
  } catch (error) {
    console.error('Inventory error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}
