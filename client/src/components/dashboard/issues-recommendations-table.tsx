import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Book, CheckCircle, ExternalLink, FileText, Link2, Zap } from "lucide-react";
import { useState } from "react";
import { Issue, Recommendation } from "@/lib/types";

interface IssuesRecommendationsTableProps {
  issues: Issue[];
  recommendations: Recommendation[];
  isLoading?: boolean;
  className?: string;
}

export function IssuesRecommendationsTable({
  issues,
  recommendations,
  isLoading = false,
  className
}: IssuesRecommendationsTableProps) {
  const [activeTab, setActiveTab] = useState<string>("issues");
  const [selectedItem, setSelectedItem] = useState<Issue | Recommendation | null>(null);
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);

  const openDetails = (item: Issue | Recommendation) => {
    setSelectedItem(item);
    setDetailsOpen(true);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-amber-100 text-amber-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fixed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'configuration':
        return 'bg-purple-100 text-purple-800';
      case 'monitoring':
        return 'bg-blue-100 text-blue-800';
      case 'authentication':
        return 'bg-amber-100 text-amber-800';
      case 'network':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const renderIssueDetails = (issue: Issue) => {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-semibold">
            <FileText className="h-5 w-5" />
            {issue.title}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={getSeverityColor(issue.severity)}>
              {issue.severity} severity
            </Badge>
            <Badge variant="outline" className={getStatusColor(issue.status)}>
              {issue.status.replace('_', ' ')}
            </Badge>
          </div>
          <DialogDescription className="mt-4">
            First occurred: {issue.firstOccurrence}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Description</h4>
          <p className="text-sm text-slate-600">{issue.description}</p>
        </div>
      </>
    );
  };

  const renderRecommendationDetails = (rec: Recommendation) => {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-semibold">
            <Zap className="h-5 w-5" />
            {rec.title}
          </DialogTitle>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={getCategoryColor(rec.category)}>
              {rec.category}
            </Badge>
            {rec.isAutomaticallyResolved && (
              <Badge variant="outline" className="bg-green-100 text-green-800">
                auto-resolved
              </Badge>
            )}
          </div>
        </DialogHeader>
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Description</h4>
          <p className="text-sm text-slate-600">{rec.description}</p>
          
          {rec.documentationLink && (
            <div className="mt-4">
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <a href={rec.documentationLink} target="_blank" rel="noopener noreferrer">
                  <Book className="h-4 w-4" />
                  <span>View Documentation</span>
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderLoadingSkeleton = () => {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center p-3 border rounded-md animate-pulse">
            <div className="h-4 w-4 bg-slate-200 rounded-full mr-3"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              <div className="h-3 bg-slate-200 rounded w-1/2"></div>
            </div>
            <div className="h-6 w-16 bg-slate-200 rounded ml-3"></div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle>Issues & Recommendations</CardTitle>
        <CardDescription>
          Issues detected in logs and recommended actions for resolution
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="issues" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Issues</span>
              <Badge variant="secondary" className="ml-1 rounded-full">
                {issues.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span>Recommendations</span>
              <Badge variant="secondary" className="ml-1 rounded-full">
                {recommendations.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="issues">
            {isLoading ? (
              renderLoadingSkeleton()
            ) : issues.length > 0 ? (
              <div className="space-y-2">
                {issues.map((issue, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 border rounded-md hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <Badge variant="outline" className={getSeverityColor(issue.severity)}>
                        {issue.severity}
                      </Badge>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium">{issue.title}</h4>
                        <p className="text-xs text-slate-500 truncate max-w-[300px]">
                          {issue.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getStatusColor(issue.status)}>
                        {issue.status.replace('_', ' ')}
                      </Badge>
                      <Button size="sm" variant="ghost" onClick={() => openDetails(issue)}>
                        Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
                <h3 className="text-lg font-medium">No Issues Found</h3>
                <p className="text-sm text-slate-500">
                  No issues were detected in the analyzed logs
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="recommendations">
            {isLoading ? (
              renderLoadingSkeleton()
            ) : recommendations.length > 0 ? (
              <div className="space-y-2">
                {recommendations.map((rec, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 border rounded-md hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <Badge variant="outline" className={getCategoryColor(rec.category)}>
                        {rec.category}
                      </Badge>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium">{rec.title}</h4>
                        <p className="text-xs text-slate-500 truncate max-w-[300px]">
                          {rec.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {rec.isAutomaticallyResolved && (
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          auto-resolved
                        </Badge>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openDetails(rec)}>
                        Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
                <h3 className="text-lg font-medium">No Recommendations</h3>
                <p className="text-sm text-slate-500">
                  No recommendations are available at this time
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedItem && ('severity' in selectedItem) ? 
            renderIssueDetails(selectedItem as Issue) : 
            selectedItem && renderRecommendationDetails(selectedItem as Recommendation)
          }
        </DialogContent>
      </Dialog>
    </Card>
  );
}