const BASE_URL = "http://localhost:4000";

type ApiResp<T> = { ok: boolean; data: T; message: string | null };

export type CreateSalePayload = {
  customerName: string;
  staffName: string;
  staffEmail?: string;
  createdBy?: number;
  createdByClerkId?: string;
  discountType: "%" | "PHP";
  discountValue: number;
  items: Array<{
    productId: number;
    qty: number;
    unitPrice: number;
  }>;
};

export type SaleDTO = {
  saleId: number;
  total: number;
  createdBy?: number;
  createdBySource?: "id" | "clerk_id" | "email" | "dev_admin";
};

export type SalesRecordDTO = {
  id: string;
  saleId: number;
  date: string;
  productName: string;
  category: string;
  customerName: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  total: number;
  profit: number;
  staffName: string;
};

export async function createSale(payload: CreateSalePayload): Promise<SaleDTO> {
  const res = await fetch(`${BASE_URL}/api/sales`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json: ApiResp<SaleDTO> = await res.json();
  if (!json.ok) throw new Error(json.message || "Failed to record sale");
  return json.data;
}

export async function getSales(): Promise<SalesRecordDTO[]> {
  const res = await fetch(`${BASE_URL}/api/sales`);
  const json: ApiResp<SalesRecordDTO[]> = await res.json();
  if (!json.ok) throw new Error(json.message || "Failed to load sales");
  return json.data;
}
