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

const initialOrders: SalesOrder[] = [
  {
    id: '1',
    order_number: 'ORD-2024-001',
    retailer_name: 'Rahim Store',
    order_date: '2024-12-28',
    delivery_date: '2024-12-29',
    status: 'delivered',
    payment_status: 'partial',
    total_amount: 15000,
    paid_amount: 10000,
    items: [
      { product: 'Akij Flour 1kg', qty: 100, price: 62 },
      { product: 'Power Milk 400g', qty: 20, price: 350 },
    ],
  },
  {
    id: '2',
    order_number: 'ORD-2024-002',
    retailer_name: 'Karim Traders',
    order_date: '2024-12-29',
    delivery_date: '2024-12-30',
    status: 'confirmed',
    payment_status: 'unpaid',
    total_amount: 22500,
    paid_amount: 0,
    items: [
      { product: 'Premium Rice 5kg', qty: 30, price: 480 },
      { product: 'Pampers Medium', qty: 10, price: 920 },
    ],
  },
  {
    id: '3',
    order_number: 'ORD-2024-003',
    retailer_name: 'Hasan Shop',
    order_date: '2024-12-30',
    delivery_date: '2024-12-31',
    status: 'pending',
    payment_status: 'unpaid',
    total_amount: 8750,
    paid_amount: 0,
    items: [
      { product: 'Akij Flour 1kg', qty: 50, price: 62 },
      { product: 'Sugar 1kg', qty: 100, price: 55 },
    ],
  },
];

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
  const [orders, setOrders] = useState<SalesOrder[]>(initialOrders);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [printInvoiceOrder, setPrintInvoiceOrder] = useState<SalesOrder | null>(null);
  const [printChallanOrder, setPrintChallanOrder] = useState<SalesOrder | null>(null);

  useEffect(() => {
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

          {filteredOrders.length === 0 && (
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
          onSave={(order) => {
            setOrders([...orders, { ...order, id: `new-${Date.now()}` }]);
            setShowAddModal(false);
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

const productCatalog: Record<string, { name: string; price: number }> = {
  '8901234567890': { name: 'Akij Flour 1kg', price: 62 },
  '8901234567891': { name: 'Power Milk 400g', price: 350 },
  '8901234567892': { name: 'Pampers Medium', price: 920 },
  '8901234567893': { name: 'Premium Rice 5kg', price: 480 },
  '8901234567894': { name: 'Sugar 1kg', price: 55 },
  '8901234567895': { name: 'Biscuit Pack', price: 45 },
};

function AddOrderModal({ onClose, onSave }: { onClose: () => void; onSave: (order: SalesOrder) => void }) {
  const [formData, setFormData] = useState({
    retailer_name: '',
    delivery_date: '',
    items: [{ product: '', qty: 0, price: 0 }],
  });

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
    const product = productCatalog[barcode];
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
          newItems[emptyIndex] = { product: product.name, qty: 1, price: product.price };
          setFormData({ ...formData, items: newItems });
        } else {
          setFormData({
            ...formData,
            items: [...formData.items, { product: product.name, qty: 1, price: product.price }],
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
              >
                <option value="">Select Retailer</option>
                <option value="Rahim Store">Rahim Store</option>
                <option value="Karim Traders">Karim Traders</option>
                <option value="Hasan Shop">Hasan Shop</option>
                <option value="Molla Enterprise">Molla Enterprise</option>
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
                      setFormData({ ...formData, items: newItems });
                    }}
                    className="input-field"
                    required
                  >
                    <option value="">Select Product</option>
                    <option value="Akij Flour 1kg">Akij Flour 1kg - ৳62</option>
                    <option value="Power Milk 400g">Power Milk 400g - ৳350</option>
                    <option value="Pampers Medium">Pampers Medium - ৳920</option>
                    <option value="Premium Rice 5kg">Premium Rice 5kg - ৳480</option>
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
