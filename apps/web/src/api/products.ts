import { api } from '../lib/api';

export type ProductDTO = {
  id: number;
  sku: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  lowStockThreshold: number;
  description: string;
  imageUrl: string | null;
};

export async function getProducts(): Promise<ProductDTO[]> {
  const products = await api.getProducts();
  return Array.isArray(products)
    ? products.map((product: any) => ({
        id: Number(product.id),
        sku: String(product.sku ?? ''),
        name: String(product.name ?? 'Unnamed Product'),
        category: String(product.category ?? 'Uncategorized'),
        price: Number(product.price ?? 0),
        cost: Number(product.cost ?? 0),
        stock: Number(product.stock ?? 0),
        lowStockThreshold: Number(product.lowStockThreshold ?? 0),
        description: String(product.description ?? ''),
        imageUrl: product.imageUrl ?? null,
      }))
    : [];
}
