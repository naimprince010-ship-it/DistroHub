import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import {
  User,
  UserCircle,
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
  ChevronDown,
} from 'lucide-react';
import api from '@/lib/api';
import { logger } from '@/lib/logger';
import * as smsApi from '@/lib/smsApi';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
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
  const { t } = useLanguage();
  const tabFromUrl = searchParams.get('tab') || 'suppliers';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  // Sync activeTab with URL on mount and when URL changes
  useEffect(() => {
    const urlTab = searchParams.get('tab') || 'suppliers';
    setActiveTab(urlTab);
  }, [searchParams]);

  const tabs = useMemo(
    () => [
      { id: 'suppliers', label: t('common.suppliers'), icon: Truck },
      { id: 'categories', label: t('common.categories'), icon: Tags },
      { id: 'units', label: t('common.units'), icon: Ruler },
      { id: 'market-routes', label: t('common.routes'), icon: MapPin },
      { id: 'sales-reps', label: t('common.sales_reps'), icon: User },
      { id: 'profile', label: t('common.profile'), icon: UserCircle },
      { id: 'business', label: t('common.business'), icon: Building },
      { id: 'notifications', label: t('common.notifications'), icon: Bell },
      { id: 'security', label: t('common.security'), icon: Shield },
      { id: 'appearance', label: t('settings.appearance'), icon: Palette },
    ],
    [t]
  );

  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      setSearchParams({ tab: tabId });
    },
    [setSearchParams]
  );

  return (
    <div className="min-h-screen">
      <Header title={t('settings.title')} />

      <div className="p-3 md:p-4 max-w-[1600px] mx-auto">
        <p className="text-sm text-slate-600 mb-3">{t('settings.subtitle')}</p>
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div
            className="border-b border-slate-200 bg-slate-50/80"
            role="tablist"
            aria-label={t('settings.tabs_aria')}
          >
            <div className="flex gap-0 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent px-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex shrink-0 items-center gap-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${activeTab === tab.id
                    ? 'text-primary-600 border-primary-600 bg-white'
                    : 'text-slate-500 border-transparent hover:text-slate-800 hover:bg-white/60'
                    }`}
                >
                  <tab.icon className="w-4 h-4 shrink-0 opacity-90" aria-hidden />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 md:p-4">
            {activeTab === 'suppliers' && <SupplierManagement />}
            {activeTab === 'categories' && <CategoryManagement />}
            {activeTab === 'units' && <UnitManagement />}
            {activeTab === 'market-routes' && <MarketRouteManagement />}
            {activeTab === 'sales-reps' && <SalesRepManagement />}
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
  const { t } = useLanguage();
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
        setError(error?.response?.data?.detail || error?.message || t('settings.load_failed'));
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
      alert(t('settings.required_supplier'));
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
      const errorMessage = error?.response?.data?.detail || error?.message || t('settings.save_failed');
      setError(errorMessage);
      alert(`${t('settings.save_failed')}: ${errorMessage}`);
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
        const errorMessage = deleteError?.response?.data?.detail || deleteError?.message || t('settings.delete_failed');
        alert(`${t('settings.delete_failed')}: ${errorMessage}`);
        return;
      }

      setDeleteConfirm(null);
    } catch (error: any) {
      console.error('[SupplierManagement] Failed to delete supplier:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || t('settings.delete_failed');
      alert(`${t('settings.delete_failed')}: ${errorMessage}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{t('settings.supplier_title')}</h3>
        </div>
        <div className="text-center py-8 text-slate-500">{t('settings.supplier_loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">{t('settings.supplier_title')}</h3>
        <button onClick={() => { setShowModal(true); setEditingSupplier(null); setFormData({ name: '', phone: '', address: '', company: '' }); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t('settings.supplier_add')}
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
          placeholder={t('settings.supplier_search_ph')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left p-2 font-medium text-slate-600">{t('settings.table_name')}</th>
              <th className="text-left p-2 font-medium text-slate-600">{t('settings.table_contact')}</th>
              <th className="text-left p-2 font-medium text-slate-600">{t('settings.table_phone')}</th>
              <th className="text-left p-2 font-medium text-slate-600">{t('settings.table_address')}</th>
              <th className="text-left p-2 font-medium text-slate-600">{t('settings.table_actions')}</th>
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
          <div className="text-center py-8 text-slate-500">{t('settings.supplier_none')}</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">{editingSupplier ? t('settings.supplier_modal_edit') : t('settings.supplier_modal_add')}</h4>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.field_supplier_name')} *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder={t('settings.field_supplier_name_ph')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.field_company')} *</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="input-field"
                  placeholder={t('settings.field_company_ph')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.field_phone')} *</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field"
                  placeholder={t('settings.field_phone_ph')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.field_address')}</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input-field"
                  rows={2}
                  placeholder={t('settings.field_address_ph')}
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
                  {t('products.cancel')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!formData.name || !formData.phone || isSubmitting}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {isSubmitting ? t('settings.saving') : editingSupplier ? t('settings.supplier_modal_edit') : t('settings.supplier_modal_add')}
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
                <h4 className="font-semibold text-slate-900">{t('settings.delete_supplier_title')}</h4>
                <p className="text-sm text-slate-500">{t('settings.delete_supplier_body')}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">{t('products.cancel')}</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 flex-1">{t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SalesRep {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'sales_rep';
  created_at: string;
}

function SalesRepManagement() {
  const { t } = useLanguage();
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRep, setEditingRep] = useState<SalesRep | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ name: string; email: string; phone: string; password: string }>({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSalesReps();
  }, []);

  const fetchSalesReps = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('[SalesRepManagement] No token found, skipping fetch');
      setSalesReps([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/users');
      if (response.data && Array.isArray(response.data)) {
        // Filter only sales_rep role
        const reps = response.data.filter((u: any) => u.role === 'sales_rep');
        setSalesReps(reps);
      }
    } catch (error: any) {
      console.error('[SalesRepManagement] Failed to fetch sales reps:', error);
      setError(error?.response?.data?.detail || error?.message || t('settings.load_failed'));
      setSalesReps([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredReps = useMemo(() => {
    return salesReps.filter(rep =>
      rep.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rep.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (rep.phone && rep.phone.includes(searchTerm))
    );
  }, [salesReps, searchTerm]);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!formData.name || !formData.name.trim() || !formData.email || !formData.email.trim()) {
      alert(t('settings.required_sales_rep'));
      return;
    }

    if (!editingRep && !formData.password) {
      alert(t('settings.required_sales_rep_password'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (editingRep) {
        // Update existing
        const payload: any = {
          name: formData.name.trim(),
          email: formData.email.trim(),
        };
        if (formData.phone) payload.phone = formData.phone.trim();
        if (formData.password) payload.password = formData.password;

        await api.put(`/api/users/${editingRep.id}`, payload);
      } else {
        // Create new
        const payload = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone?.trim() || null,
          password: formData.password,
          role: 'sales_rep' as const,
        };

        await api.post('/api/users', payload);
      }

      await fetchSalesReps();
      setShowModal(false);
      setEditingRep(null);
      setFormData({ name: '', email: '', phone: '', password: '' });
    } catch (error: any) {
      console.error('[SalesRepManagement] Failed to save sales rep:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || t('settings.save_failed');
      setError(errorMessage);
      alert(`${t('settings.save_failed')}: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (rep: SalesRep) => {
    setEditingRep(rep);
    setFormData({
      name: rep.name,
      email: rep.email,
      phone: rep.phone || '',
      password: ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/users/${id}`);
      await fetchSalesReps();
      setDeleteConfirm(null);
    } catch (error: any) {
      console.error('[SalesRepManagement] Failed to delete sales rep:', error);
      const errorMessage = error?.response?.data?.detail || error?.message || t('settings.delete_failed');
      alert(`${t('settings.delete_failed')}: ${errorMessage}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{t('settings.sales_rep_title')}</h3>
        </div>
        <div className="text-center py-8 text-slate-500">{t('settings.sales_rep_loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">{t('settings.sales_rep_title')}</h3>
        <button
          onClick={() => {
            setShowModal(true);
            setEditingRep(null);
            setFormData({ name: '', email: '', phone: '', password: '' });
            setError(null);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t('settings.sales_rep_add')}
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
          placeholder={t('settings.sales_rep_search_ph')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left p-2 font-medium text-slate-600">{t('settings.table_name')}</th>
              <th className="text-left p-2 font-medium text-slate-600">{t('settings.table_email')}</th>
              <th className="text-left p-2 font-medium text-slate-600">{t('settings.table_phone')}</th>
              <th className="text-left p-2 font-medium text-slate-600">{t('settings.table_actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredReps.map((rep) => (
              <tr key={rep.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary-600" />
                    </div>
                    <span className="font-medium text-slate-900">{rep.name}</span>
                  </div>
                </td>
                <td className="p-2 text-slate-600">{rep.email}</td>
                <td className="p-2 text-slate-600">{rep.phone || '-'}</td>
                <td className="p-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(rep)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-600"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(rep.id)}
                      className="p-1 hover:bg-red-50 rounded text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredReps.length === 0 && !loading && (
          <div className="text-center py-8 text-slate-500">{t('settings.sales_rep_none')}</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">{editingRep ? t('settings.sales_rep_modal_edit') : t('settings.sales_rep_modal_add')}</h4>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingRep(null);
                  setFormData({ name: '', email: '', phone: '', password: '' });
                  setError(null);
                }}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.field_full_name')} *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder={t('settings.field_name_ph')}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.field_email')} *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field"
                  placeholder={t('settings.field_email_ph')}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.table_phone')}</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field"
                  placeholder={t('settings.field_phone_ph')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('settings.field_password')} {editingRep ? t('settings.field_password_edit_hint') : '*'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-field"
                  placeholder={editingRep ? t('settings.field_password_new_ph') : t('settings.field_password_create_ph')}
                  required={!editingRep}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingRep(null);
                    setFormData({ name: '', email: '', phone: '', password: '' });
                    setError(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  {t('products.cancel')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!formData.name || !formData.email || (!editingRep && !formData.password) || isSubmitting}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {isSubmitting ? t('settings.saving') : editingRep ? t('settings.sales_rep_modal_edit') : t('settings.sales_rep_modal_add')}
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
                <h4 className="font-semibold text-slate-900">{t('settings.delete_sales_rep_title')}</h4>
                <p className="text-sm text-slate-500">{t('settings.delete_sales_rep_body')}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">{t('products.cancel')}</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 flex-1">{t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryManagement() {
  const { t } = useLanguage();
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
        alert(t('dashboard.error_cold_start'));
      } else if (error.isNetworkError || error.code === 'ERR_NETWORK') {
        alert(t('dashboard.error_network'));
      } else {
        alert(`${t('settings.load_failed')}: ${error.response?.data?.detail || error.message || ''}`);
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
      alert(t('settings.required_category_name'));
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

      alert(`${t('settings.save_failed')}: ${errorMessage}`);
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
          <h3 className="text-lg font-semibold text-slate-900">{t('settings.category_title')}</h3>
        </div>
        <div className="text-center py-8 text-slate-500">{t('settings.category_loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">{t('settings.category_title')}</h3>
        <button onClick={() => { setShowModal(true); setEditingCategory(null); setFormData({ name: '', description: '', color: '#4F46E5' }); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t('settings.category_add')}
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder={t('settings.category_search_ph')}
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
                  <p className="text-xs text-slate-500">{category.product_count} {t('settings.products_suffix')}</p>
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
        <div className="text-center py-8 text-slate-500">{t('settings.category_none')}</div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">{editingCategory ? t('settings.category_modal_edit') : t('settings.category_modal_add')}</h4>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.field_category_name')} *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder={t('settings.field_category_name_ph')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.field_description')}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  rows={2}
                  placeholder={t('settings.field_description_ph')}
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
                  {t('products.cancel')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!formData.name}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {editingCategory ? t('settings.category_modal_edit') : t('settings.category_modal_add')}
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
                <h4 className="font-semibold text-slate-900">{t('settings.delete_category_title')}</h4>
                <p className="text-sm text-slate-500">{t('settings.delete_category_body')}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">{t('products.cancel')}</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 flex-1">{t('common.delete')}</button>
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

interface MarketRoute {
  id: string;
  name: string;
  sub_area?: string | null;
  market_day?: string | null;
  notes?: string | null;
  created_at: string;
}

function MarketRouteManagement() {
  const { t } = useLanguage();
  const [routes, setRoutes] = useState<MarketRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<MarketRoute | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', sub_area: '', market_day: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMarketRoutes();
  }, []);

  const fetchMarketRoutes = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setRoutes([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/market-routes');
      setRoutes(response.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || t('settings.load_failed'));
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRoutes = useMemo(() => {
    return routes.filter((route) =>
      route.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (route.sub_area || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (route.market_day || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [routes, searchTerm]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert(t('settings.required_route_name'));
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    const payload = {
      name: formData.name.trim(),
      sub_area: formData.sub_area.trim() || null,
      market_day: formData.market_day.trim() || null,
      notes: formData.notes.trim() || null,
    };

    try {
      if (editingRoute) {
        await api.put(`/api/market-routes/${editingRoute.id}`, payload);
      } else {
        await api.post('/api/market-routes', payload);
      }
      await fetchMarketRoutes();
      setShowModal(false);
      setEditingRoute(null);
      setFormData({ name: '', sub_area: '', market_day: '', notes: '' });
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.message || t('settings.save_failed');
      setError(message);
      alert(`${t('settings.save_failed')}: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (route: MarketRoute) => {
    setEditingRoute(route);
    setFormData({
      name: route.name,
      sub_area: route.sub_area || '',
      market_day: route.market_day || '',
      notes: route.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/market-routes/${id}`);
      await fetchMarketRoutes();
      setDeleteConfirm(null);
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.message || t('settings.delete_failed');
      alert(`${t('settings.delete_failed')}: ${message}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{t('settings.route_title')}</h3>
        </div>
        <div className="text-center py-8 text-slate-500">{t('settings.route_loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">{t('settings.route_title')}</h3>
        <button
          onClick={() => {
            setEditingRoute(null);
            setFormData({ name: '', sub_area: '', market_day: '', notes: '' });
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t('settings.route_add')}
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
          placeholder={t('settings.route_search_ph')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left p-2 font-medium text-slate-600">{t('settings.table_route')}</th>
              <th className="text-left p-2 font-medium text-slate-600">{t('settings.table_subarea')}</th>
              <th className="text-left p-2 font-medium text-slate-600">{t('settings.table_market_day')}</th>
              <th className="text-left p-2 font-medium text-slate-600">{t('settings.table_actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filteredRoutes.map((route) => (
              <tr key={route.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-primary-600" />
                    </div>
                    <span className="font-medium text-slate-900">{route.name}</span>
                  </div>
                </td>
                <td className="p-2 text-slate-600">{route.sub_area || '-'}</td>
                <td className="p-2 text-slate-600">{route.market_day || '-'}</td>
                <td className="p-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(route)}
                      className="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(route.id)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredRoutes.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-slate-500">
                  {t('settings.route_none')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-2 animate-fade-in">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                {editingRoute ? t('settings.route_modal_edit') : t('settings.route_modal_add')}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.field_route_name')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.field_subarea')}</label>
                  <input
                    type="text"
                    value={formData.sub_area}
                    onChange={(e) => setFormData({ ...formData, sub_area: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.field_market_day')}</label>
                  <input
                    type="text"
                    value={formData.market_day}
                    onChange={(e) => setFormData({ ...formData, market_day: e.target.value })}
                    className="input-field"
                    placeholder={t('settings.field_market_day_ph')}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.field_notes')}</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field min-h-[80px]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  {t('products.cancel')}
                </button>
                <button type="button" onClick={handleSubmit} className="btn-primary" disabled={isSubmitting}>
                  {editingRoute ? t('settings.route_modal_edit') : t('settings.route_modal_add')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('settings.delete_route_title')}</h3>
            <p className="text-slate-600 mb-4">{t('settings.delete_route_body')}</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">{t('products.cancel')}</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 flex-1">{t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UnitManagement() {
  const { t } = useLanguage();
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
      setError(error?.response?.data?.detail || error?.message || t('settings.load_failed'));
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
      alert(t('settings.required_unit'));
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
      const errorMessage = error?.response?.data?.detail || error?.message || t('settings.save_failed');
      setError(errorMessage);
      alert(`${t('settings.save_failed')}: ${errorMessage}`);
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
      const errorMessage = error?.response?.data?.detail || error?.message || t('settings.delete_failed');
      alert(`${t('settings.delete_failed')}: ${errorMessage}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{t('settings.unit_title')}</h3>
        </div>
        <div className="text-center py-8 text-slate-500">{t('settings.unit_loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">{t('settings.unit_title')}</h3>
        <button onClick={() => { setShowModal(true); setEditingUnit(null); setFormData({ name: '', abbreviation: '', description: '' }); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t('settings.unit_add')}
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
          placeholder={t('settings.unit_search_ph')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left p-2 font-medium text-slate-600">{t('settings.table_unit_name')}</th>
              <th className="text-left p-2 font-medium text-slate-600">{t('settings.table_abbr')}</th>
              <th className="text-left p-2 font-medium text-slate-600">{t('settings.table_desc')}</th>
              <th className="text-left p-2 font-medium text-slate-600">{t('settings.table_actions')}</th>
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
          <div className="text-center py-8 text-slate-500">{t('settings.unit_none')}</div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">{editingUnit ? t('settings.unit_modal_edit') : t('settings.unit_modal_add')}</h4>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.field_unit_name')} *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder={t('settings.field_unit_name_ph')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.field_abbr')} *</label>
                <input
                  type="text"
                  value={formData.abbreviation}
                  onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                  className="input-field"
                  placeholder={t('settings.field_abbr_ph')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.field_description')}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  rows={2}
                  placeholder={t('settings.field_unit_desc_ph')}
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
                  {t('products.cancel')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!formData.name || !formData.abbreviation || isSubmitting}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {isSubmitting ? t('settings.saving') : editingUnit ? t('settings.unit_modal_edit') : t('settings.unit_modal_add')}
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
                <h4 className="font-semibold text-slate-900">{t('settings.delete_unit_title')}</h4>
                <p className="text-sm text-slate-500">{t('settings.delete_unit_body')}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">{t('products.cancel')}</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 flex-1">{t('common.delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileSettings() {
  const { t } = useLanguage();
  const currentUser = useMemo(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) return JSON.parse(stored);
    } catch { }
    return { name: 'Admin User', email: 'admin@distrohub.com', role: 'Administrator' };
  }, []);

  return (
    <div className="max-w-2xl space-y-3">
      <h3 className="text-lg font-semibold text-slate-900">{t('settings.profile_title')}</h3>

      <div className="flex items-center gap-3">
        <div className="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center">
          <User className="w-10 h-10 text-white" />
        </div>
        <button type="button" className="btn-secondary">{t('settings.change_photo')}</button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.field_full_name')}</label>
          <input type="text" className="input-field" defaultValue={currentUser.name || "Admin User"} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.field_email')}</label>
          <input type="email" className="input-field" defaultValue={currentUser.email || "admin@distrohub.com"} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.table_phone')}</label>
          <input type="tel" className="input-field" defaultValue="01712345678" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.profile_role')}</label>
          <input type="text" className="input-field bg-slate-50" defaultValue={currentUser.role || "Administrator"} disabled />
        </div>
      </div>

      <button type="button" className="btn-primary flex items-center gap-2">
        <Save className="w-4 h-4" />
        {t('settings.save_changes')}
      </button>
    </div>
  );
}

function BusinessSettings() {
  const { t } = useLanguage();
  const storageKey = 'distrohub_business_settings';
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    businessName: 'DistroHub Dealership',
    address: '123 Main Street, Dhaka, Bangladesh',
    phone: '01712345678',
    email: 'contact@distrohub.com',
    currency: 'BDT',
    timezone: 'Asia/Dhaka',
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setFormData((prev) => ({
          ...prev,
          ...parsed,
        }));
      }
    } catch (error) {
      console.warn('[BusinessSettings] Failed to load saved settings:', error);
    }
  }, []);

  const handleSave = () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      localStorage.setItem(storageKey, JSON.stringify(formData));
      toast({
        title: t('settings.business_saved_title'),
        description: t('settings.business_saved_desc'),
      });
    } catch (error) {
      console.error('[BusinessSettings] Failed to save settings:', error);
      toast({
        title: t('settings.business_save_failed_title'),
        description: t('settings.business_save_failed_desc'),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-3">
      <h3 className="text-lg font-semibold text-slate-900">{t('settings.business_title')}</h3>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.business_name_label')}</label>
        <input
          type="text"
          className="input-field"
          value={formData.businessName}
          onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.business_address_label')}</label>
        <textarea
          className="input-field"
          rows={3}
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.business_phone_label')}</label>
          <input
            type="tel"
            className="input-field"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.business_email_label')}</label>
          <input
            type="email"
            className="input-field"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.business_currency_label')}</label>
          <select
            className="input-field"
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
          >
            <option value="BDT">BDT (৳)</option>
            <option value="USD">USD ($)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.business_timezone_label')}</label>
          <select
            className="input-field"
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
          >
            <option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
          </select>
        </div>
      </div>

      <button
        className="btn-primary flex items-center gap-2 disabled:opacity-50"
        onClick={handleSave}
        disabled={isSaving}
      >
        <Save className="w-4 h-4" />
        {isSaving ? t('settings.saving') : t('settings.save_changes')}
      </button>
    </div>
  );
}

function NotificationSettings() {
  const { t } = useLanguage();
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

  const eventTypes: { type: SmsEventType; label: string; description: string }[] = useMemo(
    () => [
      { type: 'low_stock', label: t('settings.sms_low_stock'), description: t('settings.sms_low_stock_desc') },
      { type: 'expiry_alert', label: t('settings.sms_expiry'), description: t('settings.sms_expiry_desc') },
      { type: 'payment_due', label: t('settings.sms_payment'), description: t('settings.sms_payment_desc') },
      { type: 'new_order', label: t('settings.sms_new_order'), description: t('settings.sms_new_order_desc') },
    ],
    [t]
  );

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
    try {
      setLoading(true);
      const settings = await smsApi.getSmsSettings();
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
    } catch (error) {
      logger.error('Failed to fetch SMS settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (eventType: SmsEventType, enabled: boolean) => {
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
        const updateData: SmsSettingsCreate = {
          event_type: eventType,
          enabled,
          delivery_mode: currentSetting?.delivery_mode || 'immediate',
          recipients: currentSetting?.recipients || ['admins'],
        };

        const updated = await smsApi.updateSmsSettings(updateData);

        // Update with server response
        setSmsSettings((prev) => ({
          ...prev,
          [eventType]: updated,
        }));
      } catch (error) {
        // Revert optimistic update on error
        setSmsSettings((prev) => ({
          ...prev,
          [eventType]: previousSetting,
        }));

        logger.error(`Failed to update SMS setting for ${eventType}:`, error);
        alert(t('settings.sms_update_failed'));
      } finally {
        setSavingStates((prev) => ({ ...prev, [eventType]: false }));
      }
    }, 300);
  };

  const handleDeliveryModeChange = async (eventType: SmsEventType, mode: SmsDeliveryMode) => {
    try {
      const currentSetting = smsSettings[eventType];
      const updateData: SmsSettingsCreate = {
        event_type: eventType,
        enabled: currentSetting?.enabled ?? true,
        delivery_mode: mode,
        recipients: currentSetting?.recipients || ['admins'],
      };

      await smsApi.updateSmsSettings(updateData);
      await fetchSmsSettings();
    } catch (error) {
      logger.error(`Failed to update delivery mode for ${eventType}:`, error);
      alert(t('settings.sms_mode_failed'));
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">{t('settings.notifications_title')}</h3>
        <p className="text-slate-500">{t('settings.notifications_loading')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-3">
      <h3 className="text-lg font-semibold text-slate-900">{t('settings.notifications_title')}</h3>
      <p className="text-sm text-slate-500 mb-4">
        {t('settings.notifications_intro')}
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
                        {t('settings.saving')}
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
                    {t('settings.delivery_mode')}
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeliveryModeChange(event.type, 'immediate')}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${setting?.delivery_mode === 'immediate'
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                      {t('settings.delivery_immediate')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeliveryModeChange(event.type, 'queued')}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${setting?.delivery_mode === 'queued'
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                      {t('settings.delivery_queued')}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {setting?.delivery_mode === 'immediate'
                      ? t('settings.delivery_immediate_hint')
                      : t('settings.delivery_queued_hint')}
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
  const { t } = useLanguage();
  return (
    <div className="max-w-2xl space-y-3">
      <h3 className="text-lg font-semibold text-slate-900">{t('settings.security_title')}</h3>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.security_current_pw')}</label>
        <input type="password" className="input-field" placeholder={t('settings.ph_current_password')} />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.security_new_pw')}</label>
        <input type="password" className="input-field" placeholder={t('settings.ph_new_password')} />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t('settings.security_confirm_pw')}</label>
        <input type="password" className="input-field" placeholder={t('settings.ph_confirm_password')} />
      </div>

      <button type="button" className="btn-primary flex items-center gap-2">
        <Shield className="w-4 h-4" />
        {t('settings.security_update_pw')}
      </button>

      <div className="pt-3 border-t border-slate-200">
        <h4 className="font-medium text-slate-900 mb-2">{t('settings.security_2fa_title')}</h4>
        <p className="text-sm text-slate-500 mb-2">
          {t('settings.security_2fa_desc')}
        </p>
        <button type="button" className="btn-secondary">{t('settings.security_2fa_enable')}</button>
      </div>
    </div>
  );
}

function AppearanceSettings() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="max-w-2xl space-y-3">
      <h3 className="text-lg font-semibold text-slate-900">{t('settings.appearance')}</h3>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">{t('settings.language')}</label>
        <div className="relative w-48">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as any)}
            className="input-field appearance-none pr-10"
          >
            <option value="en">{t('settings.english')}</option>
            <option value="bn">{t('settings.bengali')}</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        <p className="text-xs text-slate-500 mt-1">{t('settings.select_language')}</p>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <label className="block text-sm font-medium text-slate-700 mb-2">{t('settings.theme')}</label>
        <div className="flex gap-2">
          <button type="button" className="flex-1 p-3 border-2 border-primary-500 rounded-lg bg-white">
            <div className="w-full h-8 bg-white border border-slate-200 rounded mb-2"></div>
            <p className="text-sm font-medium text-center">{t('settings.theme_light')}</p>
          </button>
          <button type="button" className="flex-1 p-3 border-2 border-slate-200 rounded-lg bg-white hover:border-slate-300 transition-colors">
            <div className="w-full h-8 bg-slate-900 rounded mb-2"></div>
            <p className="text-sm font-medium text-center">{t('settings.theme_dark')}</p>
          </button>
          <button type="button" className="flex-1 p-3 border-2 border-slate-200 rounded-lg bg-white hover:border-slate-300 transition-colors">
            <div className="w-full h-8 bg-gradient-to-r from-white to-slate-900 rounded mb-2"></div>
            <p className="text-sm font-medium text-center">{t('settings.theme_system')}</p>
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">{t('settings.accent_color')}</label>
        <div className="flex gap-2">
          <button className="w-10 h-10 bg-primary-500 rounded-lg ring-2 ring-offset-2 ring-primary-500"></button>
          <button className="w-10 h-10 bg-green-500 rounded-lg hover:ring-2 hover:ring-offset-2 hover:ring-green-500 transition-all"></button>
          <button className="w-10 h-10 bg-blue-500 rounded-lg hover:ring-2 hover:ring-offset-2 hover:ring-blue-500 transition-all"></button>
          <button className="w-10 h-10 bg-purple-500 rounded-lg hover:ring-2 hover:ring-offset-2 hover:ring-purple-500 transition-all"></button>
          <button className="w-10 h-10 bg-orange-500 rounded-lg hover:ring-2 hover:ring-offset-2 hover:ring-orange-500 transition-all"></button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">{t('settings.sidebar_position')}</label>
        <select className="input-field w-48">
          <option value="left">{t('settings.sidebar_left')}</option>
          <option value="right">{t('settings.sidebar_right')}</option>
        </select>
      </div>

      <button type="button" className="btn-primary flex items-center gap-2">
        <Save className="w-4 h-4" />
        {t('settings.save_changes')}
      </button>
    </div>
  );
}

// Categories Settings Component (unused - using CategoryManagement instead)
// This commented code was causing syntax errors - removed duplicate/orphaned code
