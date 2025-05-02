import { cn } from "@/lib/utils";

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  // This would typically be fetched from an API or context
  const llmStatus = "connected"; // connected, disconnected, error
  
  return (
    <footer className={cn("bg-white border-t border-slate-200 py-4 px-6", className)}>
      <div className="flex flex-col md:flex-row justify-between items-center">
        <div className="text-sm text-slate-500 mb-2 md:mb-0">
          <span>TelecomAI Troubleshooter</span>
          <span className="mx-2">•</span>
          <span>Running Locally on Ubuntu</span>
        </div>
        <div className="text-sm text-slate-500">
          <span>LLM Status:</span>
          <span className={cn(
            "ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
            llmStatus === "connected" ? "bg-green-100 text-green-800" : 
            llmStatus === "disconnected" ? "bg-amber-100 text-amber-800" : 
            "bg-red-100 text-red-800"
          )}>
            <span className={cn(
              "h-1.5 w-1.5 rounded-full mr-1",
              llmStatus === "connected" ? "bg-green-500" : 
              llmStatus === "disconnected" ? "bg-amber-500" : 
              "bg-red-500"
            )}></span>
            {llmStatus === "connected" ? "Connected" : 
             llmStatus === "disconnected" ? "Disconnected" : 
             "Error"}
          </span>
        </div>
      </div>
    </footer>
  );
}
