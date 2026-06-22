import { getSalesRecords } from '../lib/dashboardData';

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

export function getSales(): SalesRecordDTO[] {
  return getSalesRecords();
}
