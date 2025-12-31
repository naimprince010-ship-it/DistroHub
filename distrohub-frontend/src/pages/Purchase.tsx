import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import {
  Plus,
  Search,
  Eye,
  Package,
  Calendar,
  Truck,
  Filter,
  X,
  Trash2,
  Printer,
  Warehouse,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { BarcodeScanButton } from '@/components/BarcodeScanner';

interface PurchaseItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  batch: string;
  expiry: string;
  qty: number;
  unit_price: number;
  sub_total: number;
  current_stock: number;
  last_purchase_price: number;
}

interface Purchase {
  id: string;
  invoice_number: string;
  supplier_invoice: string;
  supplier_name: string;
  warehouse: string;
  purchase_date: string;
  sub_total: number;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  discount_amount: number;
  tax_percent: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  items: PurchaseItem[];
}

const warehouses = ['Main Warehouse', 'Godown 1', 'Godown 2', 'Shop Floor'];
const suppliers = ['Akij Food & Beverage Ltd.', 'Pran Foods Ltd.', 'Square Food Ltd.', 'ACI Foods Ltd.', 'Nestle Bangladesh'];

const productCatalog = [
  { id: '1', name: 'Akij Flour 1kg', sku: 'AKJ-FLR-001', barcode: '8901234567890', stock: 500, lastPrice: 55 },
  { id: '2', name: 'Power Milk 400g', sku: 'PWR-MLK-001', barcode: '8901234567891', stock: 200, lastPrice: 320 },
  { id: '3', name: 'Pampers Medium', sku: 'PMP-MED-001', barcode: '8901234567892', stock: 150, lastPrice: 850 },
  { id: '4', name: 'Premium Rice 5kg', sku: 'RIC-PRM-001', barcode: '8901234567893', stock: 300, lastPrice: 420 },
  { id: '5', name: 'Sugar 1kg', sku: 'SGR-001', barcode: '8901234567894', stock: 400, lastPrice: 50 },
  { id: '6', name: 'Cooking Oil 1L', sku: 'OIL-001', barcode: '8901234567895', stock: 250, lastPrice: 180 },
  { id: '7', name: 'Salt 1kg', sku: 'SLT-001', barcode: '8901234567896', stock: 600, lastPrice: 35 },
  { id: '8', name: 'Biscuit Pack', sku: 'BSC-001', barcode: '8901234567897', stock: 350, lastPrice: 40 },
];

const initialPurchases: Purchase[] = [
  {
    id: '1',
    invoice_number: 'PUR-2024-001',
    supplier_invoice: 'INV-AKJ-2024-1234',
    supplier_name: 'Akij Food & Beverage Ltd.',
    warehouse: 'Main Warehouse',
    purchase_date: '2024-12-20',
    sub_total: 125000,
    discount_type: 'percent',
    discount_value: 0,
    discount_amount: 0,
    tax_percent: 0,
    tax_amount: 0,
    total_amount: 125000,
    paid_amount: 125000,
    due_amount: 0,
    items: [
      { id: '1', product_id: '1', product_name: 'Akij Flour 1kg', sku: 'AKJ-FLR-001', qty: 500, unit_price: 55, sub_total: 27500, batch: 'BT-2024-001', expiry: '2025-06-15', current_stock: 500, last_purchase_price: 55 },
      { id: '2', product_id: '2', product_name: 'Power Milk 400g', sku: 'PWR-MLK-001', qty: 200, unit_price: 320, sub_total: 64000, batch: 'BT-2024-002', expiry: '2025-01-20', current_stock: 200, last_purchase_price: 320 },
    ],
  },
  {
    id: '2',
    invoice_number: 'PUR-2024-002',
    supplier_invoice: 'INV-AKJ-2024-1235',
    supplier_name: 'Akij Food & Beverage Ltd.',
    warehouse: 'Godown 1',
    purchase_date: '2024-12-25',
    sub_total: 85000,
    discount_type: 'fixed',
    discount_value: 0,
    discount_amount: 0,
    tax_percent: 0,
    tax_amount: 0,
    total_amount: 85000,
    paid_amount: 50000,
    due_amount: 35000,
    items: [
      { id: '1', product_id: '4', product_name: 'Premium Rice 5kg', sku: 'RIC-PRM-001', qty: 150, unit_price: 420, sub_total: 63000, batch: 'BT-2024-004', expiry: '2025-12-31', current_stock: 300, last_purchase_price: 420 },
      { id: '2', product_id: '5', product_name: 'Sugar 1kg', sku: 'SGR-001', qty: 200, unit_price: 50, sub_total: 10000, batch: 'BT-2024-005', expiry: '2025-06-30', current_stock: 400, last_purchase_price: 50 },
    ],
  },
];

export function Purchase() {
  const [searchParams] = useSearchParams();
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  useEffect(() => {
    const globalSearch = searchParams.get('q') || '';
    setSearchTerm(globalSearch);
  }, [searchParams]);

  const filteredPurchases = purchases.filter((p) => {
    const matchesSearch =
      p.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplier_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const due = p.total_amount - p.paid_amount;
    const matchesPayment = paymentFilter === 'all' ||
      (paymentFilter === 'paid' && due === 0) ||
      (paymentFilter === 'partial' && due > 0 && p.paid_amount > 0) ||
      (paymentFilter === 'unpaid' && p.paid_amount === 0);
    
    const purchaseDate = new Date(p.purchase_date);
    const today = new Date();
    const daysDiff = Math.ceil((today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));
    const matchesDate = dateFilter === 'all' ||
      (dateFilter === 'today' && daysDiff <= 1) ||
      (dateFilter === 'week' && daysDiff <= 7) ||
      (dateFilter === 'month' && daysDiff <= 30);
    
    return matchesSearch && matchesPayment && matchesDate;
  });

  const activeFiltersCount = [paymentFilter, dateFilter].filter(f => f !== 'all').length;

  const clearFilters = () => {
    setPaymentFilter('all');
    setDateFilter('all');
    setSearchTerm('');
  };

  const totalPurchases = purchases.reduce((sum, p) => sum + p.total_amount, 0);
  const totalDue = purchases.reduce((sum, p) => sum + (p.total_amount - p.paid_amount), 0);

  return (
    <div className="min-h-screen">
      <Header title="Purchase / Stock-In" />

      <div className="p-3">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{purchases.length}</p>
                <p className="text-slate-500 text-sm">Total Purchases</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">৳ {totalPurchases.toLocaleString()}</p>
                <p className="text-slate-500 text-sm">Total Value</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">৳ {totalDue.toLocaleString()}</p>
                <p className="text-slate-500 text-sm">Payable to Supplier</p>
              </div>
            </div>
          </div>
        </div>

                {/* Actions Bar */}
                <div className="bg-white rounded-xl p-2 shadow-sm mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value)}
                        className="input-field pl-10 w-40"
                      >
                        <option value="all">All Payment</option>
                        <option value="paid">Paid</option>
                        <option value="partial">Partial</option>
                        <option value="unpaid">Unpaid</option>
                      </select>
                    </div>

                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="input-field w-36"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                    </select>

                    {activeFiltersCount > 0 && (
                      <button
                        onClick={clearFilters}
                        className="flex items-center gap-1 px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Clear ({activeFiltersCount})
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    New Purchase
                  </button>
                </div>

        {/* Purchases Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-2 font-semibold text-slate-700">Invoice #</th>
                  <th className="text-left p-2 font-semibold text-slate-700">Supplier</th>
                  <th className="text-left p-2 font-semibold text-slate-700">Date</th>
                  <th className="text-right p-2 font-semibold text-slate-700">Total</th>
                  <th className="text-right p-2 font-semibold text-slate-700">Paid</th>
                  <th className="text-right p-2 font-semibold text-slate-700">Due</th>
                  <th className="text-center p-2 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2 font-medium text-primary-600">{purchase.invoice_number}</td>
                    <td className="p-2 text-slate-900">{purchase.supplier_name}</td>
                    <td className="p-2 text-slate-600">{purchase.purchase_date}</td>
                    <td className="p-2 text-right font-medium text-slate-900">
                      ৳ {purchase.total_amount.toLocaleString()}
                    </td>
                    <td className="p-2 text-right text-green-600">
                      ৳ {purchase.paid_amount.toLocaleString()}
                    </td>
                    <td className="p-2 text-right font-medium text-red-600">
                      ৳ {(purchase.total_amount - purchase.paid_amount).toLocaleString()}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => setSelectedPurchase(purchase)}
                        className="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPurchases.length === 0 && (
            <div className="p-4 text-center text-slate-500">
              No purchases found. Create a new purchase to add stock.
            </div>
          )}
        </div>
      </div>

      {/* Purchase Details Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-2 animate-fade-in">
            <div className="p-3 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">{selectedPurchase.invoice_number}</h2>
              <p className="text-slate-500">{selectedPurchase.supplier_name}</p>
            </div>

            <div className="p-3">
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <p className="text-sm text-slate-500">Purchase Date</p>
                  <p className="font-medium">{selectedPurchase.purchase_date}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Amount</p>
                  <p className="font-medium">৳ {selectedPurchase.total_amount.toLocaleString()}</p>
                </div>
              </div>

              <h3 className="font-semibold text-slate-900 mb-2">Items</h3>
              <table className="w-full mb-3">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-2 text-sm font-medium text-slate-600">Product</th>
                    <th className="text-left p-2 text-sm font-medium text-slate-600">Batch</th>
                    <th className="text-left p-2 text-sm font-medium text-slate-600">Expiry</th>
                    <th className="text-right p-2 text-sm font-medium text-slate-600">Qty</th>
                    <th className="text-right p-2 text-sm font-medium text-slate-600">Price</th>
                    <th className="text-right p-2 text-sm font-medium text-slate-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                    {selectedPurchase.items.map((item, index) => (
                      <tr key={index} className="border-b border-slate-100">
                        <td className="p-2">{item.product_name}</td>
                        <td className="p-2 font-mono text-sm">{item.batch}</td>
                        <td className="p-2">{item.expiry}</td>
                        <td className="p-2 text-right">{item.qty}</td>
                        <td className="p-2 text-right">৳ {item.unit_price}</td>
                        <td className="p-2 text-right font-medium">৳ {item.sub_total.toLocaleString()}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-slate-200 flex justify-end">
              <button onClick={() => setSelectedPurchase(null)} className="btn-primary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Purchase Modal */}
      {showAddModal && (
        <AddPurchaseModal
          onClose={() => setShowAddModal(false)}
          onSave={(purchase) => {
            setPurchases([...purchases, { ...purchase, id: `new-${Date.now()}` }]);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

interface ValidationError {
  [key: string]: string;
}

function AddPurchaseModal({ onClose, onSave }: { onClose: () => void; onSave: (purchase: Purchase) => void }) {
  const [formData, setFormData] = useState({
    supplier_name: suppliers[0],
    supplier_invoice: '',
    warehouse: warehouses[0],
    purchase_date: new Date().toISOString().split('T')[0],
    discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: 0,
    tax_percent: 0,
    paid_amount: 0,
  });
  
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [errors, setErrors] = useState<ValidationError>({});
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProducts = productCatalog.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode.includes(searchTerm)
  );

  const addProductToItems = (product: typeof productCatalog[0]) => {
    const existingItem = items.find(item => item.product_id === product.id);
    if (existingItem) {
      setItems(items.map(item => 
        item.product_id === product.id 
          ? { ...item, qty: item.qty + 1, sub_total: (item.qty + 1) * item.unit_price }
          : item
      ));
    } else {
      const newItem: PurchaseItem = {
        id: `item-${Date.now()}`,
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        batch: '',
        expiry: '',
        qty: 1,
        unit_price: product.lastPrice,
        sub_total: product.lastPrice,
        current_stock: product.stock,
        last_purchase_price: product.lastPrice,
      };
      setItems([...items, newItem]);
    }
    setSearchTerm('');
    setShowProductDropdown(false);
  };

  const handleBarcodeScan = (barcode: string) => {
    const product = productCatalog.find(p => p.barcode === barcode);
    if (product) {
      addProductToItems(product);
    } else {
      setErrors({ ...errors, barcode: `Product with barcode ${barcode} not found` });
      setTimeout(() => {
        const newErrors = { ...errors };
        delete newErrors.barcode;
        setErrors(newErrors);
      }, 3000);
    }
  };

  const updateItem = (itemId: string, field: keyof PurchaseItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value };
        if (field === 'qty' || field === 'unit_price') {
          updated.sub_total = updated.qty * updated.unit_price;
        }
        return updated;
      }
      return item;
    }));
  };

  const removeItem = (itemId: string) => {
    setItems(items.filter(item => item.id !== itemId));
  };

  const subTotal = items.reduce((sum, item) => sum + item.sub_total, 0);
  const discountAmount = formData.discount_type === 'percent' 
    ? (subTotal * formData.discount_value / 100)
    : formData.discount_value;
  const afterDiscount = subTotal - discountAmount;
  const taxAmount = afterDiscount * formData.tax_percent / 100;
  const grandTotal = afterDiscount + taxAmount;
  const dueAmount = grandTotal - formData.paid_amount;

  const validateForm = (): boolean => {
    const newErrors: ValidationError = {};
    
    if (items.length === 0) {
      newErrors.items = 'At least one item is required';
    }
    
    items.forEach((item, index) => {
      if (!item.batch) {
        newErrors[`batch_${index}`] = 'Batch number is required';
      }
      if (!item.expiry) {
        newErrors[`expiry_${index}`] = 'Expiry date is required';
      } else {
        const expiryDate = new Date(item.expiry);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expiryDate < today) {
          newErrors[`expiry_${index}`] = 'Expiry date cannot be in the past';
        }
      }
      if (item.qty <= 0) {
        newErrors[`qty_${index}`] = 'Quantity must be greater than 0';
      }
      if (item.unit_price <= 0) {
        newErrors[`price_${index}`] = 'Price must be greater than 0';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent, shouldPrint = false) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const purchase: Purchase = {
      id: '',
      invoice_number: `PUR-${Date.now()}`,
      supplier_invoice: formData.supplier_invoice,
      supplier_name: formData.supplier_name,
      warehouse: formData.warehouse,
      purchase_date: formData.purchase_date,
      sub_total: subTotal,
      discount_type: formData.discount_type,
      discount_value: formData.discount_value,
      discount_amount: discountAmount,
      tax_percent: formData.tax_percent,
      tax_amount: taxAmount,
      total_amount: grandTotal,
      paid_amount: formData.paid_amount,
      due_amount: dueAmount,
      items: items,
    };
    
    onSave(purchase);
    
    if (shouldPrint) {
      setTimeout(() => {
        window.print();
      }, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && showProductDropdown && filteredProducts.length > 0) {
      e.preventDefault();
      addProductToItems(filteredProducts[0]);
    }
  };

  const RequiredMark = () => <span className="text-red-500 ml-0.5">*</span>;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto m-2 animate-fade-in">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">New Purchase / Stock-In</h2>
          {errors.barcode && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              {errors.barcode}
            </div>
          )}
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)} className="p-4 space-y-4">
          {/* Header Fields */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Supplier<RequiredMark />
              </label>
              <select
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                className="input-field w-full"
                required
              >
                {suppliers.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <FileText className="w-3 h-3 inline mr-1" />
                Supplier Invoice #
              </label>
              <input
                type="text"
                value={formData.supplier_invoice}
                onChange={(e) => setFormData({ ...formData, supplier_invoice: e.target.value })}
                className="input-field w-full"
                placeholder="e.g., INV-2024-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <Warehouse className="w-3 h-3 inline mr-1" />
                Warehouse<RequiredMark />
              </label>
              <select
                value={formData.warehouse}
                onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                className="input-field w-full"
                required
              >
                {warehouses.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Purchase Date<RequiredMark />
              </label>
              <input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="input-field w-full"
                required
              />
            </div>
          </div>

          {/* Product Search */}
          <div className="bg-slate-50 rounded-xl p-3">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Add Products (Search by Name, SKU, or Barcode)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1" ref={dropdownRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowProductDropdown(true);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  onKeyDown={handleKeyDown}
                  className="input-field w-full pl-10"
                  placeholder="Type product name, SKU, or scan barcode..."
                />
                {showProductDropdown && searchTerm && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map(product => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => addProductToItems(product)}
                          className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between border-b border-slate-100 last:border-0"
                        >
                          <div>
                            <p className="font-medium text-slate-900">{product.name}</p>
                            <p className="text-xs text-slate-500">{product.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-slate-600">Stock: <span className="font-medium">{product.stock}</span></p>
                            <p className="text-xs text-slate-500">Last: ৳{product.lastPrice}</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-slate-500 text-sm">No products found</div>
                    )}
                  </div>
                )}
              </div>
              <BarcodeScanButton onScan={handleBarcodeScan} />
            </div>
          </div>

          {/* Items Table */}
          {errors.items && (
            <div className="text-red-600 text-sm flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.items}
            </div>
          )}
          
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-2 text-sm font-semibold text-slate-700 w-8">SL</th>
                  <th className="text-left p-2 text-sm font-semibold text-slate-700">Product</th>
                  <th className="text-left p-2 text-sm font-semibold text-slate-700 w-28">Batch #<RequiredMark /></th>
                  <th className="text-left p-2 text-sm font-semibold text-slate-700 w-32">Expiry<RequiredMark /></th>
                  <th className="text-right p-2 text-sm font-semibold text-slate-700 w-20">Qty<RequiredMark /></th>
                  <th className="text-right p-2 text-sm font-semibold text-slate-700 w-24">Unit Price</th>
                  <th className="text-right p-2 text-sm font-semibold text-slate-700 w-28">Sub-total</th>
                  <th className="text-center p-2 text-sm font-semibold text-slate-700 w-12">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-slate-500">
                      No items added. Search and add products above.
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-2 text-sm text-slate-600">{index + 1}</td>
                      <td className="p-2">
                        <div>
                          <p className="font-medium text-slate-900">{item.product_name}</p>
                          <p className="text-xs text-slate-500">{item.sku}</p>
                          {item.last_purchase_price > 0 && (
                            <p className="text-xs text-green-600">Last price: ৳{item.last_purchase_price}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.batch}
                          onChange={(e) => updateItem(item.id, 'batch', e.target.value)}
                          className={`input-field w-full text-sm ${errors[`batch_${index}`] ? 'border-red-500' : ''}`}
                          placeholder="BT-XXX"
                        />
                        {errors[`batch_${index}`] && (
                          <p className="text-red-500 text-xs mt-0.5">{errors[`batch_${index}`]}</p>
                        )}
                      </td>
                      <td className="p-2">
                        <input
                          type="date"
                          value={item.expiry}
                          onChange={(e) => updateItem(item.id, 'expiry', e.target.value)}
                          className={`input-field w-full text-sm ${errors[`expiry_${index}`] ? 'border-red-500' : ''}`}
                          min={new Date().toISOString().split('T')[0]}
                        />
                        {errors[`expiry_${index}`] && (
                          <p className="text-red-500 text-xs mt-0.5">{errors[`expiry_${index}`]}</p>
                        )}
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={item.qty || ''}
                          onChange={(e) => updateItem(item.id, 'qty', Number(e.target.value))}
                          className={`input-field w-full text-sm text-right ${errors[`qty_${index}`] ? 'border-red-500' : ''}`}
                          min="1"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          value={item.unit_price || ''}
                          onChange={(e) => updateItem(item.id, 'unit_price', Number(e.target.value))}
                          className={`input-field w-full text-sm text-right ${errors[`price_${index}`] ? 'border-red-500' : ''}`}
                          min="0"
                        />
                      </td>
                      <td className="p-2 text-right font-medium text-slate-900">
                        ৳ {item.sub_total.toLocaleString()}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Discount & Tax */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700 w-20">Discount:</label>
                <select
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percent' | 'fixed' })}
                  className="input-field w-24"
                >
                  <option value="percent">%</option>
                  <option value="fixed">৳ Fixed</option>
                </select>
                <input
                  type="number"
                  value={formData.discount_value || ''}
                  onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                  className="input-field w-24"
                  min="0"
                  placeholder="0"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700 w-20">Tax (%):</label>
                <input
                  type="number"
                  value={formData.tax_percent || ''}
                  onChange={(e) => setFormData({ ...formData, tax_percent: Number(e.target.value) })}
                  className="input-field w-24"
                  min="0"
                  max="100"
                  placeholder="0"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700 w-20">Paid (৳):</label>
                <input
                  type="number"
                  value={formData.paid_amount || ''}
                  onChange={(e) => setFormData({ ...formData, paid_amount: Number(e.target.value) })}
                  className="input-field w-32"
                  min="0"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Totals */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Sub-total:</span>
                <span className="font-medium">৳ {subTotal.toLocaleString()}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount ({formData.discount_type === 'percent' ? `${formData.discount_value}%` : 'Fixed'}):</span>
                  <span>- ৳ {discountAmount.toLocaleString()}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Tax ({formData.tax_percent}%):</span>
                  <span>+ ৳ {taxAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2">
                <span>Grand Total:</span>
                <span className="text-primary-600">৳ {grandTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Paid:</span>
                <span className="text-green-600">৳ {formData.paid_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="text-slate-600">Due:</span>
                <span className={dueAmount > 0 ? 'text-red-600' : 'text-green-600'}>
                  ৳ {dueAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
              className="btn-secondary flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Save & Print
            </button>
            <button type="submit" className="btn-primary">
              Create Purchase
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
