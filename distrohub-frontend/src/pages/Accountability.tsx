import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Info, AlertCircle, Wallet } from 'lucide-react';
import api from '@/lib/api';
import { formatDateBD } from '@/lib/utils';

interface SrAccountability {
  user_id: string;
  user_name: string;
  current_cash_holding: number;
  current_outstanding: number;  // LOGIC FIX: Actual outstanding amount
  active_routes_count: number;
  pending_reconciliation_count: number;
  total_expected_cash: number;
  total_collected: number;  // FRONTEND FIX: Total collected from backend (payments + reconciliations with safeguard)
  total_returns: number;  // FRONTEND FIX: Total returns from backend
  routes: any[];
  reconciliations: any[];
}

export function Accountability() {
  const [salesReps, setSalesReps] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedSr, setSelectedSr] = useState<string>('');
  const [accountability, setAccountability] = useState<SrAccountability | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAccountability, setLoadingAccountability] = useState(false);
  const [settlingCash, setSettlingCash] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    const fetchSalesReps = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/users');
        if (response.data) {
          const reps = response.data
            .filter((u: any) => u.role === 'sales_rep')
            .map((u: any) => ({ id: u.id, name: u.name }));
          setSalesReps(reps);
        }
      } catch (error) {
        console.error('[Accountability] Error fetching sales reps:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSalesReps();
  }, []);

  useEffect(() => {
    if (selectedSr) {
      const fetchAccountability = async () => {
        try {
          setLoadingAccountability(true);
          const response = await api.get(`/api/users/${selectedSr}/accountability`);
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/bb54464a-6920-42d2-ab5d-e72077bc0c94', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: 'Accountability.tsx:fetchAccountability:response',
              message: 'SR Accountability API response received',
              data: {
                user_id: response.data?.user_id,
                user_name: response.data?.user_name,
                total_collected: response.data?.total_collected,
                total_collected_exists: response.data?.total_collected !== undefined,
                total_returns: response.data?.total_returns,
                total_returns_exists: response.data?.total_returns !== undefined,
                current_outstanding: response.data?.current_outstanding,
                total_expected_cash: response.data?.total_expected_cash,
                active_routes_count: response.data?.active_routes_count,
                routes: response.data?.routes?.length || 0,
                reconciliations: response.data?.reconciliations?.length || 0,
                full_response_keys: Object.keys(response.data || {})
              },
              timestamp: Date.now(),
              sessionId: 'debug-session',
              runId: 'run1',
              hypothesisId: 'A'
            })
          }).catch(() => {});
          // #endregion
          
          console.log('[Accountability] API Response:', response.data);
          console.log('[Accountability] total_collected:', response.data?.total_collected);
          console.log('[Accountability] total_returns:', response.data?.total_returns);
          setAccountability(response.data);
        } catch (error: any) {
          console.error('[Accountability] Error fetching accountability:', error);
          setAccountability(null);
        } finally {
          setLoadingAccountability(false);
        }
      };
      fetchAccountability();
    } else {
      setAccountability(null);
    }
  }, [selectedSr]);

  const handleSettleCash = async () => {
    if (!accountability || !selectedSr) return;
    
    const completedRoutes = accountability.routes.filter(
      (r: any) => r.status === 'completed'
    );
    
    if (completedRoutes.length === 0) {
      alert('No completed routes available for settlement. Please complete routes first.');
      return;
    }

    if (!confirm(`Settle cash for ${accountability.user_name}? This will reconcile ${completedRoutes.length} completed route(s) and update cash holding to ৳${accountability.total_collected.toLocaleString()}.`)) {
      return;
    }

    try {
      setSettlingCash(true);
      
      // Reconcile all completed routes
      for (const route of completedRoutes) {
        try {
          // Get full route details to calculate totals
          const routeResponse = await api.get(`/api/routes/${route.id}`);
          const routeDetails = routeResponse.data;
          
          // Calculate expected from route_sales
          const routeSales = routeDetails.route_sales || [];
          let totalExpected = 0;
          
          for (const rs of routeSales) {
            const previousDue = parseFloat(rs.previous_due || 0);
            const sale = routeDetails.sales?.find((s: any) => s.id === rs.sale_id);
            const currentBill = parseFloat(sale?.total_amount || 0);
            totalExpected += previousDue + currentBill;
          }
          
          // Get payments for this route
          let totalCollected = 0;
          try {
            const paymentsResponse = await api.get(`/api/payments`);
            const allPayments = paymentsResponse.data || [];
            const routePayments = allPayments.filter((p: any) => p.route_id === route.id);
            totalCollected = routePayments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0);
          } catch (paymentsError) {
            console.warn('[Accountability] Could not fetch payments, using 0:', paymentsError);
          }
          
          // Create reconciliation
          await api.post(`/api/routes/${route.id}/reconcile`, {
            total_collected_cash: totalCollected,
            total_returns_amount: 0,
            reconciliation_items: [],
            notes: `Bulk settlement from SR Accountability page - Auto-reconciled ${new Date().toLocaleString()}`
          });
        } catch (routeError: any) {
          console.error(`[Accountability] Error reconciling route ${route.route_number}:`, routeError);
          // Continue with other routes even if one fails
        }
      }
      
      // Refresh accountability data
      const response = await api.get(`/api/users/${selectedSr}/accountability`);
      setAccountability(response.data);
      
      alert(`Cash settled successfully! ${completedRoutes.length} route(s) reconciled. Cash holding updated.`);
    } catch (error: any) {
      console.error('[Accountability] Error settling cash:', error);
      alert(`Failed to settle cash: ${error?.response?.data?.detail || error?.message}`);
    } finally {
      setSettlingCash(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header title="SR Accountability" />

      <div className="p-3">
        {/* SR Selection */}
        <div className="bg-white rounded-lg border border-slate-200 p-3 mb-3">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Select Sales Representative
          </label>
          <select
            value={selectedSr}
            onChange={(e) => setSelectedSr(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white text-slate-900 transition-all"
            disabled={loading}
          >
            <option value="">{loading ? 'Loading SRs...' : 'Select SR'}</option>
            {salesReps.map((rep) => (
              <option key={rep.id} value={rep.id}>
                {rep.name}
              </option>
            ))}
          </select>
        </div>

        {selectedSr && (
          <>
            {loadingAccountability ? (
              <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500">
                Loading accountability data...
              </div>
            ) : accountability ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 mb-3">
                  <div className="bg-white rounded-lg border border-slate-200 p-3">
                    <p className="text-slate-600 text-xs font-medium mb-1">Current Cash Holding</p>
                    <p className="text-xl font-bold text-green-600">
                      ৳{accountability.current_cash_holding.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 p-3">
                    <p className="text-slate-600 text-xs font-medium mb-1">Active Routes</p>
                    <p className="text-xl font-bold text-blue-600">
                      {accountability.active_routes_count}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 p-3">
                    <p className="text-slate-600 text-xs font-medium mb-1">Pending Reconciliation</p>
                    <p className="text-xl font-bold text-yellow-600">
                      {accountability.pending_reconciliation_count}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 p-3">
                    <p className="text-slate-600 text-xs font-medium mb-1">Total Expected Cash</p>
                    <p className="text-xl font-bold text-slate-900">
                      ৳{accountability.total_expected_cash.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* SR Ledger Summary */}
                <div className="bg-white rounded-lg border border-slate-200 mb-3">
                  <div className="p-3 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">SR Individual Ledger</h3>
                    {accountability.pending_reconciliation_count > 0 && (
                      <button
                        onClick={handleSettleCash}
                        disabled={settlingCash}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Wallet className="w-4 h-4" />
                        {settlingCash ? 'Settling...' : 'Settle Cash'}
                      </button>
                    )}
                  </div>
                  <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-blue-50/80 border border-blue-100 rounded-lg p-3.5">
                      <p className="text-xs text-slate-600 font-medium mb-1.5">Total Goods Taken</p>
                      <p className="text-xl font-bold text-blue-700">
                        <span className="text-base font-semibold">৳</span>{accountability.total_expected_cash.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500 mt-1.5">
                        {accountability.routes.length} routes
                      </p>
                    </div>
                    <div className="bg-orange-50/80 border border-orange-100 rounded-lg p-3.5">
                      <p className="text-xs text-slate-600 font-medium mb-1.5">Total Returns</p>
                      <p className="text-xl font-bold text-orange-700">
                        <span className="text-base font-semibold">৳</span>{accountability.total_returns.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-emerald-50/90 border border-emerald-200 rounded-lg p-3.5 relative">
                      <div className="flex items-start justify-between mb-1.5">
                        <p className="text-xs text-slate-600 font-medium">Total Collected</p>
                        <div title="Includes payments recorded during delivery and reconciliation totals (with double-count safeguard)">
                          <Info className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </div>
                      <p className="text-xl font-bold text-emerald-700">
                        <span className="text-base font-semibold">৳</span>{accountability.total_collected?.toLocaleString() || '0'}
                      </p>
                      {/* #region agent log */}
                      {(() => {
                        fetch('http://127.0.0.1:7242/ingest/bb54464a-6920-42d2-ab5d-e72077bc0c94', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            location: 'Accountability.tsx:render:TotalCollected',
                            message: 'Rendering Total Collected value',
                            data: {
                              total_collected: accountability.total_collected,
                              total_collected_type: typeof accountability.total_collected,
                              total_collected_exists: accountability.total_collected !== undefined,
                              display_value: accountability.total_collected?.toLocaleString() || '0'
                            },
                            timestamp: Date.now(),
                            sessionId: 'debug-session',
                            runId: 'run1',
                            hypothesisId: 'B'
                          })
                        }).catch(() => {});
                        return null;
                      })()}
                      {/* #endregion */}
                      <button
                        onClick={async () => {
                          if (!selectedSr) return;
                          setLoadingPayments(true);
                          setShowPaymentHistory(true);
                          try {
                            const response = await api.get(`/api/users/${selectedSr}/payments`);
                            setPaymentHistory(response.data || []);
                          } catch (error: any) {
                            console.error('[Accountability] Error fetching payment history:', error);
                            alert('Failed to load payment history');
                          } finally {
                            setLoadingPayments(false);
                          }
                        }}
                        className="mt-2 flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-medium"
                      >
                        <History className="w-3 h-3" />
                        View Payment History
                      </button>
                      {accountability.pending_reconciliation_count > 0 && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <AlertCircle className="w-3 h-3 text-yellow-600" />
                          <p className="text-xs text-yellow-700 font-medium">
                            {accountability.pending_reconciliation_count} pending
                          </p>
                        </div>
                      )}
                    </div>
                    <div className={`rounded-lg p-3.5 border ${
                      accountability.current_outstanding > 0 
                        ? 'bg-red-50/90 border-red-200' 
                        : 'bg-green-50/80 border-green-100'
                    }`}>
                      <p className="text-xs text-slate-600 font-medium mb-1.5">Current Outstanding</p>
                      <p className={`text-xl font-bold ${
                        accountability.current_outstanding > 0 
                          ? 'text-red-700' 
                          : 'text-green-700'
                      }`}>
                        <span className="text-base font-semibold">৳</span>{accountability.current_outstanding.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500 mt-1.5">
                        {accountability.current_outstanding > 0 ? 'Amount due from retailers' : 'All cleared'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Active Routes */}
                {accountability.routes.length > 0 && (
                  <div className="bg-white rounded-lg border border-slate-200 mb-3">
                    <div className="p-3 border-b border-slate-200">
                      <h3 className="font-semibold text-slate-900">Active Routes</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left p-3 font-semibold text-slate-700 text-sm">Route #</th>
                            <th className="text-left p-3 font-semibold text-slate-700 text-sm">Date</th>
                            <th className="text-center p-3 font-semibold text-slate-700 text-sm">Orders</th>
                            <th className="text-right p-3 font-semibold text-slate-700 text-sm">Amount</th>
                            <th className="text-center p-3 font-semibold text-slate-700 text-sm">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {accountability.routes.map((route: any) => (
                            <tr key={route.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-3 font-medium text-primary-600">{route.route_number}</td>
                              <td className="p-3 text-slate-600 text-sm">{formatDateBD(route.route_date)}</td>
                              <td className="p-3 text-center text-slate-600">{route.total_orders}</td>
                              <td className="p-3 text-right">
                                <span className="font-bold text-slate-900">
                                  <span className="text-sm font-semibold">৳</span>{route.total_amount.toLocaleString()}
                                </span>
                              </td>
                              <td className="p-3 text-center">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${
                                  route.status === 'completed' ? 'bg-green-100 text-green-800 border border-green-200' :
                                  route.status === 'in_progress' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                  route.status === 'reconciled' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                                  'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                }`}>
                                  {route.status === 'pending' ? 'Pending' :
                                   route.status === 'in_progress' ? 'In Progress' :
                                   route.status === 'completed' ? 'Completed' :
                                   'Reconciled'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Reconciliation History */}
                {accountability.reconciliations.length > 0 && (
                  <div className="bg-white rounded-lg border border-slate-200">
                    <div className="p-3 border-b border-slate-200">
                      <h3 className="font-semibold text-slate-900">Reconciliation History</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left p-3 font-semibold text-slate-700 text-sm">Date</th>
                            <th className="text-right p-3 font-semibold text-slate-700 text-sm">Expected</th>
                            <th className="text-right p-3 font-semibold text-slate-700 text-sm">Collected</th>
                            <th className="text-right p-3 font-semibold text-slate-700 text-sm">Returns</th>
                            <th className="text-right p-3 font-semibold text-slate-700 text-sm">Discrepancy</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {accountability.reconciliations.map((rec: any) => (
                            <tr key={rec.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="p-3 text-slate-600 text-sm">
                                {formatDateBD(rec.reconciled_at)}
                              </td>
                              <td className="p-3 text-right">
                                <span className="font-bold text-slate-900">
                                  <span className="text-sm font-semibold">৳</span>{rec.total_expected_cash.toLocaleString()}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <span className="font-bold text-emerald-700">
                                  <span className="text-sm font-semibold">৳</span>{rec.total_collected_cash.toLocaleString()}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <span className="font-bold text-orange-700">
                                  <span className="text-sm font-semibold">৳</span>{rec.total_returns_amount.toLocaleString()}
                                </span>
                              </td>
                              <td className={`p-3 text-right ${
                                rec.discrepancy === 0 ? 'text-green-700' : 'text-red-700'
                              }`}>
                                <span className="font-bold">
                                  <span className="text-sm font-semibold">৳</span>{rec.discrepancy.toLocaleString()}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {accountability.routes.length === 0 && accountability.reconciliations.length === 0 && (
                  <div className="bg-white rounded-xl p-8 text-center text-slate-500">
                    No routes or reconciliations found for this SR.
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500">
                No accountability data found.
              </div>
            )}
          </>
        )}

        {!selectedSr && (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500">
            Please select a Sales Representative to view accountability.
          </div>
        )}
      </div>

      {/* Payment History Modal */}
      {showPaymentHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Payment History</h2>
                <p className="text-sm text-slate-500">
                  {accountability?.user_name} • {paymentHistory.length} payment{paymentHistory.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setShowPaymentHistory(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              {loadingPayments ? (
                <div className="text-center text-slate-500 py-8">Loading payment history...</div>
              ) : paymentHistory.length === 0 ? (
                <div className="text-center text-slate-500 py-8">No payment records found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left p-3 font-semibold text-slate-700 text-sm">Date/Time</th>
                        <th className="text-left p-3 font-semibold text-slate-700 text-sm">Invoice</th>
                        <th className="text-left p-3 font-semibold text-slate-700 text-sm">Retailer</th>
                        <th className="text-right p-3 font-semibold text-slate-700 text-sm">Amount</th>
                        <th className="text-center p-3 font-semibold text-slate-700 text-sm">Method</th>
                        <th className="text-left p-3 font-semibold text-slate-700 text-sm">Route</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paymentHistory.map((payment: any) => (
                        <tr key={payment.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 text-sm text-slate-600">
                            {formatDateBD(payment.created_at)}
                          </td>
                          <td className="p-3 text-sm font-medium text-slate-900">
                            {payment.invoice_number || '-'}
                          </td>
                          <td className="p-3 text-sm text-slate-600">
                            {payment.retailer_name}
                          </td>
                          <td className="p-3 text-right">
                            <span className="font-bold text-slate-900">
                              <span className="text-sm font-semibold">৳</span>{payment.amount.toLocaleString()}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded capitalize">
                              {payment.payment_method}
                            </span>
                          </td>
                          <td className="p-3 text-sm text-slate-600">
                            {payment.route_number || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200">
                      <tr>
                        <td colSpan={3} className="p-3 text-right font-semibold text-slate-700">
                          Total:
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-bold text-slate-900">
                            <span className="text-sm font-semibold">৳</span>
                            {paymentHistory.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                          </span>
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
