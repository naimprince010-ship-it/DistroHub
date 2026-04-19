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
    <div className={cn('flex flex-col gap-5 p-5 md:p-6', className)}>
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-foreground leading-tight">{title}</h1>
          {subtitle && (
            <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
      {children}
    </div>
  );
}
