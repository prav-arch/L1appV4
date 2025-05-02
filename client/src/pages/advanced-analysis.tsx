import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MainLayout } from "@/components/layout/main-layout";
import { AutomatedRemediation } from "@/components/automated-remediation";
import { RootCauseAnalysis } from "@/components/root-cause-analysis";
import { TimelineAnalysis } from "@/components/timeline-analysis";
import { PredictiveAnalysis } from "@/components/predictive-analysis";
import { NaturalLanguageQuery } from "@/components/natural-language-query";
import { ResolutionFeedback } from "@/components/resolution-feedback";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getLogs, getAnalysisResult } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Database, FileWarning } from "lucide-react";
import type { Log } from "@/lib/types";

export default function AdvancedAnalysis() {
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);
  
  // Fetch all logs
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['/api/logs'],
    queryFn: getLogs
  });
  
  // Fetch analysis for selected log
  const { data: analysis, isLoading: analysisLoading } = useQuery({
    queryKey: ['/api/logs', selectedLogId, 'analysis'],
    queryFn: () => selectedLogId ? getAnalysisResult(selectedLogId) : Promise.resolve(undefined),
    enabled: !!selectedLogId
  });
  
  // Get the selected log
  const selectedLog = selectedLogId && logs 
    ? logs.find(log => log.id === selectedLogId) 
    : null;
  
  // Get the selected issue
  const selectedIssue = selectedIssueId && analysis?.issues 
    ? analysis.issues.find(issue => issue.id === selectedIssueId) 
    : null;
  
  // Handle log selection change
  const handleLogChange = (value: string) => {
    const logId = parseInt(value, 10);
    setSelectedLogId(logId);
    setSelectedIssueId(null); // Reset issue selection when log changes
  };
  
  // Handle issue selection change
  const handleIssueChange = (value: string) => {
    setSelectedIssueId(parseInt(value, 10));
  };
  
  // Filter for logs that have completed processing
  const completedLogs = logs?.filter(
    log => log.processingStatus === 'completed' || log.processingStatus === 'completed_without_vectors'
  ) || [];
  
  return (
    <MainLayout title="Advanced Analysis">
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Select Log for Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={selectedLogId?.toString() || ""} 
              onValueChange={handleLogChange}
              disabled={logsLoading || completedLogs.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a log file" />
              </SelectTrigger>
              <SelectContent>
                {completedLogs.map(log => (
                  <SelectItem key={log.id} value={log.id.toString()}>
                    {log.filename}
                  </SelectItem>
                ))}
                {completedLogs.length === 0 && (
                  <SelectItem value="empty" disabled>
                    No analyzed logs available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
        
        {selectedLogId && analysis?.issues && analysis.issues.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Select Issue for Remediation</CardTitle>
            </CardHeader>
            <CardContent>
              <Select 
                value={selectedIssueId?.toString() || ""} 
                onValueChange={handleIssueChange}
                disabled={analysisLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an issue" />
                </SelectTrigger>
                <SelectContent>
                  {analysis.issues.map(issue => (
                    <SelectItem key={issue.id} value={issue.id.toString()}>
                      {issue.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}
      </div>
      
      {!selectedLogId && (
        <div className="p-8 text-center">
          <Database className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">No Log Selected</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            Select a log file to access advanced analysis features like root cause analysis, timeline analysis, and more.
          </p>
        </div>
      )}
      
      {selectedLogId && logsLoading && (
        <div className="p-8 text-center">
          <div className="animate-pulse flex justify-center">
            <div className="h-12 w-12 bg-slate-200 rounded-full"></div>
          </div>
          <div className="animate-pulse mt-4">
            <div className="h-4 bg-slate-200 rounded w-32 mx-auto"></div>
            <div className="h-3 bg-slate-200 rounded max-w-md mx-auto mt-2"></div>
          </div>
        </div>
      )}
      
      {selectedLogId && !logsLoading && (
        <Tabs defaultValue="root-cause" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full mb-6">
            <TabsTrigger value="root-cause">Root Cause</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="predictive">Predictive</TabsTrigger>
            <TabsTrigger value="query">Natural Language</TabsTrigger>
            <TabsTrigger value="remediation" disabled={!selectedIssueId}>Remediation</TabsTrigger>
          </TabsList>
          
          <TabsContent value="root-cause">
            <RootCauseAnalysis logId={selectedLogId} />
          </TabsContent>
          
          <TabsContent value="timeline">
            <TimelineAnalysis logId={selectedLogId} />
          </TabsContent>
          
          <TabsContent value="predictive">
            <PredictiveAnalysis />
          </TabsContent>
          
          <TabsContent value="query">
            <NaturalLanguageQuery />
          </TabsContent>
          
          <TabsContent value="remediation">
            {selectedIssueId ? (
              <div className="space-y-6">
                <AutomatedRemediation issueId={selectedIssueId} />
                
                {selectedIssue && (
                  <ResolutionFeedback 
                    issueId={selectedIssueId}
                    issueTitle={selectedIssue.title}
                    steps={[
                      { description: "Run diagnostic commands" },
                      { description: "Update configuration files" },
                      { description: "Restart affected services" }
                    ]}
                  />
                )}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-md border">
                <FileWarning className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-700 mb-2">No Issue Selected</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  Select an issue from the dropdown above to view automated remediation steps.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </MainLayout>
  );
}