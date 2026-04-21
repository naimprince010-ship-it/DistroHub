import { useState, useEffect } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Phone,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  X,
} from 'lucide-react';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useTableControls } from '@/hooks/useTableControls';
import { PaginationControls } from '@/components/ui/pagination-controls';

interface Receivable {
  id: string;
  retailer_id: string;
  retailer_name: string;
  shop_name: string;
  phone: string;
  total_due: number;
  last_payment_date: string | null;
  days_overdue: number;
  orders: { order_number: string; invoice_number: string; amount: number; date: string; sale_id: string }[];
}

export function Receivables() {
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [amountFilter, setAmountFilter] = useState<string>('all');
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchReceivables = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [response, agingResponse, salesResponse] = await Promise.all([
        api.get('/api/receivables'),
        api.get('/api/receivables/aging').catch(() => ({ data: [] })),
        api.get('/api/sales').catch(() => ({ data: [] })),
      ]);
      const receivablesData = response.data || [];
      const agingRows = Array.isArray(agingResponse.data) ? agingResponse.data : [];
      const agingMap = new Map<string, any>(agingRows.map((row: any) => [row.retailer_id, row]));
      const allSales = Array.isArray(salesResponse.data) ? salesResponse.data : [];
      
      // Build outstanding orders from a single sales fetch (avoid per-row requests)
      const receivablesWithOrders = await Promise.all(
        receivablesData.map(async (r: any) => {
          const outstandingOrders = allSales
            .filter((sale: any) => 
              sale.retailer_id === r.retailer_id && 
              sale.due_amount > 0
            )
            .map((sale: any) => ({
              order_number: sale.order_number || sale.invoice_number,
              invoice_number: sale.invoice_number,
              amount: sale.due_amount,
              date: sale.created_at || sale.order_date,
              sale_id: sale.id
            }));

            const aging = agingMap.get(r.retailer_id);
            // Calculate days_overdue from aging buckets (fallback: previous behavior)
            let daysOverdue = 0;
            if (aging) {
              if ((aging.bucket_60_plus || 0) > 0) daysOverdue = 61;
              else if ((aging.bucket_31_60 || 0) > 0) daysOverdue = 31;
              else if ((aging.bucket_16_30 || 0) > 0) daysOverdue = 16;
              else if ((aging.bucket_8_15 || 0) > 0) daysOverdue = 8;
              else daysOverdue = 0;
            } else if (r.last_payment_date) {
              const lastPayment = new Date(r.last_payment_date);
              const today = new Date();
              const diffTime = today.getTime() - lastPayment.getTime();
              daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            } else {
              // If no payment history, use oldest order date
              if (outstandingOrders.length > 0) {
                const oldestOrder = outstandingOrders.reduce((oldest: any, order: any) => {
                  return new Date(order.date) < new Date(oldest.date) ? order : oldest;
                });
                const oldestDate = new Date(oldestOrder.date);
                const today = new Date();
                const diffTime = today.getTime() - oldestDate.getTime();
                daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              }
            }

          return {
            id: r.retailer_id,
            retailer_id: r.retailer_id,
            retailer_name: r.retailer_name,
            shop_name: r.shop_name,
            phone: r.phone,
            total_due: parseFloat(aging?.total_due ?? r.total_due ?? 0),
            last_payment_date: r.last_payment_date || null,
            days_overdue: daysOverdue,
            orders: outstandingOrders
          };
        })
      );

      setReceivables(receivablesWithOrders);
    } catch (error) {
      console.error('[Receivables] Error fetching receivables:', error);
      setLoadError('Failed to load receivables. Please try again.');
      toast({
        title: 'Load failed',
        description: 'Could not load receivables. Please retry.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch receivables from API
  useEffect(() => {
    fetchReceivables();
  }, []);

  type OverdueVariant = 'success' | 'warning' | 'danger' | 'info';
  const getOverdueStatus = (days: number): { variant: OverdueVariant; label: string; key: string } => {
    if (days <= 7) return { variant: 'success', label: 'Current', key: 'current' };
    if (days <= 15) return { variant: 'warning', label: 'Overdue', key: 'overdue' };
    if (days <= 30) return { variant: 'danger', label: 'Past Due', key: 'past_due' };
    return { variant: 'danger', label: 'Critical', key: 'critical' };
  };

  const filteredReceivables = receivables.filter((r) => {
    const matchesSearch =
      r.retailer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.phone.includes(searchTerm);
    
    const status = getOverdueStatus(r.days_overdue);
    const matchesStatus = statusFilter === 'all' || status.key === statusFilter;
    
    const matchesAmount = amountFilter === 'all' ||
      (amountFilter === 'small' && r.total_due < 10000) ||
      (amountFilter === 'medium' && r.total_due >= 10000 && r.total_due < 30000) ||
      (amountFilter === 'large' && r.total_due >= 30000);
    
    return matchesSearch && matchesStatus && matchesAmount;
  });
  const receivablesTable = useTableControls(filteredReceivables, { initialSortKey: 'shop_name', pageSize: 8 });

  const activeFiltersCount = [statusFilter, amountFilter].filter(f => f !== 'all').length;

  const clearFilters = () => {
    setStatusFilter('all');
    setAmountFilter('all');
    setSearchTerm('');
  };

  const totalDue = receivables.reduce((sum, r) => sum + r.total_due, 0);
  const overdueCount = receivables.filter((r) => r.days_overdue > 7).length;
  const agingSummary = receivables.reduce(
    (acc, r) => {
      if (r.days_overdue <= 7) acc.current += r.total_due;
      else if (r.days_overdue <= 15) acc.bucket_8_15 += r.total_due;
      else if (r.days_overdue <= 30) acc.bucket_16_30 += r.total_due;
      else if (r.days_overdue <= 60) acc.bucket_31_60 += r.total_due;
      else acc.bucket_60_plus += r.total_due;
      return acc;
    },
    { current: 0, bucket_8_15: 0, bucket_16_30: 0, bucket_31_60: 0, bucket_60_plus: 0 }
  );

  return (
    <PageShell title="Receivables (বাকি হিসাব)">
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading receivables…</div>
      ) : (
        <>
          {loadError ? (
            <div className="rounded-xl border border-[hsl(var(--dh-red))]/30 bg-[hsl(var(--dh-red))]/5 p-3 text-sm text-[hsl(var(--dh-red))]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{loadError}</span>
                <button type="button" onClick={() => void fetchReceivables()} className="btn-secondary h-8 px-3 text-xs">
                  Retry
                </button>
              </div>
            </div>
          ) : null}
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Total Receivables" value={`৳ ${totalDue.toLocaleString()}`} icon={DollarSign} color="red" />
            <StatCard label="Overdue Accounts"  value={overdueCount}                      icon={AlertCircle} color="amber" />
            <StatCard label="Total Accounts"    value={receivables.length}                icon={Clock}       color="blue" />
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Current (0-7)</p><p className="font-semibold">৳ {agingSummary.current.toLocaleString()}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">8-15 days</p><p className="font-semibold text-amber-600">৳ {agingSummary.bucket_8_15.toLocaleString()}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">16-30 days</p><p className="font-semibold text-orange-600">৳ {agingSummary.bucket_16_30.toLocaleString()}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">31-60 days</p><p className="font-semibold text-red-600">৳ {agingSummary.bucket_31_60.toLocaleString()}</p></CardContent></Card>
            <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">60+ days</p><p className="font-semibold text-[hsl(var(--dh-red))]">৳ {agingSummary.bucket_60_plus.toLocaleString()}</p></CardContent></Card>
          </div>

          {/* Filter bar */}
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-52">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input type="text" placeholder="Search retailer or shop…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field pl-8 h-9 text-sm w-full" />
                </div>
                <div className="relative">
                  <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field pl-8 h-9 w-36 text-sm">
                    <option value="all">All Status</option>
                    <option value="current">Current</option>
                    <option value="overdue">Overdue</option>
                    <option value="past_due">Past Due</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <select value={amountFilter} onChange={(e) => setAmountFilter(e.target.value)} className="input-field h-9 w-44 text-sm">
                  <option value="all">All Amounts</option>
                  <option value="small">&lt; ৳10,000</option>
                  <option value="medium">৳10,000 – ৳30,000</option>
                  <option value="large">&gt; ৳30,000</option>
                </select>
                <button
                  type="button"
                  onClick={() => receivablesTable.toggleSort('total_due')}
                  className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-muted-foreground"
                >
                  Due {receivablesTable.sortKey === 'total_due' ? (receivablesTable.sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                </button>
                {activeFiltersCount > 0 && (
                  <button onClick={clearFilters} className="flex items-center gap-1 h-9 px-3 text-sm rounded-lg border border-[hsl(var(--dh-red))]/30 bg-[hsl(var(--dh-red))]/5 text-[hsl(var(--dh-red))] hover:bg-[hsl(var(--dh-red))]/10 transition-colors">
                    <X className="w-3.5 h-3.5" /> Clear ({activeFiltersCount})
                  </button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Receivables List */}
          <div className="space-y-2">
            {receivablesTable.paginatedRows.map((receivable) => {
              const status = getOverdueStatus(receivable.days_overdue);
              return (
                <Card key={receivable.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedReceivable(receivable)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">{receivable.shop_name}</h3>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{receivable.retailer_name}</p>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{receivable.phone}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Last payment: {receivable.last_payment_date || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-bold font-mono text-[hsl(var(--dh-red))]">৳ {receivable.total_due.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mb-2">{receivable.days_overdue} days overdue</p>
                        <div className="mb-2 h-1.5 w-28 rounded-full bg-muted">
                          <div
                            className="h-1.5 rounded-full bg-[hsl(var(--dh-red))]"
                            style={{ width: `${Math.min(100, Math.max(8, receivable.days_overdue * 2))}%` }}
                          />
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedReceivable(receivable); setShowPaymentModal(true); }} className="btn-primary text-xs h-7 px-3">
                          Record Payment
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {filteredReceivables.length > 0 ? (
            <PaginationControls
              page={receivablesTable.page}
              totalPages={receivablesTable.totalPages}
              totalRows={receivablesTable.totalRows}
              onPageChange={receivablesTable.setPage}
            />
          ) : null}

          {filteredReceivables.length === 0 && (
            <div className="dh-empty-state py-10">
              <p className="dh-empty-state-title">No receivables found</p>
              <p className="dh-empty-state-desc">All accounts are clear.</p>
            </div>
          )}
        </>
      )}

      {/* Receivable Details Modal */}
      {selectedReceivable && !showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/40">
          <div className="absolute inset-y-0 right-0 w-full max-w-xl overflow-y-auto border-l border-border bg-card shadow-xl">
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">{selectedReceivable.shop_name}</h2>
              <p className="text-sm text-muted-foreground">{selectedReceivable.retailer_name}</p>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-[hsl(var(--dh-red))]/5 border border-[hsl(var(--dh-red))]/20 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Due</p>
                <p className="text-2xl font-bold font-mono text-[hsl(var(--dh-red))]">৳ {selectedReceivable.total_due.toLocaleString()}</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2 text-sm">Outstanding Orders Timeline</h3>
                <div className="space-y-2">
                  {selectedReceivable.orders.map((order, index) => (
                    <div key={index} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-2.5">
                      <div>
                        <p className="font-medium text-[hsl(var(--primary))] text-sm">{order.invoice_number || order.order_number}</p>
                        <p className="text-xs text-muted-foreground">{new Date(order.date).toLocaleDateString('en-BD')}</p>
                      </div>
                      <p className="font-semibold font-mono text-foreground text-sm">৳ {order.amount.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-card p-4 border-t border-border flex justify-end gap-2">
              <button onClick={() => setSelectedReceivable(null)} className="btn-secondary">Close</button>
              <button onClick={() => setShowPaymentModal(true)} className="btn-primary">Record Payment</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedReceivable && (
        <PaymentModal
          receivable={selectedReceivable}
          onPaymentRecorded={async () => {
            await fetchReceivables();
          }}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedReceivable(null);
          }}
        />
      )}
    </PageShell>
  );
}

function PaymentModal({
  receivable,
  onClose,
  onPaymentRecorded,
}: {
  receivable: Receivable;
  onClose: () => void;
  onPaymentRecorded: () => Promise<void> | void;
}) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  // If there's only one outstanding order, auto-select it
  useEffect(() => {
    if (receivable.orders.length === 1) {
      setSelectedSaleId(receivable.orders[0].sale_id);
    }
  }, [receivable]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const paymentAmount = parseFloat(amount);
    
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid payment amount.',
        variant: 'destructive',
      });
      return;
    }
    
    if (paymentAmount > receivable.total_due) {
      toast({
        title: 'Invalid amount',
        description: `Payment amount cannot exceed due amount of ৳${receivable.total_due.toLocaleString()}.`,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // If a specific sale is selected, record payment against that sale
      if (selectedSaleId) {
        const sale = receivable.orders.find(o => o.sale_id === selectedSaleId);
        if (sale) {
          // Record payment for specific sale
          const paymentPayload = {
            retailer_id: receivable.retailer_id,
            sale_id: selectedSaleId,
            amount: paymentAmount,
            payment_method: paymentMethod,
            notes: notes || undefined
          };
          
          await api.post('/api/payments', paymentPayload);
          
          // Update sale paid_amount
          const saleResponse = await api.get(`/api/sales/${selectedSaleId}`);
          const currentSale = saleResponse.data;
          const newPaidAmount = (currentSale.paid_amount || 0) + paymentAmount;
          await api.put(`/api/sales/${selectedSaleId}`, {
            paid_amount: newPaidAmount
          });
        }
      } else {
        // Record general payment (no specific sale)
        const paymentPayload = {
          retailer_id: receivable.retailer_id,
          amount: paymentAmount,
          payment_method: paymentMethod,
          notes: notes || undefined
        };
        
        await api.post('/api/payments', paymentPayload);
      }
      
      toast({
        title: 'Payment recorded',
        description: `Payment of ৳${paymentAmount.toLocaleString()} recorded successfully.`,
      });
      await onPaymentRecorded();
      onClose();
    } catch (error: any) {
      console.error('[PaymentModal] Error recording payment:', error);
      let errorMessage = 'Failed to record payment';
      
      if (error?.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.detail) {
          errorMessage = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
        } else if (errorData.message) {
          errorMessage = typeof errorData.message === 'string' ? errorData.message : JSON.stringify(errorData.message);
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Payment failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dh-modal-overlay">
      <div className="dh-modal-panel w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Record Payment</h2>
          <p className="text-sm text-muted-foreground">{receivable.shop_name}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="bg-[hsl(var(--dh-red))]/5 border border-[hsl(var(--dh-red))]/20 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Outstanding Amount</p>
            <p className="text-2xl font-bold font-mono text-[hsl(var(--dh-red))]">৳ {receivable.total_due.toLocaleString()}</p>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Payment Amount (৳)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="input-field" placeholder="Enter amount" max={receivable.total_due} required />
          </div>
          {receivable.orders.length > 1 && (
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-foreground">Apply to Order (Optional)</label>
              <select value={selectedSaleId || ''} onChange={(e) => setSelectedSaleId(e.target.value || null)} className="input-field">
                <option value="">General Payment (Apply to oldest)</option>
                {receivable.orders.map((order) => (
                  <option key={order.sale_id} value={order.sale_id}>{order.invoice_number} – ৳{order.amount.toLocaleString()}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">If not selected, payment will be applied to the oldest outstanding order</p>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Payment Method</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input-field">
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer</option>
              <option value="mobile">Mobile Banking (bKash/Nagad)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Notes (Optional)</label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="input-field" placeholder="Transaction ID or note" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={loading}>
              <CheckCircle className="w-4 h-4" />
              {loading ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
