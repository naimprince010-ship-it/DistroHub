import { useState, useEffect, useCallback } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SrLiabilitySummary, SrRiskAdjustment, User, UserRole } from '@/types';
import { toast } from '@/hooks/use-toast';

function readLocalRole(): UserRole | 'unknown' {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return 'unknown';
    const j = JSON.parse(raw) as { role?: string };
    const r = (j?.role || '').toLowerCase();
    if (r === 'admin' || r === 'sr' || r === 'dsr') return r;
    if (r === 'sales_rep') return 'dsr';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export function SrLiabilityReport() {
  const [role, setRole] = useState<UserRole | 'unknown'>('unknown');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedSr, setSelectedSr] = useState<string>('');
  const [summary, setSummary] = useState<SrLiabilitySummary | null>(null);
  const [adjustments, setAdjustments] = useState<SrRiskAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjAmount, setAdjAmount] = useState('');
  const [adjType, setAdjType] = useState('commission_offset');
  const [adjNotes, setAdjNotes] = useState('');

  const targetSrId = role === 'sr' ? (JSON.parse(localStorage.getItem('user') || '{}')?.id as string) : selectedSr;

  const load = useCallback(async () => {
    if (!targetSrId) {
      setSummary(null);
      setAdjustments([]);
      return;
    }
    setLoading(true);
    try {
      const sRes = await api.get<SrLiabilitySummary>('/api/reports/sr-liability', {
        params: role === 'sr' ? {} : { sr_id: targetSrId },
      });
      setSummary(sRes.data);
      const aRes = await api.get<SrRiskAdjustment[]>('/api/sr-risk-adjustments', {
        params: { sr_user_id: targetSrId },
      });
      setAdjustments(aRes.data || []);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      const msg = err?.response?.data?.detail || 'Failed to load SR liability';
      toast({ title: 'Error', description: String(msg), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [role, targetSrId]);

  useEffect(() => {
    setRole(readLocalRole());
  }, []);

  useEffect(() => {
    const init = async () => {
      const r = readLocalRole();
      setRole(r);
      if (r === 'admin' || r === 'dsr') {
        try {
          const u = await api.get<User[]>('/api/users');
          const srOnly = (u.data || []).filter((x) => x.role === 'sr');
          setUsers(srOnly);
          if (srOnly.length > 0) setSelectedSr((prev) => prev || srOnly[0].id);
        } catch {
          setUsers([]);
        }
      } else {
        setSelectedSr(JSON.parse(localStorage.getItem('user') || '{}')?.id || '');
      }
    };
    void init();
  }, []);

  useEffect(() => {
    if (role === 'unknown') return;
    if (role === 'admin' || role === 'dsr') {
      if (!selectedSr) return;
    }
    void load();
  }, [role, selectedSr, load]);

  const postAdjustment = async () => {
    if (role !== 'admin' || !targetSrId) return;
    const n = parseFloat(adjAmount);
    if (Number.isNaN(n) || n === 0) {
      toast({ title: 'Invalid amount', description: 'Enter a non-zero number.', variant: 'destructive' });
      return;
    }
    try {
      await api.post('/api/sr-risk-adjustments', {
        sr_user_id: targetSrId,
        amount: n,
        adjustment_type: adjType,
        notes: adjNotes || undefined,
      });
      setAdjAmount('');
      setAdjNotes('');
      await load();
      toast({ title: 'Adjustment posted' });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast({
        title: 'Failed',
        description: String(err?.response?.data?.detail || e),
        variant: 'destructive',
      });
    }
  };

  return (
    <PageShell
      title="SR personal guarantee"
      subtitle="Open SR-backed due, net exposure, and risk adjustments"
    >
      <div className="space-y-4 max-w-3xl">
        {(role === 'admin' || role === 'dsr') && (
          <div className="max-w-sm">
            <label className="text-sm text-muted-foreground">SR</label>
            <select
              className="input-field w-full"
              value={selectedSr}
              onChange={(e) => setSelectedSr(e.target.value)}
            >
              {users.length === 0 ? (
                <option value="">No SR users</option>
              ) : (
                users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))
              )}
            </select>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : summary ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{summary.sr_name || summary.sr_user_id}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Open SR-backed due</p>
                <p className="font-mono text-lg font-semibold">৳ {summary.open_sr_backed_due.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Adjustments total (credit to SR)</p>
                <p className="font-mono text-lg">৳ {summary.adjustments_total.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Net exposure</p>
                <p className="font-mono text-lg font-semibold text-amber-700 dark:text-amber-400">
                  ৳ {summary.net_exposure.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Guarantee limit (0 = unlimited)</p>
                <p className="font-mono">৳ {summary.guarantee_limit.toLocaleString()}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-muted-foreground">Enforcement</p>
                <p className="font-medium uppercase">{summary.enforcement}</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Adjustments</CardTitle>
          </CardHeader>
          <CardContent>
            {adjustments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No adjustments yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {adjustments.map((a) => (
                  <li key={a.id} className="border-b border-border pb-2">
                    <span className="font-mono">৳ {a.amount.toLocaleString()}</span>{' '}
                    <span className="text-muted-foreground">({a.adjustment_type})</span>
                    {a.notes ? <p className="text-xs text-muted-foreground mt-0.5">{a.notes}</p> : null}
                  </li>
                ))}
              </ul>
            )}
            {role === 'admin' && targetSrId ? (
              <div className="mt-4 space-y-2 border-t border-border pt-4">
                <p className="text-sm font-medium">Post manual adjustment (admin)</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <input
                    className="input-field"
                    placeholder="Amount (positive = reduces exposure)"
                    value={adjAmount}
                    onChange={(e) => setAdjAmount(e.target.value)}
                  />
                  <input
                    className="input-field"
                    value={adjType}
                    onChange={(e) => setAdjType(e.target.value)}
                    placeholder="Type"
                  />
                  <input
                    className="input-field"
                    value={adjNotes}
                    onChange={(e) => setAdjNotes(e.target.value)}
                    placeholder="Notes"
                  />
                </div>
                <Button type="button" size="sm" onClick={() => void postAdjustment()}>
                  Post adjustment
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
