import { Bell, Search, User } from 'lucide-react';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3">
      <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>

      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 bg-slate-100 border-0 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200"
          />
        </div>

        <button className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="text-sm">
            <p className="font-medium text-slate-900">Admin</p>
            <p className="text-slate-500 text-xs">admin@distrohub.com</p>
          </div>
        </div>
      </div>
    </header>
  );
}
