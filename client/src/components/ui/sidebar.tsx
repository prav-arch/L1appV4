import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  
  const navItems = [
    { path: "/", label: "Dashboard", icon: "fa-home" },
    { path: "/upload", label: "Upload Logs", icon: "fa-upload" },
    { path: "/logs", label: "Log History", icon: "fa-history" },
    { path: "/search", label: "Semantic Search", icon: "fa-search" },
    { path: "/settings", label: "Settings", icon: "fa-cog" },
  ];
  
  return (
    <aside className={cn("hidden md:flex flex-col w-64 bg-slate-800 text-white p-0 shadow-lg", className)}>
      <div className="p-4 border-b border-slate-700">
        <h1 className="text-2xl font-bold flex items-center">
          <i className="fas fa-network-wired mr-3"></i>
          <span>TelecomAI</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">Troubleshooter</p>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        <ul>
          {navItems.map((item) => (
            <li key={item.path} className="mb-1">
              <Link 
                href={item.path} 
                className={cn(
                  "flex items-center px-4 py-3 rounded-lg mx-2",
                  location === item.path
                    ? "text-white bg-primary"
                    : "text-slate-300 hover:bg-slate-700"
                )}
              >
                <i className={`fas ${item.icon} w-5`}></i>
                <span className="ml-3">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center">
            <i className="fas fa-user text-sm"></i>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">Admin User</p>
            <p className="text-xs text-slate-400">Local System</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
