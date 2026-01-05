import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
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
    <div className="min-h-screen">
      <Header title="Payments & Receivables" />

      <div className="p-3">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-slate-500 text-sm">Total Receivables</p>
            <p className="text-2xl font-bold text-red-600">
              ৳ {totalReceivables.toLocaleString()}
            </p>
            {dashboardStats && (
              <p className="text-xs text-slate-400 mt-1">
                Dashboard: ৳ {dashboardStats.receivable_from_customers.toLocaleString()}
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-slate-500 text-sm">Total Payables</p>
            <p className="text-2xl font-bold text-orange-600">
              ৳ {totalPayables.toLocaleString()}
            </p>
            {dashboardStats && (
              <p className="text-xs text-slate-400 mt-1">
                Dashboard: ৳ {dashboardStats.payable_to_supplier.toLocaleString()}
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-slate-500 text-sm">Total Payments</p>
            <p className="text-2xl font-bold text-green-600">
              ৳ {totalPayments.toLocaleString()}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              This month: ৳ {totalPaymentsThisMonth.toLocaleString()}
            </p>
          </div>

          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-slate-500 text-sm">Outstanding</p>
            <p className="text-2xl font-bold text-blue-600">
              {receivables.filter((r) => r.total_due > 0).length + payables.filter((p) => p.total_due > 0).length}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {receivables.filter((r) => r.total_due > 0).length} retailers, {payables.filter((p) => p.total_due > 0).length} suppliers
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm mb-2">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('receivables')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'receivables'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Receivables ({receivables.filter((r) => r.total_due > 0).length})
            </button>
            <button
              onClick={() => setActiveTab('payables')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'payables'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Payables ({payables.filter((p) => p.total_due > 0).length})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === 'payments'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Payment History ({payments.length})
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl p-2 shadow-sm mb-2 flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab === 'receivables' ? 'retailers' : activeTab === 'payables' ? 'suppliers' : 'payments'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-8 w-full"
            />
          </div>
          {activeTab === 'receivables' && (
            <button
              onClick={() => {
                const retailersWithDue = receivables.filter((r) => r.total_due > 0);
                if (retailersWithDue.length > 0) {
                  setSelectedRetailer(retailersWithDue[0]);
                  setShowPaymentModal(true);
                }
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Record Payment
            </button>
          )}
          {activeTab === 'payables' && (
            <button
              onClick={() => {
                const suppliersWithDue = payables.filter((p) => p.total_due > 0);
                if (suppliersWithDue.length > 0) {
                  setSelectedSupplier(suppliersWithDue[0]);
                  setShowSupplierPaymentModal(true);
                }
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Pay Supplier
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-xl p-8 text-center text-slate-500">
            Loading payments, receivables, and payables...
          </div>
        ) : activeTab === 'receivables' ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-2 font-semibold text-slate-700">Retailer</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Total Due</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Last Payment</th>
                    <th className="text-center p-2 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredReceivables
                    .filter((r) => r.total_due > 0)
                    .sort((a, b) => b.total_due - a.total_due)
                    .map((receivable) => (
                      <tr key={receivable.retailer_id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2">
                          <div className="font-medium text-slate-900">
                            {receivable.shop_name || receivable.retailer_name}
                          </div>
                          {receivable.shop_name && receivable.shop_name !== receivable.retailer_name && (
                            <div className="text-xs text-slate-500">{receivable.retailer_name}</div>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <span className="font-semibold text-red-600">
                            ৳ {receivable.total_due.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-2 text-slate-600">
                          {receivable.last_payment_date
                            ? new Date(receivable.last_payment_date).toLocaleDateString()
                            : 'Never'}
                          {receivable.last_payment_amount !== undefined && receivable.last_payment_amount !== null && (
                            <span className="text-xs text-slate-400 ml-1">
                              (৳{receivable.last_payment_amount.toLocaleString()})
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => {
                              setSelectedRetailer(receivable);
                              setShowPaymentModal(true);
                            }}
                            className="btn-primary text-sm px-3 py-1"
                          >
                            Record Payment
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {filteredReceivables.filter((r) => r.total_due > 0).length === 0 && (
              <div className="p-8 text-center text-slate-500">
                {searchTerm
                  ? 'No receivables found matching your search.'
                  : 'No outstanding receivables.'}
              </div>
            )}
          </div>
        ) : activeTab === 'payables' ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-2 font-semibold text-slate-700">Supplier</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Total Due</th>
                    <th className="text-center p-2 font-semibold text-slate-700">Unpaid Purchases</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Last Purchase</th>
                    <th className="text-center p-2 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayables
                    .filter((p) => p.total_due > 0)
                    .map((payable) => (
                      <tr key={payable.supplier_name} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2">
                          <div className="font-medium text-slate-900">
                            {payable.supplier_name}
                          </div>
                        </td>
                        <td className="p-2 text-right">
                          <span className="font-semibold text-orange-600">
                            ৳ {payable.total_due.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-2 text-center text-slate-600">
                          {payable.unpaid_purchases}
                        </td>
                        <td className="p-2 text-slate-600">
                          {payable.last_paid_date
                            ? new Date(payable.last_paid_date).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => {
                              setSelectedSupplier(payable);
                              setShowSupplierPaymentModal(true);
                            }}
                            className="btn-primary text-sm px-3 py-1"
                          >
                            Pay Supplier
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {filteredPayables.filter((p) => p.total_due > 0).length === 0 && (
              <div className="p-8 text-center text-slate-500">
                {searchTerm
                  ? 'No payables found matching your search.'
                  : 'No outstanding payables.'}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-2 font-semibold text-slate-700">Date</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Retailer</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Amount</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Method</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPayments
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((payment) => (
                      <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2 text-slate-600">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-2 font-medium text-slate-900">{payment.retailer_name}</td>
                        <td className="p-2 text-right font-semibold text-green-600">
                          ৳ {payment.amount.toLocaleString()}
                        </td>
                        <td className="p-2 text-slate-600">{payment.payment_method}</td>
                        <td className="p-2 text-slate-500 text-sm">{payment.notes || '-'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {filteredPayments.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                {searchTerm ? 'No payments found matching your search.' : 'No payments recorded yet.'}
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
    </div>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md m-2 animate-fade-in">
        <div className="p-3 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Record Payment</h2>
          <p className="text-sm text-slate-500 mt-1">{retailer.retailer_name}</p>
          <p className="text-sm text-red-600 font-medium mt-1">
            Total Due: ৳ {retailer.total_due.toLocaleString()}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={retailer.total_due}
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="input-field"
              required
            />
            <p className="text-xs text-slate-400 mt-1">
              Maximum: ৳ {retailer.total_due.toLocaleString()}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="input-field"
              required
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="mobile_banking">Mobile Banking</option>
              <option value="check">Check</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-field"
              rows={3}
              placeholder="Payment notes..."
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1">
              Record Payment
            </button>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md m-2 animate-fade-in">
        <div className="p-3 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Pay Supplier</h2>
          <p className="text-sm text-slate-500 mt-1">{supplier.supplier_name}</p>
          <p className="text-sm text-orange-600 font-medium mt-1">
            Total Due: ৳ {supplier.total_due.toLocaleString()}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={supplier.total_due}
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="input-field"
              required
            />
            <p className="text-xs text-slate-400 mt-1">
              Maximum: ৳ {supplier.total_due.toLocaleString()}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              className="input-field"
              required
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="mobile_banking">Mobile Banking</option>
              <option value="check">Check</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-field"
              rows={3}
              placeholder="Payment notes..."
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1">
              Pay Supplier
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

