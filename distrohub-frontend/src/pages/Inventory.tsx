import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import {
  Search,
  AlertTriangle,
  Package,
  TrendingUp,
  TrendingDown,
  Filter,
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

const statusConfig = {
  in_stock: { color: 'bg-green-100 text-green-700', label: 'In Stock' },
  low_stock: { color: 'bg-yellow-100 text-yellow-700', label: 'Low Stock' },
  expiring: { color: 'bg-orange-100 text-orange-700', label: 'Expiring Soon' },
  expired: { color: 'bg-red-100 text-red-700', label: 'Expired' },
};

export function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch inventory from API
  useEffect(() => {
    const fetchInventory = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('[Inventory] No token found, skipping inventory fetch');
        setInventory([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('[Inventory] Fetching inventory from API...');
        const response = await api.get('/api/inventory');
        console.log('[Inventory] Inventory fetched successfully:', response.data?.length || 0);
        
        if (response.data) {
          // Backend returns products with batches, frontend needs flat list of batch items
          const flatInventory: InventoryItem[] = [];
          
          response.data.forEach((product: any) => {
            // Each product has batches array
            if (product.batches && Array.isArray(product.batches)) {
              product.batches.forEach((batch: any, batchIndex: number) => {
                // Determine status based on expiry and quantity
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
                
                // Format expiry_date if it's a date object
                let expiryDateStr = '';
                if (batch.expiry_date) {
                  if (typeof batch.expiry_date === 'string') {
                    expiryDateStr = batch.expiry_date.split('T')[0]; // Extract date part if ISO string
                  } else if (batch.expiry_date instanceof Date) {
                    expiryDateStr = batch.expiry_date.toISOString().split('T')[0];
                  } else {
                    expiryDateStr = String(batch.expiry_date);
                  }
                }
                
                flatInventory.push({
                  id: `${product.product_id}-${batchIndex}`,
                  product_name: product.product_name || '',
                  sku: product.sku || '',
                  batch_number: batch.batch_number || '',
                  expiry_date: expiryDateStr,
                  quantity: batch.quantity || 0,
                  unit: 'Pack', // Default unit (can be enhanced later if product has unit field)
                  location: 'Warehouse A', // Default location (can be enhanced later if batch has location)
                  status: status,
                });
              });
            }
          });
          
          setInventory(flatInventory);
          console.log('[Inventory] Inventory mapped and set:', flatInventory.length);
        }
      } catch (error: any) {
        console.error('[Inventory] Error fetching inventory:', error);
        console.error('[Inventory] Error details:', {
          message: error?.message,
          status: error?.response?.status,
          data: error?.response?.data,
        });
        
        if (error?.response?.status === 401) {
          console.warn('[Inventory] 401 Unauthorized - token may be expired');
          // Interceptor will handle redirect to login
          return;
        }
        
        // On error, use empty array
        setInventory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, []);

  const filteredInventory = inventory.filter((item) => {
    // Normalize search term (trim and lowercase)
    const q = searchTerm.trim().toLowerCase();
    
    // Safe null/undefined handling for all searchable fields
    const matchesSearch = q === '' || 
      ((item.product_name ?? '').toLowerCase().includes(q)) ||
      ((item.sku ?? '').toLowerCase().includes(q)) ||
      ((item.batch_number ?? '').toLowerCase().includes(q)) ||
      ((item.location ?? '').toLowerCase().includes(q));
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Debug logging
  console.log('[Inventory] Search term:', searchTerm);
  console.log('[Inventory] Total items:', inventory.length);
  console.log('[Inventory] Filtered count:', filteredInventory.length);
  if (inventory.length > 0) {
    console.log('[Inventory] Sample item keys:', Object.keys(inventory[0]));
    console.log('[Inventory] Sample item:', inventory[0]);
  }

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
    </div>
  );
}
