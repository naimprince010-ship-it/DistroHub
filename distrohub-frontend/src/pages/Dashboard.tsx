import { Header } from '@/components/layout/Header';
import {
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const salesData = [
  { name: 'Jan', sales: 4000, collections: 2400 },
  { name: 'Feb', sales: 3000, collections: 1398 },
  { name: 'Mar', sales: 2000, collections: 9800 },
  { name: 'Apr', sales: 2780, collections: 3908 },
  { name: 'May', sales: 1890, collections: 4800 },
  { name: 'Jun', sales: 2390, collections: 3800 },
  { name: 'Jul', sales: 3490, collections: 4300 },
];

const topProducts = [
  { name: 'Akij Flour 1kg', sales: 1250 },
  { name: 'Power Milk 400g', sales: 980 },
  { name: 'Pampers Medium', sales: 850 },
  { name: 'Rice Premium 5kg', sales: 720 },
  { name: 'Sugar 1kg', sales: 650 },
];

const stats = [
  {
    title: 'Total Sales',
    value: '৳ 12,45,000',
    change: '+12.5%',
    trend: 'up',
    icon: TrendingUp,
    color: 'bg-green-500',
  },
  {
    title: 'Total Due',
    value: '৳ 3,25,000',
    change: '-5.2%',
    trend: 'down',
    icon: TrendingDown,
    color: 'bg-red-500',
  },
  {
    title: 'Total Products',
    value: '156',
    change: '+8',
    trend: 'up',
    icon: Package,
    color: 'bg-blue-500',
  },
  {
    title: 'Active Retailers',
    value: '89',
    change: '+3',
    trend: 'up',
    icon: Users,
    color: 'bg-purple-500',
  },
];

const recentOrders = [
  { id: 'ORD-001', retailer: 'Rahim Store', amount: 15000, status: 'delivered' },
  { id: 'ORD-002', retailer: 'Karim Traders', amount: 22500, status: 'pending' },
  { id: 'ORD-003', retailer: 'Hasan Shop', amount: 8750, status: 'confirmed' },
  { id: 'ORD-004', retailer: 'Molla Enterprise', amount: 31000, status: 'delivered' },
  { id: 'ORD-005', retailer: 'Akbar Store', amount: 12000, status: 'pending' },
];

const expiringProducts = [
  { name: 'Power Milk 400g', batch: 'BT-2024-001', expiry: '2025-01-15', qty: 50 },
  { name: 'Akij Flour 1kg', batch: 'BT-2024-002', expiry: '2025-01-20', qty: 30 },
  { name: 'Biscuit Pack', batch: 'BT-2024-003', expiry: '2025-01-25', qty: 100 },
];

export function Dashboard() {
  return (
    <div className="min-h-screen">
      <Header title="Dashboard" />
      
      <div className="p-3">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
          {stats.map((stat) => (
            <div
              key={stat.title}
              className="bg-white rounded-xl p-3 shadow-sm card-hover"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <span
                  className={`flex items-center text-sm font-medium ${
                    stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {stat.change}
                  {stat.trend === 'up' ? (
                    <ArrowUpRight className="w-4 h-4 ml-1" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 ml-1" />
                  )}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
              <p className="text-slate-500 text-sm">{stat.title}</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 mb-3">
          {/* Sales Chart */}
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Sales & Collections</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#64748B" />
                <YAxis stroke="#64748B" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#4F46E5"
                  strokeWidth={2}
                  dot={{ fill: '#4F46E5' }}
                />
                <Line
                  type="monotone"
                  dataKey="collections"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: '#10B981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Top Selling Products</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" stroke="#64748B" />
                <YAxis dataKey="name" type="category" stroke="#64748B" width={100} />
                <Tooltip />
                <Bar dataKey="sales" fill="#4F46E5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {/* Recent Orders */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-2 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Recent Orders</h3>
              <a href="/sales" className="text-primary-500 text-sm font-medium hover:underline">
                View All
              </a>
            </div>
            <div className="divide-y divide-slate-100">
              {recentOrders.map((order) => (
                <div key={order.id} className="p-2 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-medium text-slate-900">{order.id}</p>
                    <p className="text-sm text-slate-500">{order.retailer}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">৳ {order.amount.toLocaleString()}</p>
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                        order.status === 'delivered'
                          ? 'bg-green-100 text-green-700'
                          : order.status === 'confirmed'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expiring Products */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-2 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Expiring Soon
              </h3>
              <a href="/expiry" className="text-primary-500 text-sm font-medium hover:underline">
                View All
              </a>
            </div>
            <div className="divide-y divide-slate-100">
              {expiringProducts.map((product, index) => (
                <div key={index} className="p-2 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-medium text-slate-900">{product.name}</p>
                    <p className="text-sm text-slate-500">Batch: {product.batch}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-orange-600">{product.expiry}</p>
                    <p className="text-sm text-slate-500">{product.qty} units</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
