import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Eye, DollarSign, FileCheck, Clock } from 'lucide-react';
import api from '@/lib/api';
import { formatDateBD } from '@/lib/utils';

interface SrAccountability {
  user_id: string;
  user_name: string;
  current_cash_holding: number;
  active_routes_count: number;
  pending_reconciliation_count: number;
  total_expected_cash: number;
  routes: any[];
  reconciliations: any[];
}

export function Accountability() {
  const [salesReps, setSalesReps] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedSr, setSelectedSr] = useState<string>('');
  const [accountability, setAccountability] = useState<SrAccountability | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAccountability, setLoadingAccountability] = useState(false);

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
        } catch (error) {
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

  return (
    <div className="min-h-screen">
      <Header title="SR Accountability" />

      <div className="p-3">
        {/* SR Selection */}
        <div className="bg-white rounded-xl p-3 shadow-sm mb-3">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Select Sales Representative
          </label>
          <select
            value={selectedSr}
            onChange={(e) => setSelectedSr(e.target.value)}
            className="input-field"
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
              <div className="bg-white rounded-xl p-8 text-center text-slate-500">
                Loading accountability data...
              </div>
            ) : accountability ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
                  <div className="bg-white rounded-xl p-3 shadow-sm">
                    <p className="text-slate-500 text-sm">Current Cash Holding</p>
                    <p className="text-2xl font-bold text-green-600">
                      ৳ {accountability.current_cash_holding.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-3 shadow-sm">
                    <p className="text-slate-500 text-sm">Active Routes</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {accountability.active_routes_count}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-3 shadow-sm">
                    <p className="text-slate-500 text-sm">Pending Reconciliation</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {accountability.pending_reconciliation_count}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-3 shadow-sm">
                    <p className="text-slate-500 text-sm">Total Expected Cash</p>
                    <p className="text-2xl font-bold text-slate-900">
                      ৳ {accountability.total_expected_cash.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Active Routes */}
                {accountability.routes.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm mb-3">
                    <div className="p-3 border-b border-slate-200">
                      <h3 className="font-semibold text-slate-900">Active Routes</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left p-2 font-semibold text-slate-700">Route #</th>
                            <th className="text-left p-2 font-semibold text-slate-700">Date</th>
                            <th className="text-center p-2 font-semibold text-slate-700">Orders</th>
                            <th className="text-right p-2 font-semibold text-slate-700">Amount</th>
                            <th className="text-center p-2 font-semibold text-slate-700">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {accountability.routes.map((route: any) => (
                            <tr key={route.id} className="hover:bg-slate-50">
                              <td className="p-2 font-medium text-primary-600">{route.route_number}</td>
                              <td className="p-2 text-slate-600">{formatDateBD(route.route_date)}</td>
                              <td className="p-2 text-center">{route.total_orders}</td>
                              <td className="p-2 text-right font-medium">
                                ৳ {route.total_amount.toLocaleString()}
                              </td>
                              <td className="p-2 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  route.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  route.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {route.status}
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
                  <div className="bg-white rounded-xl shadow-sm">
                    <div className="p-3 border-b border-slate-200">
                      <h3 className="font-semibold text-slate-900">Reconciliation History</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left p-2 font-semibold text-slate-700">Date</th>
                            <th className="text-right p-2 font-semibold text-slate-700">Expected</th>
                            <th className="text-right p-2 font-semibold text-slate-700">Collected</th>
                            <th className="text-right p-2 font-semibold text-slate-700">Returns</th>
                            <th className="text-right p-2 font-semibold text-slate-700">Discrepancy</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {accountability.reconciliations.map((rec: any) => (
                            <tr key={rec.id} className="hover:bg-slate-50">
                              <td className="p-2 text-slate-600">
                                {formatDateBD(rec.reconciled_at)}
                              </td>
                              <td className="p-2 text-right font-medium">
                                ৳ {rec.total_expected_cash.toLocaleString()}
                              </td>
                              <td className="p-2 text-right font-medium text-green-600">
                                ৳ {rec.total_collected_cash.toLocaleString()}
                              </td>
                              <td className="p-2 text-right font-medium text-orange-600">
                                ৳ {rec.total_returns_amount.toLocaleString()}
                              </td>
                              <td className={`p-2 text-right font-medium ${
                                rec.discrepancy === 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                ৳ {rec.discrepancy.toLocaleString()}
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
              <div className="bg-white rounded-xl p-8 text-center text-slate-500">
                No accountability data found.
              </div>
            )}
          </>
        )}

        {!selectedSr && (
          <div className="bg-white rounded-xl p-8 text-center text-slate-500">
            Please select a Sales Representative to view accountability.
          </div>
        )}
      </div>
    </div>
  );
}
