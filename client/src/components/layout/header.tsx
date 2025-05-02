import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Menu, Bell, User } from "lucide-react";

interface HeaderProps {
  title?: string;
  onToggleSidebar?: () => void;
}

export function Header({ title = "Dashboard", onToggleSidebar }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle search submit
    console.log("Search for:", searchQuery);
  };
  
  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden mr-4 text-slate-500"
            onClick={onToggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
        
        <div className="flex items-center space-x-4">
          <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
            <Input
              type="text"
              placeholder="Search logs..."
              className="pl-10 pr-4 py-2 bg-slate-100 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          </form>
          
          <Button variant="ghost" size="icon" className="rounded-full">
            <Bell className="h-5 w-5 text-slate-500" />
          </Button>
          
          <Button variant="ghost" size="icon" className="rounded-full md:hidden">
            <User className="h-5 w-5 text-slate-500" />
          </Button>
        </div>
      </div>
    </header>
  );
}
