import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bell, Search, User, X } from 'lucide-react';
import { OnlineStatusBadge } from '@/components/OfflineIndicator';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [localSearch, setLocalSearch] = useState(searchParams.get('q') || '');

  useEffect(() => {
    setLocalSearch(searchParams.get('q') || '');
  }, [searchParams]);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set('q', value);
    } else {
      newParams.delete('q');
    }
    setSearchParams(newParams);
  };

  const clearSearch = () => {
    setLocalSearch('');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('q');
    setSearchParams(newParams);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
        <OnlineStatusBadge />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex items-center">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
          <input
            type="text"
            placeholder="Search..."
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-10 pl-10 pr-8 bg-slate-100 border-0 rounded-lg w-48 md:w-64 lg:w-80 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all duration-200"
          />
          {localSearch && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button className="relative h-10 w-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200">
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
