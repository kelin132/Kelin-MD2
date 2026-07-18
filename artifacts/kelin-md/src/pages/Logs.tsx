import { useGetLogs, useClearLogs } from "@workspace/api-client-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Terminal, Trash2, Filter, Download } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { GetLogsLevel } from "@workspace/api-client-react";

export default function LogsPage() {
  const [level, setLevel] = useState<GetLogsLevel>("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { data: logs, refetch } = useGetLogs(
    { level: level === "all" ? undefined : level, limit: 100 },
    { query: { refetchInterval: 2000 } }
  );
  
  const clearLogs = useClearLogs();

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleClear = () => {
    clearLogs.mutate(undefined, {
      onSuccess: () => refetch()
    });
  };

  const handleExport = () => {
    if (!logs) return;
    const content = logs.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message} ${l.details || ''}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kelin-md-logs-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLogColor = (logLevel: string) => {
    switch (logLevel) {
      case 'error': return 'text-destructive';
      case 'warn': return 'text-orange-400';
      case 'debug': return 'text-purple-400';
      case 'info': return 'text-primary';
      default: return 'text-white/80';
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-mono font-bold text-white tracking-tight flex items-center gap-3">
          <Terminal className="text-primary" /> SYSTEM_CONSOLE
        </h1>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
            {['all', 'info', 'warn', 'error', 'debug'].map(l => (
              <button
                key={l}
                onClick={() => setLevel(l as GetLogsLevel)}
                className={`px-3 py-1 text-xs font-mono rounded ${level === l ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white/80'}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors ${autoScroll ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-transparent border-white/10 text-muted-foreground'}`}
          >
            AUTO_SCROLL: {autoScroll ? 'ON' : 'OFF'}
          </button>
          
          <button onClick={handleExport} className="p-1.5 text-muted-foreground hover:text-white bg-white/5 rounded border border-white/5 hover:border-white/20 transition-all">
            <Download size={16} />
          </button>
          <button onClick={handleClear} disabled={clearLogs.isPending} className="p-1.5 text-muted-foreground hover:text-destructive bg-white/5 rounded border border-white/5 hover:border-destructive/30 transition-all">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <GlassCard className="flex-1 flex flex-col border-white/10 overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 h-8 bg-gradient-to-b from-black/40 to-transparent z-10 pointer-events-none" />
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 font-mono text-[13px] bg-[#050508] relative"
        >
          {logs?.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground italic">
              No logs found for this filter.
            </div>
          ) : (
            <div className="space-y-2">
              {logs?.map(log => (
                <div key={log.id} className="flex flex-col sm:flex-row sm:gap-4 hover:bg-white/5 p-1 -mx-1 rounded transition-colors break-all">
                  <div className="flex gap-3 shrink-0">
                    <span className="text-white/30 w-24">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit', fractionalSecondDigits: 3 })}
                    </span>
                    <span className={`w-14 ${getLogColor(log.level)}`}>
                      [{log.level.toUpperCase()}]
                    </span>
                  </div>
                  <div className="flex flex-col flex-1 pl-12 sm:pl-0">
                    <span className="text-white/90">{log.message}</span>
                    {log.details && (
                      <span className="text-white/40 text-[11px] mt-0.5 whitespace-pre-wrap font-sans">{log.details}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-black/60 to-transparent z-10 pointer-events-none" />
      </GlassCard>
    </div>
  );
}
