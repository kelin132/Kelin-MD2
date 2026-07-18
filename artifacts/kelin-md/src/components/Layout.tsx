import { motion } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { useLocation } from "wouter";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="min-h-[100dvh] flex bg-[#0A0A10] text-slate-200 selection:bg-primary/30 overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-secondary/10 via-background to-background">
      {/* Background ambient light */}
      <div className="fixed top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-[120px] pointer-events-none" />
      
      {/* Grid overlay */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />

      <Sidebar />
      
      <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
        <TopBar />
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-7xl mx-auto h-full"
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}

function TopBar() {
  const [location] = useLocation();
  const title = getTitle(location);

  return (
    <header className="h-16 glass-panel border-b border-white/5 border-l-0 border-t-0 border-r-0 flex items-center justify-between px-6 md:px-8 z-20 shrink-0">
      <div className="flex items-center gap-4">
        {/* Mobile spacing adjustment */}
        <div className="w-8 md:hidden" />
        <h2 className="text-xl font-medium tracking-wide font-mono text-white/90 drop-shadow-md">
          <span className="text-primary mr-2">/</span>
          {title}
        </h2>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Placeholder for top bar actions, notifications etc */}
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          SYSTEM ONLINE
        </div>
      </div>
    </header>
  );
}

function getTitle(path: string) {
  if (path === "/") return "OVERVIEW";
  if (path.startsWith("/pair")) return "PAIRING_CODE";
  if (path.startsWith("/logs")) return "CONSOLE_LOGS";
  if (path.startsWith("/plugins")) return "PLUGINS_MANAGER";
  if (path.startsWith("/commands")) return "COMMAND_REGISTRY";
  if (path.startsWith("/stats")) return "STATISTICS";
  if (path.startsWith("/sessions")) return "SESSION_CONTROL";
  if (path.startsWith("/files")) return "FILE_SYSTEM";
  if (path.startsWith("/api-status")) return "API_INTEGRATIONS";
  if (path.startsWith("/settings")) return "CONFIGURATION";
  if (path.startsWith("/backup")) return "BACKUP_RESTORE";
  return "DASHBOARD";
}
