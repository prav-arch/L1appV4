import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";
import { Search, Filter, Download, Eye } from "lucide-react";
import { getLogs, getAnalysisResult } from "@/lib/api";
import { AnalysisPanel } from "@/components/dashboard/analysis-panel";
import { Log, AnalysisResult } from "@/lib/types";

export default function LogsHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [selectedLogAnalysis, setSelectedLogAnalysis] = useState<AnalysisResult | null>(null);
  
  const logsQuery = useQuery({
    queryKey: ['/api/logs'],
    queryFn: getLogs
  });
  
  const analysisQuery = useQuery({
    queryKey: ['/api/logs', selectedLog?.id, 'analysis'],
    queryFn: () => selectedLog ? getAnalysisResult(selectedLog.id) : Promise.resolve(null),
    enabled: !!selectedLog
  });
  
  const filteredLogs = logsQuery.data?.filter(log => 
    log.filename.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  const handleViewLog = (log: Log) => {
    setSelectedLog(log);
    setSelectedLogAnalysis(null);
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Processing</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  return (
    <MainLayout title="Log History">
      {selectedLog ? (
        <>
          <div className="mb-4">
            <Button 
              variant="outline" 
              onClick={() => setSelectedLog(null)}
              className="mb-4"
            >
              ← Back to Log History
            </Button>
            <h2 className="text-xl font-semibold">{selectedLog.filename}</h2>
            <p className="text-sm text-slate-500">
              Uploaded {formatDistanceToNow(new Date(selectedLog.uploadedAt), { addSuffix: true })}
              {" • "}
              {formatFileSize(selectedLog.fileSize)}
            </p>
          </div>
          
          <AnalysisPanel 
            log={selectedLog}
            analysisResult={analysisQuery.data || undefined}
            isLoading={analysisQuery.isLoading}
          />
        </>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
              <div>
                <CardTitle>Log Files</CardTitle>
                <CardDescription>History of uploaded telecom logs</CardDescription>
              </div>
              <div className="flex mt-2 sm:mt-0 space-x-2">
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex mb-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search logs by filename..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {logsQuery.isLoading ? (
              <div className="py-20 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-slate-500">Loading logs...</p>
              </div>
            ) : filteredLogs.length > 0 ? (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Filename</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.filename}</TableCell>
                        <TableCell>
                          {format(new Date(log.uploadedAt), 'MMM d, yyyy h:mm a')}
                        </TableCell>
                        <TableCell>{formatFileSize(log.fileSize)}</TableCell>
                        <TableCell>{getStatusBadge(log.processingStatus)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewLog(log)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="bg-slate-100 inline-flex rounded-full p-3 mb-4">
                  <Search className="h-6 w-6 text-slate-400" />
                </div>
                <h3 className="text-lg font-medium">No logs found</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {searchTerm ? "Try adjusting your search terms" : "Upload some logs to get started"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </MainLayout>
  );
}
