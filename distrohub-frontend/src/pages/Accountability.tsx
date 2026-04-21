import { useState, useEffect } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { Info, AlertCircle, Wallet, History as HistoryIcon, X } from 'lucide-react';
import api from '@/lib/api';
import { formatDateBD } from '@/lib/utils';

interface SrAccountability {
  user_id: string;
  user_name: string;
  current_cash_holding: number;
  current_outstanding: number;
  active_routes_count: number;
  pending_reconciliation_count: number;
  total_expected_cash: number;
  total_collected: number;
  total_returns: number;
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
    const completedRoutes = accountability.routes.filter((r: any) => r.status === 'completed');
    if (completedRoutes.length === 0) {
      alert('No completed routes available for settlement. Please complete routes first.');
      return;
    }
    if (!confirm(`Settle cash for ${accountability.user_name}? This will reconcile ${completedRoutes.length} completed route(s).`)) return;
    try {
      setSettlingCash(true);
      for (const route of completedRoutes) {
        try {
          const routeResponse = await api.get(`/api/routes/${route.id}`);
          const routeDetails = routeResponse.data;
          const routeSales = routeDetails.route_sales || [];
          let totalExpected = 0;
          for (const rs of routeSales) {
            const previousDue = parseFloat(rs.previous_due || 0);
            const sale = routeDetails.sales?.find((s: any) => s.id === rs.sale_id);
            const currentBill = parseFloat(sale?.total_amount || 0);
            totalExpected += previousDue + currentBill;
          }
          let totalCollected = 0;
          try {
            const paymentsResponse = await api.get(`/api/payments`);
            const allPayments = paymentsResponse.data || [];
            const routePayments = allPayments.filter((p: any) => p.route_id === route.id);
            totalCollected = routePayments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0);
          } catch {}
          await api.post(`/api/routes/${route.id}/reconcile`, {
            total_collected_cash: totalCollected,
            total_returns_amount: 0,
            reconciliation_items: [],
            notes: `Bulk settlement from SR Accountability page - Auto-reconciled ${new Date().toLocaleString()}`
          });
        } catch (routeError: any) {
          console.error(`[Accountability] Error reconciling route ${route.route_number}:`, routeError);
        }
      }
      const response = await api.get(`/api/users/${selectedSr}/accountability`);
      setAccountability(response.data);
      alert(`Cash settled successfully! ${completedRoutes.length} route(s) reconciled.`);
    } catch (error: any) {
      alert(`Failed to settle cash: ${error?.response?.data?.detail || error?.message}`);
    } finally {
      setSettlingCash(false);
    }
  };

  const routeStatusVariant = (status: string) => {
    if (status === 'completed') return 'success';
    if (status === 'in_progress') return 'info';
    if (status === 'reconciled') return 'purple';
    return 'warning';
  };

  const routeStatusLabel = (status: string) => {
    if (status === 'pending') return 'Pending';
    if (status === 'in_progress') return 'In Progress';
    if (status === 'completed') return 'Completed';
    return 'Reconciled';
  };

  return (
    <PageShell title="SR Accountability">
      <div className="space-y-3">
        {/* SR Selection */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-4">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Select Sales Representative</label>
          <select
            value={selectedSr}
            onChange={(e) => setSelectedSr(e.target.value)}
            className="input-field"
            disabled={loading}
          >
            <option value="">{loading ? 'Loading SRs…' : 'Select SR'}</option>
            {salesReps.map((rep) => (
              <option key={rep.id} value={rep.id}>{rep.name}</option>
            ))}
          </select>
        </div>

        {selectedSr && (
          <>
            {loadingAccountability ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Loading accountability data…</div>
            ) : accountability ? (
              <>
                {/* Summary KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Cash Holding" value={`৳${accountability.current_cash_holding.toLocaleString()}`} color="green" icon={Wallet} />
                  <StatCard label="Active Routes" value={String(accountability.active_routes_count)} color="blue" />
                  <StatCard label="Pending Reconciliation" value={String(accountability.pending_reconciliation_count)} color="amber" icon={AlertCircle} />
                  <StatCard label="Total Expected Cash" value={`৳${accountability.total_expected_cash.toLocaleString()}`} color="purple" />
                </div>

                {/* SR Individual Ledger */}
                <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">SR Individual Ledger</h3>
                    {accountability.pending_reconciliation_count > 0 && (
                      <button
                        onClick={handleSettleCash}
                        disabled={settlingCash}
                        className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        {settlingCash ? 'Settling…' : 'Settle Cash'}
                      </button>
                    )}
                  </div>
                  <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-lg bg-[hsl(var(--dh-blue))]/5 border border-[hsl(var(--dh-blue))]/20 p-3.5">
                      <p className="text-xs text-muted-foreground font-medium mb-1.5">Total Goods Taken</p>
                      <p className="text-xl font-bold font-mono text-[hsl(var(--dh-blue))]">৳{accountability.total_expected_cash.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground mt-1.5">{accountability.routes.length} routes</p>
                    </div>
                    <div className="rounded-lg bg-[hsl(var(--dh-amber))]/5 border border-[hsl(var(--dh-amber))]/20 p-3.5">
                      <p className="text-xs text-muted-foreground font-medium mb-1.5">Total Returns</p>
                      <p className="text-xl font-bold font-mono text-[hsl(var(--dh-amber))]">৳{accountability.total_returns.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-[hsl(var(--dh-green))]/5 border border-[hsl(var(--dh-green))]/20 p-3.5 relative">
                      <div className="flex items-start justify-between mb-1.5">
                        <p className="text-xs text-muted-foreground font-medium">Total Collected</p>
                        <span title="Includes payments recorded during delivery and reconciliation totals">
                          <Info className="w-3.5 h-3.5 text-muted-foreground/60" />
                        </span>
                      </div>
                      <p className="text-xl font-bold font-mono text-[hsl(var(--dh-green))]">৳{accountability.total_collected?.toLocaleString() || '0'}</p>
                      <button
                        onClick={async () => {
                          if (!selectedSr) return;
                          setLoadingPayments(true);
                          setShowPaymentHistory(true);
                          try {
                            const response = await api.get(`/api/users/${selectedSr}/payments`);
                            setPaymentHistory(response.data || []);
                          } catch (error: any) {
                            alert('Failed to load payment history');
                          } finally {
                            setLoadingPayments(false);
                          }
                        }}
                        className="mt-2 flex items-center gap-1 text-xs text-[hsl(var(--dh-green))] hover:opacity-80 font-medium"
                      >
                        <HistoryIcon className="w-3 h-3" />
                        View Payment History
                      </button>
                      {accountability.pending_reconciliation_count > 0 && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <AlertCircle className="w-3 h-3 text-[hsl(var(--dh-amber))]" />
                          <p className="text-xs text-[hsl(var(--dh-amber))] font-medium">{accountability.pending_reconciliation_count} pending</p>
                        </div>
                      )}
                    </div>
                    <div className={`rounded-lg p-3.5 border ${accountability.current_outstanding > 0 ? 'bg-[hsl(var(--dh-red))]/5 border-[hsl(var(--dh-red))]/20' : 'bg-[hsl(var(--dh-green))]/5 border-[hsl(var(--dh-green))]/20'}`}>
                      <p className="text-xs text-muted-foreground font-medium mb-1.5">Current Outstanding</p>
                      <p className={`text-xl font-bold font-mono ${accountability.current_outstanding > 0 ? 'text-[hsl(var(--dh-red))]' : 'text-[hsl(var(--dh-green))]'}`}>
                        ৳{accountability.current_outstanding.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {accountability.current_outstanding > 0 ? 'Amount due from retailers' : 'All cleared'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Active Routes */}
                {accountability.routes.length > 0 && (
                  <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                      <h3 className="text-sm font-semibold text-foreground">Active Routes</h3>
                    </div>
                    <div className="dh-table-shell border-0 shadow-none">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40 border-b border-border">
                          <tr>
                            <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Route #</th>
                            <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                            <th className="text-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Orders</th>
                            <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
                            <th className="text-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {accountability.routes.map((route: any) => (
                            <tr key={route.id} className="transition-colors duration-150 ease-out hover:bg-muted/45">
                              <td className="px-3 py-2.5 font-medium text-[hsl(var(--primary))]">{route.route_number}</td>
                              <td className="px-3 py-2.5 text-muted-foreground">{formatDateBD(route.route_date)}</td>
                              <td className="px-3 py-2.5 text-center text-muted-foreground">{route.total_orders}</td>
                              <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground">৳{route.total_amount.toLocaleString()}</td>
                              <td className="px-3 py-2.5 text-center">
                                <Badge variant={routeStatusVariant(route.status) as any}>{routeStatusLabel(route.status)}</Badge>
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
                  <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-border">
                      <h3 className="text-sm font-semibold text-foreground">Reconciliation History</h3>
                    </div>
                    <div className="dh-table-shell border-0 shadow-none">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40 border-b border-border">
                          <tr>
                            <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                            <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Expected</th>
                            <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Collected</th>
                            <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Returns</th>
                            <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Discrepancy</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {accountability.reconciliations.map((rec: any) => (
                            <tr key={rec.id} className="transition-colors duration-150 ease-out hover:bg-muted/45">
                              <td className="px-3 py-2.5 text-muted-foreground">{formatDateBD(rec.reconciled_at)}</td>
                              <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground">৳{rec.total_expected_cash.toLocaleString()}</td>
                              <td className="px-3 py-2.5 text-right font-mono font-bold text-[hsl(var(--dh-green))]">৳{rec.total_collected_cash.toLocaleString()}</td>
                              <td className="px-3 py-2.5 text-right font-mono font-bold text-[hsl(var(--dh-amber))]">৳{rec.total_returns_amount.toLocaleString()}</td>
                              <td className={`px-3 py-2.5 text-right font-mono font-bold ${rec.discrepancy === 0 ? 'text-[hsl(var(--dh-green))]' : 'text-[hsl(var(--dh-red))]'}`}>
                                ৳{rec.discrepancy.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {accountability.routes.length === 0 && accountability.reconciliations.length === 0 && (
                  <div className="dh-empty-state rounded-xl border border-dashed border-border/70 bg-card py-10">
                    <p className="dh-empty-state-title">No routes or reconciliations found</p>
                    <p className="dh-empty-state-desc">This SR has no accountability activity yet.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="dh-empty-state rounded-xl border border-dashed border-border/70 bg-card py-10">
                <p className="dh-empty-state-title">No accountability data found</p>
              </div>
            )}
          </>
        )}

        {!selectedSr && (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Please select a Sales Representative to view accountability.
          </div>
        )}
      </div>

      {/* Payment History Modal */}
      {showPaymentHistory && (
        <div className="dh-modal-overlay">
          <div className="dh-modal-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Payment History</h2>
                <p className="text-xs text-muted-foreground">
                  {accountability?.user_name} • {paymentHistory.length} payment{paymentHistory.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button onClick={() => setShowPaymentHistory(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {loadingPayments ? (
                <div className="text-center text-sm text-muted-foreground py-8">Loading payment history…</div>
              ) : paymentHistory.length === 0 ? (
                <div className="dh-empty-state py-8">
                  <p className="dh-empty-state-title">No payment records found</p>
                </div>
              ) : (
                <div className="dh-table-shell">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 border-b border-border">
                      <tr>
                        <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date/Time</th>
                        <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Invoice</th>
                        <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Retailer</th>
                        <th className="text-right px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
                        <th className="text-center px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Method</th>
                        <th className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Route</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {paymentHistory.map((payment: any) => (
                        <tr key={payment.id} className="transition-colors duration-150 ease-out hover:bg-muted/45">
                          <td className="px-3 py-2.5 text-muted-foreground">{formatDateBD(payment.created_at)}</td>
                          <td className="px-3 py-2.5 font-medium text-foreground">{payment.invoice_number || '–'}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{payment.retailer_name}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground">৳{payment.amount.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-center">
                            <Badge variant="info" className="capitalize">{payment.payment_method}</Badge>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">{payment.route_number || '–'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/40 border-t border-border">
                      <tr>
                        <td colSpan={3} className="px-3 py-2.5 text-right text-xs font-semibold text-muted-foreground">Total:</td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground">
                          ৳{paymentHistory.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
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
    </PageShell>
  );
}
