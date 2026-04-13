import { API_BASE } from "../lib/api";

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

type DeleteProductData = {
  id: number;
  action: "deleted" | "archived";
};

async function readApiResp<T>(res: Response): Promise<ApiResp<T>> {
  const json = await res.json().catch(() => null);

  if (json && typeof json === "object") {
    return {
      ok: Boolean((json as { ok?: boolean }).ok),
      data: ((json as { data?: T }).data ?? null) as T,
      message:
        typeof (json as { message?: unknown }).message === "string"
          ? (json as { message: string }).message
          : null,
    };
  }

  return {
    ok: false,
    data: null as T,
    message: "Unexpected response from server",
  };
}

export async function getProducts(): Promise<ProductDTO[]> {
  const res = await fetch(`${API_BASE}/products`);
  const json = await readApiResp<ProductDTO[]>(res);
  if (!res.ok || !json.ok) throw new Error(json.message || "Failed to fetch products");
  return json.data;
}

export async function createProduct(payload: ProductPayload): Promise<ProductDTO> {
  const res = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await readApiResp<ProductDTO>(res);
  if (!res.ok || !json.ok) throw new Error(json.message || "Failed to create product");
  return json.data;
}

export async function updateProduct(id: number, payload: ProductPayload): Promise<ProductDTO> {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await readApiResp<ProductDTO>(res);
  if (!res.ok || !json.ok) throw new Error(json.message || "Failed to update product");
  return json.data;
}

export async function deleteProduct(id: number): Promise<DeleteProductData & { message: string }> {
  const res = await fetch(`${API_BASE}/products/${id}`, { method: "DELETE" });
  const json = await readApiResp<DeleteProductData>(res);

  if (!res.ok || !json.ok || !json.data) {
    throw new Error(json.message || "Failed to delete product");
  }

  return {
    ...json.data,
    message: json.message || "Product deleted successfully.",
  };
}
