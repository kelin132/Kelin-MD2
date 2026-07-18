import { useListPlugins, useReloadPlugins, useTogglePlugin } from "@workspace/api-client-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Puzzle, RefreshCw, Power, Check, X, Search } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PluginsPage() {
  const { data: plugins, refetch } = useListPlugins();
  const reload = useReloadPlugins();
  const toggle = useTogglePlugin();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const categories = ["all", ...Array.from(new Set(plugins?.map(p => p.category) || []))];

  const filteredPlugins = plugins?.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }) || [];

  const handleToggle = (id: string, currentEnabled: boolean) => {
    toggle.mutate(
      { pluginId: id, data: { enabled: !currentEnabled } },
      { onSuccess: () => refetch() }
    );
  };

  const handleReload = () => {
    reload.mutate(undefined, { onSuccess: () => refetch() });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-mono font-bold text-white tracking-tight flex items-center gap-3">
            <Puzzle className="text-secondary" /> PLUGIN_MANAGER
          </h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            {plugins?.length || 0} modules loaded • {plugins?.filter(p => p.enabled).length || 0} active
          </p>
        </div>
        
        <button 
          onClick={handleReload}
          disabled={reload.isPending}
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg text-sm font-mono transition-all disabled:opacity-50"
        >
          <RefreshCw size={16} className={reload.isPending ? "animate-spin" : ""} /> 
          RELOAD ALL
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search plugins..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm font-mono text-white focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-2 text-xs font-mono uppercase tracking-wider rounded-lg border whitespace-nowrap transition-colors ${
                categoryFilter === cat 
                  ? 'bg-secondary/20 border-secondary/50 text-secondary' 
                  : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredPlugins.map((plugin, i) => (
            <motion.div
              key={plugin.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <GlassCard className={`p-5 border-l-2 ${plugin.enabled ? 'border-l-primary' : 'border-l-muted'} flex flex-col h-full`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-mono font-bold text-white/90 truncate">{plugin.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] uppercase font-mono tracking-widest text-secondary bg-secondary/10 px-2 py-0.5 rounded border border-secondary/20">
                        {plugin.category}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        v{plugin.version || '1.0.0'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(plugin.id, plugin.enabled)}
                    className={`p-2 rounded-full border transition-all ${
                      plugin.enabled 
                        ? 'bg-primary/10 border-primary/30 text-primary shadow-[0_0_10px_rgba(0,212,255,0.2)] hover:bg-primary/20' 
                        : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'
                    }`}
                  >
                    <Power size={16} />
                  </button>
                </div>
                
                <p className="text-sm text-muted-foreground mt-2 mb-4 line-clamp-2 flex-1">
                  {plugin.description}
                </p>
                
                <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono">
                  <span className="text-white/50">{plugin.commandCount} commands</span>
                  <span className={`flex items-center gap-1 ${plugin.enabled ? 'text-green-400' : 'text-muted-foreground'}`}>
                    {plugin.enabled ? <Check size={12} /> : <X size={12} />}
                    {plugin.enabled ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {filteredPlugins.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground font-mono border border-dashed border-white/10 rounded-xl bg-white/5">
            No modules found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
}
