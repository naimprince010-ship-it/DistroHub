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
} from 'lucide-react';
import { InvoicePrint } from '@/components/print/InvoicePrint';
import { ChallanPrint } from '@/components/print/ChallanPrint';
import { BarcodeScanButton } from '@/components/BarcodeScanner';
import api from '@/lib/api';

interface SalesOrder {
  id: string;
  order_number: string;
  retailer_name: string;
  order_date: string;
  delivery_date: string;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  payment_status: 'unpaid' | 'partial' | 'paid';
  total_amount: number;
  paid_amount: number;
  items: { product: string; qty: number; price: number }[];
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
  const [printInvoiceOrder, setPrintInvoiceOrder] = useState<SalesOrder | null>(null);
  const [printChallanOrder, setPrintChallanOrder] = useState<SalesOrder | null>(null);

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
        <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
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
                  alert(`No batches found for product "${item.product}". Please add stock first.`);
                  return;
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
              
              if (saleItems.length === 0) {
                alert('No valid items to create sale. Please check product names.');
                return;
              }
              
              // Map frontend SalesOrder to backend SaleCreate format
              const salePayload = {
                retailer_id: retailer.id,
                items: saleItems,
                payment_type: 'cash', // Default payment type
                paid_amount: order.paid_amount || 0,
                notes: `Delivery date: ${order.delivery_date}`,
              };
              
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

      {/* Print Challan Modal */}
      {printChallanOrder && (
        <ChallanPrint
          data={{
            challan_number: `CH-${printChallanOrder.order_number.replace('ORD-', '')}`,
            order_number: printChallanOrder.order_number,
            date: printChallanOrder.order_date,
            delivery_date: printChallanOrder.delivery_date,
            retailer_name: printChallanOrder.retailer_name,
            items: printChallanOrder.items.map(item => ({
              product: item.product,
              qty: item.qty,
              unit: 'Pcs'
            })),
            total_items: printChallanOrder.items.length,
          }}
          onClose={() => setPrintChallanOrder(null)}
        />
      )}
    </div>
  );
}

function OrderDetailsModal({ order, onClose }: { order: SalesOrder; onClose: () => void }) {
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
              <p className="font-medium">{order.order_date}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Delivery Date</p>
              <p className="font-medium">{order.delivery_date}</p>
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
        </div>

        <div className="p-3 border-t border-slate-200 flex justify-end gap-2">
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

function AddOrderModal({ onClose, onSave }: { onClose: () => void; onSave: (order: SalesOrder) => void }) {
  const [formData, setFormData] = useState({
    retailer_name: '',
    delivery_date: '',
    items: [{ product: '', qty: 0, price: 0 }],
  });
  const [retailers, setRetailers] = useState<Array<{ id: string; name: string; shop_name: string }>>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string; selling_price: number; barcode?: string }>>([]);
  const [loadingRetailers, setLoadingRetailers] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

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
        
        const [retailersRes, productsRes] = await Promise.all([
          api.get('/api/retailers'),
          api.get('/api/products')
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
      } catch (error: any) {
        console.error('[AddOrderModal] Error fetching data:', error);
      } finally {
        setLoadingRetailers(false);
        setLoadingProducts(false);
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
