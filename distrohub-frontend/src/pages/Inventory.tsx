import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

type InvStatusVariant = 'success' | 'warning' | 'danger' | 'info';
const statusConfig: Record<string, { variant: InvStatusVariant; label: string }> = {
  in_stock: { variant: 'success', label: 'In Stock' },
  low_stock: { variant: 'warning', label: 'Low Stock' },
  expiring: { variant: 'danger', label: 'Expiring Soon' },
  expired:  { variant: 'danger',  label: 'Expired' },
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
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading warehouses…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground">Warehouses</h3>
        <button onClick={handleAdd} className="btn-primary flex items-center gap-2 h-9 px-3 text-sm">
          <Plus className="w-4 h-4" />
          Add Warehouse
        </button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Address</th>
                <th className="text-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Stock Count</th>
                <th className="text-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {warehouses.map((warehouse) => {
                const stockCount = stockCounts[warehouse.id] || 0;
                const hasStock = stockCount > 0;
                return (
                  <tr key={warehouse.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Warehouse className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">{warehouse.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {warehouse.address ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{warehouse.address}</span>
                        </div>
                      ) : <span className="text-muted-foreground/50 italic">No address</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Badge variant={warehouse.is_active ? 'success' : 'muted'}>
                        {warehouse.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-medium text-foreground">
                      {stockCount.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleEdit(warehouse)}
                          className="p-1.5 rounded text-muted-foreground hover:text-[hsl(var(--dh-blue))] hover:bg-[hsl(var(--dh-blue))]/10 transition-colors"
                          title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(warehouse.id)} disabled={hasStock}
                          className={`p-1.5 rounded transition-colors ${hasStock ? 'text-muted-foreground/30 cursor-not-allowed' : 'text-muted-foreground hover:text-[hsl(var(--dh-red))] hover:bg-[hsl(var(--dh-red))]/10'}`}
                          title={hasStock ? 'Cannot delete warehouse with stock' : 'Delete'}>
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
            <div className="py-8 text-center text-sm text-muted-foreground">No warehouses found. Click "Add Warehouse" to create one.</div>
          )}
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}</h2>
              <button onClick={() => { setShowModal(false); setEditingWarehouse(null); setFormData({ name: '', address: '', is_active: true }); setError(''); }}
                className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {error && <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 py-2 rounded-lg text-sm">{error}</div>}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Warehouse Name <span className="text-[hsl(var(--dh-red))]">*</span></label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field" required placeholder="e.g., Main Warehouse" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-foreground">Address</label>
                <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input-field" rows={3} placeholder="Warehouse address…" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="w-4 h-4 rounded" />
                <span className="text-sm font-medium text-foreground">Active</span>
              </label>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditingWarehouse(null); setFormData({ name: '', address: '', is_active: true }); setError(''); }} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">{editingWarehouse ? 'Update' : 'Create'}</button>
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
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Items"   value={totalItems.toLocaleString()} icon={Package}       color="blue" />
        <StatCard label="Low Stock"     value={lowStockCount}               icon={TrendingDown}  color="amber" />
        <StatCard label="Expiring Soon" value={expiringCount}               icon={AlertTriangle} color="purple" />
        <StatCard label="Expired"       value={expiredCount}                icon={TrendingUp}    color="red" />
      </div>

      {/* Table card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Stock Overview</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input type="text" placeholder="Search inventory…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field pl-8 h-9 w-48 text-sm" />
              </div>
              <div className="relative">
                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field pl-8 h-9 w-40 text-sm">
                  <option value="all">All Status</option>
                  <option value="in_stock">In Stock</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="expiring">Expiring Soon</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div className="relative">
                <Warehouse className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="input-field pl-8 h-9 w-40 text-sm">
                  <option value="all">All Warehouses</option>
                  {warehouses.map((wh) => <option key={wh.id} value={wh.name}>{wh.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading inventory…</div>
          ) : (
            <div className="dh-table-shell border-0 shadow-none">
              <table className="w-full border-collapse text-sm">
                <thead className="border-b border-border/80 bg-muted/35">
                  <tr>
                    <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Product</th>
                    <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">SKU</th>
                    <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Batch</th>
                    <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Expiry</th>
                    <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Quantity</th>
                    <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Warehouse</th>
                    <th className="text-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredInventory.map((item) => (
                    <tr key={item.id} className="transition-colors duration-150 ease-out hover:bg-muted/45">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-[hsl(var(--primary))]/10 rounded-lg flex items-center justify-center">
                            <Package className="w-4 h-4 text-[hsl(var(--primary))]" />
                          </div>
                          <span className="font-medium text-foreground">{item.product_name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{item.sku}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{item.batch_number}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          {(item.status === 'expiring' || item.status === 'expired') && <AlertTriangle className="w-3.5 h-3.5 text-[hsl(var(--dh-amber))]" />}
                          <span className={item.status === 'expired' ? 'text-[hsl(var(--dh-red))] font-medium text-xs' : item.status === 'expiring' ? 'text-[hsl(var(--dh-amber))] font-medium text-xs' : 'text-muted-foreground text-xs'}>
                            {item.expiry_date}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={`font-mono font-medium ${item.status === 'low_stock' ? 'text-[hsl(var(--dh-amber))]' : 'text-foreground'}`}>
                          {item.quantity} {item.unit}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground text-sm">{item.location}</td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge variant={statusConfig[item.status].variant}>{statusConfig[item.status].label}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && filteredInventory.length === 0 && (
            <div className="dh-empty-state">
              <p className="dh-empty-state-title">No inventory items</p>
              <p className="dh-empty-state-desc">Try adjusting your search or filters.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FIFO Notice */}
      <div className="bg-[hsl(var(--dh-blue))]/5 border border-[hsl(var(--dh-blue))]/20 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-[hsl(var(--dh-blue))] mt-0.5 shrink-0" />
          <div>
            <h4 className="font-medium text-foreground text-sm">FIFO Inventory Management</h4>
            <p className="text-sm text-muted-foreground">
              Products are automatically suggested for sale based on First-In-First-Out (FIFO) principle. Items with earlier expiry dates are prioritized.
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
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams, activeTab]);

  const tabs = [
    { id: 'stock', label: 'Stock Overview', icon: Package },
    { id: 'warehouses', label: 'Warehouse Management', icon: Warehouse },
  ];

  const handleTabChange = (tabId: string) => {
    if (tabId !== activeTab) {
      setActiveTab(tabId);
      setSearchParams({ tab: tabId }, { replace: true });
    }
  };

  return (
    <PageShell title="Inventory">
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-border px-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-[hsl(var(--primary))] border-[hsl(var(--primary))]'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-4">
          {activeTab === 'stock' && <StockOverview />}
          {activeTab === 'warehouses' && <WarehouseManagement />}
        </div>
      </div>
    </PageShell>
  );
}
