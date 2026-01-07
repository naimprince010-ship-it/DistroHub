import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import {
  Search,
  AlertTriangle,
  Package,
  TrendingUp,
  TrendingDown,
  Filter,
  Warehouse,
  Plus,
  Edit,
  Trash2,
  MapPin,
  X,
} from 'lucide-react';
import api from '@/lib/api';

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

interface Warehouse {
  id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

const statusConfig = {
  in_stock: { color: 'bg-green-100 text-green-700', label: 'In Stock' },
  low_stock: { color: 'bg-yellow-100 text-yellow-700', label: 'Low Stock' },
  expiring: { color: 'bg-orange-100 text-orange-700', label: 'Expiring Soon' },
  expired: { color: 'bg-red-100 text-red-700', label: 'Expired' },
};

// Warehouse Management Component
function WarehouseManagement() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [stockCounts, setStockCounts] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState({ name: '', address: '', is_active: true });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/warehouses');
      setWarehouses(response.data || []);
      
      // Fetch stock counts for each warehouse
      const counts: Record<string, number> = {};
      for (const wh of response.data || []) {
        try {
          const stockResponse = await api.get(`/api/warehouses/${wh.id}/stock-count`);
          counts[wh.id] = stockResponse.data.total_stock || 0;
        } catch (e) {
          counts[wh.id] = 0;
        }
      }
      setStockCounts(counts);
    } catch (error: any) {
      console.error('Error fetching warehouses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (editingWarehouse) {
        await api.put(`/api/warehouses/${editingWarehouse.id}`, formData);
      } else {
        await api.post('/api/warehouses', formData);
      }
      setShowModal(false);
      setEditingWarehouse(null);
      setFormData({ name: '', address: '', is_active: true });
      fetchWarehouses();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Failed to save warehouse');
    }
  };

  const handleDelete = async (warehouseId: string) => {
    if (!confirm('Are you sure you want to delete this warehouse?')) return;

    try {
      await api.delete(`/api/warehouses/${warehouseId}`);
      fetchWarehouses();
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || 'Failed to delete warehouse';
      alert(errorMsg);
    }
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      address: warehouse.address || '',
      is_active: warehouse.is_active,
    });
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingWarehouse(null);
    setFormData({ name: '', address: '', is_active: true });
    setError('');
    setShowModal(true);
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading warehouses...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Warehouse Management</h3>
        <button
          onClick={handleAdd}
          className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          Add Warehouse
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-3 font-semibold text-slate-700">Name</th>
              <th className="text-left p-3 font-semibold text-slate-700">Address</th>
              <th className="text-center p-3 font-semibold text-slate-700">Status</th>
              <th className="text-right p-3 font-semibold text-slate-700">Stock Count</th>
              <th className="text-center p-3 font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {warehouses.map((warehouse) => {
              const stockCount = stockCounts[warehouse.id] || 0;
              const hasStock = stockCount > 0;
              return (
                <tr key={warehouse.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Warehouse className="w-5 h-5 text-slate-400" />
                      <span className="font-medium text-slate-900">{warehouse.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-slate-600">
                    {warehouse.address ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{warehouse.address}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">No address</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        warehouse.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {warehouse.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <span className="font-medium text-slate-900">{stockCount.toLocaleString()}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(warehouse)}
                        className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                        title="Edit warehouse"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(warehouse.id)}
                        disabled={hasStock}
                        className={`p-1.5 rounded transition-colors ${
                          hasStock
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                        }`}
                        title={hasStock ? 'Cannot delete warehouse with stock' : 'Delete warehouse'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {warehouses.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            No warehouses found. Click "Add Warehouse" to create one.
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md m-4">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingWarehouse(null);
                  setFormData({ name: '', address: '', is_active: true });
                  setError('');
                }}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Warehouse Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  placeholder="e.g., Main Warehouse"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input-field w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Warehouse address..."
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Active</span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingWarehouse(null);
                    setFormData({ name: '', address: '', is_active: true });
                    setError('');
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition-all duration-200 flex-1"
                >
                  {editingWarehouse ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Stock Overview Component (existing inventory view)
function StockOverview() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    fetchInventory();
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const response = await api.get('/api/warehouses');
      setWarehouses(response.data || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchInventory = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setInventory([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get('/api/inventory');
      
      if (response.data) {
        const flatInventory: InventoryItem[] = [];
        
        response.data.forEach((product: any) => {
          if (product.batches && Array.isArray(product.batches)) {
            product.batches.forEach((batch: any, batchIndex: number) => {
              let status: 'in_stock' | 'low_stock' | 'expiring' | 'expired' = 'in_stock';
              if (batch.expiry_date) {
                const expiry = new Date(batch.expiry_date);
                const today = new Date();
                const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                
                if (expiry < today) {
                  status = 'expired';
                } else if (diffDays <= 30) {
                  status = 'expiring';
                }
              }
              
              if (batch.quantity < 50 && status !== 'expired' && status !== 'expiring') {
                status = 'low_stock';
              }
              
              let expiryDateStr = '';
              if (batch.expiry_date) {
                if (typeof batch.expiry_date === 'string') {
                  expiryDateStr = batch.expiry_date.split('T')[0];
                } else if (batch.expiry_date instanceof Date) {
                  expiryDateStr = batch.expiry_date.toISOString().split('T')[0];
                } else {
                  expiryDateStr = String(batch.expiry_date);
                }
              }

              // Get warehouse name if available
              const warehouseName = batch.warehouse_id 
                ? warehouses.find(w => w.id === batch.warehouse_id)?.name || 'Unknown'
                : 'Main Warehouse';
              
              flatInventory.push({
                id: `${product.product_id}-${batchIndex}`,
                product_name: product.product_name || '',
                sku: product.sku || '',
                batch_number: batch.batch_number || '',
                expiry_date: expiryDateStr,
                quantity: batch.quantity || 0,
                unit: 'Pack',
                location: warehouseName,
                status: status,
              });
            });
          }
        });
        
        setInventory(flatInventory);
      }
    } catch (error: any) {
      console.error('[Inventory] Error fetching inventory:', error);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (warehouses.length > 0) {
      fetchInventory();
    }
  }, [warehouses]);

  const filteredInventory = inventory.filter((item) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = q === '' || 
      ((item.product_name ?? '').toLowerCase().includes(q)) ||
      ((item.sku ?? '').toLowerCase().includes(q)) ||
      ((item.batch_number ?? '').toLowerCase().includes(q)) ||
      ((item.location ?? '').toLowerCase().includes(q));
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesWarehouse = warehouseFilter === 'all' || item.location === warehouseFilter;
    
    return matchesSearch && matchesStatus && matchesWarehouse;
  });

  const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockCount = inventory.filter((item) => item.status === 'low_stock').length;
  const expiringCount = inventory.filter((item) => item.status === 'expiring').length;
  const expiredCount = inventory.filter((item) => item.status === 'expired').length;

  return (
    <div>
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
          <div className="relative">
            <Warehouse className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="input-field pl-10 w-48"
            >
              <option value="all">All Warehouses</option>
              {warehouses.map((wh) => (
                <option key={wh.id} value={wh.name}>{wh.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading inventory...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-2 font-semibold text-slate-700">Product</th>
                  <th className="text-left p-2 font-semibold text-slate-700">SKU</th>
                  <th className="text-left p-2 font-semibold text-slate-700">Batch</th>
                  <th className="text-left p-2 font-semibold text-slate-700">Expiry</th>
                  <th className="text-right p-2 font-semibold text-slate-700">Quantity</th>
                  <th className="text-left p-2 font-semibold text-slate-700">Warehouse</th>
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
        )}

        {!loading && filteredInventory.length === 0 && (
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
  );
}

// Main Inventory Component with Tabs
export function Inventory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'stock';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  useEffect(() => {
    const urlTab = searchParams.get('tab') || 'stock';
    setActiveTab(urlTab);
  }, [searchParams]);

  const tabs = [
    { id: 'stock', label: 'Stock Overview', icon: Package },
    { id: 'warehouses', label: 'Warehouse Management', icon: Warehouse },
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  return (
    <div className="min-h-screen">
      <Header title="Inventory" />

      <div className="p-3">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-3">
            {activeTab === 'stock' && <StockOverview />}
            {activeTab === 'warehouses' && <WarehouseManagement />}
          </div>
        </div>
      </div>
    </div>
  );
}
