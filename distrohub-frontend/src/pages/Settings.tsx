import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import {
  User,
  Building,
  Bell,
  Shield,
  Palette,
  Save,
} from 'lucide-react';

export function Settings() {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
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
