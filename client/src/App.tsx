import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import LogsHistory from "@/pages/logs-history";
import UploadLogs from "@/pages/upload-logs";
import SemanticSearchPage from "@/pages/semantic-search";
import Settings from "@/pages/settings";
import AdvancedAnalysis from "@/pages/advanced-analysis";
import VectorStore from "@/pages/vector-store";
import ModelFineTuning from "@/pages/model-fine-tuning";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/logs" component={LogsHistory} />
      <Route path="/upload" component={UploadLogs} />
      <Route path="/search" component={SemanticSearchPage} />
      <Route path="/advanced" component={AdvancedAnalysis} />
      <Route path="/vector-store" component={VectorStore} />
      <Route path="/fine-tuning" component={ModelFineTuning} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
