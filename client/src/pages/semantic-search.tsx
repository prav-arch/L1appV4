import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Search, FileText } from "lucide-react";
import { semanticSearch } from "@/lib/api";
import { SearchResponse, SearchResult } from "@/lib/types";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function SemanticSearchPage() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const { toast } = useToast();

  const searchMutation = useMutation({
    mutationFn: semanticSearch,
    onSuccess: (data) => {
      setSearchResults(data);
    },
    onError: (error) => {
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "Failed to perform search",
        variant: "destructive"
      });
    }
  });

  const handleSearch = () => {
    if (!query.trim()) {
      toast({
        title: "Empty search",
        description: "Please enter a search query",
        variant: "destructive"
      });
      return;
    }
    
    searchMutation.mutate(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };
  
  return (
    <MainLayout title="Semantic Search">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Semantic Search</h1>
        <p className="text-slate-500">
          Search through your log files using natural language queries to find relevant information.
        </p>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Logs</CardTitle>
          <CardDescription>
            Describe the issue or pattern you're looking for in natural language
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Example: 'connection timeout errors' or 'authentication failures in the last week'"
                className="pl-10 py-6"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <Button 
              onClick={handleSearch}
              disabled={searchMutation.isPending || !query.trim()}
              className="py-6"
            >
              {searchMutation.isPending ? "Searching..." : "Search"}
            </Button>
          </div>
          
          <Alert className="mt-4 bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-700 text-sm">
              <strong>Pro tip:</strong> Be specific about what you're looking for. For example,
              instead of searching for "errors", try "gateway connection failures in authentication service".
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
      
      {searchMutation.isPending && (
        <div className="py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-slate-500">Searching logs...</p>
          <p className="text-xs text-slate-400 mt-1">This may take a moment for complex queries</p>
        </div>
      )}
      
      {searchResults && !searchMutation.isPending && (
        <>
          {searchResults.summary && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Search Summary</CardTitle>
                <CardDescription>AI-generated summary of search results</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700">{searchResults.summary}</p>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Search Results</CardTitle>
              <CardDescription>
                Found {searchResults.results.length} relevant log segments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {searchResults.results.length > 0 ? (
                <div className="space-y-4">
                  {searchResults.results.map((result: SearchResult, index: number) => (
                    <div key={index} className="border border-slate-200 rounded-lg overflow-hidden">
                      <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 text-slate-400 mr-2" />
                          <span className="font-medium text-sm">{result.filename}</span>
                        </div>
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          Relevance: {result.relevance}
                        </span>
                      </div>
                      <div className="p-4 max-h-48 overflow-y-auto">
                        <pre className="font-mono text-xs whitespace-pre-wrap text-slate-700">
                          {result.text}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Search className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-slate-700">No matching results</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Try using different keywords or phrases
                  </p>
                </div>
              )}
            </CardContent>
            
            {searchResults.results.length > 5 && (
              <CardFooter className="justify-center">
                <Button variant="outline">
                  Load More Results
                </Button>
              </CardFooter>
            )}
          </Card>
        </>
      )}
    </MainLayout>
  );
}
