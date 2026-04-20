import { useState, useEffect, useMemo } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import {
  Tags,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  AlertTriangle,
} from 'lucide-react';
import api from '@/lib/api';
import { logger } from '@/lib/logger';
import { useLanguage } from '@/contexts/LanguageContext';

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string;
  product_count: number;
  created_at: string;
}

export function Categories() {
  const { t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', color: '#4F46E5' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    logger.log('[Categories] Component mounted, fetching categories...');
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      logger.log('[Categories] Fetching categories from API...');
      const response = await api.get('/api/categories');
      logger.log('[Categories] Categories fetched successfully:', response.data);
      setCategories(response.data);
    } catch (error: any) {
      console.error('[Categories] Failed to fetch categories:', error);
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

  const filteredCategories = useMemo(() => {
    return categories.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [categories, searchTerm]);

  const handleSubmit = async () => {
    if (isSubmitting) return;

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

      if (editingCategory) {
        await api.put(`/api/categories/${editingCategory.id}`, payload);
      } else {
        await api.post('/api/categories', payload);
      }

      await fetchCategories();
      setShowModal(false);
      setEditingCategory(null);
      setFormData({ name: '', description: '', color: '#4F46E5' });
    } catch (error: any) {
      console.error('[Categories] Failed to save category:', error);
      let errorMessage = 'Failed to save category';
      if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
        errorMessage = 'Request timeout. Please try again.';
      } else if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error?.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      alert(`${t('settings.save_failed')}: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/categories/${id}`);
      await fetchCategories();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  return (
    <PageShell title={t('settings.category_title')} subtitle="Manage your product categories">
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('settings.category_search_ph')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <button
              onClick={() => {
                setShowModal(true);
                setEditingCategory(null);
                setFormData({ name: '', description: '', color: '#4F46E5' });
              }}
              className="btn-primary flex items-center gap-2 ml-3"
            >
              <Plus className="w-4 h-4" />
              {t('settings.category_add')}
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">{t('settings.category_loading')}</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCategories.map((category) => (
                  <div
                    key={category.id}
                    className="bg-muted/40 rounded-lg p-4 hover:shadow-md transition-shadow border border-border"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${category.color}20` }}
                        >
                          <Tags className="w-5 h-5" style={{ color: category.color }} />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{category.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {category.product_count} {t('settings.products_suffix')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(category)}
                          className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(category.id)}
                          className="p-1.5 hover:bg-red-100 rounded text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {category.description && (
                      <p className="text-sm text-muted-foreground mt-2">{category.description}</p>
                    )}
                  </div>
                ))}
              </div>

              {filteredCategories.length === 0 && !loading && (
                <div className="text-center py-12 text-muted-foreground">
                  {t('settings.category_none')}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-5 w-full max-w-md border border-border shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-foreground">
                {editingCategory ? t('settings.category_modal_edit') : t('settings.category_modal_add')}
              </h4>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingCategory(null);
                  setFormData({ name: '', description: '', color: '#4F46E5' });
                }}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('settings.field_category_name')} *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder={t('settings.field_category_name_ph')}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {t('settings.field_description')}
                </label>
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
                  disabled={!formData.name || isSubmitting}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {isSubmitting
                    ? t('settings.saving')
                    : editingCategory
                    ? t('settings.category_modal_edit')
                    : t('settings.category_modal_add')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-5 w-full max-w-sm border border-border shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">{t('settings.delete_category_title')}</h4>
                <p className="text-sm text-muted-foreground">{t('settings.delete_category_body')}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">
                {t('products.cancel')}
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 flex-1 transition-colors"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
