import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Settings as SettingsIcon, Save, RefreshCw } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

const settingsSchema = z.object({
  botName: z.string().min(1, "Bot name is required"),
  ownerName: z.string(),
  ownerNumber: z.string(),
  prefix: z.string().min(1, "Prefix is required"),
  themeEmoji: z.string(),
  footer: z.string(),
  autoRead: z.boolean().default(false),
  autoReact: z.boolean().default(false),
  antiLink: z.boolean().default(false),
  antiSpam: z.boolean().default(false),
  antiDelete: z.boolean().default(false),
  welcomeMessage: z.boolean().default(false),
});

export default function SettingsPage() {
  const { data: settings, isFetching } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      botName: "", ownerName: "", ownerNumber: "", prefix: "", themeEmoji: "", footer: "",
      autoRead: false, autoReact: false, antiLink: false, antiSpam: false, antiDelete: false, welcomeMessage: false
    }
  });

  const initialized = useRef(false);

  useEffect(() => {
    if (settings && !initialized.current) {
      form.reset({
        botName: settings.botName,
        ownerName: settings.ownerName,
        ownerNumber: settings.ownerNumber,
        prefix: settings.prefix,
        themeEmoji: settings.themeEmoji,
        footer: settings.footer,
        autoRead: settings.autoRead || false,
        autoReact: settings.autoReact || false,
        antiLink: settings.antiLink || false,
        antiSpam: settings.antiSpam || false,
        antiDelete: settings.antiDelete || false,
        welcomeMessage: settings.welcomeMessage || false,
      });
      initialized.current = true;
    }
  }, [settings, form]);

  const onSubmit = (values: z.infer<typeof settingsSchema>) => {
    updateSettings.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Settings saved successfully", variant: "default" });
      },
      onError: () => {
        toast({ title: "Failed to save settings", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-mono font-bold text-white tracking-tight flex items-center gap-3">
            <SettingsIcon className="text-primary" /> SYSTEM_CONFIGURATION
          </h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            Core bot parameters and feature toggles
          </p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <GlassCard className="p-6 border-white/10 space-y-4">
            <h2 className="text-sm font-mono text-secondary uppercase tracking-widest border-b border-white/5 pb-2 mb-4">Identity & Display</h2>
            
            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground">Bot Name</label>
              <input {...form.register("botName")} className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-sm font-mono text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground">Owner Name</label>
                <input {...form.register("ownerName")} className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-sm font-mono text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground">Owner Number</label>
                <input {...form.register("ownerNumber")} className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-sm font-mono text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground">Command Prefix</label>
                <input {...form.register("prefix")} className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-sm font-mono text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground">Theme Emoji</label>
                <input {...form.register("themeEmoji")} className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-sm font-mono text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground">Message Footer</label>
              <input {...form.register("footer")} className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-sm font-mono text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
            </div>
          </GlassCard>

          <GlassCard className="p-6 border-white/10 space-y-6">
            <h2 className="text-sm font-mono text-primary uppercase tracking-widest border-b border-white/5 pb-2">Feature Toggles</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <ToggleField form={form} name="autoRead" label="Auto-Read Msgs" />
              <ToggleField form={form} name="autoReact" label="Auto-React" />
              <ToggleField form={form} name="antiLink" label="Anti-Link" />
              <ToggleField form={form} name="antiSpam" label="Anti-Spam" />
              <ToggleField form={form} name="antiDelete" label="Anti-Delete" />
              <ToggleField form={form} name="welcomeMessage" label="Welcome Msgs" />
            </div>
          </GlassCard>
        </div>

        <div className="flex justify-end gap-4">
          <button 
            type="button"
            onClick={() => {
              initialized.current = false;
              form.reset();
            }}
            className="px-6 py-2.5 rounded-lg text-sm font-mono text-muted-foreground bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
          >
            RESET
          </button>
          <button 
            type="submit"
            disabled={updateSettings.isPending}
            className="px-6 py-2.5 rounded-lg text-sm font-mono text-black bg-primary hover:bg-primary/90 transition-all shadow-[0_0_15px_rgba(0,212,255,0.4)] flex items-center gap-2 font-bold"
          >
            {updateSettings.isPending ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
            SAVE CONFIG
          </button>
        </div>
      </form>
    </div>
  );
}

function ToggleField({ form, name, label }: { form: any, name: string, label: string }) {
  const value = form.watch(name);
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-sm font-mono text-white/80 group-hover:text-white transition-colors">{label}</span>
      <div className="relative">
        <input type="checkbox" className="sr-only" {...form.register(name)} />
        <div className={`block w-10 h-6 rounded-full transition-colors ${value ? 'bg-primary shadow-[0_0_10px_rgba(0,212,255,0.5)]' : 'bg-black border border-white/20'}`}></div>
        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${value ? 'transform translate-x-4' : ''}`}></div>
      </div>
    </label>
  );
}
