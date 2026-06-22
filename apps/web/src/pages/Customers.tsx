import { useMemo, useState } from 'react';
import { Edit2, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { offlineStore, type Customer } from '../lib/offlineStore';

const emptyCustomer = { name: '', phone: '', email: '', address: '', notes: '' };

export default function Customers() {
  const [customers, setCustomers] = useState(() => offlineStore.getCustomers());
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Customer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyCustomer);

  const sales = offlineStore.getSalesWithItems();
  const statsByCustomer = useMemo(() => {
    const map = new Map<number, { purchases: number; total: number }>();
    sales.forEach((sale) => {
      if (!sale.customerId) return;
      const current = map.get(sale.customerId) ?? { purchases: 0, total: 0 };
      map.set(sale.customerId, { purchases: current.purchases + 1, total: current.total + sale.total });
    });
    return map;
  }, [sales]);

  const filtered = customers.filter((customer) => {
    const q = search.toLowerCase();
    return [customer.name, customer.phone, customer.email, customer.address]
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  const reload = () => setCustomers(offlineStore.getCustomers());

  const openCreate = () => {
    setEditing(null);
    setForm(emptyCustomer);
    setShowForm(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      notes: customer.notes,
    });
    setShowForm(true);
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (form.email.trim() && !form.email.includes('@')) {
      toast.error('Enter a valid email or leave it blank');
      return;
    }
    offlineStore.saveCustomer({ ...form, name: form.name.trim(), id: editing?.id });
    toast.success(editing ? 'Customer updated' : 'Customer added');
    setShowForm(false);
    reload();
  };

  const remove = (customer: Customer) => {
    if (!confirm(`Delete "${customer.name}"? This cannot be undone.`)) return;
    try {
      offlineStore.deleteCustomer(customer.id);
      toast.success('Customer deleted');
      reload();
    } catch (error: any) {
      toast.error(error?.message || 'Customer could not be deleted');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[#111827] text-xl font-bold">Customer Management</h1>
          <p className="text-[#6B7280] text-sm">{customers.length} locally stored customer records</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-[#EC4899] text-white rounded-lg text-sm hover:bg-[#DB2777]">
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search customers by name, phone, email, or address..."
            className="w-full pl-9 pr-3 py-2 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/20"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                {['Customer', 'Contact', 'Address', 'Purchases', 'Actions'].map((heading) => (
                  <th key={heading} className="px-5 py-3 text-left text-xs text-[#6B7280] uppercase">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm text-[#9CA3AF]">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" /> No customers found
                  </td>
                </tr>
              ) : filtered.map((customer) => {
                const stats = statsByCustomer.get(customer.id) ?? { purchases: 0, total: 0 };
                return (
                  <tr key={customer.id} className="hover:bg-[#F9FAFB]">
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-[#111827] font-semibold">{customer.name}</p>
                      <p className="text-xs text-[#9CA3AF] line-clamp-1">{customer.notes || 'No notes'}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#6B7280]">
                      <p>{customer.phone || 'No phone'}</p>
                      <p>{customer.email || 'No email'}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#6B7280]">{customer.address || 'No address'}</td>
                    <td className="px-5 py-3.5 text-xs text-[#111827]">
                      <p className="font-semibold">{stats.purchases} transaction{stats.purchases === 1 ? '' : 's'}</p>
                      <p className="text-[#9CA3AF]">PHP {stats.total.toFixed(2)}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(customer)} className="p-1.5 rounded-md hover:bg-[#F3F4F6] text-[#6B7280]" title="Edit customer">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => remove(customer)} className="p-1.5 rounded-md hover:bg-red-50 text-[#6B7280] hover:text-red-500" title="Delete customer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-[#F3F4F6] flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#111827]">{editing ? 'Edit Customer' : 'Add Customer'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-[#F3F4F6]"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              {[
                ['Name', 'name'],
                ['Phone', 'phone'],
                ['Email', 'email'],
                ['Address', 'address'],
              ].map(([label, key]) => (
                <div key={key}>
                  <label className="block text-xs text-[#374151] mb-1.5 font-medium">{label}</label>
                  <input
                    value={form[key as keyof typeof form]}
                    onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                    className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#EC4899]/15"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-[#374151] mb-1.5 font-medium">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#EC4899]/15"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-[#E5E7EB] rounded-xl text-sm text-[#6B7280]">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-[#EC4899] text-white rounded-xl text-sm font-semibold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
