import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Clock, 
  Loader2, 
  ChevronDown, 
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "../config";

interface TimelineEvent {
  timestamp: string;
  description: string;
  level: "info" | "warning" | "error" | "success";
  details?: string;
  relatedEvents?: number[];
}

interface TimelineAnalysisResult {
  events: TimelineEvent[];
  patterns: {
    description: string;
    eventIndices: number[];
    significance: string;
  }[];
  summary: string;
}

export function TimelineAnalysis({ logId }: { logId: number }) {
  const [expandedEvents, setExpandedEvents] = useState<number[]>([]);
  const [visiblePatternEvents, setVisiblePatternEvents] = useState<{[key: number]: boolean}>({});
  
  const { data, isLoading, error } = useQuery<TimelineAnalysisResult>({
    queryKey: [`/api/logs/${logId}/timeline`],
    enabled: !!logId,
  });
  
  const toggleEventExpand = (index: number) => {
    if (expandedEvents.includes(index)) {
      setExpandedEvents(expandedEvents.filter(i => i !== index));
    } else {
      setExpandedEvents([...expandedEvents, index]);
    }
  };

  const togglePatternEvents = (patternIndex: number) => {
    setVisiblePatternEvents(prev => ({
      ...prev,
      [patternIndex]: !prev[patternIndex]
    }));
  };
  
  // Get color for event level
  const getEventColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };
  
  // Get icon for event level
  const getEventIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <AlertTriangle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };
  
  // Format timestamp to be more human-readable
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  };
  
  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="h-5 w-5 mr-2 text-primary" />
          Timeline Analysis
        </CardTitle>
        <CardDescription>
          Chronological analysis of events and patterns in log data
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-slate-500">Analyzing timeline...</p>
          </div>
        ) : error ? (
          <div className="py-8 text-center text-slate-500">
            <p className="text-red-500 mb-4">Error analyzing timeline</p>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-slate-50 p-4 rounded-md">
              <div className="flex items-center mb-2">
                <Calendar className="h-4 w-4 text-slate-500 mr-2" />
                <h3 className="font-medium text-sm text-slate-700">Timeline Overview</h3>
              </div>
              <p className="text-slate-700">{data.summary}</p>
            </div>
            
            {/* Patterns */}
            {data.patterns && data.patterns.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium text-sm text-slate-700 mb-2">Detected Patterns</h3>
                {data.patterns.map((pattern, patternIndex) => (
                  <div key={patternIndex} className="border rounded-md overflow-hidden">
                    <div 
                      className="p-3 bg-slate-50 border-b flex justify-between items-center cursor-pointer"
                      onClick={() => togglePatternEvents(patternIndex)}
                    >
                      <div>
                        <h4 className="font-medium text-slate-900">{pattern.description}</h4>
                        <p className="text-xs text-slate-500 mt-1">{pattern.significance}</p>
                      </div>
                      <div className="flex items-center">
                        <Badge variant="outline" className="mr-2">
                          {pattern.eventIndices.length} events
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePatternEvents(patternIndex);
                          }}
                        >
                          {visiblePatternEvents[patternIndex] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    {visiblePatternEvents[patternIndex] && (
                      <div className="p-2 space-y-2">
                        {pattern.eventIndices.map((eventIndex) => {
                          const event = data.events[eventIndex];
                          return event ? (
                            <div 
                              key={eventIndex}
                              className={`p-2 rounded border ${getEventColor(event.level)}`}
                            >
                              <div className="flex items-start gap-2">
                                {getEventIcon(event.level)}
                                <div>
                                  <div className="flex items-center">
                                    <span className="text-xs font-medium">{formatTimestamp(event.timestamp)}</span>
                                  </div>
                                  <p className="text-sm mt-1">{event.description}</p>
                                </div>
                              </div>
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Timeline Events */}
            <div className="space-y-2">
              <h3 className="font-medium text-sm text-slate-700 mb-2">Chronological Events</h3>
              
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200"></div>
                
                <div className="space-y-4">
                  {data.events.map((event, index) => (
                    <div key={index} className="relative pl-10">
                      <div className={`absolute left-2 top-2 h-5 w-5 rounded-full border-2 border-white z-10 flex items-center justify-center ${
                        event.level === 'error' ? 'bg-red-500' : 
                        event.level === 'warning' ? 'bg-amber-500' : 
                        event.level === 'success' ? 'bg-green-500' : 
                        'bg-blue-500'
                      }`}>
                        <span className="text-white text-xs">{index + 1}</span>
                      </div>
                      
                      <div className={`border rounded-md overflow-hidden ${
                        expandedEvents.includes(index) ? 'border-primary' : ''
                      }`}>
                        <div 
                          className={`p-3 ${
                            expandedEvents.includes(index) ? 'bg-slate-50' : ''
                          } cursor-pointer flex justify-between items-start`}
                          onClick={() => toggleEventExpand(index)}
                        >
                          <div>
                            <div className="flex items-center">
                              <span className="text-xs font-medium text-slate-500">{formatTimestamp(event.timestamp)}</span>
                              <Badge 
                                variant="outline" 
                                className={`ml-2 ${
                                  event.level === 'error' ? 'border-red-200 text-red-800 bg-red-50' : 
                                  event.level === 'warning' ? 'border-amber-200 text-amber-800 bg-amber-50' : 
                                  event.level === 'success' ? 'border-green-200 text-green-800 bg-green-50' : 
                                  'border-blue-200 text-blue-800 bg-blue-50'
                                }`}
                              >
                                {event.level}
                              </Badge>
                            </div>
                            <p className="text-sm mt-1">{event.description}</p>
                          </div>
                          
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            {expandedEvents.includes(index) ? 
                              <ChevronUp className="h-4 w-4" /> : 
                              <ChevronDown className="h-4 w-4" />
                            }
                          </Button>
                        </div>
                        
                        {expandedEvents.includes(index) && event.details && (
                          <div className="p-3 border-t bg-slate-50">
                            <div className="rounded bg-white p-2 text-xs font-mono overflow-x-auto border">
                              <pre className="whitespace-pre-wrap">{event.details}</pre>
                            </div>
                            
                            {event.relatedEvents && event.relatedEvents.length > 0 && (
                              <div className="mt-3">
                                <h5 className="text-xs font-medium text-slate-700 mb-2">Related Events</h5>
                                <div className="flex flex-wrap gap-2">
                                  {event.relatedEvents.map(relatedIndex => (
                                    <Badge 
                                      key={relatedIndex} 
                                      variant="outline"
                                      className="cursor-pointer hover:bg-slate-100"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Expand the related event and scroll to it
                                        if (!expandedEvents.includes(relatedIndex)) {
                                          setExpandedEvents([...expandedEvents, relatedIndex]);
                                        }
                                        // Scroll to the related event would be handled here if needed
                                      }}
                                    >
                                      Event #{relatedIndex + 1}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <Clock className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">Select a log to view its timeline analysis</p>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="text-xs text-slate-500">
        Timeline analysis helps identify sequences of events, their relationships, and patterns within log data
      </CardFooter>
    </Card>
  );
}