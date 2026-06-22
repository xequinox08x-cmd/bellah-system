import { getProducts as loadProducts } from '../lib/dashboardData';
import type { ProductDTO } from './products';

export type { ProductDTO };

export function getProducts(): ProductDTO[] {
  return loadProducts();
}
