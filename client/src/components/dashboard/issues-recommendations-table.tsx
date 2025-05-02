import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle, ExternalLink, HelpCircle, Info } from "lucide-react";

import type { Issue, Recommendation } from "@/lib/types";

interface IssuesRecommendationsTableProps {
  issues: Issue[];
  recommendations: Recommendation[];
  className?: string;
  isLoading?: boolean;
}

export function IssuesRecommendationsTable({ 
  issues, 
  recommendations, 
  className,
  isLoading = false
}: IssuesRecommendationsTableProps) {
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  
  // Filter recommendations that are relevant to the selected issue
  const getRelevantRecommendations = () => {
    if (!selectedIssue) return [];
    
    // In a real implementation, recommendations would be linked to issues
    // Here we're doing a simple relevance check based on severity
    return recommendations.filter(rec => {
      if (selectedIssue.severity === 'high') {
        // For high severity issues, show all recommendations
        return true;
      } else if (selectedIssue.severity === 'medium') {
        // For medium issues, show recommendations only from certain categories
        return ['configuration', 'monitoring', 'network'].includes(rec.category);
      } else {
        // For low severity, show only configuration recommendations
        return rec.category === 'configuration';
      }
    });
  };
  
  // Render severity badge with appropriate color
  const renderSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return <Badge variant="destructive">{severity}</Badge>;
      case 'medium':
        return <Badge variant="outline" className="bg-amber-500 text-white border-amber-500">{severity}</Badge>;
      case 'low':
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };
  
  // Render status badge
  const renderStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'fixed':
        return <Badge variant="outline" className="bg-green-500 text-white border-green-500">{status}</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-blue-500 text-white">{status}</Badge>;
      case 'pending':
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Render category badge
  const renderCategoryBadge = (category: string) => {
    switch (category.toLowerCase()) {
      case 'configuration':
        return <Badge variant="outline" className="border-blue-500 text-blue-700">{category}</Badge>;
      case 'monitoring':
        return <Badge variant="outline" className="border-purple-500 text-purple-700">{category}</Badge>;
      case 'authentication':
        return <Badge variant="outline" className="border-amber-500 text-amber-700">{category}</Badge>;
      case 'network':
        return <Badge variant="outline" className="border-green-500 text-green-700">{category}</Badge>;
      default:
        return <Badge variant="outline">{category}</Badge>;
    }
  };
  
  // Function to get icon based on severity
  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'medium':
        return <Info className="h-5 w-5 text-amber-500" />;
      case 'low':
      default:
        return <HelpCircle className="h-5 w-5 text-blue-500" />;
    }
  };
  
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Issues & Recommendations</CardTitle>
          <CardDescription>Loading analysis results...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-60 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (issues.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Issues & Recommendations</CardTitle>
          <CardDescription>No issues detected in analyzed logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-60 flex flex-col items-center justify-center text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-medium text-gray-900">All Clear</h3>
            <p className="text-gray-500 mt-2">
              No issues were detected in the analyzed logs. The system appears to be functioning normally.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Issues & Recommendations</CardTitle>
        <CardDescription>Detected issues and AI-generated recommendations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Issue</TableHead>
                <TableHead>First Occurrence</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.map((issue, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      {getSeverityIcon(issue.severity)}
                      <span className="ml-2">{issue.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>{issue.firstOccurrence}</TableCell>
                  <TableCell>{renderSeverityBadge(issue.severity)}</TableCell>
                  <TableCell>{renderStatusBadge(issue.status)}</TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedIssue(issue)}
                        >
                          View Recommendations
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>Issue Details & Recommendations</DialogTitle>
                          <DialogDescription>
                            GenAI analysis and recommendations for resolving this issue
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="grid gap-6 py-4">
                          {/* Issue details */}
                          <div className="rounded-lg border bg-card p-4">
                            <h3 className="text-lg font-semibold flex items-center">
                              {getSeverityIcon(selectedIssue?.severity || 'low')}
                              <span className="ml-2">{selectedIssue?.title}</span>
                              {renderSeverityBadge(selectedIssue?.severity || 'low')}
                            </h3>
                            <p className="mt-2 text-sm text-muted-foreground">{selectedIssue?.description}</p>
                            <div className="flex mt-4 text-sm text-muted-foreground">
                              <div className="mr-4"><strong>First Occurred:</strong> {selectedIssue?.firstOccurrence}</div>
                              <div><strong>Status:</strong> {renderStatusBadge(selectedIssue?.status || 'pending')}</div>
                            </div>
                          </div>
                          
                          {/* Recommendations */}
                          <div>
                            <h3 className="font-semibold mb-3">GenAI Recommendations</h3>
                            
                            <ScrollArea className="h-[300px] rounded-md border p-4">
                              {getRelevantRecommendations().length > 0 ? (
                                <div className="space-y-6">
                                  {getRelevantRecommendations().map((rec, idx) => (
                                    <div key={idx} className="rounded-lg bg-accent/50 p-4">
                                      <div className="flex items-center justify-between">
                                        <h4 className="font-medium">{rec.title}</h4>
                                        {renderCategoryBadge(rec.category)}
                                      </div>
                                      <p className="mt-2 text-sm">{rec.description}</p>
                                      
                                      {rec.documentationLink && (
                                        <>
                                          <Separator className="my-3" />
                                          <a 
                                            href={rec.documentationLink} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-sm text-blue-600 flex items-center hover:underline"
                                          >
                                            View Documentation
                                            <ExternalLink className="ml-1 h-3 w-3" />
                                          </a>
                                        </>
                                      )}
                                      
                                      {rec.isAutomaticallyResolved && (
                                        <div className="mt-3 flex items-center text-sm text-green-600">
                                          <CheckCircle className="mr-1 h-4 w-4" />
                                          This issue can be automatically resolved
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="py-8 text-center text-muted-foreground">
                                  No specific recommendations for this issue
                                </div>
                              )}
                            </ScrollArea>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}