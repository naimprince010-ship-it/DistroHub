import { Outlet } from 'react-router-dom';
import { Sidebar, SidebarProvider, useSidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

function MainContent() {
  const { isCollapsed } = useSidebar();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div
        className={cn(
          'min-h-screen transition-all duration-300 ease-out flex flex-col',
          isMobile ? 'ml-0' : isCollapsed ? 'ml-[76px]' : 'ml-[260px]'
        )}
      >
        <Header />
        <main className="flex-1 pb-3 md:pb-4">
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
