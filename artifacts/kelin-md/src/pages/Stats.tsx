import { useGetBotStatus } from "@workspace/api-client-react";
import { GlassCard } from "@/components/ui/glass-card";
import { BarChart2, Activity, Zap, HardDrive } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { useEffect, useState } from "react";

// Generate mock historical data based on current status for the chart
function useHistoricalData(currentStatus: any) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (!currentStatus) return;
    
    // Initialize mock historical data on first load
    if (data.length === 0) {
      const mockData = Array.from({ length: 20 }).map((_, i) => ({
        time: new Date(Date.now() - (20 - i) * 3000).toLocaleTimeString([], {minute:'2-digit', second:'2-digit'}),
        ram: Math.max(10, currentStatus.ramUsageMb - Math.random() * 20 + 10),
        cpu: Math.max(1, currentStatus.cpuUsage - Math.random() * 10 + 5)
      }));
      setData(mockData);
      return;
    }

    // Append new point
    setData(prev => {
      const newPoint = {
        time: new Date().toLocaleTimeString([], {minute:'2-digit', second:'2-digit'}),
        ram: currentStatus.ramUsageMb,
        cpu: currentStatus.cpuUsage
      };
      return [...prev.slice(1), newPoint];
    });
  }, [currentStatus]);

  return data;
}

export default function StatsPage() {
  const { data: status } = useGetBotStatus({ query: { refetchInterval: 3000 } });
  const chartData = useHistoricalData(status);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-mono font-bold text-white tracking-tight flex items-center gap-3">
          <BarChart2 className="text-primary" /> SYSTEM_METRICS
        </h1>
        <p className="text-sm text-muted-foreground font-mono mt-1">
          Real-time resource utilization and throughput
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <GlassCard className="p-6 border-white/10 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-xl group-hover:bg-primary/20 transition-colors" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-black/40 rounded-xl border border-white/5">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase">CPU Load</p>
              <h3 className="text-2xl font-mono font-bold text-white mt-1">{status?.cpuUsage?.toFixed(1) || 0}%</h3>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 border-white/10 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary/10 rounded-full blur-xl group-hover:bg-secondary/20 transition-colors" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-black/40 rounded-xl border border-white/5">
              <HardDrive className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase">Memory Usage</p>
              <h3 className="text-2xl font-mono font-bold text-white mt-1">{status?.ramUsageMb?.toFixed(1) || 0} <span className="text-sm text-white/50">MB</span></h3>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 border-white/10 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/10 rounded-full blur-xl group-hover:bg-green-500/20 transition-colors" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-black/40 rounded-xl border border-white/5">
              <Activity className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase">Uptime</p>
              <h3 className="text-2xl font-mono font-bold text-white mt-1">
                {status ? Math.floor(status.uptime / 3600) : 0}<span className="text-sm text-white/50 mx-1">h</span>
                {status ? Math.floor((status.uptime % 3600) / 60) : 0}<span className="text-sm text-white/50 ml-1">m</span>
              </h3>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-6 border-white/10">
        <h3 className="text-sm font-mono text-white/80 mb-6 uppercase tracking-widest flex items-center gap-2">
          <Activity size={16} className="text-primary" /> Resource History
        </h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(190, 100%, 50%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(190, 100%, 50%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(260, 89%, 58%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(260, 89%, 58%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(10, 10, 16, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                itemStyle={{ fontFamily: 'monospace' }}
                labelStyle={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', marginBottom: '8px' }}
              />
              <Area type="monotone" dataKey="ram" name="RAM (MB)" stroke="hsl(190, 100%, 50%)" strokeWidth={2} fillOpacity={1} fill="url(#colorRam)" />
              <Area type="monotone" dataKey="cpu" name="CPU (%)" stroke="hsl(260, 89%, 58%)" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </div>
  );
}
