import { useState, useEffect } from 'react';
import { Clock, User, MapPin } from 'lucide-react';
import api from '@/lib/api';
import { formatDateBD } from '@/lib/utils';

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  created_at: string;
  collected_by_name?: string;
  route_number?: string;
  invoice_number?: string;
  notes?: string;
}

interface PaymentHistoryProps {
  saleId: string;
  onClose?: () => void;
}

export function PaymentHistory({ saleId, onClose }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/api/sales/${saleId}/payments`);
        setPayments(response.data || []);
      } catch (err: any) {
        console.error('[PaymentHistory] Error fetching payments:', err);
        setError(err.response?.data?.detail || 'Failed to load payment history');
      } finally {
        setLoading(false);
      }
    };

    if (saleId) {
      fetchPayments();
    }
  }, [saleId]);

  if (loading) {
    return (
      <div className="p-4 text-center text-slate-500">
        Loading payment history...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        {error}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="p-4 text-center text-slate-500">
        No payment records found for this order.
      </div>
    );
  }

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900">Payment History</h3>
        <span className="text-sm text-slate-600">
          {payments.length} payment{payments.length !== 1 ? 's' : ''} • Total: ৳{totalAmount.toLocaleString()}
        </span>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="bg-slate-50 rounded-lg p-3 border border-slate-200 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-slate-900 text-lg">
                    ৳{payment.amount.toLocaleString()}
                  </span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded capitalize">
                    {payment.payment_method}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600 mt-1">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDateBD(payment.created_at)}</span>
                  </div>
                  {payment.collected_by_name && (
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{payment.collected_by_name}</span>
                    </div>
                  )}
                  {payment.route_number && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>{payment.route_number}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {payment.notes && (
              <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-200">
                {payment.notes}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
