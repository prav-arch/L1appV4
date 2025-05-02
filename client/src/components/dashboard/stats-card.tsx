import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  className?: string;
  iconClassName?: string;
  trend?: {
    value: number;
    increasing: boolean;
  }
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  className,
  iconClassName,
  trend
}: StatsCardProps) {
  return (
    <div className={cn("bg-white rounded-lg shadow p-4 border border-slate-200", className)}>
      <div className="flex items-center">
        <div className={cn("rounded-full p-3 bg-blue-100 text-primary", iconClassName)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="ml-4">
          <h3 className="text-sm font-medium text-slate-500">{title}</h3>
          <p className="text-2xl font-semibold">{value}</p>
          
          {trend && (
            <div className="flex items-center mt-1">
              <span className={cn(
                "text-xs",
                trend.increasing ? "text-green-600" : "text-red-600"
              )}>
                <i className={`fas fa-arrow-${trend.increasing ? 'up' : 'down'} mr-1`}></i>
                {trend.value}%
              </span>
              <span className="text-xs text-slate-400 ml-1">vs last month</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
