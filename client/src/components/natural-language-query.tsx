import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "../config";
import { Search, MessageCircle, AlertTriangle, Sparkle, Lightbulb } from "lucide-react";

interface NLQueryResponse {
  answer: string;
  relevant_entries: string[];
  suggested_follow_up: string[];
}

export function NaturalLanguageQuery() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<NLQueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${API_BASE_URL}/natural-language-query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });
      
      if (!res.ok) {
        throw new Error(`Server responded with ${res.status}: ${res.statusText}`);
      }
      
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      console.error("Error querying logs:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      toast({
        variant: "destructive",
        title: "Query failed",
        description: "We couldn't process your query. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowUpClick = (followUp: string) => {
    setQuery(followUp);
    // Don't automatically submit to give user a chance to edit
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Sparkle className="h-5 w-5 mr-2 text-primary" />
          Natural Language Log Query
        </CardTitle>
        <CardDescription>
          Ask questions about your telecom logs in plain English
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g., What authentication failures occurred yesterday?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" disabled={isLoading || !query.trim()}>
              {isLoading ? <Spinner className="mr-2 h-4 w-4" /> : <Search className="mr-2 h-4 w-4" />}
              Search
            </Button>
          </div>
        </form>

        {isLoading && (
          <div className="flex justify-center items-center mt-8 mb-4">
            <Spinner className="h-8 w-8" />
            <span className="ml-3 text-sm text-slate-500">Analyzing logs...</span>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 border border-red-200 rounded-md bg-red-50">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
              <div>
                <h4 className="font-medium text-red-800">Error</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {response && !isLoading && (
          <div className="mt-6 space-y-6">
            <div className="bg-slate-50 p-4 rounded-lg border">
              <div className="flex items-start">
                <MessageCircle className="h-5 w-5 text-primary mt-1 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-slate-900">Answer</h3>
                  <p className="mt-2 text-slate-700 whitespace-pre-line">{response.answer}</p>
                </div>
              </div>
            </div>

            {response.relevant_entries && response.relevant_entries.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Relevant Log Entries</h4>
                <div className="bg-slate-100 p-3 rounded-md border max-h-60 overflow-y-auto">
                  {response.relevant_entries.map((entry, i) => (
                    <div 
                      key={i} 
                      className="text-xs font-mono p-1.5 border-b last:border-b-0 text-slate-700"
                    >
                      {entry}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {response.suggested_follow_up && response.suggested_follow_up.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-2">Follow-up Questions</h4>
                <div className="flex flex-wrap gap-2">
                  {response.suggested_follow_up.map((followUp, i) => (
                    <Badge 
                      key={i} 
                      variant="outline"
                      className="cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => handleFollowUpClick(followUp)}
                    >
                      <Lightbulb className="h-3 w-3 mr-1" />
                      {followUp}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-slate-500 justify-end">
        Powered by GenAI analysis of telecom logs
      </CardFooter>
    </Card>
  );
}