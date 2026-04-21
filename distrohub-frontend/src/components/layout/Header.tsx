import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, RefreshCw, Search, Settings, FileText, User, X } from 'lucide-react';
import { OnlineStatusBadge } from '@/components/OfflineIndicator';
import { useOffline } from '@/contexts/OfflineContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { SidebarTrigger } from '@/components/layout/Sidebar';
import { cn, fillTemplate } from '@/lib/utils';
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
import api from '@/lib/api';

interface DashboardStatsBrief {
  low_stock_count?: number;
  expiring_soon_count?: number;
}

export function Header() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [localSearch, setLocalSearch] = useState(searchParams.get('q') || '');
  const [alertStats, setAlertStats] = useState<{ low: number; exp: number } | null>(null);
  const [alertStatsLoading, setAlertStatsLoading] = useState(true);
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

  useEffect(() => {
    const token = localStorage.getItem('token')?.trim();
    if (!token) {
      setAlertStats(null);
      setAlertStatsLoading(false);
      return;
    }
    let cancelled = false;
    setAlertStatsLoading(true);
    (async () => {
      try {
        const { data } = await api.get<DashboardStatsBrief>('/api/dashboard/stats');
        if (cancelled) return;
        setAlertStats({
          low: data.low_stock_count ?? 0,
          exp: data.expiring_soon_count ?? 0,
        });
      } catch {
        if (!cancelled) setAlertStats(null);
      } finally {
        if (!cancelled) setAlertStatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasUrgentAlerts =
    alertStats !== null && (alertStats.low > 0 || alertStats.exp > 0);

  const notificationsSubtitle = (() => {
    if (alertStatsLoading) return t('notifications_panel.subtitle_loading');
    if (alertStats === null) return t('notifications_panel.subtitle_unavailable');
    return hasUrgentAlerts
      ? t('notifications_panel.subtitle_has_alerts')
      : t('notifications_panel.subtitle_clear');
  })();

  const detailsHref =
    alertStats && alertStats.exp > 0
      ? '/expiry'
      : alertStats && alertStats.low > 0
        ? '/inventory?filter=low-stock'
        : '/inventory';

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
    <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-border/80 bg-background/82 px-4 backdrop-blur-xl transition-all duration-300 lg:px-6">
      {/* Left: Mobile menu trigger and online/sync status */}
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <SidebarTrigger />
        
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
                'hover:-translate-y-px hover:bg-primary/20 disabled:opacity-50',
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

      {/* Right: Search, Notification, User Profile */}
      <div className="flex items-center gap-2 lg:gap-4">
        {/* Search Bar - Hidden on small mobile */}
        <div className="hidden sm:block relative group">
          <input
            ref={searchInputRef}
            type="text"
            placeholder={t('common.search_placeholder')}
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={cn(
              'h-10 rounded-xl py-2.5 pl-4 pr-16',
              'w-40 md:w-56 lg:w-72',
              'text-sm text-foreground placeholder:text-muted-foreground',
              'bg-card/90 border border-border/80',
              'shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]',
              'focus:outline-none focus:ring-2 focus:ring-ring/40 focus:bg-background focus:border-ring/40',
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
          ) : null}
        </div>

        {/* Mobile search button */}
        <button
          onClick={() => searchInputRef.current?.focus()}
          className={cn(
            'sm:hidden flex items-center justify-center w-10 h-10 rounded-xl border border-border/70 bg-card/60',
            'text-muted-foreground hover:-translate-y-px hover:text-foreground hover:bg-accent',
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
                'relative h-10 w-10 flex items-center justify-center rounded-xl border border-border/70 bg-card/60',
                'text-muted-foreground hover:-translate-y-px hover:text-foreground hover:bg-accent',
                'transition-all duration-200 focus-ring group'
              )}
              aria-label={t('common.notifications')}
            >
              <Bell className="w-5 h-5 transition-transform group-hover:scale-110" />
              {hasUrgentAlerts && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full ring-2 ring-background" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 shadow-xl border-border rounded-xl overflow-hidden">
            <div className="bg-muted/50 border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">{t('common.notifications')}</p>
              <p className="text-xs text-muted-foreground">{notificationsSubtitle}</p>
            </div>
            <div className="p-1 max-h-[400px] overflow-y-auto custom-scrollbar">
              {alertStatsLoading ? (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                  {t('notifications_panel.subtitle_loading')}
                </p>
              ) : alertStats === null ? (
                <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                  {t('notifications_panel.subtitle_unavailable')}
                </p>
              ) : (
                <>
                  <Link
                    to="/inventory?filter=low-stock"
                    className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent group"
                  >
                    <div
                      className={cn(
                        'mt-1.5 h-2 w-2 rounded-full flex-shrink-0',
                        alertStats.low > 0 ? 'bg-destructive' : 'bg-muted-foreground/40'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{t('notifications_panel.low_stock_title')}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fillTemplate(t('notifications_panel.low_stock_body'), { count: String(alertStats.low) })}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium flex-shrink-0">
                      {t('notifications_panel.just_now')}
                    </span>
                  </Link>
                  <Link
                    to="/expiry"
                    className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent group"
                  >
                    <div
                      className={cn(
                        'mt-1.5 h-2 w-2 rounded-full flex-shrink-0',
                        alertStats.exp > 0 ? 'bg-amber-500' : 'bg-muted-foreground/40'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{t('notifications_panel.expiry_title')}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fillTemplate(t('notifications_panel.expiry_body'), { count: String(alertStats.exp) })}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium flex-shrink-0">
                      {t('notifications_panel.just_now')}
                    </span>
                  </Link>
                </>
              )}
              <Separator className="my-1" />
              <div className="px-4 py-2 text-center">
                <Link
                  to={detailsHref}
                  className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  {t('notifications_panel.view_details')}
                </Link>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              'flex items-center gap-2 rounded-xl border border-border/70 bg-card/60 px-2.5 py-1.5',
              'hover:bg-accent/70 hover:border-border transition-all duration-200 focus-ring group',
              'shadow-sm'
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
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">
                  {currentUser.role || t('common.administrator')}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground hidden lg:block transition-transform group-data-[state=open]:rotate-180" />
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
