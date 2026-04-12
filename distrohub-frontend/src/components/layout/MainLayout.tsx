import { Outlet } from 'react-router-dom';
import { Sidebar, SidebarProvider, useSidebar } from './Sidebar';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

function MainContent() {
  const { isCollapsed } = useSidebar();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main
        className={cn(
          'min-h-screen transition-all duration-300 ease-out',
          // On mobile, no margin needed since sidebar is overlay
          isMobile ? 'ml-0' : isCollapsed ? 'ml-[76px]' : 'ml-[260px]'
        )}
      >
        <Outlet />
      </main>
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
