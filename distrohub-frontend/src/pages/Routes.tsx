import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
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
  assigned_to?: string; // Include for auto-suggest in route creation
}

const statusConfig = {
  pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
  in_progress: { icon: Truck, color: 'bg-blue-100 text-blue-700', label: 'In Progress' },
  completed: { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: 'Completed' },
  reconciled: { icon: FileCheck, color: 'bg-purple-100 text-purple-700', label: 'Reconciled' },
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

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleDelete = async (route: Route) => {
    if (!confirm(`Are you sure you want to delete route ${route.route_number}? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.delete(`/api/routes/${route.id}`);
      await fetchRoutes();
    } catch (error: any) {
      console.error('[Routes] Error deleting route:', error);
      alert(`Failed to delete route: ${error?.response?.data?.detail || error?.message}`);
    }
  };

  const filteredRoutes = routes;

  return (
    <div className="min-h-screen">
      <Header title="Routes / Batches" />

      <div className="p-3">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <p className="text-slate-500 text-sm">Total Routes</p>
            <p className="text-2xl font-bold text-slate-900">{routes.length}</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <p className="text-slate-500 text-sm">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">
              {routes.filter((r) => r.status === 'pending').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <p className="text-slate-500 text-sm">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">
              {routes.filter((r) => r.status === 'in_progress').length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <p className="text-slate-500 text-sm">Reconciled</p>
            <p className="text-2xl font-bold text-green-600">
              {routes.filter((r) => r.status === 'reconciled').length}
            </p>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-xl p-2 shadow-sm mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Filters can be added here */}
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Route
          </button>
        </div>

        {/* Routes Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading routes...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-2 font-semibold text-slate-700">Route #</th>
                    <th className="text-left p-2 font-semibold text-slate-700">SR Name</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Date</th>
                    <th className="text-center p-2 font-semibold text-slate-700">Orders</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Amount</th>
                    <th className="text-center p-2 font-semibold text-slate-700">Status</th>
                    <th className="text-center p-2 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRoutes.map((route) => {
                    const StatusIcon = statusConfig[route.status].icon;
                    return (
                      <tr key={route.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2 font-medium text-primary-600">{route.route_number}</td>
                        <td className="p-2 text-slate-900">{route.assigned_to_name}</td>
                        <td className="p-2 text-slate-600">{formatDateBD(route.route_date)}</td>
                        <td className="p-2 text-center">{route.total_orders}</td>
                        <td className="p-2 text-right font-medium text-slate-900">
                          ৳ {route.total_amount.toLocaleString()}
                        </td>
                        <td className="p-2 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[route.status].color}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig[route.status].label}
                          </span>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setLoadSheetRoute(route)}
                              className="px-2 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                              title="Load Sheet"
                            >
                              Load Sheet
                            </button>
                            <button
                              onClick={() => setSelectedRoute(route)}
                              className="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setBulkPrintRoute(route)}
                              className="p-1 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Print All Challans"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {route.status === 'completed' && (
                              <button
                                onClick={() => setReconcileRoute(route)}
                                className="px-2 py-1 text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                                title="Reconcile"
                              >
                                Reconcile
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(route)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete Route"
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
            </div>
          )}

          {!loading && filteredRoutes.length === 0 && (
            <div className="p-4 text-center text-slate-500">
              No routes found. Create a new route to get started.
            </div>
          )}
        </div>
      </div>

      {/* Create Route Modal */}
      {showCreateModal && (
        <CreateRouteModal
          onClose={() => setShowCreateModal(false)}
          onSave={async () => {
            await fetchRoutes();
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Route Details Modal */}
      {selectedRoute && (
        <RouteDetailsModal
          route={selectedRoute}
          onClose={() => setSelectedRoute(null)}
          onRefresh={fetchRoutes}
          onBulkPrint={() => {
            setSelectedRoute(null);
            setBulkPrintRoute(selectedRoute);
          }}
        />
      )}

      {/* Reconciliation Modal */}
      {reconcileRoute && (
        <ReconciliationModal
          route={reconcileRoute}
          onClose={() => setReconcileRoute(null)}
          onSuccess={async () => {
            await fetchRoutes();
            setReconcileRoute(null);
          }}
        />
      )}

      {/* Bulk Print Modal */}
      {bulkPrintRoute && (
        <BulkChallanPrint
          route={bulkPrintRoute}
          onClose={() => setBulkPrintRoute(null)}
        />
      )}

      {/* Load Sheet Modal */}
      {loadSheetRoute && (
        <LoadSheet
          route={loadSheetRoute}
          onClose={() => setLoadSheetRoute(null)}
        />
      )}
    </div>
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
        
        const [usersRes, salesRes] = await Promise.all([
          api.get('/api/users'),
          api.get('/api/sales')
        ]);
        
        if (usersRes.data) {
          const reps = usersRes.data
            .filter((u: any) => u.role === 'sales_rep')
            .map((u: any) => ({ id: u.id, name: u.name }));
          setSalesReps(reps);
        }
        
        if (salesRes.data) {
          // Filter sales that are not already in a route
          const available = salesRes.data
            .filter((s: any) => !s.route_id && s.payment_status !== 'paid')
            .map((s: any) => ({
              id: s.id,
              order_number: s.invoice_number,
              retailer_name: s.retailer_name,
              retailer_id: s.retailer_id,
              total_amount: s.total_amount,
              due_amount: s.due_amount,
              payment_status: s.payment_status,
              assigned_to: s.assigned_to || undefined, // Include assigned_to for auto-suggest
            }));
          setAvailableSales(available);
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

  // Fetch previous due when retailer is selected AND auto-suggest SR from selected sales
  useEffect(() => {
    const fetchPreviousDue = async () => {
      const retailerIds = new Set(
        formData.sale_ids
          .map(saleId => availableSales.find(s => s.id === saleId)?.retailer_id)
          .filter(Boolean) as string[]
      );

      const dueMap: Record<string, number> = {};
      for (const retailerId of retailerIds) {
        try {
          const response = await api.get(`/api/retailers/${retailerId}/previous-due`);
          dueMap[retailerId] = response.data.previous_due || 0;
        } catch (error) {
          console.error(`[CreateRouteModal] Error fetching previous due for retailer ${retailerId}:`, error);
          dueMap[retailerId] = 0;
        }
      }
      setPreviousDueMap(dueMap);
    };

    // Auto-suggest SR from selected sales (if all selected sales have the same assigned_to)
    // Also check for multiple assigned_to values to show warning
    if (formData.sale_ids.length > 0) {
      const selectedSales = formData.sale_ids
        .map(saleId => availableSales.find(s => s.id === saleId))
        .filter(Boolean) as typeof availableSales;
      
      if (selectedSales.length > 0) {
        const assignedToSet = new Set(
          selectedSales.map(s => s.assigned_to).filter(Boolean) as string[]
        );
        
        // If all selected sales have the same assigned_to, auto-fill it
        if (assignedToSet.size === 1 && !formData.assigned_to) {
          const suggestedSrId = Array.from(assignedToSet)[0];
          setFormData(prev => ({ ...prev, assigned_to: suggestedSrId }));
        }
        
        // Show warning if multiple assigned_to values exist (Route SR will override)
        if (assignedToSet.size > 1) {
          // Warning will be shown in UI below
        }
      }
    }

    if (formData.sale_ids.length > 0) {
      fetchPreviousDue();
    }
  }, [formData.sale_ids, availableSales]);

  // Check if selected sales have multiple assigned_to values
  const selectedSales = formData.sale_ids
    .map(saleId => availableSales.find(s => s.id === saleId))
    .filter(Boolean) as typeof availableSales;
  const assignedToSet = new Set(
    selectedSales.map(s => s.assigned_to).filter(Boolean) as string[]
  );
  const hasMultipleAssignedTo = assignedToSet.size > 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assigned_to || formData.sale_ids.length === 0) {
      alert('Please select an SR and at least one sale order');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/routes', {
        assigned_to: formData.assigned_to,
        route_date: formData.route_date,
        sale_ids: formData.sale_ids,
        notes: formData.notes || undefined,
      });
      onSave();
    } catch (error: any) {
      console.error('[CreateRouteModal] Error creating route:', error);
      alert(`Failed to create route: ${error?.response?.data?.detail || error?.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleSaleSelection = (saleId: string) => {
    setFormData(prev => ({
      ...prev,
      sale_ids: prev.sale_ids.includes(saleId)
        ? prev.sale_ids.filter(id => id !== saleId)
        : [...prev.sale_ids, saleId]
    }));
  };

  // Group sales by retailer
  const salesByRetailer = availableSales.reduce((acc, sale) => {
    if (!acc[sale.retailer_id]) {
      acc[sale.retailer_id] = [];
    }
    acc[sale.retailer_id].push(sale);
    return acc;
  }, {} as Record<string, SalesOrder[]>);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-2 animate-fade-in">
        <div className="p-3 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Create New Route</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  SR/Delivery Man <span className="text-red-500">*</span>
                </label>
                {hasMultipleAssignedTo && (
                  <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    ⚠️ <strong>Warning:</strong> Selected sales have different SR assignments. Route SR will override Sales SR for all included orders.
                  </div>
                )}
                <select
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  className="input-field"
                  required
                  disabled={loadingReps}
                >
                  <option value="">{loadingReps ? 'Loading SRs...' : 'Select SR'}</option>
                  {salesReps.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.name}
                    </option>
                  ))}
                </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Route Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.route_date}
                onChange={(e) => setFormData({ ...formData, route_date: e.target.value })}
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Select Sales Orders <span className="text-red-500">*</span>
            </label>
            <div className="border border-slate-200 rounded-lg p-2 max-h-96 overflow-y-auto">
              {loadingSales ? (
                <div className="p-4 text-center text-slate-500">Loading sales...</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(salesByRetailer).map(([retailerId, sales]) => {
                    const retailer = sales[0];
                    const previousDue = previousDueMap[retailerId] || 0;
                    const selectedSales = sales.filter(s => formData.sale_ids.includes(s.id));
                    const totalSelected = selectedSales.reduce((sum, s) => sum + s.total_amount, 0);
                    
                    return (
                      <div key={retailerId} className="border border-slate-200 rounded-lg p-2">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-medium text-slate-900">{retailer.retailer_name}</p>
                            <p className="text-xs text-slate-500">
                              Previous Due: ৳{previousDue.toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-slate-500">
                              {selectedSales.length} of {sales.length} selected
                            </p>
                            {selectedSales.length > 0 && (
                              <p className="text-sm font-medium">
                                Total: ৳{totalSelected.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          {sales.map((sale) => (
                            <label
                              key={sale.id}
                              className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={formData.sale_ids.includes(sale.id)}
                                onChange={() => toggleSaleSelection(sale.id)}
                                className="w-4 h-4"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium">{sale.order_number}</p>
                                <p className="text-xs text-slate-500">
                                  Amount: ৳{sale.total_amount.toLocaleString()} | 
                                  Due: ৳{sale.due_amount.toLocaleString()}
                                </p>
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
            <p className="text-xs text-slate-500 mt-1">
              Selected: {formData.sale_ids.length} order(s)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-field"
              rows={2}
              placeholder="Add any notes about this route..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || formData.sale_ids.length === 0}
            >
              {loading ? 'Creating...' : 'Create Route'}
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
  onBulkPrint
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
        <div className="bg-white rounded-2xl p-8">Loading...</div>
      </div>
    );
  }

  if (!routeDetails) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-2 animate-fade-in">
        <div className="p-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{routeDetails.route_number}</h2>
            <p className="text-slate-500">{routeDetails.assigned_to_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <p className="text-sm text-slate-500">Route Date</p>
              <p className="font-medium">{formatDateBD(routeDetails.route_date)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Status</p>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusConfig[routeDetails.status].color}`}>
                {statusConfig[routeDetails.status].label}
              </span>
            </div>
          </div>

          <h3 className="font-semibold text-slate-900 mb-2">Orders in Route</h3>
          <div className="space-y-2">
            {routeDetails.sales?.map((sale: any) => {
              const routeSale = routeDetails.route_sales?.find((rs: any) => rs.sale_id === sale.id);
              const previousDue = routeSale?.previous_due || 0;
              const currentBill = sale.total_amount || 0;
              const totalOutstanding = previousDue + currentBill;
              
              return (
                <div key={sale.id} className="border border-slate-200 rounded-lg p-2">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <p className="font-medium">{sale.invoice_number}</p>
                      <p className="text-sm text-slate-600">{sale.retailer_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-500">Previous Due</p>
                      <p className="font-medium">৳{previousDue.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm mt-2 pt-2 border-t border-slate-100">
                    <span className="text-slate-600">Current Bill:</span>
                    <span className="font-medium">৳{currentBill.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold mt-1 pt-1 border-t border-slate-200">
                    <span>Total Outstanding:</span>
                    <span className="text-red-600">৳{totalOutstanding.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-3 border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={async () => {
              try {
                await api.put(`/api/routes/${routeDetails.id}`, { status: 'completed' });
                onRefresh();
              } catch (error) {
                console.error('[RouteDetailsModal] Error updating route status:', error);
              }
            }}
            className="btn-secondary"
            disabled={routeDetails.status === 'completed' || routeDetails.status === 'reconciled'}
          >
            Mark as Completed
          </button>
          <button
            onClick={onBulkPrint}
            className="btn-primary flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print All Challans
          </button>
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

