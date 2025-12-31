import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import {
  Search,
  AlertTriangle,
  Package,
  TrendingUp,
  TrendingDown,
  Filter,
} from 'lucide-react';

interface InventoryItem {
  id: string;
  product_name: string;
  sku: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  unit: string;
  location: string;
  status: 'in_stock' | 'low_stock' | 'expiring' | 'expired';
}

const inventoryData: InventoryItem[] = [
  {
    id: '1',
    product_name: 'Akij Flour 1kg',
    sku: 'AKJ-FLR-001',
    batch_number: 'BT-2024-001',
    expiry_date: '2025-06-15',
    quantity: 500,
    unit: 'Pack',
    location: 'Warehouse A',
    status: 'in_stock',
  },
  {
    id: '2',
    product_name: 'Power Milk 400g',
    sku: 'PWR-MLK-001',
    batch_number: 'BT-2024-002',
    expiry_date: '2025-01-20',
    quantity: 50,
    unit: 'Pack',
    location: 'Warehouse A',
    status: 'expiring',
  },
  {
    id: '3',
    product_name: 'Pampers Medium',
    sku: 'PMP-MED-001',
    batch_number: 'BT-2024-003',
    expiry_date: '2026-12-31',
    quantity: 30,
    unit: 'Pack',
    location: 'Warehouse B',
    status: 'low_stock',
  },
  {
    id: '4',
    product_name: 'Premium Rice 5kg',
    sku: 'RIC-PRM-001',
    batch_number: 'BT-2024-004',
    expiry_date: '2025-12-31',
    quantity: 300,
    unit: 'Bag',
    location: 'Warehouse A',
    status: 'in_stock',
  },
  {
    id: '5',
    product_name: 'Sugar 1kg',
    sku: 'SGR-001',
    batch_number: 'BT-2024-005',
    expiry_date: '2024-12-15',
    quantity: 20,
    unit: 'Pack',
    location: 'Warehouse B',
    status: 'expired',
  },
];

const statusConfig = {
  in_stock: { color: 'bg-green-100 text-green-700', label: 'In Stock' },
  low_stock: { color: 'bg-yellow-100 text-yellow-700', label: 'Low Stock' },
  expiring: { color: 'bg-orange-100 text-orange-700', label: 'Expiring Soon' },
  expired: { color: 'bg-red-100 text-red-700', label: 'Expired' },
};

export function Inventory() {
  const [inventory] = useState<InventoryItem[]>(inventoryData);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.batch_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockCount = inventory.filter((item) => item.status === 'low_stock').length;
  const expiringCount = inventory.filter((item) => item.status === 'expiring').length;
  const expiredCount = inventory.filter((item) => item.status === 'expired').length;

  return (
    <div className="min-h-screen">
      <Header title="Inventory" />

      <div className="p-3">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{totalItems.toLocaleString()}</p>
                <p className="text-slate-500 text-sm">Total Items</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{lowStockCount}</p>
                <p className="text-slate-500 text-sm">Low Stock</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{expiringCount}</p>
                <p className="text-slate-500 text-sm">Expiring Soon</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
                <p className="text-slate-500 text-sm">Expired</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-xl p-2 shadow-sm mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative min-w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search inventory..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field pl-10 w-48"
              >
                <option value="all">All Status</option>
                <option value="in_stock">In Stock</option>
                <option value="low_stock">Low Stock</option>
                <option value="expiring">Expiring Soon</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-2 font-semibold text-slate-700">Product</th>
                  <th className="text-left p-2 font-semibold text-slate-700">SKU</th>
                  <th className="text-left p-2 font-semibold text-slate-700">Batch</th>
                  <th className="text-left p-2 font-semibold text-slate-700">Expiry</th>
                  <th className="text-right p-2 font-semibold text-slate-700">Quantity</th>
                  <th className="text-left p-2 font-semibold text-slate-700">Location</th>
                  <th className="text-center p-2 font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary-600" />
                        </div>
                        <span className="font-medium text-slate-900">{item.product_name}</span>
                      </div>
                    </td>
                    <td className="p-2 text-slate-600 font-mono text-sm">{item.sku}</td>
                    <td className="p-2 text-slate-600 font-mono text-sm">{item.batch_number}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        {(item.status === 'expiring' || item.status === 'expired') && (
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                        )}
                        <span
                          className={
                            item.status === 'expired'
                              ? 'text-red-600 font-medium'
                              : item.status === 'expiring'
                              ? 'text-orange-600 font-medium'
                              : 'text-slate-600'
                          }
                        >
                          {item.expiry_date}
                        </span>
                      </div>
                    </td>
                    <td className="p-2 text-right">
                      <span
                        className={`font-medium ${
                          item.status === 'low_stock' ? 'text-yellow-600' : 'text-slate-900'
                        }`}
                      >
                        {item.quantity} {item.unit}
                      </span>
                    </td>
                    <td className="p-2 text-slate-600">{item.location}</td>
                    <td className="p-2 text-center">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusConfig[item.status].color}`}
                      >
                        {statusConfig[item.status].label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredInventory.length === 0 && (
            <div className="p-4 text-center text-slate-500">
              No inventory items found. Try adjusting your search or filters.
            </div>
          )}
        </div>

        {/* FIFO Notice */}
        <div className="mt-2 bg-blue-50 border border-blue-200 rounded-xl p-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">FIFO Inventory Management</h4>
              <p className="text-sm text-blue-700">
                Products are automatically suggested for sale based on First-In-First-Out (FIFO) principle.
                Items with earlier expiry dates are prioritized.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
