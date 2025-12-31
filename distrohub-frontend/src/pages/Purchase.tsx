import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import {
  Plus,
  Search,
  Eye,
  Package,
  Calendar,
  Truck,
  Filter,
  X,
} from 'lucide-react';

interface Purchase {
  id: string;
  invoice_number: string;
  supplier_name: string;
  purchase_date: string;
  total_amount: number;
  paid_amount: number;
  items: { product: string; qty: number; price: number; batch: string; expiry: string }[];
}

const initialPurchases: Purchase[] = [
  {
    id: '1',
    invoice_number: 'PUR-2024-001',
    supplier_name: 'Akij Food & Beverage Ltd.',
    purchase_date: '2024-12-20',
    total_amount: 125000,
    paid_amount: 125000,
    items: [
      { product: 'Akij Flour 1kg', qty: 500, price: 55, batch: 'BT-2024-001', expiry: '2025-06-15' },
      { product: 'Power Milk 400g', qty: 200, price: 320, batch: 'BT-2024-002', expiry: '2025-01-20' },
    ],
  },
  {
    id: '2',
    invoice_number: 'PUR-2024-002',
    supplier_name: 'Akij Food & Beverage Ltd.',
    purchase_date: '2024-12-25',
    total_amount: 85000,
    paid_amount: 50000,
    items: [
      { product: 'Premium Rice 5kg', qty: 150, price: 420, batch: 'BT-2024-004', expiry: '2025-12-31' },
      { product: 'Sugar 1kg', qty: 200, price: 50, batch: 'BT-2024-005', expiry: '2025-06-30' },
    ],
  },
];

export function Purchase() {
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  const filteredPurchases = purchases.filter((p) => {
    const matchesSearch =
      p.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplier_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const due = p.total_amount - p.paid_amount;
    const matchesPayment = paymentFilter === 'all' ||
      (paymentFilter === 'paid' && due === 0) ||
      (paymentFilter === 'partial' && due > 0 && p.paid_amount > 0) ||
      (paymentFilter === 'unpaid' && p.paid_amount === 0);
    
    const purchaseDate = new Date(p.purchase_date);
    const today = new Date();
    const daysDiff = Math.ceil((today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
    const matchesDate = dateFilter === 'all' ||
      (dateFilter === 'today' && daysDiff <= 1) ||
      (dateFilter === 'week' && daysDiff <= 7) ||
      (dateFilter === 'month' && daysDiff <= 30);
    
    return matchesSearch && matchesPayment && matchesDate;
  });

  const activeFiltersCount = [paymentFilter, dateFilter].filter(f => f !== 'all').length;

  const clearFilters = () => {
    setPaymentFilter('all');
    setDateFilter('all');
    setSearchTerm('');
  };

  const totalPurchases = purchases.reduce((sum, p) => sum + p.total_amount, 0);
  const totalDue = purchases.reduce((sum, p) => sum + (p.total_amount - p.paid_amount), 0);

  return (
    <div className="min-h-screen">
      <Header title="Purchase / Stock-In" />

      <div className="p-3">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{purchases.length}</p>
                <p className="text-slate-500 text-sm">Total Purchases</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">৳ {totalPurchases.toLocaleString()}</p>
                <p className="text-slate-500 text-sm">Total Value</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">৳ {totalDue.toLocaleString()}</p>
                <p className="text-slate-500 text-sm">Payable to Supplier</p>
              </div>
            </div>
          </div>
        </div>

                {/* Actions Bar */}
                <div className="bg-white rounded-xl p-2 shadow-sm mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <div className="relative min-w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search purchases..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field pl-10"
                      />
                    </div>

                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                        className="input-field pl-10 w-40"
                      >
                        <option value="all">All Payment</option>
                        <option value="paid">Paid</option>
                        <option value="partial">Partial</option>
                        <option value="unpaid">Unpaid</option>
                      </select>
                    </div>

                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="input-field w-36"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                    </select>

                    {activeFiltersCount > 0 && (
                      <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Clear ({activeFiltersCount})
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    New Purchase
                  </button>
                </div>

        {/* Purchases Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-2 font-semibold text-slate-700">Invoice #</th>
                  <th className="text-left p-2 font-semibold text-slate-700">Supplier</th>
                  <th className="text-left p-2 font-semibold text-slate-700">Date</th>
                  <th className="text-right p-2 font-semibold text-slate-700">Total</th>
                  <th className="text-right p-2 font-semibold text-slate-700">Paid</th>
                  <th className="text-right p-2 font-semibold text-slate-700">Due</th>
                  <th className="text-center p-2 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2 font-medium text-primary-600">{purchase.invoice_number}</td>
                    <td className="p-2 text-slate-900">{purchase.supplier_name}</td>
                    <td className="p-2 text-slate-600">{purchase.purchase_date}</td>
                    <td className="p-2 text-right font-medium text-slate-900">
                      ৳ {purchase.total_amount.toLocaleString()}
                    </td>
                    <td className="p-2 text-right text-green-600">
                      ৳ {purchase.paid_amount.toLocaleString()}
                    </td>
                    <td className="p-2 text-right font-medium text-red-600">
                      ৳ {(purchase.total_amount - purchase.paid_amount).toLocaleString()}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => setSelectedPurchase(purchase)}
                        className="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPurchases.length === 0 && (
            <div className="p-4 text-center text-slate-500">
              No purchases found. Create a new purchase to add stock.
            </div>
          )}
        </div>
      </div>

      {/* Purchase Details Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-2 animate-fade-in">
            <div className="p-3 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">{selectedPurchase.invoice_number}</h2>
              <p className="text-slate-500">{selectedPurchase.supplier_name}</p>
            </div>

            <div className="p-3">
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <p className="text-sm text-slate-500">Purchase Date</p>
                  <p className="font-medium">{selectedPurchase.purchase_date}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Amount</p>
                  <p className="font-medium">৳ {selectedPurchase.total_amount.toLocaleString()}</p>
                </div>
              </div>

              <h3 className="font-semibold text-slate-900 mb-2">Items</h3>
              <table className="w-full mb-3">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-2 text-sm font-medium text-slate-600">Product</th>
                    <th className="text-left p-2 text-sm font-medium text-slate-600">Batch</th>
                    <th className="text-left p-2 text-sm font-medium text-slate-600">Expiry</th>
                    <th className="text-right p-2 text-sm font-medium text-slate-600">Qty</th>
                    <th className="text-right p-2 text-sm font-medium text-slate-600">Price</th>
                    <th className="text-right p-2 text-sm font-medium text-slate-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPurchase.items.map((item, index) => (
                    <tr key={index} className="border-b border-slate-100">
                      <td className="p-2">{item.product}</td>
                      <td className="p-2 font-mono text-sm">{item.batch}</td>
                      <td className="p-2">{item.expiry}</td>
                      <td className="p-2 text-right">{item.qty}</td>
                      <td className="p-2 text-right">৳ {item.price}</td>
                      <td className="p-2 text-right font-medium">৳ {(item.qty * item.price).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-slate-200 flex justify-end">
              <button onClick={() => setSelectedPurchase(null)} className="btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Purchase Modal */}
      {showAddModal && (
        <AddPurchaseModal
          onClose={() => setShowAddModal(false)}
          onSave={(purchase) => {
            setPurchases([...purchases, { ...purchase, id: `new-${Date.now()}` }]);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

function AddPurchaseModal({ onClose, onSave }: { onClose: () => void; onSave: (purchase: Purchase) => void }) {
  const [formData, setFormData] = useState({
    supplier_name: 'Akij Food & Beverage Ltd.',
    purchase_date: new Date().toISOString().split('T')[0],
    paid_amount: 0,
    items: [{ product: '', qty: 0, price: 0, batch: '', expiry: '' }],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const total = formData.items.reduce((sum, item) => sum + item.qty * item.price, 0);
    onSave({
      id: '',
      invoice_number: `PUR-${Date.now()}`,
      supplier_name: formData.supplier_name,
      purchase_date: formData.purchase_date,
      total_amount: total,
      paid_amount: formData.paid_amount,
      items: formData.items,
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product: '', qty: 0, price: 0, batch: '', expiry: '' }],
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-2 animate-fade-in">
        <div className="p-3 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">New Purchase / Stock-In</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
              <input
                type="text"
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Date</label>
              <input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-slate-700">Items</label>
              <button type="button" onClick={addItem} className="text-primary-600 text-sm font-medium">
                + Add Item
              </button>
            </div>
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-5 gap-2 mb-1">
                <select
                  value={item.product}
                  onChange={(e) => {
                    const newItems = [...formData.items];
                    newItems[index].product = e.target.value;
                    setFormData({ ...formData, items: newItems });
                  }}
                  className="input-field"
                  required
                >
                  <option value="">Select Product</option>
                  <option value="Akij Flour 1kg">Akij Flour 1kg</option>
                  <option value="Power Milk 400g">Power Milk 400g</option>
                  <option value="Pampers Medium">Pampers Medium</option>
                  <option value="Premium Rice 5kg">Premium Rice 5kg</option>
                  <option value="Sugar 1kg">Sugar 1kg</option>
                </select>
                <input
                  type="number"
                  placeholder="Qty"
                  value={item.qty || ''}
                  onChange={(e) => {
                    const newItems = [...formData.items];
                    newItems[index].qty = Number(e.target.value);
                    setFormData({ ...formData, items: newItems });
                  }}
                  className="input-field"
                  required
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={item.price || ''}
                  onChange={(e) => {
                    const newItems = [...formData.items];
                    newItems[index].price = Number(e.target.value);
                    setFormData({ ...formData, items: newItems });
                  }}
                  className="input-field"
                  required
                />
                <input
                  type="text"
                  placeholder="Batch #"
                  value={item.batch}
                  onChange={(e) => {
                    const newItems = [...formData.items];
                    newItems[index].batch = e.target.value;
                    setFormData({ ...formData, items: newItems });
                  }}
                  className="input-field"
                  required
                />
                <input
                  type="date"
                  placeholder="Expiry"
                  value={item.expiry}
                  onChange={(e) => {
                    const newItems = [...formData.items];
                    newItems[index].expiry = e.target.value;
                    setFormData({ ...formData, items: newItems });
                  }}
                  className="input-field"
                  required
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 rounded-lg p-2">
              <p className="text-sm text-slate-500">Total Amount</p>
              <p className="text-xl font-bold">
                ৳ {formData.items.reduce((sum, item) => sum + item.qty * item.price, 0).toLocaleString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Paid Amount (৳)</label>
              <input
                type="number"
                value={formData.paid_amount || ''}
                onChange={(e) => setFormData({ ...formData, paid_amount: Number(e.target.value) })}
                className="input-field"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Purchase
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
