import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import api from '@/lib/api';
import { logger } from '@/lib/logger';
import * as smsApi from '@/lib/smsApi';
import type {
  SmsSettings,
  SmsSettingsCreate,
  SmsEventType,
  SmsDeliveryMode,
} from '@/types';

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string;
  product_count: number;
  created_at: string;
}

// Supplier and Unit interfaces removed - using LocalSupplier and LocalUnit instead

export function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'suppliers';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Sync activeTab with URL on mount and when URL changes
  useEffect(() => {
    const urlTab = searchParams.get('tab') || 'suppliers';
    setActiveTab(urlTab);
  }, [searchParams]);

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

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  return (
    <div className="min-h-screen">
      <Header title="Settings" />

      <div className="p-3">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
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
            {activeTab === 'sms-templates' && <div className="p-4 text-center text-slate-500">SMS Template Management - Coming Soon</div>}
            {activeTab === 'sms-logs' && <div className="p-4 text-center text-slate-500">SMS Logs View - Coming Soon</div>}
            {activeTab === 'security' && <SecuritySettings />}
            {activeTab === 'appearance' && <AppearanceSettings />}
          </div>
        </div>
      </div>
    </div>
  );
}

// Supplier interface matching backend API
interface Supplier {
  id: string;
  name: string;
  phone: string;
  address?: string;
  contact_person?: string;
  email?: string;
  created_at: string;
}

function SupplierManagement() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ name: string; phone: string; address: string; company: string }>({ name: '', phone: '', address: '', company: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    logger.log('[SupplierManagement] ============================================');
    logger.log('[SupplierManagement] API MODE ACTIVE - Version: 2026-01-03');
    logger.log('[SupplierManagement] Component mounted, fetching suppliers...');
    
    // Load from localStorage first for instant display
    const storedSuppliers = loadSuppliersFromStorage();
    if (storedSuppliers.length > 0) {
      logger.log('[SupplierManagement] Loading', storedSuppliers.length, 'suppliers from localStorage for instant display');
      setSuppliers(storedSuppliers);
      setLoading(false); // Show cached data immediately
    }
    
    // Then fetch from API to get latest data (background sync)
    fetchSuppliers();
  }, []); // Empty deps - only run on mount

  // Also fetch when component becomes visible (in case of tab switching)
  useEffect(() => {
    // Small delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      if (suppliers.length === 0 && !loading) {
        logger.log('[SupplierManagement] No suppliers found, fetching...');
        fetchSuppliers();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Load suppliers from localStorage
  const loadSuppliersFromStorage = (): Supplier[] => {
    try {
      const stored = localStorage.getItem('distrohub_suppliers');
      if (stored) {
        const parsed = JSON.parse(stored);
        logger.log('[SupplierManagement] Loaded', parsed.length, 'suppliers from localStorage');
        return parsed;
      }
    } catch (err) {
      console.error('[SupplierManagement] Failed to load suppliers from localStorage:', err);
    }
    return [];
  };

  // Save suppliers to localStorage
  const saveSuppliersToStorage = (suppliersList: Supplier[]) => {
    try {
      localStorage.setItem('distrohub_suppliers', JSON.stringify(suppliersList));
      logger.log('[SupplierManagement] Saved', suppliersList.length, 'suppliers to localStorage');
    } catch (err) {
      console.error('[SupplierManagement] Failed to save suppliers to localStorage:', err);
    }
  };

  const fetchSuppliers = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[SupplierManagement] No token found, skipping suppliers fetch');
      // Load from localStorage as fallback
      const storedSuppliers = loadSuppliersFromStorage();
      setSuppliers(storedSuppliers);
      setLoading(false);
      return;
    }

    try {
      // Only show loading if we don't have cached data
      const hasCachedData = suppliers.length > 0;
      if (!hasCachedData) {
        setLoading(true);
      }
      setError(null);
      logger.log('[SupplierManagement] Fetching suppliers from API...');
      const response = await api.get('/api/suppliers');
      logger.log('[SupplierManagement] Suppliers fetched successfully:', response.data);
      logger.log('[SupplierManagement] Number of suppliers:', response.data?.length || 0);
      
      // Validate response data
      if (response.data && Array.isArray(response.data)) {
        const beforeStorage = loadSuppliersFromStorage();
        // If API returns empty array, preserve localStorage data (backend might be using InMemoryDatabase)
        if (response.data.length === 0) {
          console.warn('[SupplierManagement] API returned empty array - preserving localStorage data');
          const storedSuppliers = loadSuppliersFromStorage();
          if (storedSuppliers.length > 0) {
            logger.log('[SupplierManagement] Preserving', storedSuppliers.length, 'suppliers from localStorage');
            setSuppliers(storedSuppliers);
            // Don't overwrite localStorage with empty array
          } else {
            setSuppliers([]);
            saveSuppliersToStorage([]);
          }
        } else {
          // API has data - merge with localStorage to preserve any local-only suppliers
          // Merge: Use API data as base, but keep any localStorage suppliers that aren't in API response
          // This includes temp IDs (optimistic updates) AND any suppliers that API doesn't return
          const apiSupplierIds = new Set(response.data.map((s: Supplier) => s.id));
          // Keep suppliers from localStorage that:
          // 1. Have temp IDs (optimistic updates not yet synced)
          // 2. OR are not in API response by ID (might be local-only or API returned stale data)
          const localOnlySuppliers = beforeStorage.filter(s => {
            const isTempId = s.id.startsWith('temp-');
            const notInApi = !apiSupplierIds.has(s.id);
            // Keep if it's a temp ID OR if it's not in API response
            return isTempId || notInApi;
          });
          const mergedSuppliers = [...response.data, ...localOnlySuppliers];
          setSuppliers(mergedSuppliers);
          saveSuppliersToStorage(mergedSuppliers);
          logger.log('[SupplierManagement] Suppliers state updated with', mergedSuppliers.length, 'suppliers (merged with', localOnlySuppliers.length, 'local-only)');
        }
      } else {
        console.warn('[SupplierManagement] Invalid response data format:', response.data);
        // Load from localStorage as fallback
        const storedSuppliers = loadSuppliersFromStorage();
        setSuppliers(storedSuppliers);
      }
    } catch (error: any) {
      console.error('[SupplierManagement] Failed to fetch suppliers:', error);
      
      // Load from localStorage as fallback
      const storedSuppliers = loadSuppliersFromStorage();
      if (storedSuppliers.length > 0) {
        logger.log('[SupplierManagement] Using', storedSuppliers.length, 'suppliers from localStorage as fallback');
        setSuppliers(storedSuppliers);
      }
      
      // Don't clear suppliers on timeout - keep existing data
      if (error.isTimeout || error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.warn('[SupplierManagement] Timeout error - using localStorage data');
        // Don't show error for timeout - it's just slow, not broken
        // setError(null); // Clear error - showing cached data is fine
        // Don't clear suppliers - keep what we have
      } else if (error.isNetworkError || error.code === 'ERR_NETWORK') {
        console.warn('[SupplierManagement] Network error - using localStorage data');
        // Don't show error for network issues - showing cached data is fine
        // setError(null); // Clear error - showing cached data is fine
        // Don't clear suppliers - keep what we have
      } else {
        // Only show error for actual errors (not timeouts/network)
        setError(error?.response?.data?.detail || error?.message || 'Failed to load suppliers');
        // Only clear if we don't have any suppliers yet
        if (storedSuppliers.length === 0) {
          setSuppliers([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Memoize expensive filtering calculation
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.contact_person && s.contact_person.toLowerCase().includes(searchTerm.toLowerCase())) ||
      s.phone.includes(searchTerm)
    );
  }, [suppliers, searchTerm]);

  const handleSubmit = async () => {
    if (isSubmitting) {
      logger.log('[SupplierManagement] Already submitting, ignoring duplicate request');
      return;
    }
    
    if (!formData.name || !formData.name.trim() || !formData.phone || !formData.phone.trim()) {
      alert('Supplier name and phone are required');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address?.trim() || null,
        contact_person: formData.company?.trim() || null,
        email: null,
      };
      
      logger.log('[SupplierManagement] Submitting supplier:', {
        isEdit: !!editingSupplier,
        supplierId: editingSupplier?.id,
        payload,
      });

      if (editingSupplier) {
        logger.log('[SupplierManagement] Updating supplier via PUT:', `/api/suppliers/${editingSupplier.id}`);
        const response = await api.put(`/api/suppliers/${editingSupplier.id}`, payload);
        logger.log('[SupplierManagement] Supplier updated successfully:', response.data);
        
        // Update supplier in list
        const serverSupplier: Supplier = {
          ...response.data,
          address: response.data.address ?? undefined,
          contact_person: response.data.contact_person ?? undefined,
          email: response.data.email ?? undefined,
        };
        setSuppliers(prev => {
          const updated = prev.map(s => s.id === serverSupplier.id ? serverSupplier : s);
          saveSuppliersToStorage(updated);
          return updated;
        });
      } else {
        logger.log('[SupplierManagement] Creating supplier via POST:', '/api/suppliers');
        logger.log('[SupplierManagement] Payload being sent:', JSON.stringify(payload, null, 2));
        
        // Optimistic update: Add new supplier to UI immediately with temp ID
        const tempId = `temp-${Date.now()}`;
        const optimisticSupplier: Supplier = {
          id: tempId,
          name: payload.name,
          phone: payload.phone,
          address: payload.address ?? undefined,
          contact_person: payload.contact_person ?? undefined,
          email: payload.email ?? undefined,
          created_at: new Date().toISOString(),
        };
        logger.log('[SupplierManagement] Adding supplier optimistically with temp ID:', tempId);
        setSuppliers(prev => {
          const updated = [...prev, optimisticSupplier];
          saveSuppliersToStorage(updated);
          return updated;
        });
        
        try {
          const response = await api.post('/api/suppliers', payload);
          logger.log('[SupplierManagement] Supplier created successfully:', response.data);
          logger.log('[SupplierManagement] New supplier ID:', response.data?.id);
          logger.log('[SupplierManagement] Full response:', JSON.stringify(response.data, null, 2));
          
          // Verify response has required fields
          if (!response.data?.id) {
            console.error('[SupplierManagement] WARNING: Supplier created but no ID in response!');
            console.error('[SupplierManagement] Response data:', response.data);
          }
          
          // Replace optimistic entry with actual server data
          const serverSupplier: Supplier = {
            ...response.data,
            address: response.data.address ?? undefined,
            contact_person: response.data.contact_person ?? undefined,
            email: response.data.email ?? undefined,
          };
          setSuppliers(prev => {
            const updated = prev.map(s => s.id === tempId ? serverSupplier : s);
            saveSuppliersToStorage(updated);
            return updated;
          });
        } catch (createError: any) {
          console.error('[SupplierManagement] Failed to create supplier on server:', createError);
          // Revert optimistic update
          setSuppliers(prev => {
            const updated = prev.filter(s => s.id !== tempId);
            saveSuppliersToStorage(updated);
            return updated;
          });
          throw createError; // Re-throw to show error to user
        }
      }
      
      // Then fetch from server to ensure consistency (background sync)
      try {
        await fetchSuppliers();
      } catch (fetchError) {
        console.warn('[SupplierManagement] Failed to refresh suppliers list, but supplier was saved:', fetchError);
        // Don't show error - we already updated optimistically and saved to localStorage
      }
      
      setShowModal(false);
      setEditingSupplier(null);
      setFormData({ name: '', phone: '', address: '', company: '' });
      logger.log('[SupplierManagement] Supplier operation completed successfully');
    } catch (error: any) {
      console.error('[SupplierManagement] Failed to save supplier:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to save supplier';
      setError(errorMessage);
      alert(`Failed to save supplier: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({ 
      name: supplier.name, 
      phone: supplier.phone, 
      address: supplier.address || '', 
      company: supplier.contact_person || '' 
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      logger.log('[SupplierManagement] Deleting supplier:', id);
      
      // Optimistic update: Remove from UI immediately
      setSuppliers(prev => {
        const updated = prev.filter(s => s.id !== id);
        saveSuppliersToStorage(updated);
        return updated;
      });
      
      try {
        await api.delete(`/api/suppliers/${id}`);
        logger.log('[SupplierManagement] Supplier deleted successfully');
        // Refresh suppliers from server after successful delete (background sync)
        try {
          await fetchSuppliers();
        } catch (fetchError) {
          console.warn('[SupplierManagement] Failed to refresh after delete, but supplier was removed:', fetchError);
        }
      } catch (deleteError: any) {
        console.error('[SupplierManagement] Failed to delete supplier on server:', deleteError);
        // Revert optimistic update
        await fetchSuppliers();
        const errorMessage = deleteError?.response?.data?.detail || deleteError?.message || 'Failed to delete supplier';
        alert(`Failed to delete supplier: ${errorMessage}`);
        return;
      }
      
      setDeleteConfirm(null);
    } catch (error: any) {
      console.error('[SupplierManagement] Failed to delete supplier:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to delete supplier';
      alert(`Failed to delete supplier: ${errorMessage}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Supplier Management</h3>
        </div>
        <div className="text-center py-8 text-slate-500">Loading suppliers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Supplier Management</h3>
        <button onClick={() => { setShowModal(true); setEditingSupplier(null); setFormData({ name: '', phone: '', address: '', company: '' }); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

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
              <th className="text-left p-2 font-medium text-slate-600">Contact Person</th>
              <th className="text-left p-2 font-medium text-slate-600">Phone</th>
              <th className="text-left p-2 font-medium text-slate-600">Address</th>
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
                    {supplier.contact_person || '-'}
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
                    {supplier.address || '-'}
                  </div>
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
        {filteredSuppliers.length === 0 && !loading && (
          <div className="text-center py-8 text-slate-500">No suppliers found</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h4>
              <button 
                onClick={() => {
                  setShowModal(false);
                  setEditingSupplier(null);
                  setFormData({ name: '', phone: '', address: '', company: '' });
                  setError(null);
                }} 
                className="p-1 hover:bg-slate-100 rounded"
              >
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
                <button 
                  onClick={() => {
                    setShowModal(false);
                    setEditingSupplier(null);
                    setFormData({ name: '', phone: '', address: '', company: '' });
                    setError(null);
                  }} 
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!formData.name || !formData.phone || isSubmitting}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingSupplier ? 'Update' : 'Add'} Supplier
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', color: '#4F46E5' });
  const [isSubmitting, setIsSubmitting] = useState(false); // Prevent duplicate requests

  useEffect(() => {
    logger.log('[CategoryManagement] Component mounted, fetching categories...');
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      logger.log('[CategoryManagement] Fetching categories from API...');
      const response = await api.get('/api/categories');
      logger.log('[CategoryManagement] Categories fetched successfully:', response.data);
      logger.log('[CategoryManagement] Number of categories:', response.data?.length || 0);
      setCategories(response.data);
    } catch (error: any) {
      console.error('[CategoryManagement] Failed to fetch categories:', error);
      console.error('[CategoryManagement] Error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        url: error?.config?.url
      });
      
      // Show user-friendly error message
      if (error.isTimeout || error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        alert('Backend is starting up (cold start). This may take 30-60 seconds. Please wait and try again.');
      } else if (error.isNetworkError || error.code === 'ERR_NETWORK') {
        alert('Cannot connect to the server. Please check your internet connection.');
      } else {
        alert(`Failed to load categories: ${error.response?.data?.detail || error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Memoize expensive filtering calculation
  const filteredCategories = useMemo(() => {
    return categories.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [categories, searchTerm]);

  const handleSubmit = async () => {
    // Prevent duplicate requests
    if (isSubmitting) {
      logger.log('[CategoryManagement] Already submitting, ignoring duplicate request');
      return;
    }
    
    if (!formData.name || !formData.name.trim()) {
      alert('Category name is required');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        color: formData.color,
      };
      
      logger.log('[CategoryManagement] Submitting category:', {
        isEdit: !!editingCategory,
        categoryId: editingCategory?.id,
        payload,
        isSubmitting: true
      });

      let response;
      if (editingCategory) {
        logger.log('[CategoryManagement] Updating category via PUT:', `/api/categories/${editingCategory.id}`);
        response = await api.put(`/api/categories/${editingCategory.id}`, payload);
        logger.log('[CategoryManagement] Category updated successfully:', response.data);
      } else {
        logger.log('[CategoryManagement] Creating category via POST:', '/api/categories');
        response = await api.post('/api/categories', payload);
        logger.log('[CategoryManagement] Category created successfully:', response.data);
        logger.log('[CategoryManagement] New category ID:', response.data?.id);
      }
      
      // Refresh categories from server after successful save
      logger.log('[CategoryManagement] Refreshing categories list...');
      await fetchCategories();
      
      setShowModal(false);
      setEditingCategory(null);
      setFormData({ name: '', description: '', color: '#4F46E5' });
      logger.log('[CategoryManagement] Category operation completed successfully');
    } catch (error: any) {
      // Error handling - ensure isSubmitting is reset
      console.error('[CategoryManagement] Failed to save category:', error);
      console.error('[CategoryManagement] Error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        url: error?.config?.url,
        baseURL: error?.config?.baseURL,
        method: error?.config?.method,
        payload: error?.config?.data,
        code: error?.code,
        request: error?.request,
        timeout: error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')
      });
      
      // Better error message with detailed information
      let errorMessage = 'Failed to save category';
      
      // Network/timeout errors
      if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
        errorMessage = 'Request timed out. The server may be slow. Please try again.';
      } else if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error?.code === 'ERR_FAILED') {
        errorMessage = 'Request failed. Please check the server status.';
      }
      // HTTP status code errors
      else if (error?.response) {
        const status = error.response.status;
        const detail = error.response.data?.detail || error.response.data?.message || error.response.data;
        
        if (status === 400) {
          errorMessage = `Validation error: ${detail || 'Invalid input data'}`;
        } else if (status === 401) {
          errorMessage = 'Authentication failed. Please login again.';
        } else if (status === 403) {
          errorMessage = `Permission denied: ${detail || 'You do not have permission to perform this action'}`;
        } else if (status === 409) {
          errorMessage = `Conflict: ${detail || 'Category with this name already exists'}`;
        } else if (status === 422) {
          errorMessage = `Validation error: ${detail || 'Invalid input format'}`;
        } else if (status === 500) {
          errorMessage = `Server error: ${detail || 'An unexpected error occurred on the server'}`;
        } else {
          errorMessage = `Error ${status}: ${detail || error.message || 'Unknown error'}`;
        }
      }
      // Other errors
      else if (error?.message) {
        errorMessage = error.message;
      }
      if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
        errorMessage = 'Request timeout. Please try again.';
      } else if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error?.response?.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      alert(`Failed to save category: ${errorMessage}`);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({ 
      name: category.name, 
      description: category.description || '', 
      color: category.color 
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/categories/${id}`);
      // Refresh categories from server after successful delete
      await fetchCategories();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete category:', error);
      // Optionally show error message to user
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Category Management</h3>
        </div>
        <div className="text-center py-8 text-slate-500">Loading categories...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Category Management</h3>
        <button onClick={() => { setShowModal(true); setEditingCategory(null); setFormData({ name: '', description: '', color: '#4F46E5' }); }} className="btn-primary flex items-center gap-2">
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
                  <p className="text-xs text-slate-500">{category.product_count} products</p>
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
            {category.description && (
              <p className="text-sm text-slate-600 mt-2">{category.description}</p>
            )}
          </div>
        ))}
      </div>
      {filteredCategories.length === 0 && !loading && (
        <div className="text-center py-8 text-slate-500">No categories found</div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">{editingCategory ? 'Edit Category' : 'Add Category'}</h4>
              <button 
                onClick={() => {
                  setShowModal(false);
                  setEditingCategory(null);
                  setFormData({ name: '', description: '', color: '#4F46E5' });
                }} 
                className="p-1 hover:bg-slate-100 rounded"
              >
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
                <button 
                  onClick={() => {
                    setShowModal(false);
                    setEditingCategory(null);
                    setFormData({ name: '', description: '', color: '#4F46E5' });
                  }} 
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
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

// Unit interface matching backend API
interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  description?: string;
  created_at: string;
}

function UnitManagement() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', abbreviation: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    logger.log('[UnitManagement] Component mounted, fetching units...');
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[UnitManagement] No token found, skipping units fetch');
      setUnits([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      logger.log('[UnitManagement] Fetching units from API...');
      const response = await api.get('/api/units');
      logger.log('[UnitManagement] Units fetched successfully:', response.data);
      logger.log('[UnitManagement] Number of units:', response.data?.length || 0);
      if (response.data) {
        setUnits(response.data);
      }
    } catch (error: any) {
      console.error('[UnitManagement] Failed to fetch units:', error);
      setError(error?.response?.data?.detail || error?.message || 'Failed to load units');
      setUnits([]);
    } finally {
      setLoading(false);
    }
  };

  // Memoize expensive filtering calculation
  const filteredUnits = useMemo(() => {
    return units.filter(u =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.abbreviation.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [units, searchTerm]);

  const handleSubmit = async () => {
    if (isSubmitting) {
      logger.log('[UnitManagement] Already submitting, ignoring duplicate request');
      return;
    }
    
    if (!formData.name || !formData.name.trim() || !formData.abbreviation || !formData.abbreviation.trim()) {
      alert('Unit name and abbreviation are required');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const payload = {
        name: formData.name.trim(),
        abbreviation: formData.abbreviation.trim(),
        description: formData.description?.trim() || null,
      };
      
      logger.log('[UnitManagement] Submitting unit:', {
        isEdit: !!editingUnit,
        unitId: editingUnit?.id,
        payload,
      });

      let response;
      if (editingUnit) {
        logger.log('[UnitManagement] Updating unit via PUT:', `/api/units/${editingUnit.id}`);
        response = await api.put(`/api/units/${editingUnit.id}`, payload);
        logger.log('[UnitManagement] Unit updated successfully:', response.data);
      } else {
        logger.log('[UnitManagement] Creating unit via POST:', '/api/units');
        response = await api.post('/api/units', payload);
        logger.log('[UnitManagement] Unit created successfully:', response.data);
        logger.log('[UnitManagement] New unit ID:', response.data?.id);
      }
      
      // Refresh units from server after successful save
      logger.log('[UnitManagement] Refreshing units list...');
      await fetchUnits();
      
      setShowModal(false);
      setEditingUnit(null);
      setFormData({ name: '', abbreviation: '', description: '' });
      logger.log('[UnitManagement] Unit operation completed successfully');
    } catch (error: any) {
      console.error('[UnitManagement] Failed to save unit:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to save unit';
      setError(errorMessage);
      alert(`Failed to save unit: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setFormData({ 
      name: unit.name, 
      abbreviation: unit.abbreviation, 
      description: unit.description || '' 
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      logger.log('[UnitManagement] Deleting unit:', id);
      await api.delete(`/api/units/${id}`);
      logger.log('[UnitManagement] Unit deleted successfully');
      // Refresh units from server after successful delete
      await fetchUnits();
      setDeleteConfirm(null);
    } catch (error: any) {
      console.error('[UnitManagement] Failed to delete unit:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || 'Failed to delete unit';
      alert(`Failed to delete unit: ${errorMessage}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Unit Management</h3>
        </div>
        <div className="text-center py-8 text-slate-500">Loading units...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Unit Management</h3>
        <button onClick={() => { setShowModal(true); setEditingUnit(null); setFormData({ name: '', abbreviation: '', description: '' }); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Unit
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

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

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left p-2 font-medium text-slate-600">Unit Name</th>
              <th className="text-left p-2 font-medium text-slate-600">Abbreviation</th>
              <th className="text-left p-2 font-medium text-slate-600">Description</th>
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
                  <span className="px-2 py-1 bg-slate-100 rounded text-sm font-mono">{unit.abbreviation}</span>
                </td>
                <td className="p-2 text-slate-600">
                  {unit.description || '-'}
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
        {filteredUnits.length === 0 && !loading && (
          <div className="text-center py-8 text-slate-500">No units found</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">{editingUnit ? 'Edit Unit' : 'Add Unit'}</h4>
              <button 
                onClick={() => {
                  setShowModal(false);
                  setEditingUnit(null);
                  setFormData({ name: '', abbreviation: '', description: '' });
                  setError(null);
                }} 
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unit Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="e.g., Piece, Kilogram, Liter"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Abbreviation *</label>
                <input
                  type="text"
                  value={formData.abbreviation}
                  onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                  className="input-field"
                  placeholder="e.g., Pcs, Kg, L"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  rows={2}
                  placeholder="Optional description of this unit"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => {
                    setShowModal(false);
                    setEditingUnit(null);
                    setFormData({ name: '', abbreviation: '', description: '' });
                    setError(null);
                  }} 
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!formData.name || !formData.abbreviation || isSubmitting}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingUnit ? 'Update' : 'Add'} Unit
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
  const [smsSettings, setSmsSettings] = useState<Record<SmsEventType, SmsSettings | null>>({
    low_stock: null,
    expiry_alert: null,
    payment_due: null,
    new_order: null,
  });
  const [loading, setLoading] = useState(true);
  const [savingStates, setSavingStates] = useState<Record<SmsEventType, boolean>>({
    low_stock: false,
    expiry_alert: false,
    payment_due: false,
    new_order: false,
  });
  const debounceTimers = useRef<Record<SmsEventType, NodeJS.Timeout | null>>({
    low_stock: null,
    expiry_alert: null,
    payment_due: null,
    new_order: null,
  });
  const settingsRef = useRef(smsSettings);
  
  // Keep ref in sync with state
  useEffect(() => {
    settingsRef.current = smsSettings;
  }, [smsSettings]);

  const eventTypes: { type: SmsEventType; label: string; description: string }[] = [
    { type: 'low_stock', label: 'Low Stock Alerts', description: 'Get SMS when stock is running low' },
    { type: 'expiry_alert', label: 'Expiry Alerts', description: 'Get SMS about expiring products' },
    { type: 'payment_due', label: 'Payment Due Reminders', description: 'Get SMS about overdue payments' },
    { type: 'new_order', label: 'New Order Notifications', description: 'Get SMS when new orders are placed' },
  ];

  useEffect(() => {
    fetchSmsSettings();
    // Cleanup debounce timers on unmount
    return () => {
      Object.values(debounceTimers.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  const fetchSmsSettings = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/bb54464a-6920-42d2-ab5d-e72077bc0c94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Settings.tsx:1446',message:'fetchSmsSettings called',data:{hasToken:!!localStorage.getItem('token')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    try {
      setLoading(true);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bb54464a-6920-42d2-ab5d-e72077bc0c94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Settings.tsx:1449',message:'Calling getSmsSettings API',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const settings = await smsApi.getSmsSettings();
      console.log('[Notifications] Loaded settings:', settings);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bb54464a-6920-42d2-ab5d-e72077bc0c94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Settings.tsx:1451',message:'getSmsSettings API call succeeded',data:{settingsCount:settings.length,settings:settings},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const settingsMap: Record<SmsEventType, SmsSettings | null> = {
        low_stock: null,
        expiry_alert: null,
        payment_due: null,
        new_order: null,
      };
      settings.forEach((setting) => {
        settingsMap[setting.event_type] = setting;
      });
      setSmsSettings(settingsMap);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bb54464a-6920-42d2-ab5d-e72077bc0c94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Settings.tsx:1460',message:'fetchSmsSettings completed successfully',data:{settingsMap},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bb54464a-6920-42d2-ab5d-e72077bc0c94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Settings.tsx:1462',message:'fetchSmsSettings error caught',data:{errorMessage:error instanceof Error?error.message:String(error),errorStatus:(error as any)?.response?.status,errorData:(error as any)?.response?.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      logger.error('Failed to fetch SMS settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (eventType: SmsEventType, enabled: boolean) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/bb54464a-6920-42d2-ab5d-e72077bc0c94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Settings.tsx:1482',message:'handleToggle called',data:{eventType,enabled,hasToken:!!localStorage.getItem('token')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Store previous state for potential rollback
    const previousSetting = smsSettings[eventType];

    // Optimistic UI update - update state immediately
    setSmsSettings((prev) => {
      const currentSetting = prev[eventType];
      return {
        ...prev,
        [eventType]: currentSetting
          ? { ...currentSetting, enabled }
          : {
              id: `temp-${Date.now()}`,
              user_id: '',
              role: 'sales_rep',
              event_type: eventType,
              enabled,
              delivery_mode: 'immediate',
              recipients: ['admins'],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
      };
    });

    // Clear existing debounce timer for this event type
    if (debounceTimers.current[eventType]) {
      clearTimeout(debounceTimers.current[eventType]!);
    }

    // Set saving state
    setSavingStates((prev) => ({ ...prev, [eventType]: true }));

    // Debounce API call (300ms)
    debounceTimers.current[eventType] = setTimeout(async () => {
      try {
        // Get current state from ref (always up-to-date)
        const currentSetting = settingsRef.current[eventType];
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/bb54464a-6920-42d2-ab5d-e72077bc0c94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Settings.tsx:1505',message:'Debounced API call starting',data:{eventType,enabled,hasCurrentSetting:!!currentSetting,deliveryMode:currentSetting?.delivery_mode,recipients:currentSetting?.recipients},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        const updateData: SmsSettingsCreate = {
          event_type: eventType,
          enabled,
          delivery_mode: currentSetting?.delivery_mode || 'immediate',
          recipients: currentSetting?.recipients || ['admins'],
        };
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/bb54464a-6920-42d2-ab5d-e72077bc0c94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Settings.tsx:1512',message:'Calling updateSmsSettings API',data:{updateData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion

        const updated = await smsApi.updateSmsSettings(updateData);
        console.log('[Notifications] Updated setting:', eventType, updated);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/bb54464a-6920-42d2-ab5d-e72077bc0c94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Settings.tsx:1517',message:'updateSmsSettings API call succeeded',data:{eventType,updated},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        
        // Update with server response
        setSmsSettings((prev) => ({
          ...prev,
          [eventType]: updated,
        }));
      } catch (error) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/bb54464a-6920-42d2-ab5d-e72077bc0c94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Settings.tsx:1524',message:'handleToggle error caught',data:{eventType,enabled,errorMessage:error instanceof Error?error.message:String(error),errorStatus:(error as any)?.response?.status,errorData:(error as any)?.response?.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
        // #endregion
        
        // Revert optimistic update on error
        setSmsSettings((prev) => ({
          ...prev,
          [eventType]: previousSetting,
        }));
        
        logger.error(`Failed to update SMS setting for ${eventType}:`, error);
        alert(`Failed to update ${eventTypes.find((e) => e.type === eventType)?.label || eventType}. Please try again.`);
      } finally {
        setSavingStates((prev) => ({ ...prev, [eventType]: false }));
      }
    }, 300);
  };

  const handleDeliveryModeChange = async (eventType: SmsEventType, mode: SmsDeliveryMode) => {
    console.log('[Notifications] delivery_mode click:', eventType, mode);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/bb54464a-6920-42d2-ab5d-e72077bc0c94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Settings.tsx:1592',message:'handleDeliveryModeChange called',data:{eventType,mode,hasToken:!!localStorage.getItem('token')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Store previous state for potential rollback
    const previousSetting = smsSettings[eventType];
    
    // Optimistic UI update - update state immediately
    setSmsSettings((prev) => {
      const currentSetting = prev[eventType];
      if (!currentSetting) {
        // If no setting exists, create a temporary one
        return {
          ...prev,
          [eventType]: {
            id: `temp-${Date.now()}`,
            user_id: '',
            role: 'sales_rep',
            event_type: eventType,
            enabled: true,
            delivery_mode: mode,
            recipients: ['admins'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        };
      }
      return {
        ...prev,
        [eventType]: { ...currentSetting, delivery_mode: mode },
      };
    });

    // Set saving state
    setSavingStates((prev) => ({ ...prev, [eventType]: true }));

    try {
      const currentSetting = smsSettings[eventType];
      const updateData: SmsSettingsCreate = {
        event_type: eventType,
        enabled: currentSetting?.enabled ?? true,
        delivery_mode: mode,
        recipients: currentSetting?.recipients || ['admins'],
      };
      
      console.log('[Notifications] PUT payload:', updateData);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bb54464a-6920-42d2-ab5d-e72077bc0c94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Settings.tsx:1615',message:'Calling updateSmsSettings for delivery_mode',data:{updateData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      const updated = await smsApi.updateSmsSettings(updateData);
      console.log('[Notifications] PUT success:', updated);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bb54464a-6920-42d2-ab5d-e72077bc0c94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Settings.tsx:1620',message:'updateSmsSettings for delivery_mode succeeded',data:{eventType,mode,updated},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      // Update with server response
      setSmsSettings((prev) => ({
        ...prev,
        [eventType]: updated,
      }));
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/bb54464a-6920-42d2-ab5d-e72077bc0c94',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Settings.tsx:1628',message:'handleDeliveryModeChange error caught',data:{eventType,mode,errorMessage:error instanceof Error?error.message:String(error),errorStatus:(error as any)?.response?.status,errorData:(error as any)?.response?.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      
      // Revert optimistic update on error
      setSmsSettings((prev) => ({
        ...prev,
        [eventType]: previousSetting,
      }));
      
      logger.error(`Failed to update delivery mode for ${eventType}:`, error);
      alert(`Failed to update delivery mode. Please try again.`);
    } finally {
      setSavingStates((prev) => ({ ...prev, [eventType]: false }));
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">SMS Notification Settings</h3>
        <p className="text-slate-500">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-3">
      <h3 className="text-lg font-semibold text-slate-900">SMS Notification Settings</h3>
      <p className="text-sm text-slate-500 mb-4">
        Configure SMS notifications for different events. Notifications are sent via mimsms.com.
      </p>

      <div className="space-y-3">
        {eventTypes.map((event) => {
          const setting = smsSettings[event.type];
          const enabled = setting?.enabled ?? false;
          const isSaving = savingStates[event.type];

          return (
            <div key={event.type} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{event.label}</p>
                    {isSaving && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <span className="inline-block w-2 h-2 bg-primary-600 rounded-full animate-pulse"></span>
                        Saving...
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">{event.description}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={enabled}
                    disabled={isSaving}
                    onChange={(e) => handleToggle(event.type, e.target.checked)}
                  />
                  <div className={`w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 ${isSaving ? 'opacity-50' : ''}`}></div>
                </label>
              </div>

              {enabled && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Delivery Mode
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeliveryModeChange(event.type, 'immediate')}
                      disabled={isSaving}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        setting?.delivery_mode === 'immediate'
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                      } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Immediate
                    </button>
                    <button
                      onClick={() => handleDeliveryModeChange(event.type, 'queued')}
                      disabled={isSaving}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        setting?.delivery_mode === 'queued'
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                      } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Queued
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {setting?.delivery_mode === 'immediate'
                      ? 'SMS will be sent immediately when event occurs'
                      : 'SMS will be added to queue and sent in batches'}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
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

// Categories Settings Component (unused - using CategoryManagement instead)
// This commented code was causing syntax errors - removed duplicate/orphaned code
