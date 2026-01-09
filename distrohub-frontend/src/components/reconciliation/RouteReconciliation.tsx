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
          {/* Quick Reconciliation Table */}
          <div className="mb-4">
            <h3 className="font-semibold text-slate-900 mb-2">Quick Reconciliation Table</h3>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-2 font-semibold text-slate-700">Invoice #</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Retailer</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Previous Due</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Current Bill</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Total Outstanding</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Collected Amount</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Return Qty</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Remaining Due</th>
                    <th className="text-center p-2 font-semibold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales.map((sale: any) => {
                    const routeSale = routeSales.find((rs: any) => rs.sale_id === sale.id);
                    const previousDue = routeSale?.previous_due || 0;
                    const currentBill = sale.total_amount || 0;
                    const totalOutstanding = previousDue + currentBill;
                    const collected = collectedCash[sale.id] || 0;
                    
                    // Calculate total returned amount for this sale
                    let saleReturnAmount = 0;
                    sale.items?.forEach((item: any) => {
                      const key = `${sale.id}_${item.id}`;
                      const returned = returnedItems[key];
                      if (returned && returned.quantity_returned > 0) {
                        const unitPrice = item.unit_price || 0;
                        const discount = item.discount || 0;
                        const itemSubtotal = unitPrice * item.quantity;
                        const itemDiscountAmount = (itemSubtotal * discount) / 100;
                        const itemTotal = itemSubtotal - itemDiscountAmount;
                        const unitPriceAfterDiscount = itemTotal / item.quantity;
                        saleReturnAmount += unitPriceAfterDiscount * returned.quantity_returned;
                      }
                    });
                    
                    const remainingDue = totalOutstanding - collected - saleReturnAmount;
                    
                    // Calculate total return qty
                    const totalReturnQty = sale.items?.reduce((sum: number, item: any) => {
                      const key = `${sale.id}_${item.id}`;
                      const returned = returnedItems[key];
                      return sum + (returned?.quantity_returned || 0);
                    }, 0) || 0;
                    
                    // Status color
                    let statusColor = 'bg-green-100 text-green-700';
                    let statusLabel = 'Paid';
                    if (remainingDue > 0.01) {
                      if (collected === 0 && totalReturnQty === 0) {
                        statusColor = 'bg-red-100 text-red-700';
                        statusLabel = 'Unpaid';
                      } else {
                        statusColor = 'bg-yellow-100 text-yellow-700';
                        statusLabel = 'Partial';
                      }
                    }

                    return (
                      <tr key={sale.id} className="hover:bg-slate-50">
                        <td className="p-2 font-medium text-primary-600">{sale.invoice_number}</td>
                        <td className="p-2 text-slate-900">{sale.retailer_name}</td>
                        <td className="p-2 text-right text-slate-700">৳{previousDue.toLocaleString()}</td>
                        <td className="p-2 text-right text-blue-600">৳{currentBill.toLocaleString()}</td>
                        <td className="p-2 text-right font-bold text-slate-900">৳{totalOutstanding.toLocaleString()}</td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={collected}
                            onChange={(e) => setCollectedCash(prev => ({
                              ...prev,
                              [sale.id]: Math.max(0, parseFloat(e.target.value) || 0)
                            }))}
                            className="w-32 input-field text-right"
                            min={0}
                            step="0.01"
                            placeholder="0"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              // Toggle return items view for this sale
                              const returnModal = document.getElementById(`return-modal-${sale.id}`);
                              if (returnModal) {
                                returnModal.classList.toggle('hidden');
                              }
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            {totalReturnQty > 0 ? `${totalReturnQty} items` : 'Add Returns'}
                          </button>
                        </td>
                        <td className={`p-2 text-right font-bold ${
                          remainingDue > 0.01 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          ৳{remainingDue.toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Return Items Details (Collapsible) */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900">Return Items Details</h3>
            {sales.map((sale: any) => (
              <div key={sale.id} id={`return-modal-${sale.id}`} className="hidden border border-slate-200 rounded-lg p-3">
                <div className="mb-2">
                  <p className="font-medium text-slate-900">{sale.invoice_number} - {sale.retailer_name}</p>
                </div>
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
            ))}
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
