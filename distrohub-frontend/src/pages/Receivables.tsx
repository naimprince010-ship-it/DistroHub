import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
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

  const getOverdueStatus = (days: number) => {
    if (days <= 7) return { color: 'text-green-600', bg: 'bg-green-100', label: 'Current', key: 'current' };
    if (days <= 15) return { color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Overdue', key: 'overdue' };
    if (days <= 30) return { color: 'text-orange-600', bg: 'bg-orange-100', label: 'Past Due', key: 'past_due' };
    return { color: 'text-red-600', bg: 'bg-red-100', label: 'Critical', key: 'critical' };
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
    <div className="min-h-screen">
      <Header title="Receivables (বাকি হিসাব)" />

      <div className="p-3">
        {loading ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-slate-500">Loading receivables...</p>
          </div>
        ) : (
          <>
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">৳ {totalDue.toLocaleString()}</p>
                <p className="text-slate-500 text-sm">Total Receivables</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">{overdueCount}</p>
                <p className="text-slate-500 text-sm">Overdue Accounts</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{receivables.length}</p>
                <p className="text-slate-500 text-sm">Total Accounts</p>
              </div>
            </div>
          </div>
        </div>

                {/* Search & Filter Bar */}
                <div className="bg-white rounded-xl p-2 shadow-sm mb-2 flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by retailer name or shop..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input-field pl-10"
                    />
                  </div>

                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="input-field pl-10 w-40"
                    >
                      <option value="all">All Status</option>
                      <option value="current">Current</option>
                      <option value="overdue">Overdue</option>
                      <option value="past_due">Past Due</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <select
                    value={amountFilter}
                    onChange={(e) => setAmountFilter(e.target.value)}
                    className="input-field w-44"
                  >
                    <option value="all">All Amounts</option>
                    <option value="small">&lt; ৳10,000</option>
                    <option value="medium">৳10,000 - ৳30,000</option>
                    <option value="large">&gt; ৳30,000</option>
                  </select>

                  {activeFiltersCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-1 px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Clear ({activeFiltersCount})
                    </button>
                  )}
                </div>

        {/* Receivables List */}
        <div className="space-y-2">
          {filteredReceivables.map((receivable) => {
            const status = getOverdueStatus(receivable.days_overdue);
            return (
              <div
                key={receivable.id}
                className="bg-white rounded-xl p-3 shadow-sm card-hover cursor-pointer"
                onClick={() => setSelectedReceivable(receivable)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-slate-900">{receivable.shop_name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-slate-500 text-sm mb-2">{receivable.retailer_name}</p>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {receivable.phone}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Last payment: {receivable.last_payment_date}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-600">৳ {receivable.total_due.toLocaleString()}</p>
                    <p className="text-sm text-slate-500">{receivable.days_overdue} days overdue</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedReceivable(receivable);
                        setShowPaymentModal(true);
                      }}
                      className="mt-1 btn-primary text-sm py-1"
                    >
                      Record Payment
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredReceivables.length === 0 && (
          <div className="bg-white rounded-xl p-4 text-center text-slate-500">
            No receivables found. All accounts are clear!
          </div>
        )}
          </>
        )}
      </div>

      {/* Receivable Details Modal */}
      {selectedReceivable && !showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-2 animate-fade-in">
            <div className="p-3 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">{selectedReceivable.shop_name}</h2>
              <p className="text-slate-500">{selectedReceivable.retailer_name}</p>
            </div>

            <div className="p-3">
              <div className="bg-red-50 rounded-lg p-2 mb-3 text-center">
                <p className="text-sm text-red-600">Total Due</p>
                <p className="text-3xl font-bold text-red-600">
                  ৳ {selectedReceivable.total_due.toLocaleString()}
                </p>
              </div>

              <h3 className="font-semibold text-slate-900 mb-2">Outstanding Orders</h3>
              <div className="space-y-1">
                {selectedReceivable.orders.map((order, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-slate-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-primary-600">{order.invoice_number || order.order_number}</p>
                      <p className="text-sm text-slate-500">{new Date(order.date).toLocaleDateString('en-BD')}</p>
                    </div>
                    <p className="font-semibold text-slate-900">৳ {order.amount.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setSelectedReceivable(null)}
                className="btn-secondary"
              >
                Close
              </button>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="btn-primary"
              >
                Record Payment
              </button>
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
    </div>
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto m-2 animate-fade-in">
        <div className="p-3 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Record Payment</h2>
          <p className="text-slate-500">{receivable.shop_name}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-2">
          <div className="bg-slate-50 rounded-lg p-2 text-center">
            <p className="text-sm text-slate-500">Outstanding Amount</p>
            <p className="text-2xl font-bold text-red-600">৳ {receivable.total_due.toLocaleString()}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Amount (৳)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-field"
              placeholder="Enter amount"
              max={receivable.total_due}
              required
            />
          </div>

          {receivable.orders.length > 1 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Apply to Order (Optional)
              </label>
              <select
                value={selectedSaleId || ''}
                onChange={(e) => setSelectedSaleId(e.target.value || null)}
                className="input-field"
              >
                <option value="">General Payment (Apply to oldest)</option>
                {receivable.orders.map((order) => (
                  <option key={order.sale_id} value={order.sale_id}>
                    {order.invoice_number} - ৳{order.amount.toLocaleString()}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                If not selected, payment will be applied to the oldest outstanding order
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="input-field"
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer</option>
              <option value="mobile">Mobile Banking (bKash/Nagad)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field"
              placeholder="Transaction ID or note"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary flex items-center gap-2"
              disabled={loading}
            >
              <CheckCircle className="w-4 h-4" />
              {loading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
