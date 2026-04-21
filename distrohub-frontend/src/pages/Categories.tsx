import { useState, useEffect, useMemo } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import {
  Plus,
  Edit,
  Trash2,
  X,
  AlertTriangle,
} from 'lucide-react';
import api from '@/lib/api';
import { logger } from '@/lib/logger';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { useTableControls } from '@/hooks/useTableControls';
import { PaginationControls } from '@/components/ui/pagination-controls';

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
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    logger.log('[Categories] Component mounted, fetching categories...');
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      logger.log('[Categories] Fetching categories from API...');
      const response = await api.get('/api/categories');
      logger.log('[Categories] Categories fetched successfully:', response.data);
      setCategories(response.data);
    } catch (error: any) {
      console.error('[Categories] Failed to fetch categories:', error);
      if (error.isTimeout || error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        toast({ title: t('settings.load_failed'), description: t('dashboard.error_cold_start'), variant: 'destructive' });
      } else if (error.isNetworkError || error.code === 'ERR_NETWORK') {
        toast({ title: t('settings.load_failed'), description: t('dashboard.error_network'), variant: 'destructive' });
      } else {
        toast({
          title: t('settings.load_failed'),
          description: error.response?.data?.detail || error.message || '',
          variant: 'destructive',
        });
      }
      setLoadError(t('settings.load_failed'));
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

  const categoriesTable = useTableControls(filteredCategories, {
    initialSortKey: 'name',
    pageSize: 10,
  });

  const handleSubmit = async () => {
    if (isSubmitting) return;

    if (!formData.name || !formData.name.trim()) {
      toast({ title: t('settings.required_category_name'), variant: 'destructive' });
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
      toast({
        title: t('settings.save_failed'),
        description: errorMessage,
        variant: 'destructive',
      });
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
          {loadError ? (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-[hsl(var(--dh-red))]/30 bg-[hsl(var(--dh-red))]/5 px-3 py-2 text-sm text-[hsl(var(--dh-red))]">
              <span>{loadError}</span>
              <button type="button" onClick={() => void fetchCategories()} className="btn-secondary h-8 px-3 text-xs">Retry</button>
            </div>
          ) : null}
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="max-w-sm w-full">
              <input
                type="text"
                placeholder={t('settings.category_search_ph')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
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
              <div className="dh-table-shell">
                <table className="w-full min-w-[780px] text-sm">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">#</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <button type="button" onClick={() => categoriesTable.toggleSort('name')} className="inline-flex items-center gap-1">
                          Category
                          <span className="text-[10px]">{categoriesTable.sortKey === 'name' ? (categoriesTable.sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </button>
                      </th>
                      <th className="hidden px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">Description</th>
                      <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <button type="button" onClick={() => categoriesTable.toggleSort('product_count')} className="ml-auto inline-flex items-center gap-1">
                          Products
                          <span className="text-[10px]">{categoriesTable.sortKey === 'product_count' ? (categoriesTable.sortDirection === 'asc' ? '▲' : '▼') : '↕'}</span>
                        </button>
                      </th>
                      <th className="hidden px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">Created</th>
                      <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {categoriesTable.paginatedRows.map((category, idx) => (
                      <tr key={category.id} className="transition-colors duration-150 ease-out hover:bg-muted/45">
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{(categoriesTable.page - 1) * categoriesTable.pageSize + idx + 1}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-3 rounded-full border border-black/10"
                              style={{ backgroundColor: category.color }}
                              aria-hidden
                            />
                            <span className="font-medium text-foreground">{category.name}</span>
                          </div>
                        </td>
                        <td className="hidden px-3 py-2.5 text-muted-foreground lg:table-cell">
                          {category.description || <span className="text-xs text-muted-foreground/60">No description</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-foreground">
                          {category.product_count}
                        </td>
                        <td className="hidden px-3 py-2.5 text-muted-foreground md:table-cell">
                          {new Date(category.created_at).toLocaleDateString('en-BD')}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEdit(category)}
                              className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
                              title="Edit category"
                              aria-label="Edit category"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(category.id)}
                              className="p-1.5 hover:bg-red-100 rounded text-muted-foreground hover:text-red-500 transition-colors"
                              title="Delete category"
                              aria-label="Delete category"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <PaginationControls
                  page={categoriesTable.page}
                  totalPages={categoriesTable.totalPages}
                  totalRows={categoriesTable.totalRows}
                  onPageChange={categoriesTable.setPage}
                />
              </div>

              {filteredCategories.length === 0 && !loading && (
                <div className="dh-empty-state py-10">
                  <p className="dh-empty-state-title">{t('settings.category_none')}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="dh-modal-overlay">
          <div className="dh-modal-panel w-full max-w-md p-5">
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
                aria-label="Close category modal"
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
        <div className="dh-modal-overlay">
          <div className="dh-modal-panel w-full max-w-sm p-5">
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
