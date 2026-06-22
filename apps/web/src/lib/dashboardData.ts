import { offlineStore } from './offlineStore';
import type { SalesRecordDTO } from '../api/sales';
import type { ProductDTO } from '../api/products';

function saleDate(createdAt: string) {
  return createdAt.slice(0, 10);
}

export function getSalesRecords(): SalesRecordDTO[] {
  const users = offlineStore.getUsers();
  return offlineStore.getSalesWithItems().flatMap((sale) =>
    sale.items.map((item) => {
      const staff = users.find((user) => user.id === sale.staffUserId);
      return {
        id: String(item.id),
        saleId: sale.id,
        productId: item.productId,
        productName: item.productName,
        category: item.category,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        profit: item.profit,
        date: saleDate(sale.createdAt),
        createdAt: sale.createdAt,
        customerName: sale.customerName,
        staffName: staff?.name || 'Staff',
      };
    }),
  );
}

export function getProducts(): ProductDTO[] {
  return offlineStore.getProducts().map((product) => ({
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    price: product.price,
    cost: product.cost,
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold,
    description: product.description,
    imageUrl: product.imageUrl ?? null,
  }));
}

export function getSaleById(saleId: number) {
  const sale = offlineStore.getSalesWithItems().find((row) => row.id === saleId);
  if (!sale) throw new Error('Sale not found');
  return {
    ...sale,
    items: sale.items.map((item) => ({
      product_name: item.productName,
      qty: item.quantity,
      unit_price: item.unitPrice,
      total: item.total,
    })),
  };
}
