import { useGetApiStatus } from "@workspace/api-client-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Cpu, CheckCircle2, XCircle, AlertCircle, ExternalLink } from "lucide-react";
import { Link } from "wouter";

export default function ApiStatusPage() {
  const { data: apiStatus } = useGetApiStatus();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-mono font-bold text-white tracking-tight flex items-center gap-3">
            <Cpu className="text-primary" /> API_INTEGRATIONS
          </h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            Status of external API keys and services
          </p>
        </div>
        <Link href="/settings">
          <button className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg text-sm font-mono text-white transition-all">
            CONFIGURE KEYS
          </button>
        </Link>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {apiStatus?.map(api => (
          <GlassCard key={api.name} className="p-5 border-white/5 flex flex-col h-full hover:border-white/20 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-mono font-bold text-white/90">{api.name}</h3>
              {api.configured ? (
                api.working ? (
                  <span className="text-green-400 bg-green-400/10 p-1.5 rounded-full" title="Working">
                    <CheckCircle2 size={18} />
                  </span>
                ) : (
                  <span className="text-orange-400 bg-orange-400/10 p-1.5 rounded-full" title="Failing">
                    <AlertCircle size={18} />
                  </span>
                )
              ) : (
                <span className="text-muted-foreground bg-white/5 p-1.5 rounded-full" title="Not Configured">
                  <XCircle size={18} />
                </span>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground mb-4 flex-1">
              {api.description || `${api.name} integration API`}
            </p>
            
            <div className="pt-3 border-t border-white/5 mt-auto flex justify-between items-center text-xs font-mono">
              <span className={`px-2 py-1 rounded border ${
                api.configured ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-white/5 border-white/10 text-white/40'
              }`}>
                {api.configured ? 'CONFIGURED' : 'MISSING KEY'}
              </span>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
