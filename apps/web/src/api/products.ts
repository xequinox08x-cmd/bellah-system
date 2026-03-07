const BASE_URL = "http://localhost:4000";

export type ProductDTO = {
  id: number;
  sku: string;
  name: string;
  category: string;
  price: string;
  cost: string;
  stock: number;
  lowStockThreshold: number;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductPayload = {
  sku: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  lowStockThreshold: number;
  description: string;
};

type ApiResp<T> = { ok: boolean; data: T; message: string | null };

export async function getProducts(): Promise<ProductDTO[]> {
  const res = await fetch(`${BASE_URL}/api/products`);
  const json: ApiResp<ProductDTO[]> = await res.json();
  if (!json.ok) throw new Error(json.message || "Failed to fetch products");
  return json.data;
}

export async function createProduct(payload: ProductPayload): Promise<ProductDTO> {
  const res = await fetch(`${BASE_URL}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json: ApiResp<ProductDTO> = await res.json();
  if (!json.ok) throw new Error(json.message || "Failed to create product");
  return json.data;
}

export async function updateProduct(id: number, payload: ProductPayload): Promise<ProductDTO> {
  const res = await fetch(`${BASE_URL}/api/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json: ApiResp<ProductDTO> = await res.json();
  if (!json.ok) throw new Error(json.message || "Failed to update product");
  return json.data;
}

export async function deleteProduct(id: number): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/products/${id}`, { method: "DELETE" });
  const json: ApiResp<{ deletedId: number }> = await res.json();
  if (!json.ok) throw new Error(json.message || "Failed to delete product");
}