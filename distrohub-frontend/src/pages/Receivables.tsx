import { useState } from 'react';
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

interface Receivable {
  id: string;
  retailer_name: string;
  shop_name: string;
  phone: string;
  total_due: number;
  last_payment_date: string;
  days_overdue: number;
  orders: { order_number: string; amount: number; date: string }[];
}

const receivablesData: Receivable[] = [
  {
    id: '1',
    retailer_name: 'Rahim Uddin',
    shop_name: 'Rahim Store',
    phone: '01712345678',
    total_due: 15000,
    last_payment_date: '2024-12-20',
    days_overdue: 10,
    orders: [
      { order_number: 'ORD-2024-001', amount: 5000, date: '2024-12-15' },
      { order_number: 'ORD-2024-005', amount: 10000, date: '2024-12-25' },
    ],
  },
  {
    id: '2',
    retailer_name: 'Karim Mia',
    shop_name: 'Karim Traders',
    phone: '01812345678',
    total_due: 32000,
    last_payment_date: '2024-12-10',
    days_overdue: 20,
    orders: [
      { order_number: 'ORD-2024-002', amount: 22000, date: '2024-12-10' },
      { order_number: 'ORD-2024-008', amount: 10000, date: '2024-12-28' },
    ],
  },
  {
    id: '3',
    retailer_name: 'Hasan Ali',
    shop_name: 'Hasan Shop',
    phone: '01912345678',
    total_due: 8500,
    last_payment_date: '2024-12-28',
    days_overdue: 2,
    orders: [
      { order_number: 'ORD-2024-003', amount: 8500, date: '2024-12-28' },
    ],
  },
  {
    id: '4',
    retailer_name: 'Molla Brothers',
    shop_name: 'Molla Enterprise',
    phone: '01612345678',
    total_due: 45000,
    last_payment_date: '2024-11-30',
    days_overdue: 30,
    orders: [
      { order_number: 'ORD-2024-004', amount: 31000, date: '2024-11-25' },
      { order_number: 'ORD-2024-009', amount: 14000, date: '2024-12-20' },
    ],
  },
];

export function Receivables() {
  const [receivables] = useState<Receivable[]>(receivablesData);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [amountFilter, setAmountFilter] = useState<string>('all');
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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
                      <p className="font-medium text-primary-600">{order.order_number}</p>
                      <p className="text-sm text-slate-500">{order.date}</p>
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
  const [reference, setReference] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Payment of ৳${amount} recorded for ${receivable.shop_name}`);
    onClose();
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Reference (Optional)</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="input-field"
              placeholder="Transaction ID or note"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
