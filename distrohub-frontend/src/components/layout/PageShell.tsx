import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface PageShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Consistent page wrapper used by all main pages.
 * Replaces ad-hoc `min-h-screen` + custom title divs.
 */
export function PageShell({ title, subtitle, actions, children, className }: PageShellProps) {
  return (
    <div className={cn('flex flex-col gap-6 p-4 md:p-6 lg:p-7', className)}>
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[1.35rem] font-semibold leading-tight tracking-[-0.025em] text-foreground md:text-[1.5rem]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground/90">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">{actions}</div>
        )}
      </div>
      {children}
    </div>
  );
}
