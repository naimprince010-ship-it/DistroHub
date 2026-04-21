import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/ui/stat-card';
import {
  Plus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Search,
} from 'lucide-react';
import api from '@/lib/api';

interface Payment {
  id: string;
  retailer_id: string;
  retailer_name: string;
  sale_id?: string;
  amount: number;
  payment_method: string;
  notes?: string;
  created_at: string;
}

interface Receivable {
  retailer_id: string;
  retailer_name: string;
  shop_name?: string;
  total_due: number;
  last_payment_date?: string;
  last_payment_amount?: number;
}

interface DashboardStats {
  receivable_from_customers: number;
  payable_to_supplier: number;
}

interface Payable {
  supplier_name: string;
  total_due: number;
  unpaid_purchases: number;
  last_paid_date?: string;
  last_paid_amount?: number;
}

interface Purchase {
  id: string;
  supplier_name: string;
  invoice_number: string;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  created_at: string;
}

export function Payments() {
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  // purchases state removed - using local variable in fetchData instead
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'receivables' | 'payables' | 'payments'>('receivables');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRetailer, setSelectedRetailer] = useState<Receivable | null>(null);
  const [showSupplierPaymentModal, setShowSupplierPaymentModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Payable | null>(null);

  // Calculate payables from purchases
  const calculatePayables = (purchasesData: Purchase[]): Payable[] => {
    const supplierMap = new Map<string, Payable>();

    purchasesData.forEach((purchase) => {
      const due = purchase.total_amount - (purchase.paid_amount || 0);
      if (due > 0) {
        const existing = supplierMap.get(purchase.supplier_name);
        if (existing) {
          existing.total_due += due;
          existing.unpaid_purchases += 1;
          // Update last paid date if this purchase is more recent
          if (purchase.created_at && (!existing.last_paid_date || purchase.created_at > existing.last_paid_date)) {
            existing.last_paid_date = purchase.created_at;
          }
        } else {
          supplierMap.set(purchase.supplier_name, {
            supplier_name: purchase.supplier_name,
            total_due: due,
            unpaid_purchases: 1,
            last_paid_date: purchase.created_at,
          });
        }
      }
    });

    return Array.from(supplierMap.values()).sort((a, b) => b.total_due - a.total_due);
  };

  // Fetch all data
  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[Payments] No token found, skipping data fetch');
      setPayments([]);
      setReceivables([]);
      setPayables([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[Payments] Fetching payments, receivables, purchases, and dashboard stats...');

      const [paymentsRes, receivablesRes, purchasesRes, dashboardRes] = await Promise.all([
        api.get('/api/payments'),
        api.get('/api/receivables'),
        api.get('/api/purchases'),
        api.get('/api/dashboard/stats'),
      ]);

      if (paymentsRes.data) {
        setPayments(paymentsRes.data);
        console.log('[Payments] Payments fetched:', paymentsRes.data.length);
      }

      if (receivablesRes.data) {
        setReceivables(receivablesRes.data);
        console.log('[Payments] Receivables fetched:', receivablesRes.data.length);
      }

      if (purchasesRes.data) {
        const mappedPurchases: Purchase[] = purchasesRes.data.map((p: any) => ({
          id: p.id || '',
          supplier_name: p.supplier_name || '',
          invoice_number: p.invoice_number || '',
          total_amount: p.total_amount || 0,
          paid_amount: p.paid_amount || 0,
          due_amount: (p.total_amount || 0) - (p.paid_amount || 0),
          created_at: p.created_at || '',
        }));
        const calculatedPayables = calculatePayables(mappedPurchases);
        setPayables(calculatedPayables);
        console.log('[Payments] Purchases fetched:', mappedPurchases.length);
        console.log('[Payments] Payables calculated:', calculatedPayables.length);
      }

      if (dashboardRes.data) {
        setDashboardStats({
          receivable_from_customers: dashboardRes.data.receivable_from_customers || 0,
          payable_to_supplier: dashboardRes.data.payable_to_supplier || 0,
        });
        console.log('[Payments] Dashboard stats fetched');
      }
    } catch (error: any) {
      console.error('[Payments] Error fetching data:', error);
      if (error?.response?.status === 401) {
        console.warn('[Payments] 401 Unauthorized - token may be expired');
        return;
      }
      setPayments([]);
      setReceivables([]);
      setPayables([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const globalSearch = searchParams.get('q') || '';
    setSearchTerm(globalSearch);
  }, [searchParams]);

  // Filter payments by search term
  const filteredPayments = payments.filter((payment) =>
    payment.retailer_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter receivables by search term
  const filteredReceivables = receivables.filter((receivable) =>
    receivable.retailer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (receivable.shop_name && receivable.shop_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Filter payables by search term
  const filteredPayables = payables.filter((payable) =>
    payable.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals
  const totalReceivables = receivables.reduce((sum, r) => sum + r.total_due, 0);
  const totalPayables = payables.reduce((sum, p) => sum + p.total_due, 0);
  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalPaymentsThisMonth = payments
    .filter((p) => {
      const paymentDate = new Date(p.created_at);
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      return paymentDate >= thisMonth;
    })
    .reduce((sum, p) => sum + p.amount, 0);

  const handleCreatePayment = async (paymentData: {
    retailer_id: string;
    sale_id?: string;
    amount: number;
    payment_method: string;
    notes?: string;
  }) => {
    try {
      console.log('[Payments] Creating payment:', paymentData);
      const response = await api.post('/api/payments', paymentData);
      console.log('[Payments] Payment created successfully:', response.data);

      // Refetch data to update lists and dashboard
      await fetchData();
      setShowPaymentModal(false);
      setSelectedRetailer(null);
    } catch (error: any) {
      console.error('[Payments] Failed to create payment:', error);
      alert(`Failed to create payment: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handlePaySupplier = async (paymentData: {
    supplier_name: string;
    amount: number;
    payment_method: string;
    notes?: string;
  }) => {
    try {
      console.log('[Payments] Paying supplier:', paymentData);
      console.warn('[Payments] Supplier payment endpoint not available. Backend needs POST /api/supplier-payments or PUT /api/purchases/{id} endpoint.');
      
      // Note: Backend endpoint for supplier payments needs to be implemented
      // Expected endpoint: POST /api/supplier-payments with { supplier_name, amount, payment_method, notes }
      // OR: PUT /api/purchases/{id} to update paid_amount
      // For now, show informative message
      alert(
        `Supplier payment functionality requires a backend endpoint.\n\n` +
        `Expected: POST /api/supplier-payments\n` +
        `Payload: ${JSON.stringify(paymentData, null, 2)}\n\n` +
        `Alternative: Update purchase paid_amount via PUT /api/purchases/{id}`
      );
      
      // TODO: When backend endpoint is available, implement:
      // const response = await api.post('/api/supplier-payments', paymentData);
      // console.log('[Payments] Supplier payment created successfully:', response.data);
      // await fetchData();
      // setShowSupplierPaymentModal(false);
      // setSelectedSupplier(null);
    } catch (error: any) {
      console.error('[Payments] Failed to pay supplier:', error);
      alert(`Failed to pay supplier: ${error.response?.data?.detail || error.message}`);
    }
  };

  return (
    <PageShell title="Payments & Receivables">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Receivables" value={`৳ ${totalReceivables.toLocaleString()}`} icon={TrendingDown} color="red"
            hint={dashboardStats ? `Dashboard: ৳ ${dashboardStats.receivable_from_customers.toLocaleString()}` : undefined} />
          <StatCard label="Total Payables"    value={`৳ ${totalPayables.toLocaleString()}`}    icon={TrendingUp}   color="amber"
            hint={dashboardStats ? `Dashboard: ৳ ${dashboardStats.payable_to_supplier.toLocaleString()}` : undefined} />
          <StatCard label="Total Payments"    value={`৳ ${totalPayments.toLocaleString()}`}    icon={TrendingUp}   color="green"
            hint={`This month: ৳ ${totalPaymentsThisMonth.toLocaleString()}`} />
          <StatCard label="Outstanding"
            value={receivables.filter((r) => r.total_due > 0).length + payables.filter((p) => p.total_due > 0).length}
            icon={DollarSign} color="blue"
            hint={`${receivables.filter((r) => r.total_due > 0).length} retailers, ${payables.filter((p) => p.total_due > 0).length} suppliers`} />
        </div>

        {/* Tabs */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex border-b border-border px-1">
            {[
              { id: 'receivables', label: `Receivables (${receivables.filter((r) => r.total_due > 0).length})` },
              { id: 'payables',    label: `Payables (${payables.filter((p) => p.total_due > 0).length})` },
              { id: 'payments',   label: `Payment History (${payments.length})` },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.id ? 'text-[hsl(var(--primary))] border-[hsl(var(--primary))]' : 'text-muted-foreground border-transparent hover:text-foreground'}`}>
                {tab.label}
              </button>
            ))}
          </div>
          {/* Search + action bar */}
          <div className="flex items-center gap-2 p-3 border-b border-border">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input type="text"
                placeholder={`Search ${activeTab === 'receivables' ? 'retailers' : activeTab === 'payables' ? 'suppliers' : 'payments'}…`}
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-8 h-9 text-sm w-full" />
            </div>
            {activeTab === 'receivables' && (
              <button onClick={() => { const r = receivables.filter((r) => r.total_due > 0); if (r.length > 0) { setSelectedRetailer(r[0]); setShowPaymentModal(true); } }}
                className="btn-primary flex items-center gap-2 h-9 px-3 text-sm shrink-0">
                <Plus className="w-4 h-4" /> Record Payment
              </button>
            )}
            {activeTab === 'payables' && (
              <button onClick={() => { const s = payables.filter((p) => p.total_due > 0); if (s.length > 0) { setSelectedSupplier(s[0]); setShowSupplierPaymentModal(true); } }}
                className="btn-primary flex items-center gap-2 h-9 px-3 text-sm shrink-0">
                <Plus className="w-4 h-4" /> Pay Supplier
              </button>
            )}
          </div>

          {/* Content */}
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading payments, receivables, and payables…</div>
          ) : activeTab === 'receivables' ? (
            <div className="dh-table-shell border-0 shadow-none">
              <table className="w-full border-collapse text-sm">
                <thead className="border-b border-border/80 bg-muted/35">
                  <tr>
                    <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Retailer</th>
                    <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Due</th>
                    <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Last Payment</th>
                    <th className="text-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredReceivables.filter((r) => r.total_due > 0).sort((a, b) => b.total_due - a.total_due).map((receivable) => (
                    <tr key={receivable.retailer_id} className="transition-colors duration-150 ease-out hover:bg-muted/45">
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-foreground">{receivable.shop_name || receivable.retailer_name}</div>
                        {receivable.shop_name && receivable.shop_name !== receivable.retailer_name && <div className="text-xs text-muted-foreground">{receivable.retailer_name}</div>}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-[hsl(var(--dh-red))]">৳ {receivable.total_due.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-sm text-muted-foreground">
                        {receivable.last_payment_date ? new Date(receivable.last_payment_date).toLocaleDateString() : 'Never'}
                        {receivable.last_payment_amount != null && <span className="text-xs text-muted-foreground/70 ml-1">(৳{receivable.last_payment_amount.toLocaleString()})</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button onClick={() => { setSelectedRetailer(receivable); setShowPaymentModal(true); }} className="btn-primary text-xs h-7 px-3">Record Payment</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : activeTab === 'payables' ? (
            <div className="dh-table-shell border-0 shadow-none">
              <table className="w-full border-collapse text-sm">
                <thead className="border-b border-border/80 bg-muted/35">
                  <tr>
                    <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Supplier</th>
                    <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Due</th>
                    <th className="text-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Unpaid Purchases</th>
                    <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Last Purchase</th>
                    <th className="text-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPayables.filter((p) => p.total_due > 0).map((payable) => (
                    <tr key={payable.supplier_name} className="transition-colors duration-150 ease-out hover:bg-muted/45">
                      <td className="px-3 py-2.5 font-medium text-foreground">{payable.supplier_name}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-[hsl(var(--dh-amber))]">৳ {payable.total_due.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-center text-muted-foreground">{payable.unpaid_purchases}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{payable.last_paid_date ? new Date(payable.last_paid_date).toLocaleDateString() : 'N/A'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <button onClick={() => { setSelectedSupplier(payable); setShowSupplierPaymentModal(true); }} className="btn-primary text-xs h-7 px-3">Pay Supplier</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPayables.filter((p) => p.total_due > 0).length === 0 && (
                <div className="dh-empty-state py-10">
                  <p className="dh-empty-state-title">{searchTerm ? 'No matching payables' : 'No outstanding payables'}</p>
                  <p className="dh-empty-state-desc">
                    {searchTerm ? 'Try a different search term.' : 'Supplier dues will appear here when you have unpaid purchases.'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="dh-table-shell border-0 shadow-none">
              <table className="w-full border-collapse text-sm">
                <thead className="border-b border-border/80 bg-muted/35">
                  <tr>
                    <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Retailer</th>
                    <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
                    <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Method</th>
                    <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPayments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((payment) => (
                    <tr key={payment.id} className="transition-colors duration-150 ease-out hover:bg-muted/45">
                      <td className="px-3 py-2.5 text-muted-foreground">{new Date(payment.created_at).toLocaleDateString()}</td>
                      <td className="px-3 py-2.5 font-medium text-foreground">{payment.retailer_name}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-[hsl(var(--dh-green))]">৳ {payment.amount.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{payment.payment_method}</td>
                      <td className="px-3 py-2.5 text-sm text-muted-foreground">{payment.notes || '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPayments.length === 0 && (
                <div className="dh-empty-state py-10">
                  <p className="dh-empty-state-title">{searchTerm ? 'No matching payments' : 'No payments yet'}</p>
                  <p className="dh-empty-state-desc">
                    {searchTerm ? 'Try a different search term.' : 'Recorded payments will show up in this list.'}
                  </p>
                </div>
              )}
            </div>
          )}
          </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedRetailer && (
        <PaymentModal
          retailer={selectedRetailer}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedRetailer(null);
          }}
          onSave={handleCreatePayment}
        />
      )}

      {/* Supplier Payment Modal */}
      {showSupplierPaymentModal && selectedSupplier && (
        <SupplierPaymentModal
          supplier={selectedSupplier}
          onClose={() => {
            setShowSupplierPaymentModal(false);
            setSelectedSupplier(null);
          }}
          onSave={handlePaySupplier}
        />
      )}
    </PageShell>
  );
}

interface PaymentModalProps {
  retailer: Receivable;
  onClose: () => void;
  onSave: (paymentData: {
    retailer_id: string;
    sale_id?: string;
    amount: number;
    payment_method: string;
    notes?: string;
  }) => void;
}

function PaymentModal({ retailer, onClose, onSave }: PaymentModalProps) {
  const [formData, setFormData] = useState({
    amount: retailer.total_due.toString(),
    payment_method: 'cash',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (amount > retailer.total_due) {
      alert(`Amount cannot exceed total due (৳${retailer.total_due.toLocaleString()})`);
      return;
    }

    onSave({
      retailer_id: retailer.retailer_id,
      amount: amount,
      payment_method: formData.payment_method,
      notes: formData.notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Record Payment</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{retailer.retailer_name}</p>
          <p className="text-sm font-medium text-[hsl(var(--dh-red))] mt-0.5">Total Due: ৳ {retailer.total_due.toLocaleString()}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Amount</label>
            <input type="number" step="0.01" min="0" max={retailer.total_due} value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="input-field" required />
            <p className="text-xs text-muted-foreground">Maximum: ৳ {retailer.total_due.toLocaleString()}</p>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Payment Method</label>
            <select value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} className="input-field" required>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="mobile_banking">Mobile Banking</option>
              <option value="check">Check</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Notes (Optional)</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input-field" rows={3} placeholder="Payment notes…" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Record Payment</button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface SupplierPaymentModalProps {
  supplier: Payable;
  onClose: () => void;
  onSave: (paymentData: {
    supplier_name: string;
    amount: number;
    payment_method: string;
    notes?: string;
  }) => void;
}

function SupplierPaymentModal({ supplier, onClose, onSave }: SupplierPaymentModalProps) {
  const [formData, setFormData] = useState({
    amount: supplier.total_due.toString(),
    payment_method: 'cash',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (amount > supplier.total_due) {
      alert(`Amount cannot exceed total due (৳${supplier.total_due.toLocaleString()})`);
      return;
    }

    onSave({
      supplier_name: supplier.supplier_name,
      amount: amount,
      payment_method: formData.payment_method,
      notes: formData.notes || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Pay Supplier</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{supplier.supplier_name}</p>
          <p className="text-sm font-medium text-[hsl(var(--dh-amber))] mt-0.5">Total Due: ৳ {supplier.total_due.toLocaleString()}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Amount</label>
            <input type="number" step="0.01" min="0" max={supplier.total_due} value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="input-field" required />
            <p className="text-xs text-muted-foreground">Maximum: ৳ {supplier.total_due.toLocaleString()}</p>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Payment Method</label>
            <select value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} className="input-field" required>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="mobile_banking">Mobile Banking</option>
              <option value="check">Check</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Notes (Optional)</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input-field" rows={3} placeholder="Payment notes…" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Pay Supplier</button>
          </div>
        </form>
      </div>
    </div>
  );
}

