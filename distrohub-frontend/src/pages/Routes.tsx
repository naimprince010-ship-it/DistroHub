import { useState, useEffect } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Eye,
  Printer,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  Trash2,
  FileCheck,
} from 'lucide-react';
import api from '@/lib/api';
import { formatDateBD } from '@/lib/utils';
import { BulkChallanPrint } from '@/components/print/BulkChallanPrint';
import { ReconciliationModal } from '@/components/reconciliation/RouteReconciliation';
import { LoadSheet } from '@/components/routes/LoadSheet';

interface Route {
  id: string;
  route_number: string;
  assigned_to: string;
  assigned_to_name: string;
  route_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'reconciled';
  total_orders: number;
  total_amount: number;
  notes?: string;
  created_at: string;
  completed_at?: string;
  reconciled_at?: string;
  sales?: any[];
  route_sales?: any[];
}

interface SalesOrder {
  id: string;
  order_number: string;
  retailer_name: string;
  retailer_id: string;
  total_amount: number;
  due_amount: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
  assigned_to?: string;
}

const statusVariantMap: Record<Route['status'], string> = {
  pending: 'warning',
  in_progress: 'info',
  completed: 'success',
  reconciled: 'purple',
};

const statusLabelMap: Record<Route['status'], string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  reconciled: 'Reconciled',
};

export function Routes() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [reconcileRoute, setReconcileRoute] = useState<Route | null>(null);
  const [bulkPrintRoute, setBulkPrintRoute] = useState<Route | null>(null);
  const [loadSheetRoute, setLoadSheetRoute] = useState<Route | null>(null);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/routes');
      setRoutes(response.data || []);
    } catch (error: any) {
      console.error('[Routes] Error fetching routes:', error);
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoutes(); }, []);

  const handleDelete = async (route: Route) => {
    if (!confirm(`Are you sure you want to delete route ${route.route_number}?`)) return;
    try {
      await api.delete(`/api/routes/${route.id}`);
      await fetchRoutes();
    } catch (error: any) {
      alert(`Failed to delete route: ${error?.response?.data?.detail || error?.message}`);
    }
  };

  return (
    <PageShell
      title="Routes / Batches"
      actions={
        <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Route
        </button>
      }
    >
      <div className="space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Routes" value={String(routes.length)} color="blue" icon={<Truck className="w-5 h-5" />} />
          <StatCard label="Pending" value={String(routes.filter((r) => r.status === 'pending').length)} color="amber" icon={<Clock className="w-5 h-5" />} />
          <StatCard label="In Progress" value={String(routes.filter((r) => r.status === 'in_progress').length)} color="purple" icon={<Truck className="w-5 h-5" />} />
          <StatCard label="Reconciled" value={String(routes.filter((r) => r.status === 'reconciled').length)} color="green" icon={<CheckCircle className="w-5 h-5" />} />
        </div>

        {/* Routes Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {loading ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">Loading routes…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Route #</th>
                    <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">SR Name</th>
                    <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="text-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Orders</th>
                    <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
                    <th className="text-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="text-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {routes.map((route) => (
                    <tr key={route.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-[hsl(var(--primary))]">{route.route_number}</td>
                      <td className="px-3 py-2.5 text-foreground">{route.assigned_to_name}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{formatDateBD(route.route_date)}</td>
                      <td className="px-3 py-2.5 text-center text-muted-foreground">{route.total_orders}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-foreground">৳ {route.total_amount.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge variant={statusVariantMap[route.status] as any}>{statusLabelMap[route.status]}</Badge>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setLoadSheetRoute(route)} className="px-2 py-1 text-xs font-medium bg-[hsl(var(--dh-blue))]/10 text-[hsl(var(--dh-blue))] hover:bg-[hsl(var(--dh-blue))]/20 rounded transition-colors" title="Load Sheet">
                            Load Sheet
                          </button>
                          <button onClick={() => setSelectedRoute(route)} className="p-1 rounded text-muted-foreground hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 transition-colors" title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => setBulkPrintRoute(route)} className="p-1 rounded text-muted-foreground hover:text-[hsl(var(--dh-green))] hover:bg-[hsl(var(--dh-green))]/10 transition-colors" title="Print All Challans">
                            <Printer className="w-4 h-4" />
                          </button>
                          {route.status === 'completed' && (
                            <button onClick={() => setReconcileRoute(route)} className="px-2 py-1 text-xs font-medium bg-[hsl(var(--dh-purple))]/10 text-[hsl(var(--dh-purple))] hover:bg-[hsl(var(--dh-purple))]/20 rounded transition-colors" title="Reconcile">
                              Reconcile
                            </button>
                          )}
                          <button onClick={() => handleDelete(route)} className="p-1 rounded text-muted-foreground hover:text-[hsl(var(--dh-red))] hover:bg-[hsl(var(--dh-red))]/10 transition-colors" title="Delete Route">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && routes.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">No routes found. Create a new route to get started.</div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateRouteModal onClose={() => setShowCreateModal(false)} onSave={async () => { await fetchRoutes(); setShowCreateModal(false); }} />
      )}
      {selectedRoute && (
        <RouteDetailsModal route={selectedRoute} onClose={() => setSelectedRoute(null)} onRefresh={fetchRoutes} onBulkPrint={() => { setSelectedRoute(null); setBulkPrintRoute(selectedRoute); }} />
      )}
      {reconcileRoute && (
        <ReconciliationModal route={reconcileRoute} onClose={() => setReconcileRoute(null)} onSuccess={async () => { await fetchRoutes(); setReconcileRoute(null); }} />
      )}
      {bulkPrintRoute && <BulkChallanPrint route={bulkPrintRoute} onClose={() => setBulkPrintRoute(null)} />}
      {loadSheetRoute && <LoadSheet route={loadSheetRoute} onClose={() => setLoadSheetRoute(null)} />}
    </PageShell>
  );
}

function CreateRouteModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [formData, setFormData] = useState({
    assigned_to: '',
    route_date: new Date().toISOString().split('T')[0],
    sale_ids: [] as string[],
    notes: '',
  });
  const [salesReps, setSalesReps] = useState<Array<{ id: string; name: string }>>([]);
  const [availableSales, setAvailableSales] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingReps, setLoadingReps] = useState(true);
  const [loadingSales, setLoadingSales] = useState(true);
  const [previousDueMap, setPreviousDueMap] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingReps(true);
        setLoadingSales(true);
        const [usersRes, salesRes] = await Promise.all([api.get('/api/users'), api.get('/api/sales')]);
        if (usersRes.data) {
          setSalesReps(usersRes.data.filter((u: any) => u.role === 'sales_rep').map((u: any) => ({ id: u.id, name: u.name })));
        }
        if (salesRes.data) {
          setAvailableSales(salesRes.data.filter((s: any) => !s.route_id && s.payment_status !== 'paid').map((s: any) => ({
            id: s.id, order_number: s.invoice_number, retailer_name: s.retailer_name, retailer_id: s.retailer_id,
            total_amount: s.total_amount, due_amount: s.due_amount, payment_status: s.payment_status, assigned_to: s.assigned_to || undefined,
          })));
        }
      } catch (error) {
        console.error('[CreateRouteModal] Error fetching data:', error);
      } finally {
        setLoadingReps(false);
        setLoadingSales(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchPreviousDue = async () => {
      const retailerIds = new Set(formData.sale_ids.map(saleId => availableSales.find(s => s.id === saleId)?.retailer_id).filter(Boolean) as string[]);
      const dueMap: Record<string, number> = {};
      for (const retailerId of retailerIds) {
        try {
          const response = await api.get(`/api/retailers/${retailerId}/previous-due`);
          dueMap[retailerId] = response.data.previous_due || 0;
        } catch {
          dueMap[retailerId] = 0;
        }
      }
      setPreviousDueMap(dueMap);
    };

    if (formData.sale_ids.length > 0) {
      const selectedSalesList = formData.sale_ids.map(saleId => availableSales.find(s => s.id === saleId)).filter(Boolean) as SalesOrder[];
      if (selectedSalesList.length > 0) {
        const assignedToSet = new Set(selectedSalesList.map(s => s.assigned_to).filter(Boolean) as string[]);
        if (assignedToSet.size === 1 && !formData.assigned_to) {
          const suggestedSrId = Array.from(assignedToSet)[0];
          setFormData(prev => ({ ...prev, assigned_to: suggestedSrId }));
        }
      }
      fetchPreviousDue();
    }
  }, [formData.sale_ids, availableSales]);

  const selectedSalesList = formData.sale_ids.map(saleId => availableSales.find(s => s.id === saleId)).filter(Boolean) as SalesOrder[];
  const hasMultipleAssignedTo = new Set(selectedSalesList.map(s => s.assigned_to).filter(Boolean) as string[]).size > 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assigned_to || formData.sale_ids.length === 0) { alert('Please select an SR and at least one sale order'); return; }
    setLoading(true);
    try {
      await api.post('/api/routes', { assigned_to: formData.assigned_to, route_date: formData.route_date, sale_ids: formData.sale_ids, notes: formData.notes || undefined });
      onSave();
    } catch (error: any) {
      alert(`Failed to create route: ${error?.response?.data?.detail || error?.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleSaleSelection = (saleId: string) => {
    setFormData(prev => ({ ...prev, sale_ids: prev.sale_ids.includes(saleId) ? prev.sale_ids.filter(id => id !== saleId) : [...prev.sale_ids, saleId] }));
  };

  const salesByRetailer = availableSales.reduce((acc, sale) => {
    if (!acc[sale.retailer_id]) acc[sale.retailer_id] = [];
    acc[sale.retailer_id].push(sale);
    return acc;
  }, {} as Record<string, SalesOrder[]>);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
      <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Create New Route</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">SR/Delivery Man <span className="text-[hsl(var(--dh-red))]">*</span></label>
              {hasMultipleAssignedTo && (
                <div className="mb-2 p-2 bg-[hsl(var(--dh-amber))]/5 border border-[hsl(var(--dh-amber))]/30 rounded text-xs text-[hsl(var(--dh-amber))]">
                  ⚠️ Selected sales have different SR assignments. Route SR will override for all included orders.
                </div>
              )}
              <select value={formData.assigned_to} onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })} className="input-field" required disabled={loadingReps}>
                <option value="">{loadingReps ? 'Loading SRs…' : 'Select SR'}</option>
                {salesReps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Route Date <span className="text-[hsl(var(--dh-red))]">*</span></label>
              <input type="date" value={formData.route_date} onChange={(e) => setFormData({ ...formData, route_date: e.target.value })} className="input-field" required />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Select Sales Orders <span className="text-[hsl(var(--dh-red))]">*</span></label>
            <div className="border border-border rounded-lg p-2 max-h-96 overflow-y-auto bg-muted/10">
              {loadingSales ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Loading sales…</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(salesByRetailer).map(([retailerId, sales]) => {
                    const retailer = sales[0];
                    const previousDue = previousDueMap[retailerId] || 0;
                    const selSales = sales.filter(s => formData.sale_ids.includes(s.id));
                    const totalSelected = selSales.reduce((sum, s) => sum + s.total_amount, 0);
                    return (
                      <div key={retailerId} className="border border-border rounded-lg p-3 bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-medium text-foreground">{retailer.retailer_name}</p>
                            <p className="text-xs text-muted-foreground">Previous Due: ৳{previousDue.toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">{selSales.length} of {sales.length} selected</p>
                            {selSales.length > 0 && <p className="text-xs font-medium text-foreground">Total: ৳{totalSelected.toLocaleString()}</p>}
                          </div>
                        </div>
                        <div className="space-y-1">
                          {sales.map((sale) => (
                            <label key={sale.id} className="flex items-center gap-2 p-2 hover:bg-muted/40 rounded cursor-pointer">
                              <input type="checkbox" checked={formData.sale_ids.includes(sale.id)} onChange={() => toggleSaleSelection(sale.id)} className="w-4 h-4" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">{sale.order_number}</p>
                                <p className="text-xs text-muted-foreground">Amount: ৳{sale.total_amount.toLocaleString()} | Due: ৳{sale.due_amount.toLocaleString()}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Selected: {formData.sale_ids.length} order(s)</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Notes (Optional)</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input-field" rows={2} placeholder="Add any notes about this route…" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading || formData.sale_ids.length === 0}>
              {loading ? 'Creating…' : 'Create Route'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RouteDetailsModal({
  route,
  onClose,
  onRefresh,
  onBulkPrint,
}: {
  route: Route;
  onClose: () => void;
  onRefresh: () => void;
  onBulkPrint: () => void;
}) {
  const [routeDetails, setRouteDetails] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/routes/${route.id}`);
        setRouteDetails(response.data);
      } catch (error) {
        console.error('[RouteDetailsModal] Error fetching route details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [route.id]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card border border-border rounded-2xl p-8 text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }
  if (!routeDetails) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
      <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{routeDetails.route_number}</h2>
            <p className="text-xs text-muted-foreground">{routeDetails.assigned_to_name}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Route Date</p>
              <p className="text-sm font-medium text-foreground">{formatDateBD(routeDetails.route_date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Status</p>
              <Badge variant={statusVariantMap[routeDetails.status] as any}>{statusLabelMap[routeDetails.status]}</Badge>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Orders in Route</h3>
            <div className="space-y-2">
              {routeDetails.sales?.map((sale: any) => {
                const routeSale = routeDetails.route_sales?.find((rs: any) => rs.sale_id === sale.id);
                const previousDue = routeSale?.previous_due || 0;
                const currentBill = sale.total_amount || 0;
                const totalOutstanding = previousDue + currentBill;
                return (
                  <div key={sale.id} className="border border-border rounded-lg p-3 bg-muted/10">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{sale.invoice_number}</p>
                        <p className="text-xs text-muted-foreground">{sale.retailer_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Previous Due</p>
                        <p className="text-sm font-mono font-medium text-foreground">৳{previousDue.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs mt-2 pt-2 border-t border-border/50">
                      <span className="text-muted-foreground">Current Bill:</span>
                      <span className="font-mono font-medium text-foreground">৳{currentBill.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold mt-1 pt-1 border-t border-border">
                      <span className="text-foreground">Total Outstanding:</span>
                      <span className="font-mono text-[hsl(var(--dh-red))]">৳{totalOutstanding.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
          <button
            onClick={async () => {
              try {
                await api.put(`/api/routes/${routeDetails.id}`, { status: 'completed' });
                onRefresh();
                onClose();
              } catch (error: any) {
                alert(`Failed to update route status: ${error?.response?.data?.detail || error?.message}`);
              }
            }}
            className="btn-secondary"
            disabled={routeDetails.status === 'completed' || routeDetails.status === 'reconciled'}
          >
            Mark as Completed
          </button>
          <button onClick={onBulkPrint} className="btn-primary flex items-center gap-2">
            <Printer className="w-4 h-4" />
            Print All Challans
          </button>
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  );
}
