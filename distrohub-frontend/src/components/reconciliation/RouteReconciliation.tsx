import { useState, useEffect } from 'react';
import { XCircle } from 'lucide-react';
import api from '@/lib/api';

interface Route {
  id: string;
  route_number: string;
  assigned_to_name: string;
  sales?: any[];
  route_sales?: any[];
}

interface ReconciliationItem {
  sale_id: string;
  sale_item_id: string;
  quantity_returned: number;
  return_reason?: string;
}

interface ReconciliationModalProps {
  route: Route;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReconciliationModal({ route, onClose, onSuccess }: ReconciliationModalProps) {
  const [routeDetails, setRouteDetails] = useState<Route | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [collectedCash, setCollectedCash] = useState<Record<string, number>>({});
  const [returnedItems, setReturnedItems] = useState<Record<string, ReconciliationItem>>({});

  useEffect(() => {
    const fetchRouteDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/routes/${route.id}`);
        setRouteDetails(response.data);
        
        // Initialize collected cash with 0
        const initialCash: Record<string, number> = {};
        response.data.sales?.forEach((sale: any) => {
          initialCash[sale.id] = 0;
        });
        setCollectedCash(initialCash);
      } catch (error) {
        console.error('[ReconciliationModal] Error fetching route details:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRouteDetails();
  }, [route.id]);

  if (loading || !routeDetails) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-8">Loading reconciliation data...</div>
      </div>
    );
  }

  const sales = routeDetails.sales || [];
  const routeSales = routeDetails.route_sales || [];

  // Calculate totals
  let totalExpected = 0;
  let totalCollected = 0;
  let totalReturns = 0;

  sales.forEach((sale: any) => {
    const routeSale = routeSales.find((rs: any) => rs.sale_id === sale.id);
    const previousDue = routeSale?.previous_due || 0;
    const currentBill = sale.total_amount || 0;
    const totalOutstanding = previousDue + currentBill;
    totalExpected += totalOutstanding;
    totalCollected += collectedCash[sale.id] || 0;
  });

  // Calculate returns amount from returned items
  sales.forEach((sale: any) => {
    sale.items?.forEach((item: any) => {
      const key = `${sale.id}_${item.id}`;
      const returned = returnedItems[key];
      if (returned && returned.quantity_returned > 0) {
        const unitPrice = item.unit_price || 0;
        const discount = item.discount || 0;
        // Calculate item total (with discount)
        const itemSubtotal = unitPrice * item.quantity;
        const itemDiscountAmount = (itemSubtotal * discount) / 100;
        const itemTotal = itemSubtotal - itemDiscountAmount;
        // Calculate unit price after discount
        const unitPriceAfterDiscount = itemTotal / item.quantity;
        // Return amount = unit price * returned quantity
        const returnAmount = unitPriceAfterDiscount * returned.quantity_returned;
        totalReturns += returnAmount;
      }
    });
  });

  const discrepancy = totalExpected - totalCollected - totalReturns;

  const handleReturnChange = (saleId: string, saleItemId: string, quantity: number, reason?: string) => {
    const key = `${saleId}_${saleItemId}`;
    if (quantity > 0) {
      setReturnedItems(prev => ({
        ...prev,
        [key]: {
          sale_id: saleId,
          sale_item_id: saleItemId,
          quantity_returned: quantity,
          return_reason: reason
        }
      }));
    } else {
      setReturnedItems(prev => {
        const newItems = { ...prev };
        delete newItems[key];
        return newItems;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (totalCollected < 0) {
      alert('Collected cash cannot be negative');
      return;
    }

    setSaving(true);
    try {
      const reconciliationItems = Object.values(returnedItems).filter(item => item.quantity_returned > 0);
      
      await api.post(`/api/routes/${route.id}/reconcile`, {
        total_collected_cash: totalCollected,
        total_returns_amount: totalReturns,
        reconciliation_items: reconciliationItems,
        notes: `Reconciliation for route ${routeDetails.route_number}`
      });

      alert('Reconciliation saved successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('[ReconciliationModal] Error saving reconciliation:', error);
      alert(`Failed to save reconciliation: ${error?.response?.data?.detail || error?.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto m-2 animate-fade-in">
        <div className="p-3 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Reconciliation - {routeDetails.route_number}</h2>
            <p className="text-slate-500">SR: {routeDetails.assigned_to_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3">
          <div className="space-y-4">
            {sales.map((sale: any) => {
              const routeSale = routeSales.find((rs: any) => rs.sale_id === sale.id);
              const previousDue = routeSale?.previous_due || 0;
              const currentBill = sale.total_amount || 0;
              const totalOutstanding = previousDue + currentBill;
              const collected = collectedCash[sale.id] || 0;

              return (
                <div key={sale.id} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium text-slate-900">{sale.invoice_number}</p>
                      <p className="text-sm text-slate-600">{sale.retailer_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Previous Due</p>
                      <p className="font-medium">৳{previousDue.toLocaleString()}</p>
                      <p className="text-xs text-slate-500 mt-1">Current Bill</p>
                      <p className="font-medium">৳{currentBill.toLocaleString()}</p>
                      <p className="text-xs text-slate-500 mt-1 font-semibold">Total Outstanding</p>
                      <p className="font-bold text-red-600">৳{totalOutstanding.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Collected Cash (৳)
                    </label>
                    <input
                      type="number"
                      value={collected}
                      onChange={(e) => setCollectedCash(prev => ({
                        ...prev,
                        [sale.id]: Math.max(0, parseFloat(e.target.value) || 0)
                      }))}
                      className="input-field"
                      min={0}
                      max={totalOutstanding}
                      step="0.01"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Expected: ৳{totalOutstanding.toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Returned Items
                    </label>
                    <div className="space-y-2">
                      {sale.items?.map((item: any) => {
                        const key = `${sale.id}_${item.id}`;
                        const returned = returnedItems[key];
                        const returnedQty = returned?.quantity_returned || 0;
                        const maxReturnable = item.quantity;

                        return (
                          <div key={item.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{item.product_name}</p>
                              <p className="text-xs text-slate-500">
                                Qty: {item.quantity} | Price: ৳{item.unit_price}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={returnedQty}
                                onChange={(e) => {
                                  const qty = Math.max(0, Math.min(maxReturnable, parseInt(e.target.value) || 0));
                                  handleReturnChange(sale.id, item.id, qty);
                                }}
                                className="w-20 input-field"
                                min={0}
                                max={maxReturnable}
                                placeholder="0"
                              />
                              <span className="text-xs text-slate-500">/ {maxReturnable}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-sm text-slate-600">Total Expected Cash</p>
                <p className="text-lg font-bold text-slate-900">৳{totalExpected.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Collected Cash</p>
                <p className="text-lg font-bold text-green-600">৳{totalCollected.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Returns Amount</p>
                <p className="text-lg font-bold text-orange-600">৳{totalReturns.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Discrepancy</p>
                <p className={`text-lg font-bold ${discrepancy === 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ৳{discrepancy.toLocaleString()}
                </p>
              </div>
            </div>
            {discrepancy !== 0 && (
              <div className={`p-2 rounded ${discrepancy > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                <p className="text-sm">
                  {discrepancy > 0 
                    ? `Shortage: ৳${discrepancy.toLocaleString()} (Expected more cash)` 
                    : `Excess: ৳${Math.abs(discrepancy).toLocaleString()} (Collected more than expected)`}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Reconciliation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
