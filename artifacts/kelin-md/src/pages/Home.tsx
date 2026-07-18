import { useGetBotStatus, useGetLogs } from "@workspace/api-client-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Users, MessageSquare, Cpu, HardDrive, Clock, ShieldAlert, Activity, Command, TerminalSquare } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

export default function Home() {
  const { data: status } = useGetBotStatus({ query: { refetchInterval: 3000 } });
  const { data: logs } = useGetLogs({ limit: 5 }, { query: { refetchInterval: 3000 } });

  const stats = [
    { label: "RAM Usage", value: status ? `${status.ramUsageMb.toFixed(1)} MB` : "---", sub: status ? `/ ${status.ramTotalMb} MB` : "", icon: HardDrive, color: "text-blue-400" },
    { label: "CPU Load", value: status ? `${status.cpuUsage.toFixed(1)}%` : "---", icon: Cpu, color: "text-purple-400" },
    { label: "Users", value: status?.totalUsers || 0, icon: Users, color: "text-green-400" },
    { label: "Groups", value: status?.totalGroups || 0, icon: MessageSquare, color: "text-orange-400" },
    { label: "Commands", value: status?.totalCommands || 0, icon: Command, color: "text-pink-400" },
    { label: "Plugins", value: status?.pluginCount || 0, icon: Activity, color: "text-cyan-400" },
  ];

  const formatUptime = (seconds: number) => {
    if (!seconds) return "0h 0m";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      {/* Hero Status */}
      <GlassCard className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border-l-4 border-l-primary relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="flex items-center gap-6 z-10">
          <div className="w-20 h-20 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center relative shadow-[0_0_30px_rgba(0,212,255,0.15)]">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-2xl pointer-events-none" />
            <Activity className="w-10 h-10 text-primary drop-shadow-[0_0_15px_rgba(0,212,255,0.8)]" />
          </div>
          <div>
            <h1 className="text-3xl font-mono font-bold text-white mb-2 tracking-tight">KELIN MD <span className="text-primary">CORE</span></h1>
            <div className="flex flex-wrap items-center gap-3 text-sm font-mono">
              <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded border border-white/10">
                <span className={`w-2 h-2 rounded-full ${status?.connected ? 'bg-primary shadow-[0_0_8px_rgba(0,212,255,0.8)]' : 'bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`} />
                {status?.status.toUpperCase() || "CONNECTING..."}
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock size={14} />
                UPTIME: {formatUptime(status?.uptime || 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 z-10 w-full md:w-auto">
          {!status?.connected && status?.status !== "pairing" && (
            <Link href="/pair" className="flex-1 md:flex-none">
              <button className="w-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 px-6 py-2.5 rounded-lg font-mono text-sm tracking-wide transition-all shadow-[0_0_15px_rgba(0,212,255,0.2)] hover:shadow-[0_0_25px_rgba(0,212,255,0.4)]">
                PAIR DEVICE
              </button>
            </Link>
          )}
          <Link href="/settings" className="flex-1 md:flex-none">
            <button className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 px-6 py-2.5 rounded-lg font-mono text-sm tracking-wide transition-all">
              SYSTEM CONFIG
            </button>
          </Link>
        </div>
      </GlassCard>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            key={stat.label}
          >
            <GlassCard className="p-4 flex flex-col gap-3 hover:-translate-y-1 transition-transform duration-300">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-mono uppercase tracking-wider">{stat.label}</span>
                <stat.icon size={16} className={stat.color} />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-semibold font-mono tracking-tight text-white/90">{stat.value}</span>
                {stat.sub && <span className="text-xs text-muted-foreground font-mono mb-1">{stat.sub}</span>}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Lower Section */}
      <div className="grid md:grid-cols-3 gap-6 h-[400px]">
        {/* Mini Terminal */}
        <GlassCard className="md:col-span-2 flex flex-col h-full border-white/10">
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-2 font-mono text-sm text-white/80">
              <TerminalSquare size={16} className="text-primary" />
              LIVE_FEED.log
            </div>
            <Link href="/logs" className="text-xs text-primary hover:text-primary/80 font-mono">
              VIEW_ALL -&gt;
            </Link>
          </div>
          <div className="p-4 font-mono text-xs overflow-hidden flex flex-col-reverse gap-1.5 flex-1 bg-[#050508]">
            {logs?.map((log) => (
              <div key={log.id} className="flex gap-3 leading-relaxed opacity-80 hover:opacity-100 transition-opacity">
                <span className="text-white/40 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                </span>
                <span className={`shrink-0 w-12 ${
                  log.level === 'error' ? 'text-destructive' : 
                  log.level === 'warn' ? 'text-orange-400' : 
                  log.level === 'debug' ? 'text-purple-400' : 'text-primary'
                }`}>
                  [{log.level.toUpperCase()}]
                </span>
                <span className="text-white/80 truncate">{log.message}</span>
              </div>
            ))}
            {!logs?.length && <div className="text-muted-foreground italic">Awaiting telemetry...</div>}
          </div>
        </GlassCard>

        {/* Quick Actions */}
        <GlassCard className="flex flex-col h-full border-white/10">
          <div className="p-4 border-b border-white/10 bg-black/20">
            <h3 className="font-mono text-sm text-white/80 flex items-center gap-2">
              <Command size={16} className="text-secondary" />
              QUICK_ACTIONS
            </h3>
          </div>
          <div className="p-4 flex-1 flex flex-col gap-3">
            <ActionBtn href="/plugins" icon={Activity} label="Manage Plugins" />
            <ActionBtn href="/commands" icon={Command} label="Command Registry" />
            <ActionBtn href="/files" icon={HardDrive} label="File System" />
            <ActionBtn href="/api-status" icon={Cpu} label="API Integrations" />
            <ActionBtn href="/backup" icon={HardDrive} label="System Backup" />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function ActionBtn({ href, icon: Icon, label }: { href: string, icon: any, label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 p-3 rounded bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all group cursor-pointer">
      <div className="w-8 h-8 rounded bg-black/30 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <Icon size={16} className="text-white/60 group-hover:text-primary transition-colors" />
      </div>
      <span className="font-mono text-sm text-white/80 group-hover:text-white">{label}</span>
      <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-primary font-mono">-&gt;</span>
    </Link>
  );
}
