import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { 
  MessageSquare, 
  Send, 
  ArrowRight,
  MessageCircle,
  Bot,
  UserIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "../components/ui/spinner";
import { API_BASE_URL } from "../config";

interface NLQueryResponse {
  answer: string;
  relevantSections: string[];
  confidence: number;
}

export function NaturalLanguageQuery() {
  const [query, setQuery] = useState("");
  const [conversation, setConversation] = useState<{role: "user" | "assistant"; content: string}[]>([]);
  
  const nlQuery = useMutation({
    mutationFn: async (queryText: string) => {
      const response = await fetch(`${API_BASE_URL}/query/natural-language`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: queryText }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to process natural language query");
      }
      
      return response.json() as Promise<NLQueryResponse>;
    },
    onSuccess: (data) => {
      setConversation(prev => [
        ...prev,
        { role: "assistant", content: data.answer }
      ]);
    },
    onError: (error) => {
      setConversation(prev => [
        ...prev,
        { role: "assistant", content: `Error: ${error instanceof Error ? error.message : "Failed to process query"}` }
      ]);
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    // Add user message to conversation
    setConversation(prev => [
      ...prev, 
      { role: "user", content: query }
    ]);
    
    // Process the query
    nlQuery.mutate(query);
    
    // Clear the input
    setQuery("");
  };
  
  // Simple examples to show users
  const examples = [
    "What are the most common error types in the logs?",
    "Explain the authentication failure pattern in the last 24 hours",
    "Summarize performance issues across network devices",
    "Show me connection timeout patterns"
  ];
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageSquare className="h-5 w-5 mr-2 text-primary" />
          Natural Language Query
        </CardTitle>
        <CardDescription>
          Ask questions about your logs in plain English
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Conversation display */}
        <div className="border rounded-md p-4 min-h-[200px] max-h-[400px] overflow-y-auto bg-slate-50">
          {conversation.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Bot className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="mb-2">Ask a question about your log data in natural language</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 max-w-2xl mx-auto">
                {examples.map((example, index) => (
                  <Button 
                    key={index} 
                    variant="outline" 
                    className="justify-start text-left h-auto py-2"
                    onClick={() => {
                      setQuery(example);
                    }}
                  >
                    <ArrowRight className="h-3 w-3 mr-2 flex-shrink-0" />
                    <span className="text-xs">{example}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {conversation.map((message, index) => (
                <div 
                  key={index} 
                  className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
                >
                  <div 
                    className={`max-w-[80%] md:max-w-[70%] rounded-lg p-3 ${
                      message.role === "assistant" 
                        ? "bg-white border border-slate-200" 
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    <div className="flex items-start mb-1">
                      {message.role === "assistant" ? (
                        <Bot className="h-4 w-4 mr-2 mt-1" />
                      ) : (
                        <UserIcon className="h-4 w-4 mr-2 mt-1" />
                      )}
                      <span className="text-xs font-medium">
                        {message.role === "assistant" ? "AI Assistant" : "You"}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              
              {nlQuery.isPending && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center">
                    <Spinner size="sm" className="mr-2" />
                    <span className="text-sm text-slate-500">Thinking...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Input form */}
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex-1">
            <Textarea
              placeholder="Ask a question about your log data..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>
          
          <Button 
            type="submit" 
            disabled={!query.trim() || nlQuery.isPending}
            className="flex-shrink-0"
          >
            {nlQuery.isPending ? (
              <Spinner size="sm" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </form>
      </CardContent>
      
      <CardFooter className="text-xs text-slate-500 italic">
        Results are based on analysis of your uploaded log data
      </CardFooter>
    </Card>
  );
}