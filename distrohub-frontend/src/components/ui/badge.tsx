import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold tracking-[0.01em] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline:
          "border-border text-foreground",
        success:
          "border-[hsl(var(--dh-green))]/25 bg-[hsl(var(--dh-green))]/16 text-[hsl(var(--dh-green))]",
        warning:
          "border-[hsl(var(--dh-amber))]/30 bg-[hsl(var(--dh-amber))]/18 text-[hsl(var(--dh-amber))]",
        info:
          "border-[hsl(var(--dh-blue))]/25 bg-[hsl(var(--dh-blue))]/16 text-[hsl(var(--dh-blue))]",
        danger:
          "border-[hsl(var(--dh-red))]/25 bg-[hsl(var(--dh-red))]/16 text-[hsl(var(--dh-red))]",
        purple:
          "border-[hsl(var(--dh-purple))]/25 bg-[hsl(var(--dh-purple))]/16 text-[hsl(var(--dh-purple))]",
        muted:
          "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
