import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, RefreshCw, Search, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';

interface ReconciliationRow {
  product_id: string;
  product_name: string;
  sku: string;
  stock_quantity: number;
  batch_quantity: number;
  ledger_quantity: number;
  ledger_entries: number;
  stock_vs_batch_diff: number;
  batch_vs_ledger_diff: number | null;
  status: string;
}

interface ReconciliationResponse {
  generated_at: string;
  totals: {
    products_checked: number;
    rows_returned: number;
    mismatch_stock_vs_batch: number;
    mismatch_batch_vs_ledger: number;
    sum_stock_quantity: number;
    sum_batch_quantity: number;
    sum_ledger_quantity: number;
    ledger_rows_scanned: number;
  };
  items: ReconciliationRow[];
}

export function StockReconciliation() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReconciliationResponse | null>(null);
  const [search, setSearch] = useState('');
  const [onlyMismatch, setOnlyMismatch] = useState(true);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/reports/stock-reconciliation', {
        params: { include_only_mismatch: onlyMismatch },
      });
      setReport(response.data);
    } catch (error) {
      console.error('[StockReconciliation] Failed to fetch report', error);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [onlyMismatch]);

  const rows = useMemo(() => {
    const base = report?.items || [];
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((row) =>
      row.product_name?.toLowerCase().includes(q) ||
      row.sku?.toLowerCase().includes(q)
    );
  }, [report, search]);

  const exportCsv = () => {
    const headers = [
      'Product ID',
      'Product Name',
      'SKU',
      'Status',
      'Stock Qty',
      'Batch Qty',
      'Ledger Qty',
      'Stock vs Batch Diff',
      'Batch vs Ledger Diff',
      'Ledger Entries',
    ];
    const lines = rows.map((row) => [
      row.product_id,
      row.product_name,
      row.sku,
      row.status,
      row.stock_quantity,
      row.batch_quantity,
      row.ledger_quantity,
      row.stock_vs_batch_diff,
      row.batch_vs_ledger_diff ?? '',
      row.ledger_entries,
    ]);
    const csv = [headers.join(','), ...lines.map((line) => line.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-reconciliation-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totals = report?.totals;

  return (
    <PageShell
      title="Stock Reconciliation"
      subtitle="Stock summary vs batches vs ledger consistency report"
      actions={
        <div className="flex items-center gap-2">
          <Link to="/reports" className="btn-secondary inline-flex h-9 items-center gap-2 px-3">
            <ArrowLeft className="h-4 w-4" />
            Reports
          </Link>
          <button type="button" onClick={fetchReport} className="btn-secondary inline-flex h-9 items-center gap-2 px-3" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button type="button" onClick={exportCsv} className="btn-secondary inline-flex h-9 items-center gap-2 px-3" disabled={!rows.length}>
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Products checked</p><p className="text-2xl font-semibold">{totals?.products_checked ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Rows returned</p><p className="text-2xl font-semibold">{totals?.rows_returned ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Stock vs Batch mismatch</p><p className="text-2xl font-semibold text-[hsl(var(--dh-red))]">{totals?.mismatch_stock_vs_batch ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Batch vs Ledger mismatch</p><p className="text-2xl font-semibold text-[hsl(var(--dh-amber))]">{totals?.mismatch_batch_vs_ledger ?? 0}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base">Mismatch table</CardTitle>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={onlyMismatch}
                    onChange={(e) => setOnlyMismatch(e.target.checked)}
                  />
                  Only mismatch
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search product / SKU"
                    className="input-field h-9 w-[220px] pl-8"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[68vh] overflow-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-muted/40">
                  <tr className="border-b border-border">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Product</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Stock</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Batch</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ledger</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Stock-Batch</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Batch-Ledger</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Entries</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No rows found.</td></tr>
                  ) : rows.map((row) => (
                    <tr key={row.product_id} className="border-b border-border/60 hover:bg-muted/20">
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-foreground">{row.product_name}</div>
                        <div className="text-xs text-muted-foreground">{row.sku}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant={row.status === 'ok' ? 'secondary' : 'outline'} className={row.status !== 'ok' ? 'border-[hsl(var(--dh-red))]/30 text-[hsl(var(--dh-red))]' : ''}>
                          {row.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">{row.stock_quantity}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{row.batch_quantity}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{row.ledger_quantity}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{row.stock_vs_batch_diff}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{row.batch_vs_ledger_diff ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{row.ledger_entries}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
