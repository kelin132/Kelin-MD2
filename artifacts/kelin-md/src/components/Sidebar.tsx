import { Link, useLocation } from "wouter";
import { 
  Activity, 
  TerminalSquare, 
  Puzzle, 
  Command, 
  BarChart2, 
  Smartphone, 
  FolderOpen, 
  KeyRound, 
  Settings, 
  HardDriveUpload,
  Cpu,
  LogOut,
  Power,
  RefreshCw,
  Menu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetBotStatus, useLogout, useRestartBot, useShutdownBot } from "@workspace/api-client-react";
import { useState } from "react";
import { GlassCard } from "./ui/glass-card";

const navItems = [
  { name: "Overview", path: "/", icon: Activity },
  { name: "Pairing", path: "/pair", icon: Smartphone },
  { name: "Console", path: "/logs", icon: TerminalSquare },
  { name: "Plugins", path: "/plugins", icon: Puzzle },
  { name: "Commands", path: "/commands", icon: Command },
  { name: "Statistics", path: "/stats", icon: BarChart2 },
  { name: "Sessions", path: "/sessions", icon: KeyRound },
  { name: "Files", path: "/files", icon: FolderOpen },
  { name: "API Status", path: "/api-status", icon: Cpu },
  { name: "Settings", path: "/settings", icon: Settings },
  { name: "Backups", path: "/backup", icon: HardDriveUpload },
];

export function Sidebar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: status } = useGetBotStatus({ query: { refetchInterval: 3000 } });
  
  return (
    <>
      {/* Mobile Toggle */}
      <button 
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 glass-panel rounded-md text-white"
      >
        <Menu size={20} />
      </button>

      {/* Sidebar */}
      <div className={cn(
        "fixed md:static inset-y-0 left-0 z-40 w-64 glass-panel border-r border-white/10 flex flex-col transition-transform duration-300 ease-in-out",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Brand */}
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center neon-border-blue">
            <Cpu className="text-primary w-5 h-5" />
          </div>
          <div>
            <h1 className="font-mono font-bold text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary neon-text-blue">
              KELIN MD
            </h1>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest opacity-70">
              v{status?.version || "1.0.0"}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.path} 
                href={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                  isActive 
                    ? "bg-white/10 text-white" 
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                )}
                onClick={() => setMobileOpen(false)}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-primary rounded-r-full shadow-[0_0_10px_rgba(0,212,255,1)]" />
                )}
                <Icon size={18} className={cn(
                  "transition-colors duration-200",
                  isActive ? "text-primary drop-shadow-[0_0_8px_rgba(0,212,255,0.8)]" : "group-hover:text-white"
                )} />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Bot Status */}
        <div className="p-4 border-t border-white/10">
          <div className="glass-panel bg-black/40 rounded-xl p-4 border border-white/5 relative overflow-hidden">
            {/* Ambient glow behind status */}
            <div className={cn(
              "absolute inset-0 opacity-20 transition-colors duration-1000",
              status?.connected ? "bg-primary" : "bg-destructive"
            )} />
            
            <div className="relative z-10 flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white/90">Bot Status</span>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  {status?.connected && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  )}
                  <span className={cn(
                    "relative inline-flex rounded-full h-2.5 w-2.5",
                    status?.connected ? "bg-primary shadow-[0_0_8px_rgba(0,212,255,0.8)]" : "bg-destructive"
                  )}></span>
                </span>
                <span className="text-xs uppercase tracking-wider font-mono text-muted-foreground">
                  {status?.status || "Unknown"}
                </span>
              </div>
            </div>
            
            {status?.connectedNumber && (
              <div className="text-xs text-white/70 font-mono flex items-center gap-2 bg-white/5 p-2 rounded mb-3 border border-white/5">
                <Smartphone size={12} className="text-secondary" />
                +{status.connectedNumber}
              </div>
            )}
            
            <div className="flex justify-between gap-2 mt-2">
              <RestartButton />
              <ShutdownButton />
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  );
}

function RestartButton() {
  const restart = useRestartBot();
  return (
    <button 
      onClick={() => restart.mutate()}
      disabled={restart.isPending}
      className="flex-1 bg-white/5 hover:bg-white/10 text-white/80 p-2 rounded flex items-center justify-center transition-colors border border-white/10 hover:border-primary/50 group"
      title="Restart Bot"
    >
      <RefreshCw size={14} className={cn("group-hover:text-primary transition-colors", restart.isPending && "animate-spin")} />
    </button>
  );
}

function ShutdownButton() {
  const shutdown = useShutdownBot();
  return (
    <button 
      onClick={() => shutdown.mutate()}
      disabled={shutdown.isPending}
      className="flex-1 bg-white/5 hover:bg-destructive/20 text-white/80 p-2 rounded flex items-center justify-center transition-colors border border-white/10 hover:border-destructive/50 group"
      title="Shutdown Bot"
    >
      <Power size={14} className={cn("group-hover:text-destructive transition-colors")} />
    </button>
  );
}
