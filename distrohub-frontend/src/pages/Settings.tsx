import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import {
  User,
  Building,
  Bell,
  Shield,
  Palette,
  Save,
  Plus,
  Pencil,
  Trash2,
  Package,
  Truck,
  Ruler,
  Search,
  X,
} from 'lucide-react';
import api from '@/lib/api';

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string;
  product_count: number;
  created_at: string;
}

interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  created_at: string;
}

interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  description: string | null;
  created_at: string;
}

export function Settings() {
  const [activeTab, setActiveTab] = useState('suppliers');

  const tabs = [
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'categories', label: 'Categories', icon: Package },
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
            {activeTab === 'suppliers' && <SuppliersSettings />}
            {activeTab === 'categories' && <CategoriesSettings />}
            {activeTab === 'units' && <UnitsSettings />}
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

// Categories Settings Component
function CategoriesSettings() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#4F46E5',
  });

  const colorOptions = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#6366F1', 
    '#8B5CF6', '#EC4899', '#F97316', '#14B8A6', '#84CC16'
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.put(`/api/categories/${editingCategory.id}`, formData);
      } else {
        await api.post('/api/categories', formData);
      }
      fetchCategories();
      closeModal();
    } catch (error) {
      console.error('Failed to save category:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await api.delete(`/api/categories/${id}`);
        fetchCategories();
      } catch (error) {
        console.error('Failed to delete category:', error);
      }
    }
  };

  const openModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || '',
        color: category.color,
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '', color: '#4F46E5' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: '', description: '', color: '#4F46E5' });
  };

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cat.description && cat.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <div className="text-center py-8">Loading categories...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Category Management</h3>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((category) => (
          <div key={category.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: category.color + '20' }}
                >
                  <Package className="w-5 h-5" style={{ color: category.color }} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">{category.name}</h4>
                  <p className="text-sm text-slate-500">{category.product_count} products</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => openModal(category)}
                  className="p-2 text-slate-500 hover:text-primary-600 hover:bg-white rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(category.id)}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {category.description && (
              <p className="mt-2 text-sm text-slate-600">{category.description}</p>
            )}
          </div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          No categories found. Add your first category!
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="Enter category name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  rows={3}
                  placeholder="Enter description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 rounded-lg transition-all ${
                        formData.color === color ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Suppliers Settings Component
function SuppliersSettings() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/api/suppliers');
      setSuppliers(response.data);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await api.put(`/api/suppliers/${editingSupplier.id}`, formData);
      } else {
        await api.post('/api/suppliers', formData);
      }
      fetchSuppliers();
      closeModal();
    } catch (error) {
      console.error('Failed to save supplier:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await api.delete(`/api/suppliers/${id}`);
        fetchSuppliers();
      } catch (error) {
        console.error('Failed to delete supplier:', error);
      }
    }
  };

  const openModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        contact_person: supplier.contact_person || '',
        phone: supplier.phone,
        email: supplier.email || '',
        address: supplier.address || '',
      });
    } else {
      setEditingSupplier(null);
      setFormData({ name: '', contact_person: '', phone: '', email: '', address: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSupplier(null);
    setFormData({ name: '', contact_person: '', phone: '', email: '', address: '' });
  };

  const filteredSuppliers = suppliers.filter(sup =>
    sup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sup.contact_person && sup.contact_person.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <div className="text-center py-8">Loading suppliers...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Supplier Management</h3>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search suppliers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map((supplier) => (
          <div key={supplier.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Truck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">{supplier.name}</h4>
                  {supplier.contact_person && (
                    <p className="text-sm text-slate-500">{supplier.contact_person}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => openModal(supplier)}
                  className="p-2 text-slate-500 hover:text-primary-600 hover:bg-white rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(supplier.id)}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-sm text-slate-600">
              <p>📞 {supplier.phone}</p>
              {supplier.email && <p>✉️ {supplier.email}</p>}
              {supplier.address && <p>📍 {supplier.address}</p>}
            </div>
          </div>
        ))}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          No suppliers found. Add your first supplier!
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="Enter supplier name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  className="input-field"
                  placeholder="Enter contact person name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field"
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input-field"
                  rows={2}
                  placeholder="Enter address"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingSupplier ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Units Settings Component
function UnitsSettings() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    abbreviation: '',
    description: '',
  });

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      const response = await api.get('/api/units');
      setUnits(response.data);
    } catch (error) {
      console.error('Failed to fetch units:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUnit) {
        await api.put(`/api/units/${editingUnit.id}`, formData);
      } else {
        await api.post('/api/units', formData);
      }
      fetchUnits();
      closeModal();
    } catch (error) {
      console.error('Failed to save unit:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this unit?')) {
      try {
        await api.delete(`/api/units/${id}`);
        fetchUnits();
      } catch (error) {
        console.error('Failed to delete unit:', error);
      }
    }
  };

  const openModal = (unit?: Unit) => {
    if (unit) {
      setEditingUnit(unit);
      setFormData({
        name: unit.name,
        abbreviation: unit.abbreviation,
        description: unit.description || '',
      });
    } else {
      setEditingUnit(null);
      setFormData({ name: '', abbreviation: '', description: '' });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUnit(null);
    setFormData({ name: '', abbreviation: '', description: '' });
  };

  const filteredUnits = units.filter(unit =>
    unit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unit.abbreviation.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">Loading units...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Unit Management</h3>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Unit
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search units..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredUnits.map((unit) => (
          <div key={unit.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 font-bold text-sm">{unit.abbreviation}</span>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">{unit.name}</h4>
                  <p className="text-sm text-slate-500">{unit.abbreviation}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => openModal(unit)}
                  className="p-2 text-slate-500 hover:text-primary-600 hover:bg-white rounded-lg transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(unit.id)}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {unit.description && (
              <p className="mt-2 text-sm text-slate-600">{unit.description}</p>
            )}
          </div>
        ))}
      </div>

      {filteredUnits.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          No units found. Add your first unit!
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingUnit ? 'Edit Unit' : 'Add Unit'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Unit Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="e.g., Kilogram"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Abbreviation *
                </label>
                <input
                  type="text"
                  required
                  value={formData.abbreviation}
                  onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                  className="input-field"
                  placeholder="e.g., kg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  rows={2}
                  placeholder="Enter description"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingUnit ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
