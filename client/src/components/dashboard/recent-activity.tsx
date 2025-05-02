import { formatDistanceToNow } from "date-fns";
import { Activity } from "@/lib/types";
import { CheckCircle, Search, AlertTriangle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ActivityItemProps {
  activity: Activity;
}

function ActivityItem({ activity }: ActivityItemProps) {
  const getStatusIcon = () => {
    switch (activity.activityType) {
      case "upload":
        return <i className="fas fa-upload text-primary"></i>;
      case "processing":
        return <i className="fas fa-cog text-secondary"></i>;
      case "analysis":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "status_change":
        return <Search className="h-4 w-4 text-primary" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-error" />;
      default:
        return <AlertCircle className="h-4 w-4 text-info" />;
    }
  };

  const getStatusBadge = () => {
    let bgColor, textColor, label;

    switch (activity.status) {
      case "completed":
      case "resolved":
        bgColor = "bg-green-100";
        textColor = "text-green-800";
        label = activity.status === "completed" ? "Completed" : "Resolved";
        break;
      case "in_progress":
        bgColor = "bg-blue-100";
        textColor = "text-blue-800";
        label = "In Progress";
        break;
      case "pending":
        bgColor = "bg-amber-100";
        textColor = "text-amber-800";
        label = "Pending";
        break;
      case "error":
        bgColor = "bg-red-100";
        textColor = "text-red-800";
        label = "Error";
        break;
      default:
        bgColor = "bg-slate-100";
        textColor = "text-slate-800";
        label = activity.status;
    }

    return (
      <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", bgColor, textColor)}>
        {label}
      </span>
    );
  };

  return (
    <li className="py-3 flex">
      <div className="flex-shrink-0 mr-3">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center",
          activity.status === "error" ? "bg-red-100" : 
          activity.status === "resolved" || activity.status === "completed" ? "bg-green-100" : 
          activity.status === "in_progress" ? "bg-blue-100" : "bg-amber-100"
        )}>
          {getStatusIcon()}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800">{activity.description}</p>
        <p className="text-xs text-slate-500">
          {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
        </p>
      </div>
      <div>
        {getStatusBadge()}
      </div>
    </li>
  );
}

interface RecentActivityProps {
  activities: Activity[];
  isLoading?: boolean;
  className?: string;
}

export function RecentActivity({ activities, isLoading, className }: RecentActivityProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest log analysis and troubleshooting</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4"></div>
                  <div className="h-3 bg-slate-200 rounded animate-pulse w-1/4"></div>
                </div>
                <div className="h-6 w-16 bg-slate-200 rounded-full animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : activities.length > 0 ? (
          <ul className="divide-y divide-slate-200">
            {activities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </ul>
        ) : (
          <div className="text-center py-8">
            <i className="fas fa-history text-slate-300 text-3xl mb-2"></i>
            <p className="text-sm text-slate-500">No recent activities found</p>
          </div>
        )}
        
        {activities.length > 0 && (
          <div className="mt-3 text-center">
            <a href="/logs" className="text-sm text-primary hover:text-blue-700 font-medium">
              View All Activity
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
