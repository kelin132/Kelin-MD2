import { useListCommands } from "@workspace/api-client-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Command as CommandIcon, Search, Shield, ShieldAlert, Star } from "lucide-react";
import { useState } from "react";

export default function CommandsPage() {
  const { data: commands } = useListCommands();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const categories = ["all", ...Array.from(new Set(commands?.map(c => c.category) || []))];

  const filteredCommands = commands?.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                          c.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || c.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }) || [];

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-mono font-bold text-white tracking-tight flex items-center gap-3">
            <CommandIcon className="text-pink-400" /> COMMAND_REGISTRY
          </h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            {commands?.length || 0} recognized inputs
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search commands..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm font-mono text-white focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-2 text-xs font-mono uppercase tracking-wider rounded-lg border whitespace-nowrap transition-colors ${
                categoryFilter === cat 
                  ? 'bg-pink-500/20 border-pink-500/50 text-pink-400' 
                  : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <GlassCard className="flex-1 overflow-hidden flex flex-col border-white/10">
        <div className="overflow-x-auto flex-1 bg-[#050508]/50">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white/5 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="p-4 text-xs font-mono uppercase tracking-wider text-muted-foreground font-medium border-b border-white/10">Command</th>
                <th className="p-4 text-xs font-mono uppercase tracking-wider text-muted-foreground font-medium border-b border-white/10">Category</th>
                <th className="p-4 text-xs font-mono uppercase tracking-wider text-muted-foreground font-medium border-b border-white/10 hidden md:table-cell">Usage</th>
                <th className="p-4 text-xs font-mono uppercase tracking-wider text-muted-foreground font-medium border-b border-white/10">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCommands.map((cmd) => (
                <tr key={cmd.name} className="hover:bg-white/5 transition-colors group">
                  <td className="p-4">
                    <div className="font-mono text-primary group-hover:neon-text-blue transition-all">{cmd.name}</div>
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-1 max-w-xs">{cmd.description}</div>
                  </td>
                  <td className="p-4">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-white/70 bg-white/10 px-2 py-1 rounded border border-white/5">
                      {cmd.category}
                    </span>
                  </td>
                  <td className="p-4 hidden md:table-cell">
                    <code className="text-xs text-white/50 bg-black/40 px-2 py-1 rounded">
                      {cmd.usage}
                    </code>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1.5">
                      {cmd.isOwner && (
                        <span title="Owner Only" className="text-red-400 bg-red-400/10 p-1 rounded border border-red-400/20"><ShieldAlert size={14} /></span>
                      )}
                      {cmd.isAdmin && !cmd.isOwner && (
                        <span title="Admin Only" className="text-orange-400 bg-orange-400/10 p-1 rounded border border-orange-400/20"><Shield size={14} /></span>
                      )}
                      {cmd.isPremium && (
                        <span title="Premium Feature" className="text-yellow-400 bg-yellow-400/10 p-1 rounded border border-yellow-400/20"><Star size={14} /></span>
                      )}
                      {!cmd.isOwner && !cmd.isAdmin && !cmd.isPremium && (
                        <span className="text-xs text-muted-foreground font-mono">PUBLIC</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCommands.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground font-mono italic">
                    No commands matching the query.
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
