import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Clock, 
  Loader2, 
  AlertTriangle, 
  PanelTop, 
  BarChart4, 
  ArrowDown, 
  ArrowUp
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { API_BASE_URL } from "../config";

interface TimelineEvent {
  timestamp: string;
  description: string;
  significance: "high" | "medium" | "low";
}

interface TimelinePhase {
  start_time: string;
  end_time: string;
  name: string;
  description: string;
}

interface TimelineAnomaly {
  timestamp: string;
  description: string;
}

interface TimelineAnalysisResult {
  key_events: TimelineEvent[];
  phases: TimelinePhase[];
  anomalies: TimelineAnomaly[];
}

export function TimelineAnalysis({ logId }: { logId: number }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<TimelineAnalysisResult>({
    queryKey: [`/api/logs/${logId}/timeline`],
    enabled: false, // Don't fetch on mount
  });

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    await refetch();
    setIsAnalyzing(false);
  };

  // Format date/time to be more readable
  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString();
    } catch (e) {
      return isoString;
    }
  };

  // Get significance badge variant
  const getSignificanceBadge = (significance: string) => {
    switch (significance.toLowerCase()) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">{significance}</Badge>;
    }
  };

  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="h-5 w-5 mr-2 text-primary" />
          Timeline Analysis
        </CardTitle>
        <CardDescription>
          Chronological analysis of events in the log
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading || isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-slate-500">Analyzing event timeline...</p>
          </div>
        ) : data?.phases ? (
          <div className="space-y-8">
            {/* Phases Timeline */}
            <div>
              <h3 className="text-sm font-medium mb-4 flex items-center">
                <PanelTop className="h-4 w-4 mr-1 text-primary" />
                Event Phases
              </h3>
              
              <div className="relative space-y-8 before:absolute before:inset-0 before:left-6 before:h-full before:border-l-2 before:border-slate-200 ml-6 pl-8">
                {data.phases.map((phase, index) => (
                  <div key={index} className="relative">
                    {/* Circle marker */}
                    <div className="absolute -left-8 top-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary z-10">
                      <span className="text-xs text-white font-bold">{index + 1}</span>
                    </div>
                    
                    {/* Phase content */}
                    <div className="bg-slate-50 border rounded-md p-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-slate-900">{phase.name}</h4>
                        <Badge variant="outline" className="ml-2">
                          {formatDateTime(phase.start_time)} - {formatDateTime(phase.end_time)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{phase.description}</p>
                      
                      {/* Key events in this phase */}
                      {data.key_events.filter(event => {
                        const eventTime = new Date(event.timestamp).getTime();
                        const phaseStart = new Date(phase.start_time).getTime();
                        const phaseEnd = new Date(phase.end_time).getTime();
                        return eventTime >= phaseStart && eventTime <= phaseEnd;
                      }).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <h5 className="text-xs font-medium text-slate-500 mb-2">KEY EVENTS IN THIS PHASE</h5>
                          <div className="space-y-2">
                            {data.key_events.filter(event => {
                              const eventTime = new Date(event.timestamp).getTime();
                              const phaseStart = new Date(phase.start_time).getTime();
                              const phaseEnd = new Date(phase.end_time).getTime();
                              return eventTime >= phaseStart && eventTime <= phaseEnd;
                            }).map((event, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <div className="flex-shrink-0 pt-0.5">
                                  {getSignificanceBadge(event.significance)}
                                </div>
                                <div>
                                  <div className="font-medium">{formatDateTime(event.timestamp)}</div>
                                  <div className="text-slate-700">{event.description}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Anomalies */}
            {data.anomalies.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-4 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1 text-amber-500" />
                  Detected Anomalies
                </h3>
                
                <div className="space-y-2">
                  {data.anomalies.map((anomaly, index) => (
                    <div key={index} className="bg-amber-50 border-amber-200 border rounded-md p-3 text-amber-800">
                      <div className="font-medium text-sm">{formatDateTime(anomaly.timestamp)}</div>
                      <div className="text-sm">{anomaly.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Key Events Summary */}
            <div>
              <h3 className="text-sm font-medium mb-4 flex items-center">
                <BarChart4 className="h-4 w-4 mr-1 text-primary" />
                Significant Events
              </h3>
              
              <div className="border rounded-md">
                <div className="grid grid-cols-12 text-xs font-medium bg-slate-100 p-2 rounded-t-md">
                  <div className="col-span-3">TIMESTAMP</div>
                  <div className="col-span-7">DESCRIPTION</div>
                  <div className="col-span-2 text-right">SIGNIFICANCE</div>
                </div>
                
                <div className="divide-y max-h-60 overflow-y-auto">
                  {data.key_events
                    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                    .map((event, index) => (
                      <div key={index} className="grid grid-cols-12 p-2 text-xs items-center hover:bg-slate-50">
                        <div className="col-span-3 font-mono">{formatDateTime(event.timestamp)}</div>
                        <div className="col-span-7">{event.description}</div>
                        <div className="col-span-2 text-right">{getSignificanceBadge(event.significance)}</div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-slate-500">
            <p className="text-red-500 mb-4">Error analyzing timeline</p>
            <Button onClick={runAnalysis}>Try Again</Button>
          </div>
        ) : (
          <div className="py-8 text-center">
            <Clock className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">Analyze the chronological sequence of events in this log</p>
            <Button onClick={runAnalysis}>Analyze Timeline</Button>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="justify-between flex-col sm:flex-row gap-2">
        <p className="text-xs text-slate-500">
          Identifies key phases, significant events, and anomalies in the log timeline
        </p>
        {data?.key_events && (
          <Button variant="outline" size="sm" onClick={runAnalysis}>
            Refresh Analysis
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}