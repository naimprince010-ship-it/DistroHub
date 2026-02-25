import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, RefreshCw, Search, Settings, FileText, User, X } from 'lucide-react';
import { OnlineStatusBadge } from '@/components/OfflineIndicator';
import { useOffline } from '@/contexts/OfflineContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [localSearch, setLocalSearch] = useState(searchParams.get('q') || '');
  const { pendingSyncCount, syncData, isSyncing, isOnline } = useOffline();
  const { t } = useLanguage();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalSearch(searchParams.get('q') || '');
  }, [searchParams]);

  // Handle Ctrl + K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 flex items-center justify-between px-4 transition-all duration-300">
      {/* Left: Title and Online Badge */}
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-semibold text-slate-900 leading-none tracking-tight">{t(`common.${title.toLowerCase().replace(/ /g, '_')}`) || title}</h2>
        <div className="flex items-center">
          <OnlineStatusBadge />
        </div>
        {pendingSyncCount > 0 && (
          <button
            onClick={syncData}
            disabled={!isOnline || isSyncing}
            className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 shadow-sm transition-all hover:bg-indigo-100 disabled:opacity-50"
            title={t('common.sync')}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {t('common.sync')} ({pendingSyncCount})
          </button>
        )}
      </div>

      {/* Right: Search, Notification, User Profile */}
      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div className="relative flex items-center group focus-within:shadow-md rounded-lg transition-all duration-300">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10 group-focus-within:text-primary-500 transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={t('common.search_placeholder')}
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="h-10 py-2.5 pl-10 pr-8 bg-slate-100 border border-slate-200 rounded-lg w-48 md:w-72 lg:w-96 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white focus:border-primary-500 transition-all duration-200"
          />
          {localSearch ? (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center pointer-events-none">
              <kbd className="h-5 px-1.5 rounded border border-slate-200 bg-white text-[10px] font-medium text-slate-400 flex items-center opacity-70 group-focus-within:hidden">Ctrl K</kbd>
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="relative h-10 w-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-full transition-all duration-200 group"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white animate-pulse"></span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 shadow-xl border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{t('common.notifications')}</p>
              <p className="text-xs text-slate-500">You have new alerts</p>
            </div>
            <div className="p-1 max-h-[400px] overflow-y-auto">
              <Link
                to="/expiry"
                className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-slate-100 group"
              >
                <div className="mt-0.5 h-2 w-2 rounded-full bg-red-500"></div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">Low Stock Alert</p>
                  <p className="text-xs text-slate-500 mt-0.5">5 items are below reorder level</p>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Recently</span>
              </Link>
              <Link
                to="/inventory"
                className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-slate-100 group"
              >
                <div className="mt-0.5 h-2 w-2 rounded-full bg-amber-500"></div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">Expiry Warning</p>
                  <p className="text-xs text-slate-500 mt-0.5">3 batches expiring within 30 days</p>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">1h ago</span>
              </Link>
              <Separator className="my-1" />
              <div className="px-4 py-2 text-center">
                <Link to="/reports" className="text-xs font-medium text-primary-600 hover:text-primary-700">View all notifications</Link>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 pl-2 py-1 pr-1 rounded-full hover:bg-slate-100 transition-colors border-l border-slate-200 focus:outline-none group">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center shadow-sm group-hover:shadow transition-shadow">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:flex flex-col items-start leading-tight">
                <span className="text-sm font-semibold text-slate-900">{t('common.admin')}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{t('common.administrator')}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 mr-1" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1 shadow-xl border-slate-200 rounded-xl">
            <DropdownMenuLabel className="px-3 py-2">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none">Admin User</p>
                <p className="text-xs leading-none text-slate-500">admin@distrohub.com</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>{t('common.settings')}</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/reports" className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4" />
                <span>Operation Log</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t('common.logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
