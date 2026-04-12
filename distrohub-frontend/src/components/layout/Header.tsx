import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, RefreshCw, Search, Settings, FileText, User, X, Menu } from 'lucide-react';
import { OnlineStatusBadge } from '@/components/OfflineIndicator';
import { useOffline } from '@/contexts/OfflineContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSidebar, SidebarTrigger } from '@/components/layout/Sidebar';
import { cn } from '@/lib/utils';
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

  // Read logged-in user info from localStorage
  const currentUser = useMemo(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) return JSON.parse(stored);
    } catch { }
    return { name: 'Admin User', email: 'admin@distrohub.com', role: 'admin' };
  }, []);

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
    <header className="h-16 bg-background/80 backdrop-blur-xl border-b border-border sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 transition-all duration-300">
      {/* Left: Mobile menu trigger, Title and Online Badge */}
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <SidebarTrigger />
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
          <h2 className="text-xl lg:text-2xl font-semibold text-foreground leading-none tracking-tight text-balance">
            {t(`common.${title.toLowerCase().replace(/ /g, '_')}`) || title}
          </h2>
          <div className="flex items-center gap-2">
            <OnlineStatusBadge />
            {pendingSyncCount > 0 && (
              <button
                onClick={syncData}
                disabled={!isOnline || isSyncing}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
                  'text-xs font-medium transition-all duration-200',
                  'bg-primary/10 text-primary border border-primary/20',
                  'hover:bg-primary/20 disabled:opacity-50',
                  'focus-ring'
                )}
                title={t('common.sync')}
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isSyncing && 'animate-spin')} />
                <span className="hidden sm:inline">{t('common.sync')}</span>
                <span>({pendingSyncCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right: Search, Notification, User Profile */}
      <div className="flex items-center gap-2 lg:gap-4">
        {/* Search Bar - Hidden on small mobile */}
        <div className="hidden sm:block relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10 transition-colors group-focus-within:text-primary" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={t('common.search_placeholder')}
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={cn(
              'h-10 py-2.5 pl-10 pr-8 rounded-lg',
              'w-40 md:w-56 lg:w-72',
              'text-sm text-foreground placeholder:text-muted-foreground',
              'bg-muted/50 border border-border',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background focus:border-primary',
              'transition-all duration-200'
            )}
          />
          {localSearch ? (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex items-center pointer-events-none">
              <kbd className={cn(
                'h-5 px-1.5 rounded border border-border bg-background',
                'text-[10px] font-medium text-muted-foreground',
                'flex items-center opacity-70 group-focus-within:hidden'
              )}>
                Ctrl K
              </kbd>
            </div>
          )}
        </div>

        {/* Mobile search button */}
        <button
          onClick={() => searchInputRef.current?.focus()}
          className={cn(
            'sm:hidden flex items-center justify-center w-10 h-10 rounded-lg',
            'text-muted-foreground hover:text-foreground hover:bg-accent',
            'transition-colors duration-200 focus-ring'
          )}
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Notification Bell */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                'relative h-10 w-10 flex items-center justify-center rounded-lg',
                'text-muted-foreground hover:text-foreground hover:bg-accent',
                'transition-all duration-200 focus-ring group'
              )}
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full ring-2 ring-background" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 shadow-xl border-border rounded-xl overflow-hidden">
            <div className="bg-muted/50 border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">{t('common.notifications')}</p>
              <p className="text-xs text-muted-foreground">You have new alerts</p>
            </div>
            <div className="p-1 max-h-[400px] overflow-y-auto custom-scrollbar">
              <Link
                to="/expiry"
                className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent group"
              >
                <div className="mt-1.5 h-2 w-2 rounded-full bg-destructive flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">Low Stock Alert</p>
                  <p className="text-xs text-muted-foreground mt-0.5">5 items are below reorder level</p>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium flex-shrink-0">Recently</span>
              </Link>
              <Link
                to="/inventory"
                className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent group"
              >
                <div className="mt-1.5 h-2 w-2 rounded-full bg-chart-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">Expiry Warning</p>
                  <p className="text-xs text-muted-foreground mt-0.5">3 batches expiring within 30 days</p>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium flex-shrink-0">1h ago</span>
              </Link>
              <Separator className="my-1" />
              <div className="px-4 py-2 text-center">
                <Link to="/reports" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                  View all notifications
                </Link>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              'flex items-center gap-2 pl-2 lg:pl-3 py-1.5 pr-2 rounded-lg',
              'hover:bg-accent transition-colors focus-ring group',
              'border-l border-border'
            )}>
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                'bg-gradient-to-br from-primary to-primary/80',
                'shadow-sm transition-shadow group-hover:shadow-md'
              )}>
                {currentUser?.name ? (
                  <span className="text-sm font-bold text-primary-foreground">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <User className="w-4 h-4 text-primary-foreground" />
                )}
              </div>
              <div className="hidden lg:flex flex-col items-start leading-tight">
                <span className="text-sm font-semibold text-foreground">{currentUser.name || 'Admin'}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  {currentUser.role || t('common.administrator')}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground hidden lg:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-1 shadow-xl border-border rounded-xl">
            <DropdownMenuLabel className="px-3 py-2">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none">{currentUser.name || 'Admin User'}</p>
                <p className="text-xs leading-none text-muted-foreground">{currentUser.email || 'admin@distrohub.com'}</p>
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
            <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t('common.logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
