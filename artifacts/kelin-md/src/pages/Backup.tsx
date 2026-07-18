import { useListBackups, useCreateBackup, useRestoreBackup } from "@workspace/api-client-react";
import { GlassCard } from "@/components/ui/glass-card";
import { HardDriveUpload, Download, RefreshCcw, Database, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function BackupPage() {
  const { data: backups, refetch } = useListBackups();
  const createBackup = useCreateBackup();
  const restoreBackup = useRestoreBackup();
  const { toast } = useToast();

  const handleCreate = () => {
    createBackup.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Backup created successfully" });
        refetch();
      }
    });
  };

  const handleRestore = (id: string) => {
    if (confirm("WARNING: Restoring a backup will overwrite current database state. Proceed?")) {
      restoreBackup.mutate({ data: { backupId: id } }, {
        onSuccess: () => {
          toast({ title: "Backup restored successfully. Bot restarting..." });
        }
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-mono font-bold text-white tracking-tight flex items-center gap-3">
            <HardDriveUpload className="text-primary" /> SYSTEM_BACKUP
          </h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            Database snapshots and restoration
          </p>
        </div>
        <button 
          onClick={handleCreate}
          disabled={createBackup.isPending}
          className="flex items-center justify-center gap-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50 px-5 py-2.5 rounded-lg font-mono text-sm transition-all shadow-[0_0_15px_rgba(0,212,255,0.1)]"
        >
          {createBackup.isPending ? <RefreshCcw className="animate-spin w-4 h-4" /> : <Database size={16} />}
          CREATE SNAPSHOT
        </button>
      </div>

      <GlassCard className="border-white/10 overflow-hidden">
        <div className="p-4 bg-yellow-500/10 border-b border-yellow-500/20 flex gap-3 text-yellow-400/90 text-sm font-mono">
          <AlertTriangle className="shrink-0" size={18} />
          <p>Restoring a backup will temporarily stop the bot and overwrite all current users, groups, and settings data.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-black/40">
              <tr>
                <th className="p-4 text-xs font-mono uppercase tracking-wider text-muted-foreground font-medium">Snapshot ID / File</th>
                <th className="p-4 text-xs font-mono uppercase tracking-wider text-muted-foreground font-medium">Date Created</th>
                <th className="p-4 text-xs font-mono uppercase tracking-wider text-muted-foreground font-medium">Size</th>
                <th className="p-4 text-xs font-mono uppercase tracking-wider text-muted-foreground font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {backups?.map((backup) => (
                <tr key={backup.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-4">
                    <div className="font-mono text-white/90">{backup.filename}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-1 opacity-50">{backup.id}</div>
                  </td>
                  <td className="p-4 text-sm text-white/70 font-mono">
                    {new Date(backup.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4 text-sm text-white/70 font-mono">
                    {backup.sizeMb.toFixed(2)} MB
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        className="p-2 text-muted-foreground hover:text-white bg-white/5 rounded border border-white/5 hover:border-white/20 transition-all"
                        title="Download"
                      >
                        <Download size={16} />
                      </button>
                      <button 
                        onClick={() => handleRestore(backup.id)}
                        disabled={restoreBackup.isPending}
                        className="px-3 py-1.5 text-xs font-mono text-primary bg-primary/10 hover:bg-primary/20 rounded border border-primary/20 transition-all"
                      >
                        RESTORE
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {backups?.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground font-mono italic bg-[#050508]">
                    No backups found in the system.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
