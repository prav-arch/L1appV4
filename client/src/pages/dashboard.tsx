import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { StatsCard } from "@/components/dashboard/stats-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { UploadPanel } from "@/components/dashboard/upload-panel";
import { AnalysisPanel } from "@/components/dashboard/analysis-panel";
import { SemanticSearch } from "@/components/dashboard/semantic-search";
import { getStats, getRecentActivities } from "@/lib/api";
import { FileText, CheckCircle, AlertTriangle, Clock } from "lucide-react";

export default function Dashboard() {
  const statsQuery = useQuery({
    queryKey: ['/api/stats'],
    queryFn: getStats
  });
  
  const activitiesQuery = useQuery({
    queryKey: ['/api/activities'],
    queryFn: () => getRecentActivities(5) // Limit to 5 recent activities
  });
  
  return (
    <MainLayout title="Dashboard">
      {/* Quick Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard 
          title="Analyzed Logs" 
          value={statsQuery.data?.analyzedLogs || 0}
          icon={FileText}
          iconClassName="bg-blue-100 text-primary"
          isLoading={statsQuery.isLoading}
        />
        
        <StatsCard 
          title="Issues Resolved" 
          value={statsQuery.data?.issuesResolved || 0}
          icon={CheckCircle}
          iconClassName="bg-green-100 text-success"
        />
        
        <StatsCard 
          title="Pending Issues" 
          value={statsQuery.data?.pendingIssues || 0}
          icon={AlertTriangle}
          iconClassName="bg-red-100 text-error"
        />
        
        <StatsCard 
          title="Avg. Resolution Time" 
          value={statsQuery.data?.avgResolutionTime || "0h"}
          icon={Clock}
          iconClassName="bg-indigo-100 text-secondary"
        />
      </div>
      
      {/* Upload & Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <UploadPanel />
        
        <RecentActivity 
          activities={activitiesQuery.data || []}
          isLoading={activitiesQuery.isLoading}
        />
      </div>
      
      {/* Analysis Section */}
      <AnalysisPanel className="mb-6" />
      
      {/* Semantic Search Section */}
      <SemanticSearch />
    </MainLayout>
  );
}
