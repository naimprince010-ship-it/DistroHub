import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import {
  Eye,
  RotateCcw,
  XCircle,
  Plus,
} from 'lucide-react';
import api from '@/lib/api';

interface SaleReturn {
  id: string;
  return_number: string;
  sale_id: string;
  retailer_name: string;
  total_return_amount: number;
  reason?: string;
  refund_type: 'adjust_due' | 'cash_refund';
  status: string;
  created_at: string;
  items: SaleReturnItem[];
}

interface SaleReturnItem {
  id: string;
  product_name: string;
  quantity_returned: number;
  unit_price: number;
  total_returned: number;
}

interface SalesOrder {
  id: string;
  invoice_number: string;
  retailer_name: string;
  order_date: string;
  total_amount: number;
  paid_amount: number;
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
  }>;
}

export function SalesReturns() {
  const [searchParams] = useSearchParams();
  const [sales, setSales] = useState<SalesOrder[]>([]);
  const [returns, setReturns] = useState<Map<string, SaleReturn[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<SalesOrder | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<SaleReturn | null>(null);

  // Fetch all sales
  const fetchSales = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[SalesReturns] No token found');
      setSales([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get('/api/sales');
      
      if (response.data) {
        const mappedSales: SalesOrder[] = response.data.map((sale: any) => ({
          id: sale.id || '',
          invoice_number: sale.invoice_number || '',
          retailer_name: sale.retailer_name || '',
          order_date: sale.created_at ? sale.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
          total_amount: sale.total_amount || 0,
          paid_amount: sale.paid_amount || 0,
          items: (sale.items || []).map((item: any) => ({
            id: item.id || '',
            product_name: item.product_name || '',
            quantity: item.quantity || 0,
            unit_price: item.unit_price || 0,
          })),
        }));
        setSales(mappedSales);

        // Fetch returns for each sale
        const returnsMap = new Map<string, SaleReturn[]>();
        for (const sale of mappedSales) {
          try {
            const returnsResponse = await api.get(`/api/sales/${sale.id}/returns`);
            if (returnsResponse.data && returnsResponse.data.length > 0) {
              returnsMap.set(sale.id, returnsResponse.data);
            }
          } catch (error) {
            // Sale might not have returns, that's okay
            console.log(`[SalesReturns] No returns for sale ${sale.id}`);
          }
        }
        setReturns(returnsMap);
      }
    } catch (error: any) {
      console.error('[SalesReturns] Error fetching sales:', error);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
    const globalSearch = searchParams.get('q') || '';
    setSearchTerm(globalSearch);
  }, [searchParams]);

  const filteredSales = sales.filter((sale) =>
    sale.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.retailer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalReturns = Array.from(returns.values()).flat().length;
  const totalReturnAmount = Array.from(returns.values())
    .flat()
    .reduce((sum, ret) => sum + ret.total_return_amount, 0);

  return (
    <div className="min-h-screen">
      <Header title="Sales Returns" />

      <div className="p-3">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <p className="text-slate-500 text-sm">Total Returns</p>
            <p className="text-2xl font-bold text-slate-900">{totalReturns}</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <p className="text-slate-500 text-sm">Total Return Amount</p>
            <p className="text-2xl font-bold text-red-600">৳ {totalReturnAmount.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <p className="text-slate-500 text-sm">Sales with Returns</p>
            <p className="text-2xl font-bold text-blue-600">{returns.size}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl p-2 shadow-sm mb-2">
          <input
            type="text"
            placeholder="Search by invoice number or retailer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field w-full"
          />
        </div>

        {/* Sales with Returns Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading sales returns...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-2 font-semibold text-slate-700">Invoice #</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Retailer</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Sale Date</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Sale Amount</th>
                    <th className="text-center p-2 font-semibold text-slate-700">Returns</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Return Amount</th>
                    <th className="text-center p-2 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.map((sale) => {
                    const saleReturns = returns.get(sale.id) || [];
                    const saleReturnAmount = saleReturns.reduce((sum, ret) => sum + ret.total_return_amount, 0);
                    
                    return (
                      <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2 font-medium text-primary-600">{sale.invoice_number}</td>
                        <td className="p-2 text-slate-900">{sale.retailer_name}</td>
                        <td className="p-2 text-slate-600">{sale.order_date}</td>
                        <td className="p-2 text-right font-medium text-slate-900">
                          ৳ {sale.total_amount.toLocaleString()}
                        </td>
                        <td className="p-2 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            <RotateCcw className="w-3 h-3" />
                            {saleReturns.length}
                          </span>
                        </td>
                        <td className="p-2 text-right font-medium text-red-600">
                          ৳ {saleReturnAmount.toLocaleString()}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center justify-center gap-1">
                            {saleReturns.length > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedReturn(saleReturns[0]);
                                }}
                                className="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                                title="View Returns"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedSale(sale);
                                setShowReturnModal(true);
                              }}
                              className="p-1 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Create Return"
                            >
                              <Plus className="w-4 h-4" />
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

          {!loading && filteredSales.length === 0 && (
            <div className="p-4 text-center text-slate-500">
              No sales found. Try adjusting your search.
            </div>
          )}
        </div>
      </div>

      {/* Create Return Modal */}
      {showReturnModal && selectedSale && (
        <CreateReturnModal
          sale={selectedSale}
          onClose={() => {
            setShowReturnModal(false);
            setSelectedSale(null);
          }}
          onSuccess={async () => {
            await fetchSales();
            setShowReturnModal(false);
            setSelectedSale(null);
          }}
        />
      )}

      {/* View Return Details Modal */}
      {selectedReturn && (
        <ReturnDetailsModal
          return={selectedReturn}
          onClose={() => setSelectedReturn(null)}
        />
      )}
    </div>
  );
}

function CreateReturnModal({
  sale,
  onClose,
  onSuccess,
}: {
  sale: SalesOrder;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    reason: '',
    refund_type: 'adjust_due' as 'adjust_due' | 'cash_refund',
    items: sale.items.map((item) => ({
      sale_item_id: item.id,
      product_name: item.product_name,
      quantity_sold: item.quantity,
      quantity_returned: 0,
      unit_price: item.unit_price,
    })),
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that at least one item has quantity_returned > 0
    const hasReturnItems = formData.items.some(item => item.quantity_returned > 0);
    if (!hasReturnItems) {
      alert('Please select at least one item to return');
      return;
    }

    // Validate quantities don't exceed sold quantities
    for (const item of formData.items) {
      if (item.quantity_returned > item.quantity_sold) {
        alert(`Cannot return more than sold for ${item.product_name}. Sold: ${item.quantity_sold}, Returning: ${item.quantity_returned}`);
        return;
      }
    }

    try {
      setLoading(true);
      
      const returnPayload = {
        reason: formData.reason || undefined,
        refund_type: formData.refund_type,
        items: formData.items
          .filter(item => item.quantity_returned > 0)
          .map(item => ({
            sale_item_id: item.sale_item_id,
            quantity_returned: item.quantity_returned,
          })),
      };

      console.log('[SalesReturns] Creating return:', returnPayload);
      await api.post(`/api/sales/${sale.id}/return`, returnPayload);
      console.log('[SalesReturns] Return created successfully');
      
      alert('Sales return created successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('[SalesReturns] Failed to create return:', error);
      alert(`Failed to create return: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const totalReturnAmount = formData.items.reduce(
    (sum, item) => sum + item.quantity_returned * item.unit_price,
    0
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-2 animate-fade-in">
        <div className="p-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Create Sales Return</h2>
            <p className="text-slate-500 text-sm">{sale.invoice_number} - {sale.retailer_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="input-field"
              rows={3}
              placeholder="Enter return reason (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Refund Type</label>
            <select
              value={formData.refund_type}
              onChange={(e) => setFormData({ ...formData, refund_type: e.target.value as 'adjust_due' | 'cash_refund' })}
              className="input-field"
            >
              <option value="adjust_due">Adjust Due Amount</option>
              <option value="cash_refund">Cash Refund</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Return Items</label>
            <div className="space-y-2">
              {formData.items.map((item, index) => (
                <div key={index} className="border border-slate-200 rounded-lg p-2">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-slate-900">{item.product_name}</p>
                      <p className="text-sm text-slate-500">
                        Sold: {item.quantity_sold} × ৳{item.unit_price} = ৳{(item.quantity_sold * item.unit_price).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600">Return Qty:</label>
                    <input
                      type="number"
                      min="0"
                      max={item.quantity_sold}
                      value={item.quantity_returned}
                      onChange={(e) => {
                        const newItems = [...formData.items];
                        newItems[index].quantity_returned = Math.min(
                          Math.max(0, parseInt(e.target.value) || 0),
                          item.quantity_sold
                        );
                        setFormData({ ...formData, items: newItems });
                      }}
                      className="input-field w-24"
                    />
                    <span className="text-sm text-slate-500">/ {item.quantity_sold}</span>
                    {item.quantity_returned > 0 && (
                      <span className="text-sm font-medium text-green-600 ml-auto">
                        ৳ {(item.quantity_returned * item.unit_price).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {totalReturnAmount > 0 && (
            <div className="bg-slate-50 rounded-lg p-2">
              <div className="flex justify-between">
                <span className="font-medium">Total Return Amount</span>
                <span className="font-bold text-lg text-red-600">
                  ৳ {totalReturnAmount.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReturnDetailsModal({
  return: returnData,
  onClose,
}: {
  return: SaleReturn;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-2 animate-fade-in">
        <div className="p-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{returnData.return_number}</h2>
            <p className="text-slate-500">{returnData.retailer_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <p className="text-sm text-slate-500">Return Date</p>
              <p className="font-medium">{returnData.created_at.split('T')[0]}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Refund Type</p>
              <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {returnData.refund_type === 'adjust_due' ? 'Adjust Due' : 'Cash Refund'}
              </span>
            </div>
            {returnData.reason && (
              <div className="col-span-2">
                <p className="text-sm text-slate-500">Reason</p>
                <p className="font-medium">{returnData.reason}</p>
              </div>
            )}
          </div>

          <h3 className="font-semibold text-slate-900 mb-2">Return Items</h3>
          <table className="w-full mb-3">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-2 text-sm font-medium text-slate-600">Product</th>
                <th className="text-right p-2 text-sm font-medium text-slate-600">Qty</th>
                <th className="text-right p-2 text-sm font-medium text-slate-600">Price</th>
                <th className="text-right p-2 text-sm font-medium text-slate-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {returnData.items.map((item, index) => (
                <tr key={index} className="border-b border-slate-100">
                  <td className="p-2">{item.product_name}</td>
                  <td className="p-2 text-right">{item.quantity_returned}</td>
                  <td className="p-2 text-right">৳ {item.unit_price}</td>
                  <td className="p-2 text-right font-medium">৳ {item.total_returned.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="bg-slate-50 rounded-lg p-2">
            <div className="flex justify-between pt-1">
              <span className="text-slate-900 font-medium">Total Return Amount</span>
              <span className="font-bold text-red-600">
                ৳ {returnData.total_return_amount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

