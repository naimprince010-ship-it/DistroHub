import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Eye,
  Printer,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  Edit,
  Trash2,
  Search,
  ChevronDown,
  Receipt,
} from 'lucide-react';
import { ChallanPrint } from '@/components/print/ChallanPrint';
import { BarcodeScanButton } from '@/components/BarcodeScanner';
import { PaymentHistory } from '@/components/payments/PaymentHistory';
import api, { deleteWithOfflineQueue, postWithOfflineQueue, putWithOfflineQueue } from '@/lib/api';
import { formatDateBD } from '@/lib/utils';
import { PAYMENT_METHOD_OPTIONS, formatPaymentMethodLabel, type PaymentMethodValue } from '@/lib/paymentMethods';
import {
  bulkSaveSales,
  deleteRecord,
  getProducts as getOfflineProducts,
  getRetailers as getOfflineRetailers,
  getSales as getOfflineSales,
  saveSale,
  type SaleRecord,
} from '@/lib/offlineDb';
import { PageShell } from '@/components/layout/PageShell';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTableControls } from '@/hooks/useTableControls';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  created_at: string;
  collected_by_name?: string;
  notes?: string;
}

interface SalesOrder {
  id: string;
  order_number: string;
  retailer_name: string;
  retailer_id?: string;
  order_date: string;
  delivery_date: string;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  payment_status: 'unpaid' | 'partial' | 'paid';
  total_amount: number;
  paid_amount: number;
  items: { product: string; qty: number; price: number }[];
  delivery_status?: 'pending' | 'delivered' | 'partially_delivered' | 'returned';
  assigned_to?: string;
  assigned_to_name?: string;
  route_id?: string;
  payments?: Payment[];
}

const mapApiSaleToRecord = (sale: any, synced: boolean): SaleRecord => ({
  id: sale.id || '',
  retailer_id: sale.retailer_id || '',
  retailer_name: sale.retailer_name || '',
  items: (sale.items || []).map((item: any) => ({
    product_id: item.product_id || '',
    product_name: item.product_name || item.product || '',
    quantity: item.quantity || item.qty || 0,
    unit_price: item.unit_price || item.price || 0,
    total: (item.quantity || item.qty || 0) * (item.unit_price || item.price || 0),
  })),
  total_amount: sale.total_amount || 0,
  paid_amount: sale.paid_amount || 0,
  payment_method: sale.payment_method || 'cash',
  sale_date: sale.created_at ? sale.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
  synced,
  lastModified: Date.now(),
});

const mapRecordToOrder = (sale: SaleRecord): SalesOrder => ({
  id: sale.id,
  order_number: sale.id,
  retailer_name: sale.retailer_name,
  retailer_id: sale.retailer_id,
  order_date: sale.sale_date,
  delivery_date: sale.sale_date,
  status: 'pending',
  payment_status: sale.paid_amount >= sale.total_amount ? 'paid' : sale.paid_amount > 0 ? 'partial' : 'unpaid',
  total_amount: sale.total_amount,
  paid_amount: sale.paid_amount,
  items: sale.items.map((item) => ({
    product: item.product_name,
    qty: item.quantity,
    price: item.unit_price,
  })),
});

type StatusVariant = 'warning' | 'info' | 'success' | 'danger' | 'muted';

const statusConfig: Record<string, { icon: typeof Clock; variant: StatusVariant; label: string }> = {
  pending:   { icon: Clock,        variant: 'warning', label: 'Pending' },
  confirmed: { icon: CheckCircle,  variant: 'info',    label: 'Confirmed' },
  delivered: { icon: Truck,        variant: 'success', label: 'Delivered' },
  cancelled: { icon: XCircle,      variant: 'danger',  label: 'Cancelled' },
};

const paymentConfig: Record<string, { variant: StatusVariant; label: string }> = {
  unpaid:  { variant: 'danger',  label: 'Unpaid' },
  partial: { variant: 'warning', label: 'Partial' },
  paid:    { variant: 'success', label: 'Paid' },
};

const notifyError = (message: string) =>
  toast({ title: 'Error', description: message, variant: 'destructive' });
const notifySuccess = (message: string) =>
  toast({ title: 'Success', description: message });

export function Sales() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [editOrder, setEditOrder] = useState<SalesOrder | null>(null);
  const [printChallanOrder, setPrintChallanOrder] = useState<SalesOrder | null>(null);
  const [collectionOrder, setCollectionOrder] = useState<SalesOrder | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<SalesOrder | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchSales = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);
      const response = await api.get('/api/sales');
      if (response.data) {
        const mappedOrders: SalesOrder[] = response.data.map((sale: any) => {
          let paymentStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
          if (sale.payment_status === 'paid') paymentStatus = 'paid';
          else if (sale.payment_status === 'partial') paymentStatus = 'partial';

          let status: 'pending' | 'confirmed' | 'delivered' | 'cancelled' = 'pending';
          if (sale.status === 'confirmed') status = 'confirmed';
          else if (sale.status === 'delivered') status = 'delivered';
          else if (sale.status === 'cancelled') status = 'cancelled';

          const orderDate = sale.created_at ? sale.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
          return {
            id: sale.id || '',
            order_number: sale.invoice_number || '',
            retailer_id: sale.retailer_id || '',
            retailer_name: sale.retailer_name || '',
            order_date: orderDate,
            delivery_date: sale.delivery_date || orderDate,
            status,
            payment_status: paymentStatus,
            total_amount: sale.total_amount || 0,
            paid_amount: sale.paid_amount || 0,
            items: (sale.items || []).map((item: any) => ({
              product: item.product_name || '',
              qty: item.quantity || 0,
              price: item.unit_price || 0,
            })),
            delivery_status: sale.delivery_status || 'pending',
            assigned_to: sale.assigned_to || undefined,
            assigned_to_name: sale.assigned_to_name || undefined,
            route_id: sale.route_id || undefined,
          };
        });
        setOrders(mappedOrders);
        await bulkSaveSales(response.data.map((sale: any) => mapApiSaleToRecord(sale, true)));
      }
    } catch (error: any) {
      if (error?.response?.status === 401) return;
      const isOfflineError =
        !navigator.onLine || error?.isNetworkError || error?.code === 'ERR_NETWORK' || error?.message?.includes('Network');
      if (isOfflineError) {
        const offlineSales = await getOfflineSales();
        setOrders(offlineSales.map(mapRecordToOrder));
      } else {
        setOrders([]);
        setLoadError('Failed to load sales orders. Please retry.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
    const globalSearch = searchParams.get('q') || '';
    setSearchTerm(globalSearch);
  }, [searchParams]);

  const handleDelete = async (order: SalesOrder) => {
    try {
      await deleteWithOfflineQueue('sales', `/api/sales/${order.id}`, { id: order.id }, {
        onOfflineDelete: async () => deleteRecord('sales', order.id),
        onOnlineDelete: async () => deleteRecord('sales', order.id),
      });
      await fetchSales();
      setDeleteCandidate(null);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to delete order';
      notifyError(`Failed to delete order: ${errorMessage}`);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.retailer_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalSales = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const totalDue = orders.reduce((sum, o) => sum + (o.total_amount - o.paid_amount), 0);
  const pendingCount = orders.filter((o) => o.status === 'pending' || o.status === 'confirmed').length;
  const salesTable = useTableControls(filteredOrders, { initialSortKey: 'order_number', pageSize: 10 });

  return (
    <PageShell
      title="Sales Orders"
      subtitle="Manage outgoing invoices and collections"
      actions={
        <Button onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Order
        </Button>
      }
    >
      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Orders"    value={orders.length}                         icon={Receipt} color="blue" />
        <StatCard label="Total Sales"     value={`৳ ${totalSales.toLocaleString()}`}    icon={Receipt} color="green" />
        <StatCard label="Total Due"       value={`৳ ${totalDue.toLocaleString()}`}      icon={Receipt} color="red" />
        <StatCard label="Pending Delivery" value={pendingCount}                         icon={Truck}   color="amber" />
      </div>
      {loadError ? (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-[hsl(var(--dh-red))]/30 bg-[hsl(var(--dh-red))]/5 px-3 py-2 text-sm text-[hsl(var(--dh-red))]">
          <span>{loadError}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void fetchSales()}>
            Retry
          </Button>
        </div>
      ) : null}

      {/* Table card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Orders</CardTitle>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-8 h-9 w-48 text-sm"
                />
              </div>
              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field h-9 w-36 text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Loading sales orders…</div>
          ) : filteredOrders.length === 0 ? (
            <div className="dh-empty-state">
              <p className="dh-empty-state-title">No orders found</p>
              <p className="dh-empty-state-desc">Adjust your search or create a new order.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button type="button" onClick={() => salesTable.toggleSort('order_number')} className="inline-flex items-center gap-1">
                      Order #
                      <span className="text-[10px]">{salesTable.sortKey === 'order_number' ? (salesTable.sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span>
                    </button>
                  </TableHead>
                  <TableHead>Retailer</TableHead>
                  <TableHead className="hidden md:table-cell">Order Date</TableHead>
                  <TableHead className="hidden lg:table-cell">Delivery</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="hidden md:table-cell">Payment</TableHead>
                  <TableHead className="text-right">
                    <button type="button" onClick={() => salesTable.toggleSort('total_amount')} className="ml-auto inline-flex items-center gap-1">
                      Amount
                      <span className="text-[10px]">{salesTable.sortKey === 'total_amount' ? (salesTable.sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span>
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesTable.paginatedRows.map((order) => {
                  const StatusIcon = statusConfig[order.status].icon;
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium text-[hsl(var(--primary))]">
                        {order.order_number}
                      </TableCell>
                      <TableCell className="text-foreground">{order.retailer_name}</TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{order.order_date}</TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">{order.delivery_date}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={statusConfig[order.status].variant} className="gap-1">
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig[order.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant={paymentConfig[order.payment_status].variant}>
                          {paymentConfig[order.payment_status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        ৳ {order.total_amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-[hsl(var(--dh-red))]">
                        ৳ {(order.total_amount - order.paid_amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-1.5 rounded text-muted-foreground hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 transition-colors"
                            title="View Details"
                            aria-label="View order details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditOrder(order)}
                            className="p-1.5 rounded text-muted-foreground hover:text-[hsl(var(--dh-blue))] hover:bg-[hsl(var(--dh-blue))]/10 transition-colors"
                            title="Edit Order"
                            aria-label="Edit order"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteCandidate(order)}
                            className="p-1.5 rounded text-muted-foreground hover:text-[hsl(var(--dh-red))] hover:bg-[hsl(var(--dh-red))]/10 transition-colors"
                            title="Delete Order"
                            aria-label="Delete order"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {(order.total_amount - order.paid_amount) > 0 && (
                            <button
                              onClick={() => setCollectionOrder(order)}
                              className="px-2 py-1 text-xs font-medium bg-[hsl(var(--dh-green))] hover:bg-[hsl(var(--dh-green))]/90 text-white rounded transition-colors"
                              title="Collect Money"
                            >
                              টাকা জমা
                            </button>
                          )}
                          <button
                            onClick={() => setPrintChallanOrder(order)}
                            className="p-1.5 rounded text-muted-foreground hover:text-[hsl(var(--dh-green))] hover:bg-[hsl(var(--dh-green))]/10 transition-colors"
                            title="Print Challan"
                            aria-label="Print challan"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {!loading && filteredOrders.length > 0 ? (
            <PaginationControls
              page={salesTable.page}
              totalPages={salesTable.totalPages}
              totalRows={salesTable.totalRows}
              onPageChange={salesTable.setPage}
            />
          ) : null}
        </CardContent>
      </Card>
      <AlertDialog open={deleteCandidate !== null} onOpenChange={(open) => { if (!open) setDeleteCandidate(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete order?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCandidate
                ? `Are you sure you want to delete order ${deleteCandidate.order_number}? This action cannot be undone.`
                : 'This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deleteCandidate) void handleDelete(deleteCandidate);
              }}
              className="bg-[hsl(var(--dh-red))] text-white hover:bg-[hsl(var(--dh-red))]/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onEdit={() => {
            setEditOrder(selectedOrder);
            setSelectedOrder(null);
          }}
        />
      )}

      {editOrder && (
        <EditSaleModal
          order={editOrder}
          onClose={() => setEditOrder(null)}
          onSave={async () => {
            await fetchSales();
            setEditOrder(null);
          }}
        />
      )}

      {showAddModal && (
        <AddOrderModal
          onClose={() => setShowAddModal(false)}
          onSave={async (order) => {
            try {
              if (!navigator.onLine) {
                if (!order.retailer_id) {
                  notifyError('Retailer ID not found. Please select a retailer from the list.');
                  return;
                }
                const tempId = `offline-sale-${Date.now()}`;
                const localRecord: SaleRecord = {
                  id: tempId,
                  retailer_id: order.retailer_id,
                  retailer_name: order.retailer_name,
                  items: order.items.map((item) => ({
                    product_id: '',
                    product_name: item.product,
                    quantity: item.qty,
                    unit_price: item.price,
                    total: item.qty * item.price,
                  })),
                  total_amount: order.total_amount,
                  paid_amount: order.paid_amount || 0,
                  payment_method: 'cash',
                  sale_date: order.order_date,
                  synced: false,
                  lastModified: Date.now(),
                };
                await postWithOfflineQueue('sales', '/api/sales', {
                  retailer_id: order.retailer_id,
                  items: order.items.map((item) => ({
                    product_name: item.product,
                    quantity: item.qty,
                    unit_price: item.price,
                  })),
                  payment_type: 'cash',
                  paid_amount: order.paid_amount || 0,
                  notes: `Delivery date: ${order.delivery_date}`,
                  assigned_to: order.assigned_to,
                  _local_id: tempId,
                  _offline_items: true,
                }, {
                  localRecord,
                  onOfflineSave: async (record) => saveSale(record as SaleRecord),
                });
                await fetchSales();
                setShowAddModal(false);
                return;
              }

              const retailersResponse = await api.get('/api/retailers');
              const retailer = retailersResponse.data.find(
                (r: any) => r.shop_name === order.retailer_name || r.name === order.retailer_name
              );
              if (!retailer) {
                notifyError(`Retailer "${order.retailer_name}" not found. Please select a valid retailer.`);
                return;
              }

              const productsResponse = await api.get('/api/products');
              const products = productsResponse.data;
              const saleItems = [];
              const productsWithoutBatches: string[] = [];

              for (const item of order.items) {
                const product = products.find((p: any) => p.name === item.product);
                if (!product) continue;
                const batchesResponse = await api.get(`/api/products/${product.id}/batches`);
                const batches = batchesResponse.data || [];
                if (batches.length === 0) {
                  productsWithoutBatches.push(item.product);
                  continue;
                }
                const batch = batches[0];
                saleItems.push({
                  product_id: product.id,
                  batch_id: batch.id,
                  quantity: item.qty,
                  unit_price: item.price,
                  discount: 0,
                });
              }

              if (productsWithoutBatches.length > 0) {
                const message =
                  productsWithoutBatches.length === order.items.length
                    ? `No batches found for the following products. Please add stock first:\n\n${productsWithoutBatches.join('\n')}`
                    : `Warning: The following products don't have stock and were skipped:\n\n${productsWithoutBatches.join('\n')}\n\nDo you want to continue?`;
                if (productsWithoutBatches.length === order.items.length) {
                  notifyError(message);
                  return;
                } else {
                  if (!confirm(message)) return;
                }
              }

              if (saleItems.length === 0) {
                notifyError('No valid items to create sale. Please add stock first via a purchase order.');
                return;
              }

              try {
                const creditRes = await api.get('/api/credit/check', {
                  params: {
                    retailer_id: retailer.id,
                    new_order_amount: order.total_amount || 0,
                  },
                });
                const credit = creditRes.data;
                if (credit && credit.can_submit === false) {
                  const proceed = confirm(
                    `Credit warning for ${credit.retailer_name || order.retailer_name}:\n` +
                    `Current Due: ${Number(credit.current_due || 0).toLocaleString()}\n` +
                    `Projected Due: ${Number(credit.projected_due || 0).toLocaleString()}\n` +
                    `Limit: ${Number(credit.credit_limit || 0).toLocaleString()}\n\n` +
                    `Proceed with override?`
                  );
                  if (!proceed) return;
                }
              } catch (creditError) {
                console.warn('[Sales] Credit check unavailable, proceeding without block', creditError);
              }

              const salePayload: any = {
                retailer_id: retailer.id,
                items: saleItems,
                payment_type: 'cash',
                paid_amount: order.paid_amount || 0,
                notes: `Delivery date: ${order.delivery_date}`,
                terms_days: 0,
              };
              if ('assigned_to' in order && order.assigned_to) {
                salePayload.assigned_to = order.assigned_to;
              }

              const response = await api.post('/api/sales', salePayload);
              await saveSale(mapApiSaleToRecord(response.data, true));
              await fetchSales();
              setShowAddModal(false);
            } catch (error: any) {
              notifyError(`Failed to create sale: ${error.response?.data?.detail || error.message}`);
            }
          }}
        />
      )}

      {collectionOrder && (
        <CollectionModal
          order={collectionOrder}
          onClose={() => setCollectionOrder(null)}
          onSuccess={async () => {
            await fetchSales();
            setCollectionOrder(null);
          }}
        />
      )}

      {printChallanOrder && (
        <ChallanPrintWrapper
          order={printChallanOrder}
          onClose={() => setPrintChallanOrder(null)}
        />
      )}
    </PageShell>
  );
}

/* ─── Modal helper ─── */
function ModalShell({ title, subtitle, onClose, children, footer }: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
        {footer && <div className="p-4 border-t border-border flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

function ChallanPrintWrapper({ order, onClose }: { order: SalesOrder; onClose: () => void }) {
  const [srPhone, setSrPhone] = useState<string | null>(null);
  const [srName, setSrName] = useState<string | null>(null);
  const [srId, setSrId] = useState<string | null>(null);
  const [returnItems, setReturnItems] = useState<Array<{ sale_item_id: string; quantity_returned: number; product_name: string }>>([]);

  useEffect(() => {
    const fetchData = async () => {
      let targetSrId: string | null = null;
      let targetSrName: string | null = null;

      if (order.route_id) {
        try {
          const routeRes = await api.get(`/api/routes/${order.route_id}`);
          if (routeRes.data) {
            targetSrId = routeRes.data.assigned_to || null;
            targetSrName = routeRes.data.assigned_to_name || null;
          }
        } catch {
          targetSrId = order.assigned_to || null;
          targetSrName = order.assigned_to_name || null;
        }
      } else {
        targetSrId = order.assigned_to || null;
        targetSrName = order.assigned_to_name || null;
      }

      setSrId(targetSrId);
      setSrName(targetSrName);

      if (targetSrId) {
        try {
          const usersRes = await api.get('/api/users');
          const sr = usersRes.data?.find((u: any) => u.id === targetSrId);
          if (sr?.phone) setSrPhone(sr.phone);
        } catch { /* ignore */ }
      }

      try {
        const returnsRes = await api.get(`/api/sales/${order.id}/returns`);
        if (returnsRes.data && Array.isArray(returnsRes.data)) {
          const all: Array<{ sale_item_id: string; quantity_returned: number; product_name: string }> = [];
          returnsRes.data.forEach((ret: any) => {
            (ret.items || []).forEach((item: any) => {
              all.push({
                sale_item_id: item.sale_item_id,
                quantity_returned: item.quantity_returned,
                product_name: item.product_name || '',
              });
            });
          });
          setReturnItems(all);
        }
      } catch { /* ignore */ }
    };
    fetchData();
  }, [order.assigned_to, order.route_id, order.id]);

  const returnsByProduct = new Map<string, number>();
  returnItems.forEach((item) => {
    returnsByProduct.set(item.product_name, (returnsByProduct.get(item.product_name) || 0) + item.quantity_returned);
  });

  return (
    <ChallanPrint
      data={{
        challan_number: `CH-${order.order_number.replace('ORD-', '')}`,
        order_number: order.order_number,
        date: order.order_date,
        delivery_date: order.delivery_date,
        retailer_name: order.retailer_name,
        retailer_id: order.id,
        items: order.items.map((item) => ({
          product: item.product,
          qty: item.qty,
          unit: 'Pcs',
          pack_size: 'Pcs',
          unit_price: item.price,
          bonus_qty: 0,
          discount: 0,
          discount_amount: 0,
          returned_qty: returnsByProduct.get(item.product) || 0,
        })),
        total_items: order.items.length,
        total_amount: order.total_amount,
        paid_amount: order.paid_amount,
        due_amount: order.total_amount - order.paid_amount,
        payment_status: order.payment_status,
        challan_type: 'Normal',
        delivery_status: order.delivery_status,
        distributor_name: 'DistroHub',
        route_name: 'Main Route',
        sr_name: srName || order.assigned_to_name || 'Sales Representative',
        sr_id: srId || order.assigned_to,
        sr_phone: srPhone || undefined,
      }}
      onClose={onClose}
    />
  );
}

function OrderDetailsModal({ order, onClose, onEdit }: {
  order: SalesOrder;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <ModalShell
      title={order.order_number}
      subtitle={order.retailer_name}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onEdit} className="gap-2">
            <Edit className="w-4 h-4" /> Edit Payment
          </Button>
          <Button variant="outline" className="gap-2">
            <Printer className="w-4 h-4" /> Print Challan
          </Button>
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-xs text-muted-foreground">Order Date</p>
          <p className="font-medium text-foreground">{order.order_date ? formatDateBD(order.order_date) : ''}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Delivery Date</p>
          <p className="font-medium text-foreground">{order.delivery_date ? formatDateBD(order.delivery_date) : ''}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Status</p>
          <Badge variant={statusConfig[order.status].variant}>{statusConfig[order.status].label}</Badge>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Payment Status</p>
          <Badge variant={paymentConfig[order.payment_status].variant}>{paymentConfig[order.payment_status].label}</Badge>
        </div>
        {order.assigned_to_name && (
          <div>
            <p className="text-xs text-muted-foreground">Assigned To</p>
            <p className="font-medium text-foreground">{order.assigned_to_name}</p>
          </div>
        )}
      </div>

      <h3 className="font-semibold text-foreground mb-2">Order Items</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.items.map((item, index) => (
            <TableRow key={index}>
              <TableCell>{item.product}</TableCell>
              <TableCell className="text-right font-mono">{item.qty}</TableCell>
              <TableCell className="text-right font-mono">৳ {item.price}</TableCell>
              <TableCell className="text-right font-mono font-medium">৳ {(item.qty * item.price).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="mt-3 bg-muted/50 rounded-lg p-3 space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Amount</span>
          <span className="font-semibold font-mono">৳ {order.total_amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Paid Amount</span>
          <span className="font-semibold font-mono text-[hsl(var(--dh-green))]">৳ {order.paid_amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm border-t border-border pt-1.5">
          <span className="font-medium text-foreground">Due Amount</span>
          <span className="font-bold font-mono text-[hsl(var(--dh-red))]">
            ৳ {(order.total_amount - order.paid_amount).toLocaleString()}
          </span>
        </div>
      </div>

      {order.payments && order.payments.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold text-foreground mb-2">Payment History</h3>
          <div className="space-y-2">
            {order.payments.map((payment) => (
              <div key={payment.id} className="bg-muted/40 rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium font-mono text-foreground">৳ {payment.amount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{formatDateBD(payment.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{formatPaymentMethodLabel(payment.payment_method)}</p>
                    {payment.collected_by_name && (
                      <p className="text-xs text-muted-foreground">by {payment.collected_by_name}</p>
                    )}
                  </div>
                </div>
                {payment.notes && <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </ModalShell>
  );
}

function EditSaleModal({ order, onClose, onSave }: {
  order: SalesOrder;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    paid_amount: order.paid_amount,
    delivery_status: order.delivery_status || 'pending',
    assigned_to: order.assigned_to || '',
    notes: '',
  });
  const [salesReps, setSalesReps] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingSalesReps, setLoadingSalesReps] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/api/users').then((res) => {
      if (res.data) setSalesReps(res.data.filter((u: any) => u.role === 'sales_rep').map((u: any) => ({ id: u.id, name: u.name })));
    }).catch(() => { /* ignore */ }).finally(() => setLoadingSalesReps(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updatePayload: any = {
        paid_amount: formData.paid_amount,
        delivery_status: formData.delivery_status !== 'pending' ? formData.delivery_status : undefined,
        assigned_to: formData.assigned_to || null,
        notes: formData.notes || undefined,
      };
      const localRecord: SaleRecord = {
        id: order.id, retailer_id: order.retailer_id || '', retailer_name: order.retailer_name,
        items: order.items.map((item) => ({ product_id: '', product_name: item.product, quantity: item.qty, unit_price: item.price, total: item.qty * item.price })),
        total_amount: order.total_amount, paid_amount: formData.paid_amount, payment_method: 'cash',
        sale_date: order.order_date, synced: false, lastModified: Date.now(),
      };
      await putWithOfflineQueue('sales', `/api/sales/${order.id}`, updatePayload, {
        localRecord,
        onOfflineSave: async (record) => saveSale(record as SaleRecord),
        onOnlineSave: async (data) => saveSale(mapApiSaleToRecord(data, true)),
      });
      notifySuccess('Order updated successfully.');
      onSave();
    } catch (error: any) {
      notifyError(`Failed to update order: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const calculatedDue = Math.max(0, order.total_amount - formData.paid_amount);
  const calculatedPaymentStatus = calculatedDue === 0 ? 'paid' : formData.paid_amount > 0 ? 'partial' : 'unpaid';

  return (
    <ModalShell
      title="Edit Order"
      subtitle={`${order.order_number} — ${order.retailer_name}`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-muted/40 rounded-lg p-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Amount</span>
            <span className="font-semibold font-mono">৳ {order.total_amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current Paid</span>
            <span className="font-semibold font-mono text-[hsl(var(--dh-green))]">৳ {order.paid_amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5">
            <span className="font-medium text-foreground">Current Due</span>
            <span className="font-bold font-mono text-[hsl(var(--dh-red))]">
              ৳ {(order.total_amount - order.paid_amount).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <PaymentHistory saleId={order.id} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Paid Amount (৳)</label>
          <input type="number" value={formData.paid_amount}
            onChange={(e) => setFormData({ ...formData, paid_amount: Number(e.target.value) })}
            className="input-field" min={0} max={order.total_amount} step="0.01" required />
          <p className="text-xs text-muted-foreground">Enter the total amount paid (including previous payments)</p>
        </div>

        <div className="bg-[hsl(var(--dh-blue))]/5 rounded-lg p-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">New Due Amount</span>
            <span className="font-semibold font-mono text-[hsl(var(--dh-red))]">৳ {calculatedDue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Payment Status</span>
            <Badge variant={paymentConfig[calculatedPaymentStatus].variant}>
              {paymentConfig[calculatedPaymentStatus].label}
            </Badge>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Delivery Status</label>
          <select value={formData.delivery_status}
            onChange={(e) => setFormData({ ...formData, delivery_status: e.target.value as any })}
            className="input-field">
            <option value="pending">Pending</option>
            <option value="delivered">Delivered</option>
            <option value="partially_delivered">Partially Delivered</option>
            <option value="returned">Returned</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Assigned To</label>
          <select value={formData.assigned_to}
            onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
            className="input-field" disabled={loadingSalesReps}>
            <option value="">{loadingSalesReps ? 'Loading SRs…' : 'None (Clear Assignment)'}</option>
            {salesReps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Notes (Optional)</label>
          <textarea value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="input-field" rows={2} placeholder="Add any notes about this update…" />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Updating…' : 'Update Order'}</Button>
        </div>
      </form>
    </ModalShell>
  );
}

function AddOrderModal({ onClose, onSave }: { onClose: () => void; onSave: (order: SalesOrder) => void | Promise<void> }) {
  const [formData, setFormData] = useState({
    retailer_name: '', retailer_id: '', delivery_date: '', assigned_to: '',
    items: [{ product: '', qty: 0, price: 0 }],
  });
  const [retailers, setRetailers] = useState<Array<{ id: string; name: string; shop_name: string }>>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string; selling_price: number; barcode?: string }>>([]);
  const [salesReps, setSalesReps] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingRetailers, setLoadingRetailers] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingSalesReps, setLoadingSalesReps] = useState(true);
  const [retailerSearchTerm, setRetailerSearchTerm] = useState('');
  const [showRetailerDropdown, setShowRetailerDropdown] = useState(false);
  const [productSearchTerms, setProductSearchTerms] = useState<string[]>(['']);
  const [openProductDropdownIndex, setOpenProductDropdownIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) { setLoadingRetailers(false); setLoadingProducts(false); return; }
      try {
        const [retailersRes, productsRes, usersRes] = await Promise.allSettled([
          api.get('/api/retailers'),
          api.get('/api/products'),
          api.get('/api/users'),
        ]);

        if (retailersRes.status === 'fulfilled' && Array.isArray(retailersRes.value.data)) {
          setRetailers(
            retailersRes.value.data.map((r: any) => ({
              id: r.id,
              name: r.name,
              shop_name: r.shop_name || r.name || '',
            }))
          );
        } else {
          setRetailers([]);
        }

        if (productsRes.status === 'fulfilled' && Array.isArray(productsRes.value.data)) {
          setProducts(
            productsRes.value.data.map((p: any) => ({
              id: p.id,
              name: p.name,
              selling_price: p.selling_price || 0,
              barcode: p.barcode,
            }))
          );
        } else {
          setProducts([]);
        }

        if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value.data)) {
          setSalesReps(
            usersRes.value.data
              .filter((u: any) => u.role === 'sales_rep')
              .map((u: any) => ({ id: u.id, name: u.name }))
          );
        } else {
          // Keep order form usable even if SR list endpoint is unavailable.
          setSalesReps([]);
        }
      } catch (error: any) {
        const isOfflineError = !navigator.onLine || error?.isNetworkError || error?.code === 'ERR_NETWORK';
        if (isOfflineError) {
          const [offlineRetailers, offlineProducts] = await Promise.all([getOfflineRetailers(), getOfflineProducts()]);
          setRetailers(offlineRetailers.map((r) => ({ id: r.id, name: r.name, shop_name: r.shop_name })));
          setProducts(offlineProducts.map((p) => ({ id: p.id, name: p.name, selling_price: p.unit_price })));
          setSalesReps([]);
        } else {
          notifyError(`Error loading data: ${error?.response?.data?.detail || error?.message}`);
        }
      } finally {
        setLoadingRetailers(false);
        setLoadingProducts(false);
        setLoadingSalesReps(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showRetailerDropdown && !target.closest('.retailer-dropdown-container')) {
        setShowRetailerDropdown(false);
        setRetailerSearchTerm('');
      }
      if (openProductDropdownIndex !== null && !target.closest('.product-dropdown-container')) {
        setOpenProductDropdownIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showRetailerDropdown, openProductDropdownIndex]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const total = formData.items.reduce((sum, item) => sum + item.qty * item.price, 0);
      const orderData = {
        id: '', order_number: `ORD-${Date.now()}`,
        retailer_name: formData.retailer_name, retailer_id: formData.retailer_id,
        order_date: new Date().toISOString().split('T')[0], delivery_date: formData.delivery_date,
        status: 'pending' as const, payment_status: 'unpaid' as const,
        total_amount: total, paid_amount: 0, items: formData.items,
        assigned_to: formData.assigned_to || undefined,
      };
      await onSave(orderData);
    } catch (error) {
      console.error('[AddOrderModal] Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addItem = () => {
    setFormData({ ...formData, items: [...formData.items, { product: '', qty: 0, price: 0 }] });
    setProductSearchTerms((prev) => [...prev, '']);
  };

  const handleBarcodeScan = (barcode: string) => {
    const product = products.find((p: any) => p.barcode === barcode);
    if (product) {
      const existingIndex = formData.items.findIndex((item) => item.product === product.name);
      if (existingIndex >= 0) {
        const newItems = [...formData.items];
        newItems[existingIndex].qty += 1;
        setFormData({ ...formData, items: newItems });
      } else {
        const emptyIndex = formData.items.findIndex((item) => !item.product);
        if (emptyIndex >= 0) {
          const newItems = [...formData.items];
          newItems[emptyIndex] = { product: product.name, qty: 1, price: product.selling_price };
          setFormData({ ...formData, items: newItems });
          const nextTerms = [...productSearchTerms];
          nextTerms[emptyIndex] = '';
          setProductSearchTerms(nextTerms);
        } else {
          setFormData({ ...formData, items: [...formData.items, { product: product.name, qty: 1, price: product.selling_price }] });
          setProductSearchTerms((prev) => [...prev, '']);
        }
      }
    } else {
      notifyError(`Product not found for barcode: ${barcode}`);
    }
  };

  const dropdownBase = 'absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-hidden';
  const dropdownItem = 'px-3 py-2 cursor-pointer hover:bg-accent transition-colors text-sm text-foreground';

  return (
    <ModalShell title="New Sales Order" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="relative retailer-dropdown-container">
            <label className="block text-sm font-medium text-foreground mb-1.5">Retailer</label>
            <button
              type="button"
              onClick={() => !loadingRetailers && setShowRetailerDropdown(!showRetailerDropdown)}
              className="input-field flex w-full items-center justify-between cursor-pointer text-left"
              aria-haspopup="listbox"
              aria-expanded={showRetailerDropdown}
              aria-label="Retailer selector"
            >
              <span className={formData.retailer_name ? 'text-foreground' : 'text-muted-foreground'}>
                {formData.retailer_name || (loadingRetailers ? 'Loading…' : retailers.length === 0 ? 'No retailers found' : 'Select Retailer')}
              </span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showRetailerDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showRetailerDropdown && !loadingRetailers && (
              <div className={dropdownBase} role="listbox" aria-label="Retailer options">
                <div className="p-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="text" placeholder="Search…" value={retailerSearchTerm}
                      onChange={(e) => setRetailerSearchTerm(e.target.value)}
                      className="input-field pl-7 text-sm h-8" autoFocus />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {retailers.filter((r) => {
                    const q = retailerSearchTerm.toLowerCase();
                    return r.name.toLowerCase().includes(q) || r.shop_name.toLowerCase().includes(q);
                  }).map((retailer) => (
                    <button key={retailer.id} type="button" className={`${dropdownItem} w-full text-left`}
                      onClick={() => {
                        setFormData({ ...formData, retailer_name: retailer.shop_name || retailer.name, retailer_id: retailer.id });
                        setShowRetailerDropdown(false);
                        setRetailerSearchTerm('');
                      }}>
                      {retailer.shop_name || retailer.name} ({retailer.name})
                    </button>
                  ))}
                </div>
              </div>
            )}
            {formData.retailer_name && <input type="hidden" value={formData.retailer_name} required />}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Delivery Date</label>
            <input type="date" value={formData.delivery_date}
              onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
              className="input-field" required />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-foreground">Assigned To (SR)</label>
          <select value={formData.assigned_to}
            onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
            className="input-field" disabled={loadingSalesReps}>
            <option value="">{loadingSalesReps ? 'Loading SRs…' : salesReps.length === 0 ? 'No SR found' : 'Select SR/Delivery Man (Optional)'}</option>
            {salesReps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-foreground">Order Items</label>
            <div className="flex items-center gap-2">
              <BarcodeScanButton onScan={handleBarcodeScan} />
              <button type="button" onClick={addItem} className="text-sm text-[hsl(var(--primary))] font-medium hover:underline">
                + Add Item
              </button>
            </div>
          </div>
          {formData.items.map((item, index) => (
            <div key={index} className="grid grid-cols-5 gap-2 mb-2 items-center">
              <div className="col-span-2 relative product-dropdown-container">
                <button
                  type="button"
                  onClick={() => !loadingProducts && setOpenProductDropdownIndex(openProductDropdownIndex === index ? null : index)}
                  className="input-field flex w-full items-center justify-between cursor-pointer text-left"
                  aria-haspopup="listbox"
                  aria-expanded={openProductDropdownIndex === index}
                  aria-label={`Product selector ${index + 1}`}
                >
                  <span className={item.product ? 'text-foreground' : 'text-muted-foreground'}>
                    {item.product || (loadingProducts ? 'Loading…' : 'Select Product')}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openProductDropdownIndex === index ? 'rotate-180' : ''}`} />
                </button>
                {openProductDropdownIndex === index && !loadingProducts && (
                  <div className={dropdownBase} role="listbox" aria-label={`Product options ${index + 1}`}>
                    <div className="p-2 border-b border-border">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input type="text" placeholder="Search product…"
                          value={productSearchTerms[index] || ''}
                          onChange={(e) => {
                            const next = [...productSearchTerms];
                            next[index] = e.target.value;
                            setProductSearchTerms(next);
                          }}
                          className="input-field pl-7 text-sm h-8" autoFocus />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {products.filter((p) => p.name.toLowerCase().includes((productSearchTerms[index] || '').toLowerCase())).map((product) => (
                        <button key={product.id} type="button" className={`${dropdownItem} w-full text-left`}
                          onClick={() => {
                            const newItems = [...formData.items];
                            newItems[index].product = product.name;
                            newItems[index].price = product.selling_price;
                            setFormData({ ...formData, items: newItems });
                            setOpenProductDropdownIndex(null);
                            const next = [...productSearchTerms];
                            next[index] = '';
                            setProductSearchTerms(next);
                          }}>
                          {product.name} — ৳{product.selling_price}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {item.product && <input type="hidden" value={item.product} required />}
              </div>
              <input type="number" placeholder="Qty" value={item.qty || ''}
                onChange={(e) => {
                  const newItems = [...formData.items];
                  newItems[index].qty = Number(e.target.value);
                  setFormData({ ...formData, items: newItems });
                }}
                className="input-field" required />
              <input type="number" placeholder="Price" value={item.price || ''}
                onChange={(e) => {
                  const newItems = [...formData.items];
                  newItems[index].price = Number(e.target.value);
                  setFormData({ ...formData, items: newItems });
                }}
                className="input-field" required />
              <button type="button"
                onClick={() => {
                  setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
                  setProductSearchTerms(productSearchTerms.filter((_, i) => i !== index));
                  setOpenProductDropdownIndex(null);
                }}
                className="p-2 rounded text-[hsl(var(--dh-red))] hover:bg-[hsl(var(--dh-red))]/10 transition-colors flex items-center justify-center">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="bg-muted/40 rounded-lg p-3 flex justify-between text-sm">
          <span className="font-medium text-foreground">Total Amount</span>
          <span className="font-bold font-mono text-lg">
            ৳ {formData.items.reduce((sum, item) => sum + item.qty * item.price, 0).toLocaleString()}
          </span>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create Order'}</Button>
        </div>
      </form>
    </ModalShell>
  );
}

function CollectionModal({ order, onClose, onSuccess }: {
  order: SalesOrder;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodValue>('cash');
  const [collectedBy, setCollectedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [salesReps, setSalesReps] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [loadingReps, setLoadingReps] = useState(true);

  const dueAmount = order.total_amount - order.paid_amount;

  useEffect(() => {
    api.get('/api/users').then((res) => {
      if (res.data) setSalesReps(res.data.filter((u: any) => u.role === 'sales_rep').map((u: any) => ({ id: u.id, name: u.name })));
    }).catch(() => { /* ignore */ }).finally(() => setLoadingReps(false));
  }, []);

  useEffect(() => {
    const determineDefaultSR = async () => {
      let defaultSrId = '';
      if (order.route_id) {
        try {
          const routeRes = await api.get(`/api/routes/${order.route_id}`);
          if (routeRes.data?.assigned_to) defaultSrId = routeRes.data.assigned_to;
        } catch { /* ignore */ }
      }
      if (!defaultSrId && order.assigned_to) defaultSrId = order.assigned_to;
      if (defaultSrId) setCollectedBy(defaultSrId);
    };
    determineDefaultSR();
  }, [order.route_id, order.assigned_to]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast({ title: 'Error', description: 'Please enter a valid payment amount', variant: 'destructive' });
      return;
    }
    if (paymentAmount > dueAmount) {
      toast({ title: 'Error', description: `Payment cannot exceed due amount of ৳${dueAmount.toLocaleString()}`, variant: 'destructive' });
      return;
    }

    let finalCollectedBy = collectedBy;
    if (!finalCollectedBy) {
      if (order.route_id) {
        try {
          const routeRes = await api.get(`/api/routes/${order.route_id}`);
          if (routeRes.data?.assigned_to) finalCollectedBy = routeRes.data.assigned_to;
        } catch { /* ignore */ }
      }
      if (!finalCollectedBy && order.assigned_to) finalCollectedBy = order.assigned_to;
    }
    if (!finalCollectedBy) {
      toast({ title: 'Error', description: 'Please select who collected this payment', variant: 'destructive' });
      return;
    }
    if (!order.retailer_id) {
      toast({ title: 'Error', description: 'Order retailer information is missing. Please refresh and try again.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/payments', {
        retailer_id: order.retailer_id, sale_id: order.id, amount: paymentAmount,
        payment_method: paymentMethod, collected_by: finalCollectedBy, notes: notes || undefined,
      });
      await api.put(`/api/sales/${order.id}`, { paid_amount: order.paid_amount + paymentAmount });
      const remaining = dueAmount - paymentAmount;
      const collectorName = salesReps.find((r) => r.id === collectedBy)?.name || 'SR';
      toast({
        title: 'Payment recorded',
        description: remaining > 0
          ? `Payment of ৳${paymentAmount.toLocaleString()} recorded. বাকি ৳${remaining.toLocaleString()} ${collectorName} এর কাছে পেন্ডিং।`
          : `Payment of ৳${paymentAmount.toLocaleString()} recorded. Invoice is fully paid.`,
      });
      onSuccess();
    } catch (error: any) {
      const errorData = error?.response?.data;
      const msg = typeof errorData === 'string' ? errorData
        : errorData?.detail ? String(errorData.detail)
        : error?.message || 'Failed to record payment';
      toast({ title: 'Error', description: `Failed to record payment: ${msg}`, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title="টাকা জমা নিন (Collect Money)"
      subtitle={`${order.order_number} — ${order.retailer_name}`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-[hsl(var(--dh-red))]/8 border border-[hsl(var(--dh-red))]/20 rounded-lg p-4 text-center">
          <p className="text-sm text-[hsl(var(--dh-red))] mb-1">Current Due Amount</p>
          <p className="text-3xl font-bold font-mono text-[hsl(var(--dh-red))]">৳ {dueAmount.toLocaleString()}</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Payment Amount (৳) <span className="text-[hsl(var(--dh-red))]">*</span></label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="input-field" placeholder="Enter amount" min={0} max={dueAmount} step="0.01" required />
          <p className="text-xs text-muted-foreground">Maximum: ৳{dueAmount.toLocaleString()} (partial payments allowed)</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Collected By <span className="text-[hsl(var(--dh-red))]">*</span></label>
          <select value={collectedBy} onChange={(e) => setCollectedBy(e.target.value)} className="input-field" required disabled={loadingReps}>
            <option value="">{loadingReps ? 'Loading SRs…' : 'Select SR/Delivery Man'}</option>
            {salesReps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Payment Method</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethodValue)}
            className="input-field"
          >
            {PAYMENT_METHOD_OPTIONS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Notes (Optional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input-field" rows={2} placeholder="Add notes…" />
        </div>

        {amount && parseFloat(amount) > 0 && (
          <div className="bg-[hsl(var(--dh-blue))]/5 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Amount</span>
              <span className="font-semibold font-mono text-[hsl(var(--dh-green))]">৳ {parseFloat(amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1.5">
              <span className="text-muted-foreground">Remaining Due</span>
              <span className="font-bold font-mono text-[hsl(var(--dh-red))]">৳ {Math.max(0, dueAmount - parseFloat(amount)).toLocaleString()}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" disabled={loading}>{loading ? 'Recording…' : 'Record Payment'}</Button>
        </div>
      </form>
    </ModalShell>
  );
}
