import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Phone,
  MapPin,
  CreditCard,
  User,
  Filter,
  X,
} from 'lucide-react';

interface Retailer {
  id: string;
  name: string;
  shop_name: string;
  phone: string;
  address: string;
  area: string;
  district: string;
  credit_limit: number;
  current_due: number;
}

const initialRetailers: Retailer[] = [
  {
    id: '1',
    name: 'Rahim Uddin',
    shop_name: 'Rahim Store',
    phone: '01712345678',
    address: 'Shop #12, Main Road',
    area: 'Sadar',
    district: 'Dhaka',
    credit_limit: 50000,
    current_due: 15000,
  },
  {
    id: '2',
    name: 'Karim Mia',
    shop_name: 'Karim Traders',
    phone: '01812345678',
    address: 'Market Complex, Shop #5',
    area: 'Mirpur',
    district: 'Dhaka',
    credit_limit: 75000,
    current_due: 32000,
  },
  {
    id: '3',
    name: 'Hasan Ali',
    shop_name: 'Hasan Shop',
    phone: '01912345678',
    address: 'Station Road, Shop #8',
    area: 'Uttara',
    district: 'Dhaka',
    credit_limit: 30000,
    current_due: 8500,
  },
  {
    id: '4',
    name: 'Molla Brothers',
    shop_name: 'Molla Enterprise',
    phone: '01612345678',
    address: 'College Road, Shop #22',
    area: 'Dhanmondi',
    district: 'Dhaka',
    credit_limit: 100000,
    current_due: 45000,
  },
];

export function Retailers() {
  const [retailers, setRetailers] = useState<Retailer[]>(initialRetailers);
  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [dueFilter, setDueFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRetailer, setEditingRetailer] = useState<Retailer | null>(null);

  const areas = [...new Set(retailers.map(r => r.area))];

  const filteredRetailers = retailers.filter((retailer) => {
    const matchesSearch =
      retailer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      retailer.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      retailer.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
      retailer.phone.includes(searchTerm);
    
    const matchesArea = areaFilter === 'all' || retailer.area === areaFilter;
    
    const matchesDue = dueFilter === 'all' ||
      (dueFilter === 'no_due' && retailer.current_due === 0) ||
      (dueFilter === 'has_due' && retailer.current_due > 0) ||
      (dueFilter === 'near_limit' && retailer.current_due > retailer.credit_limit * 0.8) ||
      (dueFilter === 'over_limit' && retailer.current_due > retailer.credit_limit);
    
    return matchesSearch && matchesArea && matchesDue;
  });

  const activeFiltersCount = [areaFilter, dueFilter].filter(f => f !== 'all').length;

  const clearFilters = () => {
    setAreaFilter('all');
    setDueFilter('all');
    setSearchTerm('');
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this retailer?')) {
      setRetailers(retailers.filter((r) => r.id !== id));
    }
  };

  const totalDue = retailers.reduce((sum, r) => sum + r.current_due, 0);

  return (
    <div className="min-h-screen">
      <Header title="Retailers" />

      <div className="p-3">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{retailers.length}</p>
                <p className="text-slate-500 text-sm">Total Retailers</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  ৳ {retailers.reduce((sum, r) => sum + r.credit_limit, 0).toLocaleString()}
                </p>
                <p className="text-slate-500 text-sm">Total Credit Limit</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">৳ {totalDue.toLocaleString()}</p>
                <p className="text-slate-500 text-sm">Total Due</p>
              </div>
            </div>
          </div>
        </div>

                {/* Actions Bar */}
                <div className="bg-white rounded-xl p-2 shadow-sm mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <div className="relative min-w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search retailers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field pl-10"
                      />
                    </div>

                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select
                        value={areaFilter}
                        onChange={(e) => setAreaFilter(e.target.value)}
                        className="input-field pl-10 w-40"
                      >
                        <option value="all">All Areas</option>
                        {areas.map(area => (
                          <option key={area} value={area}>{area}</option>
                        ))}
                      </select>
                    </div>

                    <select
                      value={dueFilter}
                      onChange={(e) => setDueFilter(e.target.value)}
                      className="input-field w-40"
                    >
                      <option value="all">All Due Status</option>
                      <option value="no_due">No Due</option>
                      <option value="has_due">Has Due</option>
                      <option value="near_limit">Near Limit</option>
                      <option value="over_limit">Over Limit</option>
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
                    Add Retailer
                  </button>
                </div>

        {/* Retailers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {filteredRetailers.map((retailer) => (
            <div
              key={retailer.id}
              className="bg-white rounded-xl p-3 shadow-sm card-hover"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{retailer.shop_name}</h3>
                  <p className="text-slate-500 text-sm">{retailer.name}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingRetailer(retailer)}
                    className="p-1 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(retailer.id)}
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 mb-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="w-4 h-4" />
                  <span>{retailer.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="w-4 h-4" />
                  <span>{retailer.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs">
                    {retailer.area}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs">
                    {retailer.district}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between">
                <div>
                  <p className="text-xs text-slate-500">Credit Limit</p>
                  <p className="font-semibold text-slate-900">৳ {retailer.credit_limit.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Current Due</p>
                  <p className={`font-semibold ${retailer.current_due > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ৳ {retailer.current_due.toLocaleString()}
                  </p>
                </div>
              </div>

              {retailer.current_due > retailer.credit_limit * 0.8 && (
                <div className="mt-2 px-2 py-1 bg-red-50 text-red-600 text-xs rounded-lg text-center">
                  Near credit limit!
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredRetailers.length === 0 && (
          <div className="bg-white rounded-xl p-4 text-center text-slate-500">
            No retailers found. Try adjusting your search or add a new retailer.
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingRetailer) && (
        <RetailerModal
          retailer={editingRetailer}
          onClose={() => {
            setShowAddModal(false);
            setEditingRetailer(null);
          }}
          onSave={(retailer) => {
            if (editingRetailer) {
              setRetailers(retailers.map((r) => (r.id === retailer.id ? retailer : r)));
            } else {
              setRetailers([...retailers, { ...retailer, id: `new-${Date.now()}` }]);
            }
            setShowAddModal(false);
            setEditingRetailer(null);
          }}
        />
      )}
    </div>
  );
}

interface RetailerModalProps {
  retailer: Retailer | null;
  onClose: () => void;
  onSave: (retailer: Retailer) => void;
}

function RetailerModal({ retailer, onClose, onSave }: RetailerModalProps) {
  const [formData, setFormData] = useState<Partial<Retailer>>(
    retailer || {
      name: '',
      shop_name: '',
      phone: '',
      address: '',
      area: '',
      district: '',
      credit_limit: 0,
      current_due: 0,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Retailer);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-2 animate-fade-in">
        <div className="p-3 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            {retailer ? 'Edit Retailer' : 'Add New Retailer'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Owner Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Shop Name</label>
              <input
                type="text"
                value={formData.shop_name}
                onChange={(e) => setFormData({ ...formData, shop_name: e.target.value })}
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input-field"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Area</label>
              <input
                type="text"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">District</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="input-field"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Credit Limit (৳)</label>
              <input
                type="number"
                value={formData.credit_limit}
                onChange={(e) => setFormData({ ...formData, credit_limit: Number(e.target.value) })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Current Due (৳)</label>
              <input
                type="number"
                value={formData.current_due}
                onChange={(e) => setFormData({ ...formData, current_due: Number(e.target.value) })}
                className="input-field"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {retailer ? 'Update Retailer' : 'Add Retailer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
