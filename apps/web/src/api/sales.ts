import { api } from '../lib/api';

export type SalesRecordDTO = {
  id: string;
  saleId: number;
  productId: number;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  total: number;
  profit: number;
  date: string;
  createdAt: string;
  customerName: string;
  staffName: string;
};

export async function getSales(): Promise<SalesRecordDTO[]> {
  const response = await api.getDashboardSalesRecords();
  return Array.isArray(response.data) ? response.data : [];
}
