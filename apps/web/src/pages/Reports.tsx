import { useMemo, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Calendar, DollarSign, Package, TrendingUp, Users } from 'lucide-react';
import { offlineStore } from '../lib/offlineStore';

function dateKey(value: string) {
  return value.slice(0, 10);
}

function currency(value: number) {
  return `PHP ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Reports() {
  const [range, setRange] = useState('30');
  const snapshot = offlineStore.getSnapshot();
  const sales = offlineStore.getSalesWithItems();
  const days = Number(range);
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const scopedSales = sales.filter((sale) => new Date(sale.createdAt) >= start);
  const totals = useMemo(() => ({
    revenue: scopedSales.reduce((sum, sale) => sum + sale.total, 0),
    profit: scopedSales.reduce((sum, sale) => sum + sale.profit, 0),
    transactions: scopedSales.length,
    units: scopedSales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0),
  }), [scopedSales]);

  const daily = useMemo(() => {
    const map = new Map<string, { date: string; Revenue: number; Profit: number }>();
    scopedSales.forEach((sale) => {
      const key = dateKey(sale.createdAt);
      const current = map.get(key) ?? { date: key, Revenue: 0, Profit: 0 };
      current.Revenue += sale.total;
      current.Profit += sale.profit;
      map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [scopedSales]);

  const productRows = useMemo(() => {
    const map = new Map<number, { name: string; category: string; units: number; revenue: number; profit: number }>();
    scopedSales.forEach((sale) => sale.items.forEach((item) => {
      const current = map.get(item.productId) ?? { name: item.productName, category: item.category, units: 0, revenue: 0, profit: 0 };
      current.units += item.quantity;
      current.revenue += item.total;
      current.profit += item.profit;
      map.set(item.productId, current);
    }));
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [scopedSales]);

  const customerRows = useMemo(() => {
    const map = new Map<string, { name: string; transactions: number; revenue: number }>();
    scopedSales.forEach((sale) => {
      const key = sale.customerName || 'Walk-in Customer';
      const current = map.get(key) ?? { name: key, transactions: 0, revenue: 0 };
      current.transactions += 1;
      current.revenue += sale.total;
      map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [scopedSales]);

  const lowStock = snapshot.products.filter((product) => product.stock <= product.lowStockThreshold);

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[#111827] text-xl font-bold">Local Business Reports</h1>
          <p className="text-[#6B7280] text-sm">Sales, inventory, customers, revenue, and profit from local data only</p>
        </div>
        <label className="flex items-center gap-2 px-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-sm">
          <Calendar className="w-4 h-4 text-[#6B7280]" />
          <select value={range} onChange={(event) => setRange(event.target.value)} className="bg-transparent focus:outline-none">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last 365 days</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Revenue', value: currency(totals.revenue), icon: DollarSign, bg: 'bg-[#FCE7F3]', color: 'text-[#EC4899]' },
          { label: 'Profit', value: currency(totals.profit), icon: TrendingUp, bg: 'bg-emerald-50', color: 'text-emerald-600' },
          { label: 'Transactions', value: String(totals.transactions), icon: Package, bg: 'bg-blue-50', color: 'text-blue-600' },
          { label: 'Units Sold', value: String(totals.units), icon: Users, bg: 'bg-amber-50', color: 'text-amber-600' },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} className="bg-white rounded-xl border border-[#E5E7EB] px-5 py-4 flex items-center gap-4">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}><Icon className={`w-4 h-4 ${color}`} /></div>
            <div className="min-w-0">
              <p className="text-sm text-[#111827] font-bold truncate">{value}</p>
              <p className="text-[10px] text-[#6B7280]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
        <h2 className="text-sm font-semibold text-[#111827] mb-4">Revenue and Profit Trend</h2>
        {daily.length === 0 ? (
          <div className="h-[240px] flex items-center justify-center text-xs text-[#9CA3AF]">No sales in this range</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
              <XAxis dataKey="date" fontSize={10} />
              <YAxis fontSize={10} tickFormatter={(value) => `PHP ${value}`} />
              <Tooltip formatter={(value: number) => currency(value)} />
              <Bar dataKey="Revenue" fill="#EC4899" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Profit" fill="#10B981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ReportTable title="Top Products" headers={['Product', 'Units', 'Revenue']} rows={productRows.map((row) => [row.name, String(row.units), currency(row.revenue)])} />
        <ReportTable title="Top Customers" headers={['Customer', 'Txns', 'Revenue']} rows={customerRows.map((row) => [row.name, String(row.transactions), currency(row.revenue)])} />
        <ReportTable title="Low Stock" headers={['Product', 'Stock', 'Threshold']} rows={lowStock.map((row) => [row.name, String(row.stock), String(row.lowStockThreshold)])} />
      </div>
    </div>
  );
}

function ReportTable({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#F3F4F6]">
        <h2 className="text-sm font-semibold text-[#111827]">{title}</h2>
      </div>
      <table className="w-full">
        <thead>
          <tr className="bg-[#F9FAFB]">
            {headers.map((header) => <th key={header} className="px-4 py-2.5 text-left text-[10px] uppercase text-[#9CA3AF]">{header}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F3F4F6]">
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} className="px-4 py-8 text-center text-xs text-[#9CA3AF]">No data available</td></tr>
          ) : rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 text-xs text-[#374151]">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
