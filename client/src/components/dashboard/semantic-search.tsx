import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { semanticSearch } from "@/lib/api";
import { SearchResponse, SearchResult } from "@/lib/types";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface SemanticSearchProps {
  className?: string;
}

export function SemanticSearch({ className }: SemanticSearchProps) {
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
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle>Semantic Search</CardTitle>
        <CardDescription>Search through log content using natural language</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-5">
          <div className="relative">
            <Input
              placeholder="Search logs by describing the issue (e.g., 'connection timeout errors')"
              className="pl-10 pr-20 py-6"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <Button
              className="absolute right-2 top-2"
              onClick={handleSearch}
              disabled={searchMutation.isPending || !query.trim()}
            >
              {searchMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Searching...
                </>
              ) : (
                "Search"
              )}
            </Button>
          </div>
        </div>

        {!searchResults && !searchMutation.isPending && (
          <div className="bg-slate-50 rounded-lg p-8 mb-5 text-center">
            <Search className="h-10 w-10 text-slate-400 mb-2 mx-auto" />
            <p className="text-slate-500">Enter a search query to find relevant log entries</p>
            <p className="text-xs text-slate-400 mt-1">
              Your search will be processed using vector embeddings for semantic results
            </p>
          </div>
        )}

        {searchMutation.isPending && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 border border-slate-200 rounded-lg animate-pulse">
                <div className="flex justify-between mb-2">
                  <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/5"></div>
                </div>
                <div className="h-8 bg-slate-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        )}

        {searchResults && (
          <div>
            <h3 className="font-medium text-slate-700 mb-3">Search Results</h3>
            
            {searchResults.results.length > 0 ? (
              <div className="space-y-3">
                {searchResults.results.map((result: SearchResult, index: number) => (
                  <div key={index} className="p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <div className="flex justify-between">
                      <h4 className="font-medium text-sm">{result.filename}</h4>
                      <span className="text-xs text-slate-500">Relevance: {result.relevance}</span>
                    </div>
                    <p className="text-xs font-mono mt-2 text-slate-600 line-clamp-2">
                      {result.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 rounded-lg p-6 text-center">
                <p className="text-slate-600">No results found for your query</p>
                <p className="text-xs text-slate-400 mt-1">Try using different keywords or phrases</p>
              </div>
            )}
            
            {searchResults.results.length > 5 && (
              <div className="mt-4 text-center">
                <button className="text-sm text-primary hover:text-blue-700 font-medium">
                  Load More Results
                </button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
