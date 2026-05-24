import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  className?: string;
  color?: "blue" | "green" | "purple" | "orange" | "red" | "default";
}

const colorMap = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  purple: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  red: "bg-red-500/10 text-red-600 dark:text-red-400",
  default: "bg-primary/10 text-primary",
};

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  color = "default",
}: StatsCardProps) {
  const iconClass = colorMap[color];

  return (
    <Card className={cn("shadow-sm hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="mt-1.5 text-3xl font-bold tracking-tight">{value}</p>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <p className={cn("mt-1.5 text-xs font-medium", trend.value >= 0 ? "text-emerald-600" : "text-red-600")}>
                {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}% {trend.label}
              </p>
            )}
          </div>
          <div className={cn("rounded-xl p-3 shrink-0", iconClass)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
