import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import {
  Plus,
  Eye,
  Printer,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Edit,
  Trash2,
} from 'lucide-react';
import { InvoicePrint } from '@/components/print/InvoicePrint';
import { ChallanPrint } from '@/components/print/ChallanPrint';
import { BarcodeScanButton } from '@/components/BarcodeScanner';
import api from '@/lib/api';
import { formatDateBD } from '@/lib/utils';

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
  payments?: Payment[];
}

const statusConfig = {
  pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
  confirmed: { icon: CheckCircle, color: 'bg-blue-100 text-blue-700', label: 'Confirmed' },
  delivered: { icon: Truck, color: 'bg-green-100 text-green-700', label: 'Delivered' },
  cancelled: { icon: XCircle, color: 'bg-red-100 text-red-700', label: 'Cancelled' },
};

const paymentConfig = {
  unpaid: { color: 'bg-red-100 text-red-700', label: 'Unpaid' },
  partial: { color: 'bg-yellow-100 text-yellow-700', label: 'Partial' },
  paid: { color: 'bg-green-100 text-green-700', label: 'Paid' },
};

export function Sales() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [editOrder, setEditOrder] = useState<SalesOrder | null>(null);
  const [printInvoiceOrder, setPrintInvoiceOrder] = useState<SalesOrder | null>(null);
  const [printChallanOrder, setPrintChallanOrder] = useState<SalesOrder | null>(null);
  const [collectionOrder, setCollectionOrder] = useState<SalesOrder | null>(null);

  // Fetch sales from API
  const fetchSales = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[Sales] No token found, skipping sales fetch');
      setOrders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('[Sales] Fetching sales from API...');
      const response = await api.get('/api/sales');
      console.log('[Sales] Sales fetched successfully:', response.data?.length || 0);
      
      if (response.data) {
        // Map backend Sale to frontend SalesOrder interface
        const mappedOrders: SalesOrder[] = response.data.map((sale: any) => {
          // Map payment_status enum to frontend format
          let paymentStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
          if (sale.payment_status === 'paid') {
            paymentStatus = 'paid';
          } else if (sale.payment_status === 'partial') {
            paymentStatus = 'partial';
          } else {
            paymentStatus = 'unpaid';
          }
          
          // Map status enum to frontend format
          let status: 'pending' | 'confirmed' | 'delivered' | 'cancelled' = 'pending';
          if (sale.status === 'confirmed') {
            status = 'confirmed';
          } else if (sale.status === 'delivered') {
            status = 'delivered';
          } else if (sale.status === 'cancelled') {
            status = 'cancelled';
          } else {
            status = 'pending';
          }
          
          // Format dates
          const orderDate = sale.created_at ? sale.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
          const deliveryDate = sale.delivery_date || orderDate; // Backend may not have delivery_date
          
          return {
            id: sale.id || '',
            order_number: sale.invoice_number || '',
            retailer_name: sale.retailer_name || '',
            order_date: orderDate,
            delivery_date: deliveryDate,
            status: status,
            payment_status: paymentStatus,
            total_amount: sale.total_amount || 0,
            paid_amount: sale.paid_amount || 0,
            items: (sale.items || []).map((item: any) => ({
              product: item.product_name || '',
              qty: item.quantity || 0,
              price: item.unit_price || 0,
            })),
            delivery_status: sale.delivery_status || 'pending',
          };
        });
        setOrders(mappedOrders);
        console.log('[Sales] Sales mapped and set:', mappedOrders.length);
      }
    } catch (error: any) {
      console.error('[Sales] Error fetching sales:', error);
      console.error('[Sales] Error details:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });
      
      if (error?.response?.status === 401) {
        console.warn('[Sales] 401 Unauthorized - token may be expired');
        // Interceptor will handle redirect to login
        return;
      }
      
      // On error, use empty array
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
    const globalSearch = searchParams.get('q') || '';
    setSearchTerm(globalSearch);
  }, [searchParams]);

  // Delete sale order
  const handleDelete = async (order: SalesOrder) => {
    if (!confirm(`Are you sure you want to delete order ${order.order_number}? This action cannot be undone.`)) {
      return;
    }

    try {
      console.log('[Sales] Deleting sale:', order.id);
      await api.delete(`/api/sales/${order.id}`);
      console.log('[Sales] Sale deleted successfully');
      await fetchSales(); // Refresh the list
    } catch (error: any) {
      console.error('[Sales] Error deleting sale:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to delete order';
      alert(`Failed to delete order: ${errorMessage}`);
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

  return (
    <div className="min-h-screen">
      <Header title="Sales Orders" />

      <div className="p-3">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <p className="text-slate-500 text-sm">Total Orders</p>
            <p className="text-2xl font-bold text-slate-900">{orders.length}</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <p className="text-slate-500 text-sm">Total Sales</p>
            <p className="text-2xl font-bold text-green-600">৳ {totalSales.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <p className="text-slate-500 text-sm">Total Due</p>
            <p className="text-2xl font-bold text-red-600">৳ {totalDue.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <p className="text-slate-500 text-sm">Pending Delivery</p>
            <p className="text-2xl font-bold text-yellow-600">
              {orders.filter((o) => o.status === 'pending' || o.status === 'confirmed').length}
            </p>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-xl p-2 shadow-sm mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field w-40"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Order
          </button>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading sales orders...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-2 font-semibold text-slate-700">Order #</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Retailer</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Order Date</th>
                    <th className="text-left p-2 font-semibold text-slate-700">Delivery</th>
                    <th className="text-center p-2 font-semibold text-slate-700">Status</th>
                    <th className="text-center p-2 font-semibold text-slate-700">Payment</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Amount</th>
                    <th className="text-right p-2 font-semibold text-slate-700">Due</th>
                    <th className="text-center p-2 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((order) => {
                    const StatusIcon = statusConfig[order.status].icon;
                    return (
                      <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-2 font-medium text-primary-600">{order.order_number}</td>
                        <td className="p-2 text-slate-900">{order.retailer_name}</td>
                        <td className="p-2 text-slate-600">{order.order_date}</td>
                        <td className="p-2 text-slate-600">{order.delivery_date}</td>
                        <td className="p-2 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[order.status].color}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig[order.status].label}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${paymentConfig[order.payment_status].color}`}
                          >
                            {paymentConfig[order.payment_status].label}
                          </span>
                        </td>
                        <td className="p-2 text-right font-medium text-slate-900">
                          ৳ {order.total_amount.toLocaleString()}
                        </td>
                        <td className="p-2 text-right font-medium text-red-600">
                          ৳ {(order.total_amount - order.paid_amount).toLocaleString()}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditOrder(order)}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit Order"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(order)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete Order"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            {(order.total_amount - order.paid_amount) > 0 && (
                              <button
                                onClick={() => setCollectionOrder(order)}
                                className="px-2 py-1 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                                title="টাকা জমা নিন (Collect Money)"
                              >
                                টাকা জমা
                              </button>
                            )}
                            <button
                              onClick={() => setPrintInvoiceOrder(order)}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Print Invoice"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setPrintChallanOrder(order)}
                              className="p-1 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Print Challan"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filteredOrders.length === 0 && (
            <div className="p-4 text-center text-slate-500">
              No orders found. Try adjusting your search or create a new order.
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
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

      {/* Edit Order Modal */}
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

      {/* Add Order Modal */}
      {showAddModal && (
        <AddOrderModal
          onClose={() => setShowAddModal(false)}
          onSave={async (order) => {
            try {
              console.log('[Sales] Creating sale order:', order);
              
              // Fetch retailers to get retailer_id from retailer_name
              const retailersResponse = await api.get('/api/retailers');
              const retailer = retailersResponse.data.find((r: any) => r.shop_name === order.retailer_name || r.name === order.retailer_name);
              
              if (!retailer) {
                alert(`Retailer "${order.retailer_name}" not found. Please select a valid retailer.`);
                return;
              }
              
              // Fetch products to get product_id and batches
              const productsResponse = await api.get('/api/products');
              const products = productsResponse.data;
              
              // Map frontend items to backend SaleItemCreate format
              // Note: This is simplified - in production, you'd need to select batches
              const saleItems = [];
              const productsWithoutBatches: string[] = [];
              
              for (const item of order.items) {
                const product = products.find((p: any) => p.name === item.product);
                if (!product) {
                  console.warn(`[Sales] Product "${item.product}" not found, skipping`);
                  continue;
                }
                
                // Get batches for this product
                const batchesResponse = await api.get(`/api/products/${product.id}/batches`);
                const batches = batchesResponse.data || [];
                
                if (batches.length === 0) {
                  productsWithoutBatches.push(item.product);
                  console.warn(`[Sales] No batches found for product "${item.product}", skipping`);
                  continue;
                }
                
                // Use first available batch (in production, user should select)
                const batch = batches[0];
                
                saleItems.push({
                  product_id: product.id,
                  batch_id: batch.id,
                  quantity: item.qty,
                  unit_price: item.price,
                  discount: 0, // Default discount
                });
              }
              
              // Show warning if some products don't have batches
              if (productsWithoutBatches.length > 0) {
                const message = productsWithoutBatches.length === order.items.length
                  ? `No batches found for the following products. Please add stock first:\n\n${productsWithoutBatches.join('\n')}\n\nYou need to create a purchase order to add stock before creating a sales order.`
                  : `Warning: The following products don't have stock and were skipped:\n\n${productsWithoutBatches.join('\n')}\n\nThe sale will be created only for products with available stock.`;
                
                if (productsWithoutBatches.length === order.items.length) {
                  alert(message);
                  return;
                } else {
                  const proceed = confirm(message + '\n\nDo you want to continue with the remaining products?');
                  if (!proceed) {
                    return;
                  }
                }
              }
              
              if (saleItems.length === 0) {
                alert('No valid items to create sale. All selected products need stock. Please add stock first via a purchase order.');
                return;
              }
              
              // Map frontend SalesOrder to backend SaleCreate format
              const salePayload: any = {
                retailer_id: retailer.id,
                items: saleItems,
                payment_type: 'cash', // Default payment type
                paid_amount: order.paid_amount || 0,
                notes: `Delivery date: ${order.delivery_date}`,
              };
              
              // Add assigned_to if provided (only if it exists on the order)
              if ('assigned_to' in order && order.assigned_to) {
                (salePayload as any).assigned_to = order.assigned_to;
              }
              
              console.log('[Sales] Sending sale payload:', salePayload);
              const response = await api.post('/api/sales', salePayload);
              console.log('[Sales] Sale created successfully:', response.data);
              
              // Refetch sales to get the latest data
              await fetchSales();
              setShowAddModal(false);
            } catch (error: any) {
              console.error('[Sales] Failed to create sale:', error);
              alert(`Failed to create sale: ${error.response?.data?.detail || error.message}`);
            }
          }}
        />
      )}

      {/* Print Invoice Modal */}
      {printInvoiceOrder && (
        <InvoicePrint
          data={{
            invoice_number: printInvoiceOrder.order_number,
            order_date: printInvoiceOrder.order_date,
            retailer_name: printInvoiceOrder.retailer_name,
            items: printInvoiceOrder.items,
            subtotal: printInvoiceOrder.total_amount,
            discount: 0,
            total_amount: printInvoiceOrder.total_amount,
            paid_amount: printInvoiceOrder.paid_amount,
            due_amount: printInvoiceOrder.total_amount - printInvoiceOrder.paid_amount,
          }}
          onClose={() => setPrintInvoiceOrder(null)}
        />
      )}

      {/* Collection Modal */}
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

      {/* Print Challan Modal */}
      {printChallanOrder && (
        <ChallanPrint
          data={{
            challan_number: `CH-${printChallanOrder.order_number.replace('ORD-', '')}`,
            order_number: printChallanOrder.order_number,
            date: printChallanOrder.order_date,
            delivery_date: printChallanOrder.delivery_date,
            retailer_name: printChallanOrder.retailer_name,
            retailer_id: printChallanOrder.id,
            items: printChallanOrder.items.map(item => ({
              product: item.product,
              qty: item.qty,
              unit: 'Pcs',
              pack_size: 'Pcs',
              unit_price: item.price,
              bonus_qty: 0,
              discount: 0,
              discount_amount: 0
            })),
            total_items: printChallanOrder.items.length,
            total_amount: printChallanOrder.total_amount,
            paid_amount: printChallanOrder.paid_amount,
            due_amount: printChallanOrder.total_amount - printChallanOrder.paid_amount,
            payment_status: printChallanOrder.payment_status,
            challan_type: 'Normal',
            delivery_status: printChallanOrder.delivery_status,
            distributor_name: 'DistroHub',
            route_name: 'Main Route',
            sr_name: 'Sales Representative',
          }}
          onClose={() => setPrintChallanOrder(null)}
        />
      )}
    </div>
  );
}

function OrderDetailsModal({ 
  order, 
  onClose, 
  onEdit
}: { 
  order: SalesOrder; 
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-2 animate-fade-in">
        <div className="p-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{order.order_number}</h2>
            <p className="text-slate-500">{order.retailer_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <p className="text-sm text-slate-500">Order Date</p>
              <p className="font-medium">{order.order_date ? formatDateBD(order.order_date) : ''}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Delivery Date</p>
              <p className="font-medium">{order.delivery_date ? formatDateBD(order.delivery_date) : ''}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Status</p>
              <span
                className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusConfig[order.status].color}`}
              >
                {statusConfig[order.status].label}
              </span>
            </div>
            <div>
              <p className="text-sm text-slate-500">Payment Status</p>
              <span
                className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${paymentConfig[order.payment_status].color}`}
              >
                {paymentConfig[order.payment_status].label}
              </span>
            </div>
            {order.assigned_to_name && (
              <div>
                <p className="text-sm text-slate-500">কালেক্টর (Assigned To)</p>
                <p className="font-medium">{order.assigned_to_name}</p>
              </div>
            )}
          </div>

          <h3 className="font-semibold text-slate-900 mb-2">Order Items</h3>
          <table className="w-full mb-3">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-2 text-sm font-medium text-slate-600">Product</th>
                <th className="text-right p-2 text-sm font-medium text-slate-600">Qty</th>
                <th className="text-right p-2 text-sm font-medium text-slate-600">Price</th>
                <th className="text-right p-2 text-sm font-medium text-slate-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={index} className="border-b border-slate-100">
                  <td className="p-2">{item.product}</td>
                  <td className="p-2 text-right">{item.qty}</td>
                  <td className="p-2 text-right">৳ {item.price}</td>
                  <td className="p-2 text-right font-medium">৳ {(item.qty * item.price).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="bg-slate-50 rounded-lg p-2">
            <div className="flex justify-between mb-1">
              <span className="text-slate-600">Total Amount</span>
              <span className="font-semibold">৳ {order.total_amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-600">Paid Amount</span>
              <span className="font-semibold text-green-600">৳ {order.paid_amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200">
              <span className="text-slate-900 font-medium">Due Amount</span>
              <span className="font-bold text-red-600">
                ৳ {(order.total_amount - order.paid_amount).toLocaleString()}
              </span>
            </div>
          </div>

          {order.payments && order.payments.length > 0 && (
            <div className="mt-3">
              <h3 className="font-semibold text-slate-900 mb-2">Payment History</h3>
              <div className="space-y-2">
                {order.payments.map((payment: Payment) => (
                  <div key={payment.id} className="bg-slate-50 rounded-lg p-2">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <p className="font-medium text-slate-900">৳ {payment.amount.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">
                          {formatDateBD(payment.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-600 capitalize">{payment.payment_method}</p>
                        {payment.collected_by_name && (
                          <p className="text-xs text-slate-500">by {payment.collected_by_name}</p>
                        )}
                      </div>
                    </div>
                    {payment.notes && (
                      <p className="text-xs text-slate-500 mt-1">{payment.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-200 flex justify-end gap-2">
          <button 
            onClick={onEdit}
            className="btn-secondary flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit Payment
          </button>
          <button className="btn-secondary flex items-center gap-2">
            <Printer className="w-4 h-4" />
            Print Challan
          </button>
          <button onClick={onClose} className="btn-primary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function EditSaleModal({ 
  order, 
  onClose, 
  onSave 
}: { 
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

  // Fetch sales reps on mount
  useEffect(() => {
    const fetchSalesReps = async () => {
      try {
        setLoadingSalesReps(true);
        const usersRes = await api.get('/api/users');
        if (usersRes.data) {
          const reps = usersRes.data
            .filter((u: any) => u.role === 'sales_rep')
            .map((u: any) => ({
              id: u.id,
              name: u.name
            }));
          setSalesReps(reps);
        }
      } catch (error: any) {
        console.error('[EditSaleModal] Error fetching sales reps:', error);
      } finally {
        setLoadingSalesReps(false);
      }
    };
    fetchSalesReps();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updatePayload: any = {
        paid_amount: formData.paid_amount,
      };

      // Update delivery status if needed
      if (formData.delivery_status !== 'pending') {
        updatePayload.delivery_status = formData.delivery_status;
      }

      // Update assigned_to (can be set or cleared)
      if (formData.assigned_to) {
        updatePayload.assigned_to = formData.assigned_to;
      } else {
        // If empty string, set to null to clear the assignment
        updatePayload.assigned_to = null;
      }

      if (formData.notes) {
        updatePayload.notes = formData.notes;
      }

      console.log('[EditSaleModal] Updating sale:', order.id, updatePayload);
      await api.put(`/api/sales/${order.id}`, updatePayload);
      console.log('[EditSaleModal] Sale updated successfully');

      alert('Order updated successfully!');
      onSave();
    } catch (error: any) {
      console.error('[EditSaleModal] Error updating sale:', error);
      alert(`Failed to update order: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const calculatedDue = Math.max(0, order.total_amount - formData.paid_amount);
  const calculatedPaymentStatus = 
    calculatedDue === 0 ? 'paid' : 
    formData.paid_amount > 0 ? 'partial' : 
    'unpaid';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto m-2 animate-fade-in">
        <div className="p-3 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Edit Order</h2>
          <p className="text-slate-500">{order.order_number} - {order.retailer_name}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-3">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex justify-between mb-2">
              <span className="text-slate-600">Total Amount</span>
              <span className="font-semibold text-slate-900">৳ {order.total_amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-slate-600">Current Paid</span>
              <span className="font-semibold text-green-600">৳ {order.paid_amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200">
              <span className="text-slate-900 font-medium">Current Due</span>
              <span className="font-bold text-red-600">
                ৳ {(order.total_amount - order.paid_amount).toLocaleString()}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Paid Amount (৳)
            </label>
            <input
              type="number"
              value={formData.paid_amount}
              onChange={(e) => setFormData({ ...formData, paid_amount: Number(e.target.value) })}
              className="input-field"
              min={0}
              max={order.total_amount}
              step="0.01"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Enter the total amount paid (including previous payments)
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-2">
            <div className="flex justify-between mb-1">
              <span className="text-sm text-slate-600">New Due Amount</span>
              <span className="font-semibold text-red-600">৳ {calculatedDue.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-600">Payment Status</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                calculatedPaymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                calculatedPaymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {calculatedPaymentStatus === 'paid' ? 'Paid' :
                 calculatedPaymentStatus === 'partial' ? 'Partial' : 'Unpaid'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Delivery Status
            </label>
            <select
              value={formData.delivery_status}
              onChange={(e) => setFormData({ ...formData, delivery_status: e.target.value })}
              className="input-field"
            >
              <option value="pending">Pending</option>
              <option value="delivered">Delivered</option>
              <option value="partially_delivered">Partially Delivered</option>
              <option value="returned">Returned</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              কালেক্টর (Assigned To)
            </label>
            <select
              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              className="input-field"
              disabled={loadingSalesReps}
            >
              <option value="">{loadingSalesReps ? 'Loading SRs...' : 'None (Clear Assignment)'}</option>
              {salesReps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Select SR/delivery man responsible for collecting payment. Select "None" to clear assignment.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-field"
              rows={2}
              placeholder="Add any notes about this update..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary flex items-center gap-2"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddOrderModal({ onClose, onSave }: { onClose: () => void; onSave: (order: SalesOrder) => void }) {
  const [formData, setFormData] = useState({
    retailer_name: '',
    delivery_date: '',
    assigned_to: '',
    items: [{ product: '', qty: 0, price: 0 }],
  });
  const [retailers, setRetailers] = useState<Array<{ id: string; name: string; shop_name: string }>>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string; selling_price: number; barcode?: string }>>([]);
  const [salesReps, setSalesReps] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingRetailers, setLoadingRetailers] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingSalesReps, setLoadingSalesReps] = useState(true);

  // Fetch retailers and products on mount
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('[AddOrderModal] No token found, skipping data fetch');
        setLoadingRetailers(false);
        setLoadingProducts(false);
        return;
      }

      try {
        setLoadingRetailers(true);
        setLoadingProducts(true);
        setLoadingSalesReps(true);
        
        const [retailersRes, productsRes, usersRes] = await Promise.all([
          api.get('/api/retailers'),
          api.get('/api/products'),
          api.get('/api/users')
        ]);
        
        if (retailersRes.data) {
          setRetailers(retailersRes.data.map((r: any) => ({
            id: r.id,
            name: r.name,
            shop_name: r.shop_name
          })));
        }
        
        if (productsRes.data) {
          setProducts(productsRes.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            selling_price: p.selling_price || 0,
            barcode: p.barcode
          })));
        }
        
        if (usersRes.data) {
          // Filter users with role 'sales_rep'
          const reps = usersRes.data
            .filter((u: any) => u.role === 'sales_rep')
            .map((u: any) => ({
              id: u.id,
              name: u.name
            }));
          setSalesReps(reps);
        }
      } catch (error: any) {
        console.error('[AddOrderModal] Error fetching data:', error);
      } finally {
        setLoadingRetailers(false);
        setLoadingProducts(false);
        setLoadingSalesReps(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const total = formData.items.reduce((sum, item) => sum + item.qty * item.price, 0);
    onSave({
      id: '',
      order_number: `ORD-${Date.now()}`,
      retailer_name: formData.retailer_name,
      order_date: new Date().toISOString().split('T')[0],
      delivery_date: formData.delivery_date,
      status: 'pending',
      payment_status: 'unpaid',
      total_amount: total,
      paid_amount: 0,
      items: formData.items,
      assigned_to: formData.assigned_to || undefined,
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product: '', qty: 0, price: 0 }],
    });
  };

  const handleBarcodeScan = (barcode: string) => {
    // Find product by barcode from fetched products
    const product = products.find((p: any) => p.barcode === barcode);
    
    if (product) {
      const existingIndex = formData.items.findIndex(item => item.product === product.name);
      if (existingIndex >= 0) {
        const newItems = [...formData.items];
        newItems[existingIndex].qty += 1;
        setFormData({ ...formData, items: newItems });
      } else {
        const emptyIndex = formData.items.findIndex(item => !item.product);
        if (emptyIndex >= 0) {
          const newItems = [...formData.items];
          newItems[emptyIndex] = { product: product.name, qty: 1, price: product.selling_price };
          setFormData({ ...formData, items: newItems });
        } else {
          setFormData({
            ...formData,
            items: [...formData.items, { product: product.name, qty: 1, price: product.selling_price }],
          });
        }
      }
    } else {
      alert(`Product not found for barcode: ${barcode}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-2 animate-fade-in">
        <div className="p-3 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">New Sales Order</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Retailer</label>
              <select
                value={formData.retailer_name}
                onChange={(e) => setFormData({ ...formData, retailer_name: e.target.value })}
                className="input-field"
                required
                disabled={loadingRetailers}
              >
                <option value="">{loadingRetailers ? 'Loading retailers...' : 'Select Retailer'}</option>
                {retailers.map((retailer) => (
                  <option key={retailer.id} value={retailer.shop_name}>
                    {retailer.shop_name} ({retailer.name})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Date</label>
              <input
                type="date"
                value={formData.delivery_date}
                onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              কালেক্টর (Assigned To)
            </label>
            <select
              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              className="input-field"
              disabled={loadingSalesReps}
            >
              <option value="">{loadingSalesReps ? 'Loading SRs...' : 'Select SR/Delivery Man (Optional)'}</option>
              {salesReps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Select the SR/delivery man responsible for collecting payment for this invoice
            </p>
          </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-slate-700">Order Items</label>
                        <div className="flex items-center gap-2">
                          <BarcodeScanButton onScan={handleBarcodeScan} />
                          <button type="button" onClick={addItem} className="text-primary-600 text-sm font-medium">
                            + Add Item
                          </button>
                        </div>
                      </div>
            {formData.items.map((item, index) => (
              <div key={index} className="grid grid-cols-4 gap-2 mb-1">
                <div className="col-span-2">
                  <select
                    value={item.product}
                    onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[index].product = e.target.value;
                      // Auto-update price when product is selected
                      const selectedProduct = products.find((p: any) => p.name === e.target.value);
                      if (selectedProduct) {
                        newItems[index].price = selectedProduct.selling_price;
                      }
                      setFormData({ ...formData, items: newItems });
                    }}
                    className="input-field"
                    required
                    disabled={loadingProducts}
                  >
                    <option value="">{loadingProducts ? 'Loading products...' : 'Select Product'}</option>
                    {products.map((product: any) => (
                      <option key={product.id} value={product.name}>
                        {product.name} - ৳{product.selling_price}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="number"
                  placeholder="Qty"
                  value={item.qty || ''}
                  onChange={(e) => {
                    const newItems = [...formData.items];
                    newItems[index].qty = Number(e.target.value);
                    setFormData({ ...formData, items: newItems });
                  }}
                  className="input-field"
                  required
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={item.price || ''}
                  onChange={(e) => {
                    const newItems = [...formData.items];
                    newItems[index].price = Number(e.target.value);
                    setFormData({ ...formData, items: newItems });
                  }}
                  className="input-field"
                  required
                />
              </div>
            ))}
          </div>

          <div className="bg-slate-50 rounded-lg p-2">
            <div className="flex justify-between">
              <span className="font-medium">Total Amount</span>
              <span className="font-bold text-lg">
                ৳ {formData.items.reduce((sum, item) => sum + item.qty * item.price, 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CollectionModal({
  order,
  onClose,
  onSuccess
}: {
  order: SalesOrder;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [collectedBy, setCollectedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [salesReps, setSalesReps] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [loadingReps, setLoadingReps] = useState(true);

  const dueAmount = order.total_amount - order.paid_amount;

  useEffect(() => {
    const fetchSalesReps = async () => {
      try {
        const response = await api.get('/api/users');
        if (response.data) {
          const reps = response.data
            .filter((u: any) => u.role === 'sales_rep')
            .map((u: any) => ({
              id: u.id,
              name: u.name
            }));
          setSalesReps(reps);
        }
      } catch (error) {
        console.error('[CollectionModal] Error fetching sales reps:', error);
      } finally {
        setLoadingReps(false);
      }
    };
    fetchSalesReps();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const paymentAmount = parseFloat(amount);
    
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }
    
    if (paymentAmount > dueAmount) {
      alert(`Payment amount cannot exceed due amount of ৳${dueAmount.toLocaleString()}`);
      return;
    }
    
    if (!collectedBy) {
      alert('Please select who collected this payment');
      return;
    }

    setLoading(true);
    try {
      // Create payment record
      const paymentPayload = {
        retailer_id: order.retailer_id,
        sale_id: order.id,
        amount: paymentAmount,
        payment_method: paymentMethod,
        collected_by: collectedBy,
        notes: notes || undefined
      };
      
      await api.post('/api/payments', paymentPayload);
      
      // Update sale paid_amount
      const newPaidAmount = order.paid_amount + paymentAmount;
      await api.put(`/api/sales/${order.id}`, {
        paid_amount: newPaidAmount
      });
      
      const remainingDue = dueAmount - paymentAmount;
      const collectorName = salesReps.find(r => r.id === collectedBy)?.name || 'SR';
      if (remainingDue > 0) {
        alert(`Payment of ৳${paymentAmount.toLocaleString()} recorded. বাকি ৳${remainingDue.toLocaleString()} এখনও ${collectorName} এর কাছে পেন্ডিং।`);
      } else {
        alert(`Payment of ৳${paymentAmount.toLocaleString()} recorded. Invoice is now fully paid.`);
      }
      
      onSuccess();
    } catch (error: any) {
      console.error('[CollectionModal] Error recording payment:', error);
      alert(`Failed to record payment: ${error.response?.data?.detail || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto m-2 animate-fade-in">
        <div className="p-3 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">টাকা জমা নিন (Collect Money)</h2>
          <p className="text-slate-500">{order.order_number} - {order.retailer_name}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-3">
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-sm text-red-600 mb-1">Current Due Amount</p>
            <p className="text-3xl font-bold text-red-600">৳ {dueAmount.toLocaleString()}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Payment Amount (৳) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-field"
              placeholder="Enter amount"
              min={0}
              max={dueAmount}
              step="0.01"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Maximum: ৳{dueAmount.toLocaleString()} (partial payments allowed)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              কালেক্টর (Collected By) <span className="text-red-500">*</span>
            </label>
            <select
              value={collectedBy}
              onChange={(e) => setCollectedBy(e.target.value)}
              className="input-field"
              required
              disabled={loadingReps}
            >
              <option value="">{loadingReps ? 'Loading SRs...' : 'Select SR/Delivery Man'}</option>
              {salesReps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Payment Method
            </label>
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
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field"
              rows={2}
              placeholder="Add any notes about this payment..."
            />
          </div>

          {amount && parseFloat(amount) > 0 && (
            <div className="bg-blue-50 rounded-lg p-2">
              <div className="flex justify-between mb-1">
                <span className="text-sm text-slate-600">Payment Amount</span>
                <span className="font-semibold text-green-600">৳ {parseFloat(amount || '0').toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-blue-200">
                <span className="text-sm text-slate-600">Remaining Due</span>
                <span className="font-bold text-red-600">
                  ৳ {Math.max(0, dueAmount - parseFloat(amount || '0')).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={loading}
            >
              {loading ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
