import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/**
 * Standard empty state placeholder for lists, dashboards, and tables.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-muted-foreground animate-in fade-in duration-300",
        className
      )}
    >
      {Icon && <Icon className="h-9 w-9 opacity-50" aria-hidden="true" />}
      <div className="space-y-1">
        <h3 className="text-base font-medium text-foreground">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
