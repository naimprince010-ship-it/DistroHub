import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import {
  AlertTriangle,
  Package,
  Calendar,
  Filter,
  Trash2,
  Search,
  X,
} from 'lucide-react';

interface ExpiryItem {
  id: string;
  product_name: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  days_until_expiry: number;
  status: 'expired' | 'critical' | 'warning' | 'safe';
}

const expiryData: ExpiryItem[] = [
  {
    id: '1',
    product_name: 'Sugar 1kg',
    batch_number: 'BT-2024-005',
    expiry_date: '2024-12-15',
    quantity: 20,
    days_until_expiry: -16,
    status: 'expired',
  },
  {
    id: '2',
    product_name: 'Power Milk 400g',
    batch_number: 'BT-2024-002',
    expiry_date: '2025-01-20',
    quantity: 50,
    days_until_expiry: 20,
    status: 'critical',
  },
  {
    id: '3',
    product_name: 'Biscuit Pack',
    batch_number: 'BT-2024-006',
    expiry_date: '2025-01-25',
    quantity: 100,
    days_until_expiry: 25,
    status: 'critical',
  },
  {
    id: '4',
    product_name: 'Akij Flour 1kg',
    batch_number: 'BT-2024-001',
    expiry_date: '2025-06-15',
    quantity: 500,
    days_until_expiry: 166,
    status: 'safe',
  },
  {
    id: '5',
    product_name: 'Premium Rice 5kg',
    batch_number: 'BT-2024-004',
    expiry_date: '2025-12-31',
    quantity: 300,
    days_until_expiry: 365,
    status: 'safe',
  },
];

const statusConfig = {
  expired: { color: 'bg-red-100 text-red-700 border-red-200', label: 'Expired', icon: '🔴' },
  critical: { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Critical (<30 days)', icon: '🟠' },
  warning: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Warning (<60 days)', icon: '🟡' },
  safe: { color: 'bg-green-100 text-green-700 border-green-200', label: 'Safe', icon: '🟢' },
};

export function Expiry() {
  const [items] = useState<ExpiryItem[]>(expiryData);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.batch_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filter === 'all' || item.status === filter;
    
    return matchesSearch && matchesFilter;
  });

  const activeFiltersCount = (filter !== 'all' ? 1 : 0) + (searchTerm ? 1 : 0);

  const clearFilters = () => {
    setFilter('all');
    setSearchTerm('');
  };

  const expiredCount = items.filter((i) => i.status === 'expired').length;
  const criticalCount = items.filter((i) => i.status === 'critical').length;
  const warningCount = items.filter((i) => i.status === 'warning').length;

  return (
    <div className="min-h-screen">
      <Header title="Expiry Alerts" />

      <div className="p-3">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
          <div className="bg-white rounded-xl p-3 shadow-sm border-l-4 border-red-500">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
                <p className="text-slate-500 text-sm">Expired</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border-l-4 border-orange-500">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{criticalCount}</p>
                <p className="text-slate-500 text-sm">Critical (&lt;30 days)</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border-l-4 border-yellow-500">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{warningCount}</p>
                <p className="text-slate-500 text-sm">Warning (&lt;60 days)</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border-l-4 border-green-500">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{items.length}</p>
                <p className="text-slate-500 text-sm">Total Batches</p>
              </div>
            </div>
          </div>
        </div>

                {/* Search & Filter */}
                <div className="bg-white rounded-xl p-2 shadow-sm mb-2 flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by product name or batch..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input-field pl-10"
                    />
                  </div>

                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="input-field pl-10 w-48"
                    >
                      <option value="all">All Items</option>
                      <option value="expired">Expired Only</option>
                      <option value="critical">Critical (&lt;30 days)</option>
                      <option value="warning">Warning (&lt;60 days)</option>
                      <option value="safe">Safe</option>
                    </select>
                  </div>

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

        {/* Expiry List */}
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-xl p-3 shadow-sm border-l-4 ${
                item.status === 'expired'
                  ? 'border-red-500'
                  : item.status === 'critical'
                  ? 'border-orange-500'
                  : item.status === 'warning'
                  ? 'border-yellow-500'
                  : 'border-green-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{item.product_name}</h3>
                    <p className="text-sm text-slate-500">Batch: {item.batch_number}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-sm text-slate-500">Quantity</p>
                    <p className="font-semibold text-slate-900">{item.quantity}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-500">Expiry Date</p>
                    <p className={`font-semibold ${item.status === 'expired' ? 'text-red-600' : 'text-slate-900'}`}>
                      {item.expiry_date}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-slate-500">Days</p>
                    <p
                      className={`font-semibold ${
                        item.days_until_expiry < 0
                          ? 'text-red-600'
                          : item.days_until_expiry < 30
                          ? 'text-orange-600'
                          : 'text-green-600'
                      }`}
                    >
                      {item.days_until_expiry < 0 ? `${Math.abs(item.days_until_expiry)} overdue` : item.days_until_expiry}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig[item.status].color}`}>
                    {statusConfig[item.status].label}
                  </span>
                  {item.status === 'expired' && (
                    <button className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="bg-white rounded-xl p-4 text-center text-slate-500">
            No items found for the selected filter.
          </div>
        )}

        {/* FIFO Notice */}
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">FIFO Recommendation</h4>
              <p className="text-sm text-blue-700">
                Products with earlier expiry dates should be sold first. The system automatically suggests
                items with nearest expiry when creating sales orders.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
