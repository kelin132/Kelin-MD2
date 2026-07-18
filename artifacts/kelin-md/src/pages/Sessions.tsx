import { useGetSession, useLogout } from "@workspace/api-client-react";
import { GlassCard } from "@/components/ui/glass-card";
import { KeyRound, Smartphone, LogOut, CheckCircle2, ShieldAlert, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function SessionsPage() {
  const { data: session, refetch } = useGetSession();
  const logout = useLogout();
  const { toast } = useToast();

  const handleLogout = () => {
    if (confirm("Are you sure you want to disconnect this session? The bot will go offline until re-paired.")) {
      logout.mutate(undefined, {
        onSuccess: () => {
          toast({ title: "Session disconnected" });
          refetch();
        }
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-mono font-bold text-white tracking-tight flex items-center gap-3">
          <KeyRound className="text-secondary" /> SESSION_CONTROL
        </h1>
        <p className="text-sm text-muted-foreground font-mono mt-1">
          Manage active WhatsApp connections and authentication tokens
        </p>
      </div>

      <GlassCard className="p-8 border-white/10 relative overflow-hidden">
        {session?.connected ? (
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        ) : (
          <div className="absolute top-0 right-0 w-64 h-64 bg-destructive/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        )}

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${session?.connected ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-destructive/10 border-destructive/30 text-destructive'}`}>
              <Smartphone size={32} />
            </div>
            <div>
              <h2 className="text-xl font-mono text-white mb-1">
                {session?.name || "WhatsApp Account"}
              </h2>
              <div className="flex items-center gap-3 text-sm font-mono text-muted-foreground">
                <span className="flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded border border-white/5">
                  <span className={`w-2 h-2 rounded-full ${session?.connected ? 'bg-green-400' : 'bg-destructive'}`} />
                  {session?.connected ? 'ACTIVE' : 'DISCONNECTED'}
                </span>
                {session?.phoneNumber && <span>+{session.phoneNumber}</span>}
              </div>
            </div>
          </div>

          {session?.connected ? (
            <button
              onClick={handleLogout}
              disabled={logout.isPending}
              className="flex items-center gap-2 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30 px-5 py-2.5 rounded-lg font-mono text-sm transition-all"
            >
              <LogOut size={16} /> DISCONNECT
            </button>
          ) : (
            <Link href="/pair">
              <button className="flex items-center gap-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 px-5 py-2.5 rounded-lg font-mono text-sm transition-all shadow-[0_0_15px_rgba(0,212,255,0.2)]">
                PAIR NEW DEVICE
              </button>
            </Link>
          )}
        </div>

        <div className="mt-8 grid md:grid-cols-2 gap-4 border-t border-white/5 pt-8 relative z-10">
          <div className="space-y-4">
            <h3 className="text-xs font-mono text-white/50 uppercase tracking-widest">Session Details</h3>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className={session?.hasSession ? "text-green-400" : "text-destructive"}>
                  {session?.hasSession ? "Token Exists" : "No Token"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Connected Since</span>
                <span className="text-white/90">
                  {session?.connectedAt ? new Date(session.connectedAt).toLocaleString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Session Path</span>
                <code className="text-white/50 bg-black/40 px-1 rounded truncate max-w-[200px]">
                  {session?.sessionPath || './session'}
                </code>
              </div>
            </div>
          </div>
          
          <div className="bg-black/30 rounded-xl p-4 border border-white/5 flex gap-4">
            <ShieldAlert className="text-secondary shrink-0" />
            <div className="text-sm text-white/70">
              <p className="mb-2 font-medium text-white/90">Security Notice</p>
              <p className="text-xs leading-relaxed">
                The session token allows this dashboard to control the WhatsApp account. 
                Do not share your session folder with anyone. If you suspect a breach, use the disconnect button to invalidate the token immediately.
              </p>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
