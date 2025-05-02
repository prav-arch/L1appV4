import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Database, FileSearch, Layers, BarChart, FileText, Search, Upload, Settings, Home, Network, Cpu } from "lucide-react";
import { API_BASE_URL } from "../config";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";

// Define types
interface VectorEntry {
  id: string;
  logId: number;
  text: string;
  embedding?: number[]; // Only shown in detailed view
  score?: number;
  relevance?: string;
  filename?: string;
}

interface VectorStoreStats {
  totalVectors: number;
  dimensions: number;
  collections: string[];
  indexType: string;
  status: "connected" | "error";
  lastUpdate: string;
}

export default function VectorStorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [similarityThreshold, setSimilarityThreshold] = useState(70);
  const [maxResults, setMaxResults] = useState(10);
  const [activeTab, setActiveTab] = useState("overview");
  
  // Fetch vector store statistics
  const { 
    data: stats, 
    isLoading: loadingStats,
    isError: statsError,
    error: statsErrorData
  } = useQuery<VectorStoreStats>({
    queryKey: [`${API_BASE_URL}/api/vector-store/stats`],
  });
  
  // Fetch recent vectors
  const { 
    data: recentVectors,
    isLoading: loadingVectors,
    isError: vectorsError,
    error: vectorsErrorData
  } = useQuery<VectorEntry[]>({
    queryKey: [`${API_BASE_URL}/api/vector-store/recent`],
  });
  
  // State for search results
  const [searchResults, setSearchResults] = useState<VectorEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<Error | null>(null);
  
  // Handle vector search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchError(null);
    
    try {
      const results = await apiRequest<VectorEntry[]>(`${API_BASE_URL}/api/vector-store/search`, {
        method: "POST",
        body: JSON.stringify({
          query: searchQuery,
          threshold: similarityThreshold / 100, // Convert to 0-1 range
          limit: maxResults
        }),
        raw: false // Important: we want the parsed JSON, not the Response object
      });
      
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      setSearchError(error instanceof Error ? error : new Error("Failed to search vectors"));
    } finally {
      setIsSearching(false);
    }
  };
  
  // Custom layout component inline
  const [location] = useLocation();
  
  const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/logs", label: "Logs History", icon: FileText },
    { href: "/upload", label: "Upload Logs", icon: Upload },
    { href: "/search", label: "Semantic Search", icon: Search },
    { href: "/advanced", label: "Advanced Analysis", icon: Network },
    { href: "/vector-store", label: "Vector Store", icon: Database },
    { href: "/settings", label: "Settings", icon: Settings },
  ];
  
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-white">
        <div className="p-6">
          <div className="flex items-center gap-2 font-semibold text-xl">
            <Cpu className="h-6 w-6 text-primary" />
            <span>Telecom Logs</span>
          </div>
        </div>
        
        <nav className="flex-1 space-y-1 px-4 py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                  location === item.href
                    ? "bg-slate-100 text-primary"
                    : "text-slate-700 hover:bg-slate-100 hover:text-primary"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        
        <div className="border-t p-4">
          <div className="text-xs text-slate-500">
            <p>Telecom Log Analysis</p>
            <p>Version 1.0.0</p>
          </div>
        </div>
      </aside>
      
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 h-14 border-b bg-white md:hidden z-10">
        <div className="flex h-full items-center px-4">
          <div className="flex items-center gap-2 font-semibold">
            <Cpu className="h-5 w-5 text-primary" />
            <span>Telecom Logs</span>
          </div>
        </div>
      </div>
      
      {/* Mobile navigation */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white md:hidden z-10">
        <nav className="flex justify-around">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center py-2 px-3 text-xs ${
                  location === item.href
                    ? "text-primary" 
                    : "text-slate-700 hover:text-primary"
                }`}
              >
                <Icon className="h-5 w-5 mb-1" />
                {item.label.split(' ')[0]}
              </Link>
            );
          })}
        </nav>
      </div>
      
      {/* Main content */}
      <main className="flex-1 p-6 pt-4 md:p-8 overflow-y-auto">
        <div className="mx-auto max-w-6xl">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Vector Store</h1>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </div>
      
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">
                <Database className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="browse">
                <Layers className="h-4 w-4 mr-2" />
                Browse Vectors
              </TabsTrigger>
              <TabsTrigger value="search">
                <FileSearch className="h-4 w-4 mr-2" />
                Search
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Vector Store Status</CardTitle>
                    <CardDescription>
                      Current status of Milvus vector database
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingStats ? (
                      <div className="flex justify-center py-8">
                        <Spinner size="lg" />
                      </div>
                    ) : statsError ? (
                      <div className="text-center py-6">
                        <p className="text-red-500 font-medium mb-2">Error connecting to vector store</p>
                        <p className="text-slate-600 text-sm">
                          {statsErrorData instanceof Error 
                            ? statsErrorData.message 
                            : "Failed to fetch vector store statistics"}
                        </p>
                        <p className="text-slate-600 text-sm mt-4">
                          The application will continue to work with basic functionality,
                          but semantic search and advanced features may be limited.
                        </p>
                      </div>
                    ) : stats ? (
                      <div className="space-y-4">
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-slate-600">Status</span>
                          <span className={stats.status === "connected" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            {stats.status === "connected" ? "Connected" : "Disconnected"}
                          </span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-slate-600">Total Vectors</span>
                          <span className="font-medium">{stats.totalVectors.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-slate-600">Dimensions</span>
                          <span className="font-medium">{stats.dimensions}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-slate-600">Index Type</span>
                          <span className="font-medium">{stats.indexType}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-slate-600">Last Updated</span>
                          <span className="font-medium">{new Date(stats.lastUpdate).toLocaleString()}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-slate-600">No statistics available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Vector Collections</CardTitle>
                    <CardDescription>
                      Collections in the Milvus database
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingStats ? (
                      <div className="flex justify-center py-8">
                        <Spinner size="lg" />
                      </div>
                    ) : statsError ? (
                      <div className="text-center py-6">
                        <p className="text-slate-600">Unable to fetch collections</p>
                      </div>
                    ) : stats && stats.collections.length > 0 ? (
                      <ul className="space-y-2">
                        {stats.collections.map(collection => (
                          <li 
                            key={collection} 
                            className="flex items-center p-3 rounded-md bg-slate-50 hover:bg-slate-100 transition-colors"
                          >
                            <Database className="h-4 w-4 mr-2 text-primary" />
                            <span>{collection}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-slate-600">No collections found</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>RAG Architecture</CardTitle>
                  <CardDescription>
                    How the Retrieval-Augmented Generation system works with Milvus
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-slate-50 p-4 rounded-md mb-4">
                    <h3 className="font-medium mb-2">Retrieval-Augmented Generation (RAG) Workflow</h3>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li><span className="font-medium">Log Ingestion:</span> Telecom logs are uploaded and parsed into segments</li>
                      <li><span className="font-medium">Embedding Generation:</span> Each log segment is converted to vector embeddings</li>
                      <li><span className="font-medium">Vector Storage:</span> Embeddings are stored in Milvus vector database</li>
                      <li><span className="font-medium">Query Processing:</span> User queries are converted to embeddings for semantic similarity</li>
                      <li><span className="font-medium">Retrieval:</span> Similar log segments are retrieved from Milvus</li>
                      <li><span className="font-medium">Generation:</span> Retrieved contexts are used to generate accurate responses</li>
                    </ol>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border rounded-md p-4">
                      <h4 className="font-medium mb-2">Benefits</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Accurate semantic search</li>
                        <li>Context-aware responses</li>
                        <li>Knowledge grounding in logs</li>
                        <li>Reduced hallucinations</li>
                      </ul>
                    </div>
                    
                    <div className="border rounded-md p-4">
                      <h4 className="font-medium mb-2">Performance Factors</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Embedding quality</li>
                        <li>Vector dimensions</li>
                        <li>Similarity algorithms</li>
                        <li>Index optimization</li>
                      </ul>
                    </div>
                    
                    <div className="border rounded-md p-4">
                      <h4 className="font-medium mb-2">Vector Search Features</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Approximate nearest neighbor</li>
                        <li>Similarity threshold filtering</li>
                        <li>Hybrid search capabilities</li>
                        <li>Scalable to millions of vectors</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="browse">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Vectors</CardTitle>
                  <CardDescription>
                    Recently added vectors in the database
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingVectors ? (
                    <div className="flex justify-center py-8">
                      <Spinner size="lg" />
                    </div>
                  ) : vectorsError ? (
                    <div className="text-center py-6">
                      <p className="text-red-500 font-medium mb-2">Error fetching vectors</p>
                      <p className="text-slate-600 text-sm">
                        {vectorsErrorData instanceof Error 
                          ? vectorsErrorData.message 
                          : "Failed to fetch vector data"}
                      </p>
                    </div>
                  ) : recentVectors && recentVectors.length > 0 ? (
                    <Table>
                      <TableCaption>Recently added vectors to Milvus</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Log ID</TableHead>
                          <TableHead className="w-[400px]">Text Segment</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentVectors.map(vector => (
                          <TableRow key={vector.id}>
                            <TableCell className="font-mono text-xs">{vector.id}</TableCell>
                            <TableCell>{vector.logId}</TableCell>
                            <TableCell className="max-w-[400px] truncate">
                              {vector.text}
                            </TableCell>
                            <TableCell>
                              {new Date().toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-slate-600">No vectors found in the database</p>
                      <p className="text-slate-500 text-sm mt-2">
                        Try uploading some log files first to populate the vector store
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="search">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Search Vector Store</CardTitle>
                  <CardDescription>
                    Search for similar content using semantic similarity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter your search query..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="flex-1"
                        />
                        <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
                          {isSearching ? <Spinner size="sm" className="mr-2" /> : null}
                          Search
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm text-slate-500 mb-2 block">
                          Similarity Threshold: {similarityThreshold}%
                        </label>
                        <Slider
                          value={[similarityThreshold]}
                          min={0}
                          max={100}
                          step={5}
                          onValueChange={(value) => setSimilarityThreshold(value[0])}
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm text-slate-500 mb-2 block">
                          Max Results: {maxResults}
                        </label>
                        <Slider
                          value={[maxResults]}
                          min={5}
                          max={50}
                          step={5}
                          onValueChange={(value) => setMaxResults(value[0])}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Search Results</CardTitle>
                  <CardDescription>
                    Vector search results based on semantic similarity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isSearching ? (
                    <div className="flex justify-center py-8">
                      <Spinner size="lg" />
                    </div>
                  ) : searchError ? (
                    <div className="text-center py-6">
                      <p className="text-red-500 font-medium mb-2">Error searching vectors</p>
                      <p className="text-slate-600 text-sm">{searchError.message}</p>
                    </div>
                  ) : searchResults.length > 0 ? (
                    <Table>
                      <TableCaption>Results ordered by similarity score</TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Log ID</TableHead>
                          <TableHead>Filename</TableHead>
                          <TableHead className="w-[400px]">Text Segment</TableHead>
                          <TableHead>Relevance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {searchResults.map((result, index) => (
                          <TableRow key={index}>
                            <TableCell>{result.logId}</TableCell>
                            <TableCell>{result.filename || "Unknown"}</TableCell>
                            <TableCell className="max-w-[400px] truncate">
                              {result.text}
                            </TableCell>
                            <TableCell>
                              <span className={
                                parseFloat(result.relevance || "0") > 90 
                                  ? "text-green-600 font-medium"
                                  : parseFloat(result.relevance || "0") > 70
                                    ? "text-amber-600 font-medium"
                                    : "text-slate-600"
                              }>
                                {result.relevance}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : searchQuery ? (
                    <div className="text-center py-6">
                      <p className="text-slate-600">No matches found for your query</p>
                      <p className="text-slate-500 text-sm mt-2">
                        Try adjusting your search query or lowering the similarity threshold
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-slate-600">Enter a search query to find similar content</p>
                      <p className="text-slate-500 text-sm mt-2">
                        The search uses vector embeddings to find semantically similar content
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}