import { Header } from '@/components/layout/Header';
import {
  FileText,
  TrendingUp,
  Package,
  AlertTriangle,
  Users,
  DollarSign,
  Download,
  Calendar,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const salesByArea = [
  { name: 'Sadar', sales: 125000 },
  { name: 'Mirpur', sales: 98000 },
  { name: 'Uttara', sales: 87000 },
  { name: 'Dhanmondi', sales: 156000 },
  { name: 'Gulshan', sales: 112000 },
];

const categoryData = [
  { name: 'Flour', value: 35 },
  { name: 'Dairy', value: 25 },
  { name: 'Rice', value: 20 },
  { name: 'Baby Care', value: 12 },
  { name: 'Others', value: 8 },
];

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const reports = [
  {
    title: 'Sales Summary',
    description: 'Daily, weekly, monthly sales report',
    icon: TrendingUp,
    color: 'bg-green-500',
  },
  {
    title: 'Stock Report',
    description: 'Current inventory status',
    icon: Package,
    color: 'bg-blue-500',
  },
  {
    title: 'Expiry Report',
    description: 'Products expiring soon',
    icon: AlertTriangle,
    color: 'bg-orange-500',
  },
  {
    title: 'Due List',
    description: 'Outstanding receivables',
    icon: DollarSign,
    color: 'bg-red-500',
  },
  {
    title: 'Retailer Report',
    description: 'Customer-wise sales analysis',
    icon: Users,
    color: 'bg-purple-500',
  },
  {
    title: 'Collection Report',
    description: 'Payment collection summary',
    icon: FileText,
    color: 'bg-indigo-500',
  },
];

export function Reports() {
  return (
    <div className="min-h-screen">
      <Header title="Reports" />

      <div className="p-3">
        {/* Date Filter */}
        <div className="bg-white rounded-xl p-2 shadow-sm mb-2 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-400" />
          <input type="date" className="input-field w-40" defaultValue="2024-12-01" />
          <span className="text-slate-400">to</span>
          <input type="date" className="input-field w-40" defaultValue="2024-12-31" />
          <button className="btn-primary">Apply Filter</button>
        </div>

        {/* Quick Reports */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
          {reports.map((report) => (
            <div
              key={report.title}
              className="bg-white rounded-xl p-3 shadow-sm card-hover cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-12 h-12 ${report.color} rounded-xl flex items-center justify-center`}>
                    <report.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{report.title}</h3>
                    <p className="text-sm text-slate-500">{report.description}</p>
                  </div>
                </div>
                <button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {/* Sales by Area */}
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Sales by Area</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesByArea}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip formatter={(value) => `৳ ${Number(value).toLocaleString()}`} />
                <Bar dataKey="sales" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sales by Category */}
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Sales by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-2 bg-white rounded-xl p-3 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Monthly Summary (December 2024)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="p-2 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600">Total Sales</p>
              <p className="text-2xl font-bold text-green-700">৳ 12,45,000</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">Total Orders</p>
              <p className="text-2xl font-bold text-blue-700">156</p>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg">
              <p className="text-sm text-orange-600">Collections</p>
              <p className="text-2xl font-bold text-orange-700">৳ 9,20,000</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg">
              <p className="text-sm text-red-600">Outstanding</p>
              <p className="text-2xl font-bold text-red-700">৳ 3,25,000</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
