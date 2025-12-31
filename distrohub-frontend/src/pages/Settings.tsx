import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import {
  User,
  Building,
  Bell,
  Shield,
  Palette,
  Save,
  Truck,
  Tags,
  Ruler,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Phone,
  MapPin,
  Building2,
  AlertTriangle,
} from 'lucide-react';

export function Settings() {
  const [activeTab, setActiveTab] = useState('suppliers');

  const tabs = [
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'categories', label: 'Categories', icon: Tags },
    { id: 'units', label: 'Units', icon: Ruler },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'business', label: 'Business', icon: Building },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  return (
    <div className="min-h-screen">
      <Header title="Settings" />

      <div className="p-3">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-3">
            {activeTab === 'suppliers' && <SupplierManagement />}
            {activeTab === 'categories' && <CategoryManagement />}
            {activeTab === 'units' && <UnitManagement />}
            {activeTab === 'profile' && <ProfileSettings />}
            {activeTab === 'business' && <BusinessSettings />}
            {activeTab === 'notifications' && <NotificationSettings />}
            {activeTab === 'security' && <SecuritySettings />}
            {activeTab === 'appearance' && <AppearanceSettings />}
          </div>
        </div>
      </div>
    </div>
  );
}

interface Supplier {
  id: number;
  name: string;
  phone: string;
  address: string;
  company: string;
  status: 'active' | 'inactive';
}

interface Category {
  id: number;
  name: string;
  description: string;
  productCount: number;
}

interface Unit {
  id: number;
  name: string;
  shortName: string;
  baseUnit: string;
  conversionRate: number;
}

function SupplierManagement() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    { id: 1, name: 'Akij Food & Beverage', phone: '01711111111', address: 'Dhaka, Bangladesh', company: 'Akij Group', status: 'active' },
    { id: 2, name: 'Pran Foods Ltd', phone: '01722222222', address: 'Narsingdi, Bangladesh', company: 'Pran-RFL Group', status: 'active' },
    { id: 3, name: 'Square Food', phone: '01733333333', address: 'Gazipur, Bangladesh', company: 'Square Group', status: 'active' },
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [formData, setFormData] = useState<{ name: string; phone: string; address: string; company: string; status: 'active' | 'inactive' }>({ name: '', phone: '', address: '', company: '', status: 'active' });

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.phone.includes(searchTerm)
  );

  const handleSubmit = () => {
    if (editingSupplier) {
      setSuppliers(suppliers.map(s => s.id === editingSupplier.id ? { ...formData, id: s.id, status: formData.status } : s));
    } else {
      setSuppliers([...suppliers, { ...formData, id: Date.now(), status: formData.status }]);
    }
    setShowModal(false);
    setEditingSupplier(null);
    setFormData({ name: '', phone: '', address: '', company: '', status: 'active' });
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({ name: supplier.name, phone: supplier.phone, address: supplier.address, company: supplier.company, status: supplier.status });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    setSuppliers(suppliers.filter(s => s.id !== id));
    setDeleteConfirm(null);
  };

  const toggleStatus = (id: number) => {
    setSuppliers(suppliers.map(s => s.id === id ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' } : s));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Supplier Management</h3>
        <button onClick={() => { setShowModal(true); setEditingSupplier(null); setFormData({ name: '', phone: '', address: '', company: '', status: 'active' }); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search suppliers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left p-2 font-medium text-slate-600">Name</th>
              <th className="text-left p-2 font-medium text-slate-600">Company</th>
              <th className="text-left p-2 font-medium text-slate-600">Phone</th>
              <th className="text-left p-2 font-medium text-slate-600">Address</th>
              <th className="text-left p-2 font-medium text-slate-600">Status</th>
              <th className="text-left p-2 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSuppliers.map((supplier) => (
              <tr key={supplier.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <Truck className="w-4 h-4 text-primary-600" />
                    </div>
                    <span className="font-medium text-slate-900">{supplier.name}</span>
                  </div>
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-1 text-slate-600">
                    <Building2 className="w-4 h-4" />
                    {supplier.company}
                  </div>
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-1 text-slate-600">
                    <Phone className="w-4 h-4" />
                    {supplier.phone}
                  </div>
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-1 text-slate-600">
                    <MapPin className="w-4 h-4" />
                    {supplier.address}
                  </div>
                </td>
                <td className="p-2">
                  <button
                    onClick={() => toggleStatus(supplier.id)}
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      supplier.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {supplier.status === 'active' ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(supplier)} className="p-1 hover:bg-slate-100 rounded text-slate-600">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteConfirm(supplier.id)} className="p-1 hover:bg-red-50 rounded text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredSuppliers.length === 0 && (
          <div className="text-center py-8 text-slate-500">No suppliers found</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h4>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Supplier Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="Enter supplier name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="input-field"
                  placeholder="Enter company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field"
                  placeholder="01XXXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input-field"
                  rows={2}
                  placeholder="Enter address"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={handleSubmit}
                  disabled={!formData.name || !formData.phone || !formData.company}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {editingSupplier ? 'Update' : 'Add'} Supplier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Delete Supplier?</h4>
                <p className="text-sm text-slate-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([
    { id: 1, name: 'Flour', description: 'All types of flour products', productCount: 5 },
    { id: 2, name: 'Dairy', description: 'Milk, butter, cheese products', productCount: 8 },
    { id: 3, name: 'Beverages', description: 'Soft drinks, juices, water', productCount: 12 },
    { id: 4, name: 'Snacks', description: 'Chips, biscuits, cookies', productCount: 15 },
    { id: 5, name: 'Oil', description: 'Cooking oils and ghee', productCount: 6 },
    { id: 6, name: 'Rice', description: 'All varieties of rice', productCount: 4 },
    { id: 7, name: 'Spices', description: 'Spices and seasonings', productCount: 10 },
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = () => {
    if (editingCategory) {
      setCategories(categories.map(c => c.id === editingCategory.id ? { ...c, name: formData.name, description: formData.description } : c));
    } else {
      setCategories([...categories, { id: Date.now(), name: formData.name, description: formData.description, productCount: 0 }]);
    }
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '' });
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, description: category.description });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    setCategories(categories.filter(c => c.id !== id));
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Category Management</h3>
        <button onClick={() => { setShowModal(true); setEditingCategory(null); setFormData({ name: '', description: '' }); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredCategories.map((category) => (
          <div key={category.id} className="bg-slate-50 rounded-lg p-3 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Tags className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-900">{category.name}</h4>
                  <p className="text-xs text-slate-500">{category.productCount} products</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleEdit(category)} className="p-1 hover:bg-slate-200 rounded text-slate-600">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteConfirm(category.id)} className="p-1 hover:bg-red-100 rounded text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-600 mt-2">{category.description}</p>
          </div>
        ))}
      </div>
      {filteredCategories.length === 0 && (
        <div className="text-center py-8 text-slate-500">No categories found</div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">{editingCategory ? 'Edit Category' : 'Add Category'}</h4>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="e.g., Beverages, Snacks"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  rows={2}
                  placeholder="Brief description of this category"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={handleSubmit}
                  disabled={!formData.name}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {editingCategory ? 'Update' : 'Add'} Category
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Delete Category?</h4>
                <p className="text-sm text-slate-500">Products in this category will become uncategorized.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UnitManagement() {
  const [units, setUnits] = useState<Unit[]>([
    { id: 1, name: 'Piece', shortName: 'Pcs', baseUnit: '-', conversionRate: 1 },
    { id: 2, name: 'Box', shortName: 'Box', baseUnit: 'Pcs', conversionRate: 12 },
    { id: 3, name: 'Carton', shortName: 'Ctn', baseUnit: 'Pcs', conversionRate: 24 },
    { id: 4, name: 'Kilogram', shortName: 'Kg', baseUnit: '-', conversionRate: 1 },
    { id: 5, name: 'Gram', shortName: 'g', baseUnit: 'Kg', conversionRate: 0.001 },
    { id: 6, name: 'Liter', shortName: 'L', baseUnit: '-', conversionRate: 1 },
    { id: 7, name: 'Milliliter', shortName: 'ml', baseUnit: 'L', conversionRate: 0.001 },
    { id: 8, name: 'Pack', shortName: 'Pack', baseUnit: 'Pcs', conversionRate: 6 },
    { id: 9, name: 'Dozen', shortName: 'Dz', baseUnit: 'Pcs', conversionRate: 12 },
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', shortName: '', baseUnit: '-', conversionRate: 1 });

  const baseUnits = units.filter(u => u.baseUnit === '-');

  const filteredUnits = units.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.shortName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = () => {
    if (editingUnit) {
      setUnits(units.map(u => u.id === editingUnit.id ? { ...formData, id: u.id } : u));
    } else {
      setUnits([...units, { ...formData, id: Date.now() }]);
    }
    setShowModal(false);
    setEditingUnit(null);
    setFormData({ name: '', shortName: '', baseUnit: '-', conversionRate: 1 });
  };

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setFormData({ name: unit.name, shortName: unit.shortName, baseUnit: unit.baseUnit, conversionRate: unit.conversionRate });
    setShowModal(true);
  };

  const handleDelete = (id: number) => {
    setUnits(units.filter(u => u.id !== id));
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Unit Management</h3>
        <button onClick={() => { setShowModal(true); setEditingUnit(null); setFormData({ name: '', shortName: '', baseUnit: '-', conversionRate: 1 }); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Unit
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search units..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
        <h4 className="font-medium text-blue-900 mb-1">Unit Conversion Guide</h4>
        <p className="text-sm text-blue-700">Set up conversion rates to easily convert between units. Example: 1 Carton = 24 Pieces</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left p-2 font-medium text-slate-600">Unit Name</th>
              <th className="text-left p-2 font-medium text-slate-600">Short Name</th>
              <th className="text-left p-2 font-medium text-slate-600">Base Unit</th>
              <th className="text-left p-2 font-medium text-slate-600">Conversion</th>
              <th className="text-left p-2 font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUnits.map((unit) => (
              <tr key={unit.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <Ruler className="w-4 h-4 text-primary-600" />
                    </div>
                    <span className="font-medium text-slate-900">{unit.name}</span>
                  </div>
                </td>
                <td className="p-2">
                  <span className="px-2 py-1 bg-slate-100 rounded text-sm font-mono">{unit.shortName}</span>
                </td>
                <td className="p-2 text-slate-600">
                  {unit.baseUnit === '-' ? (
                    <span className="text-green-600 font-medium">Base Unit</span>
                  ) : unit.baseUnit}
                </td>
                <td className="p-2">
                  {unit.baseUnit !== '-' ? (
                    <span className="text-sm text-slate-600">
                      1 {unit.shortName} = {unit.conversionRate} {unit.baseUnit}
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(unit)} className="p-1 hover:bg-slate-100 rounded text-slate-600">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteConfirm(unit.id)} className="p-1 hover:bg-red-50 rounded text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUnits.length === 0 && (
          <div className="text-center py-8 text-slate-500">No units found</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">{editingUnit ? 'Edit Unit' : 'Add Unit'}</h4>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unit Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="e.g., Carton"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Short Name *</label>
                  <input
                    type="text"
                    value={formData.shortName}
                    onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                    className="input-field"
                    placeholder="e.g., Ctn"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Base Unit</label>
                <select
                  value={formData.baseUnit}
                  onChange={(e) => setFormData({ ...formData, baseUnit: e.target.value })}
                  className="input-field"
                >
                  <option value="-">This is a base unit</option>
                  {baseUnits.map(u => (
                    <option key={u.id} value={u.shortName}>{u.name} ({u.shortName})</option>
                  ))}
                </select>
              </div>
              {formData.baseUnit !== '-' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Conversion Rate (1 {formData.shortName || 'unit'} = ? {formData.baseUnit})
                  </label>
                  <input
                    type="number"
                    value={formData.conversionRate}
                    onChange={(e) => setFormData({ ...formData, conversionRate: parseFloat(e.target.value) || 1 })}
                    className="input-field"
                    min="0.001"
                    step="0.001"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Example: If 1 Carton = 24 Pieces, enter 24
                  </p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={handleSubmit}
                  disabled={!formData.name || !formData.shortName}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {editingUnit ? 'Update' : 'Add'} Unit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Delete Unit?</h4>
                <p className="text-sm text-slate-500">Products using this unit may be affected.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileSettings() {
  return (
    <div className="max-w-2xl space-y-3">
      <h3 className="text-lg font-semibold text-slate-900">Profile Settings</h3>
      
      <div className="flex items-center gap-3">
        <div className="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center">
          <User className="w-10 h-10 text-white" />
        </div>
        <button className="btn-secondary">Change Photo</button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
          <input type="text" className="input-field" defaultValue="Admin User" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input type="email" className="input-field" defaultValue="admin@distrohub.com" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
          <input type="tel" className="input-field" defaultValue="01712345678" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
          <input type="text" className="input-field bg-slate-50" defaultValue="Administrator" disabled />
        </div>
      </div>

      <button className="btn-primary flex items-center gap-2">
        <Save className="w-4 h-4" />
        Save Changes
      </button>
    </div>
  );
}

function BusinessSettings() {
  return (
    <div className="max-w-2xl space-y-3">
      <h3 className="text-lg font-semibold text-slate-900">Business Settings</h3>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Business Name</label>
        <input type="text" className="input-field" defaultValue="DistroHub Dealership" />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
        <textarea className="input-field" rows={3} defaultValue="123 Main Street, Dhaka, Bangladesh" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
          <input type="tel" className="input-field" defaultValue="01712345678" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input type="email" className="input-field" defaultValue="contact@distrohub.com" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
          <select className="input-field">
            <option value="BDT">BDT (৳)</option>
            <option value="USD">USD ($)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
          <select className="input-field">
            <option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
          </select>
        </div>
      </div>

      <button className="btn-primary flex items-center gap-2">
        <Save className="w-4 h-4" />
        Save Changes
      </button>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="max-w-2xl space-y-3">
      <h3 className="text-lg font-semibold text-slate-900">Notification Settings</h3>

      <div className="space-y-2">
        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
          <div>
            <p className="font-medium text-slate-900">Low Stock Alerts</p>
            <p className="text-sm text-slate-500">Get notified when stock is running low</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
          <div>
            <p className="font-medium text-slate-900">Expiry Alerts</p>
            <p className="text-sm text-slate-500">Get notified about expiring products</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
          <div>
            <p className="font-medium text-slate-900">Payment Due Reminders</p>
            <p className="text-sm text-slate-500">Get notified about overdue payments</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
          <div>
            <p className="font-medium text-slate-900">New Order Notifications</p>
            <p className="text-sm text-slate-500">Get notified when new orders are placed</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>
      </div>

      <button className="btn-primary flex items-center gap-2">
        <Save className="w-4 h-4" />
        Save Changes
      </button>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="max-w-2xl space-y-3">
      <h3 className="text-lg font-semibold text-slate-900">Security Settings</h3>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
        <input type="password" className="input-field" placeholder="Enter current password" />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
        <input type="password" className="input-field" placeholder="Enter new password" />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
        <input type="password" className="input-field" placeholder="Confirm new password" />
      </div>

      <button className="btn-primary flex items-center gap-2">
        <Shield className="w-4 h-4" />
        Update Password
      </button>

      <div className="pt-3 border-t border-slate-200">
        <h4 className="font-medium text-slate-900 mb-2">Two-Factor Authentication</h4>
        <p className="text-sm text-slate-500 mb-2">
          Add an extra layer of security to your account by enabling two-factor authentication.
        </p>
        <button className="btn-secondary">Enable 2FA</button>
      </div>
    </div>
  );
}

function AppearanceSettings() {
  return (
    <div className="max-w-2xl space-y-3">
      <h3 className="text-lg font-semibold text-slate-900">Appearance Settings</h3>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Theme</label>
        <div className="flex gap-2">
          <button className="flex-1 p-3 border-2 border-primary-500 rounded-lg bg-white">
            <div className="w-full h-8 bg-white border border-slate-200 rounded mb-2"></div>
            <p className="text-sm font-medium text-center">Light</p>
          </button>
          <button className="flex-1 p-3 border-2 border-slate-200 rounded-lg bg-white hover:border-slate-300 transition-colors">
            <div className="w-full h-8 bg-slate-900 rounded mb-2"></div>
            <p className="text-sm font-medium text-center">Dark</p>
          </button>
          <button className="flex-1 p-3 border-2 border-slate-200 rounded-lg bg-white hover:border-slate-300 transition-colors">
            <div className="w-full h-8 bg-gradient-to-r from-white to-slate-900 rounded mb-2"></div>
            <p className="text-sm font-medium text-center">System</p>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Accent Color</label>
        <div className="flex gap-2">
          <button className="w-10 h-10 bg-primary-500 rounded-lg ring-2 ring-offset-2 ring-primary-500"></button>
          <button className="w-10 h-10 bg-green-500 rounded-lg hover:ring-2 hover:ring-offset-2 hover:ring-green-500 transition-all"></button>
          <button className="w-10 h-10 bg-blue-500 rounded-lg hover:ring-2 hover:ring-offset-2 hover:ring-blue-500 transition-all"></button>
          <button className="w-10 h-10 bg-purple-500 rounded-lg hover:ring-2 hover:ring-offset-2 hover:ring-purple-500 transition-all"></button>
          <button className="w-10 h-10 bg-orange-500 rounded-lg hover:ring-2 hover:ring-offset-2 hover:ring-orange-500 transition-all"></button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Sidebar Position</label>
        <select className="input-field w-48">
          <option value="left">Left</option>
          <option value="right">Right</option>
        </select>
      </div>

      <button className="btn-primary flex items-center gap-2">
        <Save className="w-4 h-4" />
        Save Changes
      </button>
    </div>
  );
}
