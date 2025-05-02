import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Search, Download, Filter, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { Log, AnalysisResult, Issue, Recommendation } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

interface AnalysisPanelProps {
  log?: Log;
  analysisResult?: AnalysisResult;
  isLoading?: boolean;
  className?: string;
}

export function AnalysisPanel({ log, analysisResult, isLoading, className }: AnalysisPanelProps) {
  const [fontSize, setFontSize] = useState<'text-xs' | 'text-sm' | 'text-base'>('text-xs');

  const handleIncreaseFontSize = () => {
    if (fontSize === 'text-xs') setFontSize('text-sm');
    else if (fontSize === 'text-sm') setFontSize('text-base');
  };

  const handleDecreaseFontSize = () => {
    if (fontSize === 'text-base') setFontSize('text-sm');
    else if (fontSize === 'text-sm') setFontSize('text-xs');
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Analysis Results</CardTitle>
          <CardDescription>Troubleshooting insights from log analysis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-full"></div>
            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!log) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Analysis Results</CardTitle>
          <CardDescription>Troubleshooting insights from log analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-5">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Select a log file to analyze or view previously analyzed logs.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>Analysis Results</CardTitle>
          <CardDescription>Troubleshooting insights from log analysis</CardDescription>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Log Content Panel */}
          <div className="lg:col-span-2 border border-slate-200 rounded-lg">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-medium text-slate-700">Log Content</h3>
              <div className="flex">
                <button 
                  className="p-1.5 text-slate-500 hover:text-slate-700 mr-1"
                  onClick={handleIncreaseFontSize}
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button className="p-1.5 text-slate-500 hover:text-slate-700 mr-1">
                  <Filter className="h-4 w-4" />
                </button>
                <button className="p-1.5 text-slate-500 hover:text-slate-700">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto max-h-96">
              <pre className={cn("font-mono leading-relaxed text-slate-700 whitespace-pre-wrap", fontSize)}>
                {log.originalContent}
              </pre>
            </div>
          </div>

          {/* Analysis Results Panel */}
          <div>
            {analysisResult ? (
              <>
                <div className="border border-slate-200 rounded-lg mb-4">
                  <div className="p-3 bg-slate-50 border-b border-slate-200">
                    <h3 className="font-medium text-slate-700">Issue Summary</h3>
                  </div>
                  <div className="p-4">
                    {analysisResult.issues.map((issue: Issue, index: number) => (
                      <div key={index} className="flex items-start mb-4">
                        <div className={cn(
                          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3",
                          issue.severity === 'high' ? "bg-red-100" : 
                          issue.severity === 'medium' ? "bg-amber-100" : "bg-blue-100"
                        )}>
                          <i className={cn(
                            "fas fa-exclamation-triangle text-sm",
                            issue.severity === 'high' ? "text-red-500" : 
                            issue.severity === 'medium' ? "text-amber-500" : "text-blue-500"
                          )}></i>
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-800">{issue.title}</h4>
                          <p className="text-sm text-slate-600 mt-1">{issue.description}</p>
                          
                          <div className="text-sm space-y-2 mt-2">
                            <div>
                              <span className="font-medium">Severity:</span> 
                              <span className={cn(
                                "ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                issue.severity === 'high' ? "bg-red-100 text-red-800" : 
                                issue.severity === 'medium' ? "bg-amber-100 text-amber-800" : 
                                "bg-blue-100 text-blue-800"
                              )}>
                                {issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">First Occurrence:</span> 
                              <span className="text-slate-600">{issue.firstOccurrence}</span>
                            </div>
                            <div>
                              <span className="font-medium">Status:</span> 
                              <span className={cn(
                                "ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                issue.status === 'fixed' ? "bg-green-100 text-green-800" : 
                                issue.status === 'in_progress' ? "bg-blue-100 text-blue-800" : 
                                "bg-amber-100 text-amber-800"
                              )}>
                                {issue.status === 'fixed' ? 'Fixed' : 
                                 issue.status === 'in_progress' ? 'In Progress' : 
                                 'Pending'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="border border-slate-200 rounded-lg">
                  <div className="p-3 bg-slate-50 border-b border-slate-200">
                    <h3 className="font-medium text-slate-700">Recommendations</h3>
                  </div>
                  <div className="p-4">
                    <div className="space-y-4 text-sm">
                      {analysisResult.recommendations.map((rec: Recommendation, index: number) => (
                        <div 
                          key={index} 
                          className={cn(
                            "p-3 border rounded-lg",
                            rec.category === 'configuration' ? "bg-green-50 border-green-100" : 
                            rec.category === 'authentication' ? "bg-amber-50 border-amber-100" : 
                            rec.category === 'monitoring' ? "bg-blue-50 border-blue-100" : 
                            "bg-slate-50 border-slate-100"
                          )}
                        >
                          <h4 className={cn(
                            "font-medium mb-1",
                            rec.category === 'configuration' ? "text-green-800" : 
                            rec.category === 'authentication' ? "text-amber-800" : 
                            rec.category === 'monitoring' ? "text-blue-800" : 
                            "text-slate-800"
                          )}>
                            {rec.title}
                          </h4>
                          <p className={cn(
                            rec.category === 'configuration' ? "text-green-700" : 
                            rec.category === 'authentication' ? "text-amber-700" : 
                            rec.category === 'monitoring' ? "text-blue-700" : 
                            "text-slate-700"
                          )}>
                            {rec.description}
                          </p>
                          
                          {rec.isAutomaticallyResolved && (
                            <div className="mt-2 text-xs text-green-600">
                              <i className="fas fa-check-circle mr-1"></i> This issue was automatically resolved
                            </div>
                          )}
                          
                          {rec.documentationLink && (
                            <div className="mt-2 flex items-center">
                              <a 
                                href={rec.documentationLink} 
                                className="text-xs font-medium hover:underline"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                View Documentation
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="border border-slate-200 rounded-lg p-8 text-center">
                <Search className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-700">No Analysis Available</h3>
                <p className="text-sm text-slate-500 mt-2">
                  {log.processingStatus === 'pending' || log.processingStatus === 'processing' ? 
                    'Analysis is currently in progress...' : 
                    'No analysis data available for this log.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
