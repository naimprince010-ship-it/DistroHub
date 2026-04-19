import { useState, useEffect } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  // Fetch receivables from API
  useEffect(() => {
    const fetchReceivables = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/receivables');
        const receivablesData = response.data || [];
        
        // Fetch outstanding orders for each retailer
        const receivablesWithOrders = await Promise.all(
          receivablesData.map(async (r: any) => {
            // Get sales for this retailer with due_amount > 0
            const salesResponse = await api.get('/api/sales');
            const allSales = salesResponse.data || [];
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

            // Calculate days_overdue from last_payment_date
            let daysOverdue = 0;
            if (r.last_payment_date) {
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
              total_due: parseFloat(r.total_due || 0),
              last_payment_date: r.last_payment_date || null,
              days_overdue: daysOverdue,
              orders: outstandingOrders
            };
          })
        );

        setReceivables(receivablesWithOrders);
      } catch (error) {
        console.error('[Receivables] Error fetching receivables:', error);
        alert('Failed to load receivables. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

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

  const activeFiltersCount = [statusFilter, amountFilter].filter(f => f !== 'all').length;

  const clearFilters = () => {
    setStatusFilter('all');
    setAmountFilter('all');
    setSearchTerm('');
  };

  const totalDue = receivables.reduce((sum, r) => sum + r.total_due, 0);
  const overdueCount = receivables.filter((r) => r.days_overdue > 7).length;

  return (
    <PageShell title="Receivables (বাকি হিসাব)">
      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading receivables…</div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Total Receivables" value={`৳ ${totalDue.toLocaleString()}`} icon={DollarSign} color="red" />
            <StatCard label="Overdue Accounts"  value={overdueCount}                      icon={AlertCircle} color="amber" />
            <StatCard label="Total Accounts"    value={receivables.length}                icon={Clock}       color="blue" />
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
            {filteredReceivables.map((receivable) => {
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

          {filteredReceivables.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">No receivables found. All accounts are clear!</div>
          )}
        </>
      )}

      {/* Receivable Details Modal */}
      {selectedReceivable && !showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
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
                <h3 className="font-semibold text-foreground mb-2 text-sm">Outstanding Orders</h3>
                <div className="space-y-1.5">
                  {selectedReceivable.orders.map((order, index) => (
                    <div key={index} className="flex items-center justify-between p-2.5 bg-muted/40 rounded-lg">
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
            <div className="p-4 border-t border-border flex justify-end gap-2">
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
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedReceivable(null);
          }}
        />
      )}
    </PageShell>
  );
}

function PaymentModal({ receivable, onClose }: { receivable: Receivable; onClose: () => void }) {
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
      alert('Please enter a valid payment amount');
      return;
    }
    
    if (paymentAmount > receivable.total_due) {
      alert(`Payment amount cannot exceed due amount of ৳${receivable.total_due.toLocaleString()}`);
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
      
      alert(`Payment of ৳${paymentAmount.toLocaleString()} recorded successfully!`);
      onClose();
      // Refresh the page to update receivables
      window.location.reload();
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
      
      alert(`Failed to record payment: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
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
