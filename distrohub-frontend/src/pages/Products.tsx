import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import {
  Plus,
  Upload,
  Download,
  Search,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  Filter,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  pack_size: number;
  purchase_price: number;
  selling_price: number;
  stock_quantity: number;
  batch_number: string;
  expiry_date: string;
}

const initialProducts: Product[] = [
  {
    id: '1',
    name: 'Akij Flour 1kg',
    sku: 'AKJ-FLR-001',
    category: 'Flour',
    unit: 'Pack',
    pack_size: 12,
    purchase_price: 55,
    selling_price: 62,
    stock_quantity: 500,
    batch_number: 'BT-2024-001',
    expiry_date: '2025-06-15',
  },
  {
    id: '2',
    name: 'Power Milk 400g',
    sku: 'PWR-MLK-001',
    category: 'Dairy',
    unit: 'Pack',
    pack_size: 24,
    purchase_price: 320,
    selling_price: 350,
    stock_quantity: 200,
    batch_number: 'BT-2024-002',
    expiry_date: '2025-01-20',
  },
  {
    id: '3',
    name: 'Pampers Medium',
    sku: 'PMP-MED-001',
    category: 'Baby Care',
    unit: 'Pack',
    pack_size: 6,
    purchase_price: 850,
    selling_price: 920,
    stock_quantity: 150,
    batch_number: 'BT-2024-003',
    expiry_date: '2026-12-31',
  },
  {
    id: '4',
    name: 'Premium Rice 5kg',
    sku: 'RIC-PRM-001',
    category: 'Rice',
    unit: 'Bag',
    pack_size: 10,
    purchase_price: 420,
    selling_price: 480,
    stock_quantity: 300,
    batch_number: 'BT-2024-004',
    expiry_date: '2025-12-31',
  },
];

export function Products() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [expiryFilter, setExpiryFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const categories = [...new Set(products.map(p => p.category))];

  const isExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  const isExpired = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    return expiry < today;
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    
    const matchesStock = stockFilter === 'all' ||
      (stockFilter === 'low' && product.stock_quantity < 50) ||
      (stockFilter === 'out' && product.stock_quantity === 0) ||
      (stockFilter === 'in_stock' && product.stock_quantity >= 50);
    
    const matchesExpiry = expiryFilter === 'all' ||
      (expiryFilter === 'expired' && isExpired(product.expiry_date)) ||
      (expiryFilter === 'expiring' && isExpiringSoon(product.expiry_date) && !isExpired(product.expiry_date)) ||
      (expiryFilter === 'safe' && !isExpiringSoon(product.expiry_date));
    
    return matchesSearch && matchesCategory && matchesStock && matchesExpiry;
  });

  const activeFiltersCount = [categoryFilter, stockFilter, expiryFilter].filter(f => f !== 'all').length;

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet) as Product[];
      
      const newProducts = jsonData.map((item, index) => ({
        ...item,
        id: `imported-${Date.now()}-${index}`,
      }));
      
      setProducts([...products, ...newProducts]);
      alert(`Successfully imported ${newProducts.length} products!`);
    };
    reader.readAsBinaryString(file);
  };

  const handleExcelExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(products);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    XLSX.writeFile(workbook, 'products.xlsx');
  };

    const handleDelete = (id: string) => {
      if (confirm('Are you sure you want to delete this product?')) {
        setProducts(products.filter((p) => p.id !== id));
      }
    };

    const clearFilters = () => {
      setCategoryFilter('all');
      setStockFilter('all');
      setExpiryFilter('all');
      setSearchTerm('');
    };

  return (
    <div className="min-h-screen">
      <Header title="Products" />

      <div className="p-3">
                {/* Actions Bar */}
                <div className="bg-white rounded-xl p-2 shadow-sm mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <div className="relative min-w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field pl-10"
                      />
                    </div>

                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="input-field pl-10 w-40"
                      >
                        <option value="all">All Categories</option>
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <select
                      value={stockFilter}
                      onChange={(e) => setStockFilter(e.target.value)}
                      className="input-field w-36"
                    >
                      <option value="all">All Stock</option>
                      <option value="in_stock">In Stock</option>
                      <option value="low">Low Stock</option>
                      <option value="out">Out of Stock</option>
                    </select>

                    <select
                      value={expiryFilter}
                      onChange={(e) => setExpiryFilter(e.target.value)}
                      className="input-field w-40"
                    >
                      <option value="all">All Expiry</option>
                      <option value="expired">Expired</option>
                      <option value="expiring">Expiring Soon</option>
                      <option value="safe">Safe</option>
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

                  <div className="flex items-center gap-2">
                    <label className="btn-secondary flex items-center gap-2 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      Import Excel
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleExcelImport}
                        className="hidden"
                      />
                    </label>

                    <button onClick={handleExcelExport} className="btn-secondary flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Export
                    </button>

                    <button
                      onClick={() => setShowAddModal(true)}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Product
                    </button>
                  </div>
                </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-2 font-semibold text-slate-700">Product</th>
                  <th className="text-left p-2 font-semibold text-slate-700">SKU</th>
                  <th className="text-left p-2 font-semibold text-slate-700">Category</th>
                  <th className="text-left p-2 font-semibold text-slate-700">Unit</th>
                  <th className="text-right p-2 font-semibold text-slate-700">Purchase</th>
                  <th className="text-right p-2 font-semibold text-slate-700">Selling</th>
                  <th className="text-right p-2 font-semibold text-slate-700">Stock</th>
                  <th className="text-left p-2 font-semibold text-slate-700">Batch</th>
                  <th className="text-left p-2 font-semibold text-slate-700">Expiry</th>
                  <th className="text-center p-2 font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary-600" />
                        </div>
                        <span className="font-medium text-slate-900">{product.name}</span>
                      </div>
                    </td>
                    <td className="p-2 text-slate-600 font-mono text-sm">{product.sku}</td>
                    <td className="p-2">
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-sm">
                        {product.category}
                      </span>
                    </td>
                    <td className="p-2 text-slate-600">
                      {product.unit} ({product.pack_size}/ctn)
                    </td>
                    <td className="p-2 text-right text-slate-600">৳ {product.purchase_price}</td>
                    <td className="p-2 text-right font-medium text-slate-900">৳ {product.selling_price}</td>
                    <td className="p-2 text-right">
                      <span
                        className={`font-medium ${
                          product.stock_quantity < 50 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {product.stock_quantity}
                      </span>
                    </td>
                    <td className="p-2 text-slate-600 font-mono text-sm">{product.batch_number}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        {isExpiringSoon(product.expiry_date) && (
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                        )}
                        <span
                          className={
                            isExpiringSoon(product.expiry_date) ? 'text-orange-600 font-medium' : 'text-slate-600'
                          }
                        >
                          {product.expiry_date}
                        </span>
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingProduct(product)}
                          className="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredProducts.length === 0 && (
            <div className="p-4 text-center text-slate-500">
              No products found. Try adjusting your search or add a new product.
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal would go here */}
      {(showAddModal || editingProduct) && (
        <ProductModal
          product={editingProduct}
          onClose={() => {
            setShowAddModal(false);
            setEditingProduct(null);
          }}
          onSave={(product) => {
            if (editingProduct) {
              setProducts(products.map((p) => (p.id === product.id ? product : p)));
            } else {
              setProducts([...products, { ...product, id: `new-${Date.now()}` }]);
            }
            setShowAddModal(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
}

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onSave: (product: Product) => void;
}

function ProductModal({ product, onClose, onSave }: ProductModalProps) {
  const [formData, setFormData] = useState<Partial<Product>>(
    product || {
      name: '',
      sku: '',
      category: '',
      unit: 'Pack',
      pack_size: 12,
      purchase_price: 0,
      selling_price: 0,
      stock_quantity: 0,
      batch_number: '',
      expiry_date: '',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Product);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-2 animate-fade-in">
        <div className="p-3 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            {product ? 'Edit Product' : 'Add New Product'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Product Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">SKU</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="input-field"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="input-field"
              >
                <option value="Pack">Pack</option>
                <option value="Bag">Bag</option>
                <option value="Box">Box</option>
                <option value="Piece">Piece</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Pack Size</label>
              <input
                type="number"
                value={formData.pack_size}
                onChange={(e) => setFormData({ ...formData, pack_size: Number(e.target.value) })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Price (৳)</label>
              <input
                type="number"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value) })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Selling Price (৳)</label>
              <input
                type="number"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })}
                className="input-field"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Stock Quantity</label>
              <input
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: Number(e.target.value) })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Batch Number</label>
              <input
                type="text"
                value={formData.batch_number}
                onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {product ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
