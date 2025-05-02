import { ReactNode } from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
}

export function MainLayout({ children, title = "Dashboard" }: MainLayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100">
          {children}
        </main>
        
        <Footer />
      </div>
    </div>
  );
}
