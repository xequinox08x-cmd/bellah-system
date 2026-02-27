import { DollarSign, TrendingUp, TrendingDown, Megaphone } from "lucide-react";
import { KPICard } from "./KPICard";
import { Card } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const salesData = [
  { date: "Mon", sales: 4200 },
  { date: "Tue", sales: 5800 },
  { date: "Wed", sales: 7200 },
  { date: "Thu", sales: 6100 },
  { date: "Fri", sales: 8500 },
  { date: "Sat", sales: 9200 },
  { date: "Sun", sales: 7800 },
];

const productData = [
  { product: "Glow Serum", sales: 145 },
  { product: "Lip Gloss", sales: 132 },
  { product: "Face Cream", sales: 98 },
  { product: "Eye Shadow", sales: 76 },
  { product: "Blush Palette", sales: 54 },
];

const recentTransactions = [
  { id: "TXN-001", product: "Glow Serum", quantity: 2, amount: "$89.00", date: "2025-10-22", status: "completed" },
  { id: "TXN-002", product: "Lip Gloss Set", quantity: 1, amount: "$45.00", date: "2025-10-22", status: "completed" },
  { id: "TXN-003", product: "Face Cream", quantity: 3, amount: "$135.00", date: "2025-10-22", status: "pending" },
  { id: "TXN-004", product: "Eye Shadow Palette", quantity: 1, amount: "$62.00", date: "2025-10-21", status: "completed" },
  { id: "TXN-005", product: "Blush Palette", quantity: 2, amount: "$78.00", date: "2025-10-21", status: "completed" },
];

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Sales Today"
          value="$12,458"
          subtitle="124 orders"
          icon={DollarSign}
          trend={{ value: "12.5%", isPositive: true }}
          iconBgColor="bg-[#F9E0E7]"
        />
        <KPICard
          title="Top-Selling Product"
          value="Glow Serum"
          subtitle="145 units sold"
          icon={TrendingUp}
          iconBgColor="bg-[#D4A373]/20"
        />
        <KPICard
          title="Lowest-Selling Product"
          value="Blush Palette"
          subtitle="54 units sold"
          icon={TrendingDown}
          iconBgColor="bg-[#F9E0E7]"
        />
        <KPICard
          title="Active Promotions"
          value="8"
          subtitle="3 scheduled"
          icon={Megaphone}
          iconBgColor="bg-[#D4A373]/20"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <Card className="p-6 rounded-2xl border-[#F9E0E7]/30 shadow-sm">
          <h3 className="text-[#444444] mb-4">Sales Trend (This Week)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F9E0E7" />
              <XAxis dataKey="date" stroke="#444444" />
              <YAxis stroke="#444444" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #F9E0E7",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="sales"
                stroke="#D4A373"
                strokeWidth={3}
                dot={{ fill: "#D4A373", r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Product Performance */}
        <Card className="p-6 rounded-2xl border-[#F9E0E7]/30 shadow-sm">
          <h3 className="text-[#444444] mb-4">Product Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F9E0E7" />
              <XAxis dataKey="product" stroke="#444444" angle={-15} textAnchor="end" height={80} />
              <YAxis stroke="#444444" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #F9E0E7",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="sales" fill="#F9E0E7" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="p-6 rounded-2xl border-[#F9E0E7]/30 shadow-sm">
        <h3 className="text-[#444444] mb-4">Recent Transactions</h3>
        <Table>
          <TableHeader>
            <TableRow className="border-[#F9E0E7]/30">
              <TableHead>Product</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentTransactions.map((transaction) => (
              <TableRow key={transaction.id} className="border-[#F9E0E7]/30">
                <TableCell>{transaction.product}</TableCell>
                <TableCell>{transaction.quantity}</TableCell>
                <TableCell>{transaction.amount}</TableCell>
                <TableCell>{transaction.date}</TableCell>
                <TableCell>
                  <Badge
                    className={`${
                      transaction.status === "completed"
                        ? "bg-green-100 text-green-700 hover:bg-green-100"
                        : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                    }`}
                  >
                    {transaction.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
