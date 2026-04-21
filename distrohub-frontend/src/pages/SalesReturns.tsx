import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
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

  const fetchSales = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
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

        const returnsMap = new Map<string, SaleReturn[]>();
        for (const sale of mappedSales) {
          try {
            const returnsResponse = await api.get(`/api/sales/${sale.id}/returns`);
            if (returnsResponse.data && returnsResponse.data.length > 0) {
              returnsMap.set(sale.id, returnsResponse.data);
            }
          } catch {
            // Sale might not have returns
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
    <PageShell title="Sales Returns">
      <div className="space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StatCard label="Total Returns" value={String(totalReturns)} color="blue" icon={RotateCcw} />
          <StatCard label="Total Return Amount" value={`৳ ${totalReturnAmount.toLocaleString()}`} color="red" />
          <StatCard label="Sales with Returns" value={String(returns.size)} color="purple" />
        </div>

        {/* Search Bar */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-3">
          <input
            type="text"
            placeholder="Search by invoice number or retailer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field w-full"
          />
        </div>

        {/* Sales Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {loading ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">Loading sales returns…</div>
          ) : (
            <div className="dh-table-shell border-0 shadow-none">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Invoice #</th>
                    <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Retailer</th>
                    <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sale Date</th>
                    <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sale Amount</th>
                    <th className="text-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Returns</th>
                    <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Return Amount</th>
                    <th className="text-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredSales.map((sale) => {
                    const saleReturns = returns.get(sale.id) || [];
                    const saleReturnAmount = saleReturns.reduce((sum, ret) => sum + ret.total_return_amount, 0);
                    return (
                      <tr key={sale.id} className="transition-colors duration-150 ease-out hover:bg-muted/45">
                        <td className="px-3 py-2.5 font-medium text-[hsl(var(--primary))]">{sale.invoice_number}</td>
                        <td className="px-3 py-2.5 text-foreground">{sale.retailer_name}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{sale.order_date}</td>
                        <td className="px-3 py-2.5 text-right font-mono font-semibold text-foreground">৳ {sale.total_amount.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-center">
                          {saleReturns.length > 0 ? (
                            <Badge variant="info" className="gap-1">
                              <RotateCcw className="w-3 h-3" />{saleReturns.length}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/50 text-xs">–</span>
                          )}
                        </td>
                        <td className={`px-3 py-2.5 text-right font-mono font-semibold ${saleReturnAmount > 0 ? 'text-[hsl(var(--dh-red))]' : 'text-muted-foreground/50'}`}>
                          ৳ {saleReturnAmount.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            {saleReturns.length > 0 && (
                              <button
                                onClick={() => setSelectedReturn(saleReturns[0])}
                                className="p-1 rounded text-muted-foreground hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 transition-colors"
                                title="View Returns"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => { setSelectedSale(sale); setShowReturnModal(true); }}
                              className="p-1 rounded text-muted-foreground hover:text-[hsl(var(--dh-green))] hover:bg-[hsl(var(--dh-green))]/10 transition-colors"
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
            <div className="dh-empty-state py-10">
              <p className="dh-empty-state-title">No sales found</p>
              <p className="dh-empty-state-desc">Try adjusting your search.</p>
            </div>
          )}
        </div>
      </div>

      {showReturnModal && selectedSale && (
        <CreateReturnModal
          sale={selectedSale}
          onClose={() => { setShowReturnModal(false); setSelectedSale(null); }}
          onSuccess={async () => { await fetchSales(); setShowReturnModal(false); setSelectedSale(null); }}
        />
      )}

      {selectedReturn && (
        <ReturnDetailsModal return={selectedReturn} onClose={() => setSelectedReturn(null)} />
      )}
    </PageShell>
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
    const hasReturnItems = formData.items.some(item => item.quantity_returned > 0);
    if (!hasReturnItems) { alert('Please select at least one item to return'); return; }
    for (const item of formData.items) {
      if (item.quantity_returned > item.quantity_sold) {
        alert(`Cannot return more than sold for ${item.product_name}.`);
        return;
      }
    }
    try {
      setLoading(true);
      const returnPayload = {
        reason: formData.reason || undefined,
        refund_type: formData.refund_type,
        items: formData.items.filter(item => item.quantity_returned > 0).map(item => ({
          sale_item_id: item.sale_item_id,
          quantity_returned: item.quantity_returned,
        })),
      };
      await api.post(`/api/sales/${sale.id}/return`, returnPayload);
      alert('Sales return created successfully!');
      onSuccess();
    } catch (error: any) {
      alert(`Failed to create return: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const totalReturnAmount = formData.items.reduce((sum, item) => sum + item.quantity_returned * item.unit_price, 0);

  return (
    <div className="dh-modal-overlay">
      <div className="dh-modal-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Create Sales Return</h2>
            <p className="text-xs text-muted-foreground">{sale.invoice_number} — {sale.retailer_name}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Reason</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="input-field"
              rows={3}
              placeholder="Enter return reason (optional)"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Refund Type</label>
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
            <label className="block text-xs font-medium text-muted-foreground mb-2">Return Items</label>
            <div className="space-y-2">
              {formData.items.map((item, index) => (
                <div key={index} className="border border-border rounded-lg p-3 bg-muted/20">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Sold: {item.quantity_sold} × ৳{item.unit_price} = ৳{(item.quantity_sold * item.unit_price).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Return Qty:</label>
                    <input
                      type="number"
                      min="0"
                      max={item.quantity_sold}
                      value={item.quantity_returned}
                      onChange={(e) => {
                        const newItems = [...formData.items];
                        newItems[index].quantity_returned = Math.min(Math.max(0, parseInt(e.target.value) || 0), item.quantity_sold);
                        setFormData({ ...formData, items: newItems });
                      }}
                      className="input-field w-24"
                    />
                    <span className="text-xs text-muted-foreground">/ {item.quantity_sold}</span>
                    {item.quantity_returned > 0 && (
                      <span className="text-sm font-medium text-[hsl(var(--dh-green))] ml-auto">
                        ৳ {(item.quantity_returned * item.unit_price).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {totalReturnAmount > 0 && (
            <div className="rounded-lg bg-[hsl(var(--dh-red))]/5 border border-[hsl(var(--dh-red))]/20 p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">Total Return Amount</span>
                <span className="font-bold text-lg font-mono text-[hsl(var(--dh-red))]">৳ {totalReturnAmount.toLocaleString()}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create Return'}
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
    <div className="dh-modal-overlay">
      <div className="dh-modal-panel w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">{returnData.return_number}</h2>
            <p className="text-xs text-muted-foreground">{returnData.retailer_name}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Return Date</p>
              <p className="text-sm font-medium text-foreground">{returnData.created_at.split('T')[0]}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Refund Type</p>
              <Badge variant={returnData.refund_type === 'cash_refund' ? 'warning' : 'info'}>
                {returnData.refund_type === 'adjust_due' ? 'Adjust Due' : 'Cash Refund'}
              </Badge>
            </div>
            {returnData.reason && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-0.5">Reason</p>
                <p className="text-sm text-foreground">{returnData.reason}</p>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Return Items</h3>
            <div className="dh-table-shell">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="text-left px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Product</th>
                    <th className="text-right px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Qty</th>
                    <th className="text-right px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Price</th>
                    <th className="text-right px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {returnData.items.map((item, index) => (
                    <tr key={index} className="transition-colors duration-150 ease-out hover:bg-muted/45">
                      <td className="px-3 py-2 text-foreground">{item.product_name}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">{item.quantity_returned}</td>
                      <td className="px-3 py-2 text-right font-mono text-muted-foreground">৳ {item.unit_price}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-foreground">৳ {item.total_returned.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-lg bg-[hsl(var(--dh-red))]/5 border border-[hsl(var(--dh-red))]/20 p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">Total Return Amount</span>
              <span className="font-bold text-lg font-mono text-[hsl(var(--dh-red))]">৳ {returnData.total_return_amount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-border flex justify-end">
          <button onClick={onClose} className="btn-primary">Close</button>
        </div>
      </div>
    </div>
  );
}
