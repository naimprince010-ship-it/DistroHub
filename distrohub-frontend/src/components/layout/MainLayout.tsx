import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar, SidebarProvider, useSidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/products': 'Products',
  '/retailers': 'Retailers',
  '/purchase': 'Purchase',
  '/inventory': 'Inventory',
  '/sales': 'Sales',
  '/sales-returns': 'Sales Returns',
  '/routes': 'Routes / Batches',
  '/accountability': 'SR Accountability',
  '/payments': 'Payments',
  '/receivables': 'Receivables',
  '/expiry': 'Expiry Tracker',
  '/reports': 'Reports',
  '/settings': 'Settings',
};

function MainContent() {
  const { isCollapsed } = useSidebar();
  const isMobile = useIsMobile();
  const location = useLocation();
  const pageTitle = ROUTE_TITLES[location.pathname] ?? 'DistroHub';

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div
        className={cn(
          'min-h-screen transition-all duration-300 ease-out flex flex-col',
          isMobile ? 'ml-0' : isCollapsed ? 'ml-[76px]' : 'ml-[260px]'
        )}
      >
        <Header title={pageTitle} />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function MainLayout() {
  return (
    <SidebarProvider>
      <MainContent />
    </SidebarProvider>
  );
}
