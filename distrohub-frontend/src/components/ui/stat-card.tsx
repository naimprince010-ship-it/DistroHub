import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

type StatCardColor = 'blue' | 'green' | 'amber' | 'red' | 'purple';

const colorMap: Record<StatCardColor, string> = {
  blue:   'bg-[hsl(var(--dh-blue))]',
  green:  'bg-[hsl(var(--dh-green))]',
  amber:  'bg-[hsl(var(--dh-amber))]',
  red:    'bg-[hsl(var(--dh-red))]',
  purple: 'bg-[hsl(var(--dh-purple))]',
};

const iconBgMap: Record<StatCardColor, string> = {
  blue:   'bg-[hsl(var(--dh-blue))]/10 text-[hsl(var(--dh-blue))]',
  green:  'bg-[hsl(var(--dh-green))]/10 text-[hsl(var(--dh-green))]',
  amber:  'bg-[hsl(var(--dh-amber))]/10 text-[hsl(var(--dh-amber))]',
  red:    'bg-[hsl(var(--dh-red))]/10 text-[hsl(var(--dh-red))]',
  purple: 'bg-[hsl(var(--dh-purple))]/10 text-[hsl(var(--dh-purple))]',
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  color?: StatCardColor;
  hint?: string;
  hintPositive?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color = 'blue',
  hint,
  hintPositive,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('relative overflow-hidden', className)}>
      {/* color strip */}
      <div className={cn('h-[3px] w-full', colorMap[color])} />
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
              {label}
            </p>
            <p className="mt-1 text-[22px] font-semibold font-mono leading-none text-foreground">
              {value}
            </p>
            {hint && (
              <p
                className={cn(
                  'mt-1.5 text-[11px] font-medium',
                  hintPositive === true
                    ? 'text-[hsl(var(--dh-green))]'
                    : hintPositive === false
                    ? 'text-[hsl(var(--dh-red))]'
                    : 'text-muted-foreground'
                )}
              >
                {hint}
              </p>
            )}
          </div>
          {Icon && (
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', iconBgMap[color])}>
              <Icon className="h-4 w-4" aria-hidden />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
