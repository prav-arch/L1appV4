import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  BarChart,
  FileText,
  Search,
  Upload,
  Settings,
  Home,
  Network,
  Cpu,
  Database,
  Zap
} from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  
  const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/logs", label: "Logs History", icon: FileText },
    { href: "/upload", label: "Upload Logs", icon: Upload },
    { href: "/search", label: "Semantic Search", icon: Search },
    { href: "/advanced", label: "Advanced Analysis", icon: Network },
    { href: "/vector-store", label: "Vector Store", icon: Database },
    { href: "/fine-tuning", label: "Fine-Tuning", icon: Zap },
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
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                  location === item.href 
                    ? "bg-slate-100 text-primary" 
                    : "text-slate-700 hover:bg-slate-100 hover:text-primary"
                )}
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
                className={cn(
                  "flex flex-col items-center py-2 px-3 text-xs",
                  location === item.href 
                    ? "text-primary" 
                    : "text-slate-700 hover:text-primary"
                )}
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
          {children}
        </div>
      </main>
    </div>
  );
}