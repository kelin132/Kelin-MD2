import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion } from "motion/react";
import {
  ArrowUpCircle,
  Coins,
  Crown,
  ExternalLink,
  LogOut,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/aidoru/AppShell";
import { UserAvatar } from "@/components/aidoru/UserAvatar";
import { useSession, useSessionWriter } from "@/components/aidoru/session";
import { charterGuild, fetchGuilds, requestJoinGuild, requestLeaveGuild, upgradeMyGuild, updateGuildSettings } from "@/lib/aidoru.functions";
import { GUILD_CREATION_COST, formatCoins } from "@/lib/game";

const GUILD_WEBSITE_URL = "https://aidoru.zone.id/guild";

export const Route = createFileRoute("/guild")({
  head: () => ({
    meta: [
      { title: "Guilds · aidoru community" },
      {
        name: "description",
        content:
          "Build an anime guild, grow its level through bot work, manage its treasury, and meet upgrade requirements in aidoru community.",
      },
      { property: "og:title", content: "Guilds · aidoru community" },
      {
        property: "og:description",
        content: "Anime guild progression, members, treasury, taxes, and upgrades synced with Kelin-MD2.",
      },
    ],
  }),
  component: GuildPage,
});

function GuildPage() {
  return (
    <AppShell title="Guild System" subtitle="A soft-lit anime guild hall for your bot-synced crew.">
      <GuildBody />
    </AppShell>
  );
}

function ProgressBar({ value, tone = "pink" }: { value: number; tone?: "pink" | "cyan" }) {
  return (
    <div className="bg-background/60 h-2 overflow-hidden rounded-full">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className={`h-full rounded-full ${tone === "cyan" ? "bg-gradient-to-r from-cyan-300 to-sky-400" : "bg-gradient-to-r from-fuchsia-300 to-pink-400"}`}
      />
    </div>
  );
}

function GuildBody() {
  const { data: user } = useSession();
  const writeSession = useSessionWriter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", tag: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ description: "", iconUrl: "", bannerUrl: "" });

  const fetchGuildsFn = useServerFn(fetchGuilds);
  const guildsQuery = useQuery({
    queryKey: ["aidoru", "guilds"],
    queryFn: () => fetchGuildsFn(),
    retry: false,
  });
  const join = useServerFn(requestJoinGuild);
  const leave = useServerFn(requestLeaveGuild);
  const charter = useServerFn(charterGuild);
  const upgrade = useServerFn(upgradeMyGuild);
  const updateSettings = useServerFn(updateGuildSettings);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["aidoru", "guilds"] });

  const joinMutation = useMutation({
    mutationFn: (guildId: string) => join({ data: { guildId } }),
    onSuccess: (nextUser) => {
      writeSession(nextUser);
      void refresh();
      toast.success("Joined the guild");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const leaveMutation = useMutation({
    mutationFn: () => leave(),
    onSuccess: (nextUser) => {
      writeSession(nextUser);
      void refresh();
      toast.success("You left the guild");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createMutation = useMutation({
    mutationFn: () => charter({ data: form }),
    onSuccess: (nextUser) => {
      writeSession(nextUser);
      void refresh();
      setCreating(false);
      setForm({ name: "", tag: "", description: "" });
      toast.success("Guild chartered");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const upgradeMutation = useMutation({
    mutationFn: () => upgrade(),
    onSuccess: (nextUser) => {
      writeSession(nextUser);
      void refresh();
      toast.success("Guild upgraded!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: () => updateSettings({ data: editForm }),
    onSuccess: (nextUser) => {
      writeSession(nextUser);
      void refresh();
      setEditing(null);
      toast.success("Guild settings updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!user) return null;
  const currentGuild = (guildsQuery.data ?? []).find((guild) => guild.isMember);

  return (
    <div className="space-y-6">
      <div className="glass-strong relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-14 -top-20 size-64 rounded-full bg-fuchsia-300/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="bg-gradient-brand grid size-14 place-items-center rounded-2xl shadow-[0_0_28px_rgba(244,114,182,0.28)]">
            <ShieldCheck className="size-6" />
          </span>
          <div className="min-w-52 flex-1">
            <p className="font-mono-ui text-muted-foreground text-[10px] tracking-[0.24em] uppercase">Your guild standing</p>
            <p className="font-display text-2xl font-bold">{currentGuild?.name ?? "Unaffiliated"}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {currentGuild
                ? `Level ${currentGuild.level} · ${currentGuild.memberCount}/${currentGuild.memberCapacity} members · ${(currentGuild.taxRate * 100).toFixed(0)}% guild tax`
                : "Find a guild or charter a new anime crew."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentGuild ? (
              <a
                href={GUILD_WEBSITE_URL}
                target="_blank"
                rel="noreferrer"
                className="glass glass-hover flex items-center gap-2 rounded-full px-4 py-2.5 text-[11px] font-semibold tracking-[0.14em] uppercase"
              >
                <ExternalLink className="size-3.5" /> Public guild
              </a>
            ) : null}
            {currentGuild ? (
              <button
                onClick={() => leaveMutation.mutate()}
                disabled={leaveMutation.isPending}
                className="glass glass-hover hover:text-destructive flex items-center gap-2 rounded-full px-4 py-2.5 text-[11px] font-semibold tracking-[0.14em] uppercase disabled:opacity-50"
              >
                <LogOut className="size-3.5" /> Leave
              </button>
            ) : null}
            <button
              onClick={() => setCreating((value) => !value)}
              className="bg-gradient-brand text-foreground flex items-center gap-2 rounded-full px-5 py-2.5 text-[11px] font-bold tracking-[0.14em] uppercase transition-transform active:scale-[0.97]"
            >
              <Plus className="size-3.5" /> Charter guild
            </button>
          </div>
        </div>
      </div>

      {creating ? (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass overflow-hidden rounded-[2rem] p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <Sparkles className="text-neon-pink size-5" />
            <div>
              <h2 className="font-display text-xl font-bold">Charter an anime guild</h2>
              <p className="text-muted-foreground mt-1 text-sm">Costs {formatCoins(GUILD_CREATION_COST)} coins. Grow its XP and treasury through work on the bot.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Guild name" className="glass rounded-2xl px-4 py-3 text-sm outline-none" />
            <input value={form.tag} onChange={(event) => setForm({ ...form, tag: event.target.value.toUpperCase() })} placeholder="TAG" maxLength={5} className="glass font-mono-ui rounded-2xl px-4 py-3 text-sm tracking-[0.2em] outline-none" />
            <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="What is this guild about?" rows={3} className="glass resize-none rounded-2xl px-4 py-3 text-sm outline-none md:col-span-2" />
          </div>
          <button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="bg-gradient-brand text-foreground glow-pink mt-5 rounded-full px-8 py-3 text-[11px] font-bold tracking-[0.2em] uppercase transition-transform active:scale-[0.97] disabled:opacity-50">
            {createMutation.isPending ? "Chartering…" : "Create guild"}
          </button>
        </motion.div>
      ) : null}

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="font-mono-ui text-muted-foreground text-[10px] tracking-[0.24em] uppercase">Guild hall</p>
          <h2 className="font-display mt-1 text-2xl font-bold">Find your constellation</h2>
        </div>
        <a href={GUILD_WEBSITE_URL} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground hidden items-center gap-2 text-xs sm:flex">
          <ExternalLink className="size-3.5" /> View guild portal
        </a>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {guildsQuery.isError && (
          <div className="glass col-span-full p-8 text-center">
            <p className="text-neon-pink text-sm font-bold">Failed to load guilds</p>
            <p className="text-muted-foreground mt-1 text-xs">{(guildsQuery.error as Error)?.message || "Internal server error"}</p>
            <button onClick={() => void guildsQuery.refetch()} className="mt-4 text-xs underline">Try again</button>
          </div>
        )}
        {guildsQuery.isLoading && (
          <div className="col-span-full py-12 text-center">
            <div className="border-brand-primary/30 border-t-brand-primary mx-auto size-8 animate-spin rounded-full border-4" />
            <p className="text-muted-foreground mt-4 text-xs">Scanning constellations...</p>
          </div>
        )}
        {!guildsQuery.isLoading && !guildsQuery.isError && (guildsQuery.data ?? []).length === 0 && (
          <div className="glass col-span-full p-12 text-center">
            <p className="text-muted-foreground text-sm">No guilds found. Be the first to charter one!</p>
          </div>
        )}
        {(guildsQuery.data ?? []).map((guild, index) => {
          const xpProgress = guild.guildXpRequired > 0 ? (guild.guildXp / guild.guildXpRequired) * 100 : 100;
          const treasuryProgress = guild.upgradeTreasuryRequired > 0 ? (guild.bank / guild.upgradeTreasuryRequired) * 100 : 100;
          const ready = guild.guildXp >= guild.guildXpRequired && guild.bank >= guild.upgradeTreasuryRequired && guild.memberCount >= guild.upgradeMembersRequired;
          return (
            <motion.article
              key={guild.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: Math.min(index, 8) * 0.05 }}
              className={`glass glass-hover relative flex flex-col overflow-hidden rounded-[2rem] p-6 ${guild.isMember ? "border-neon-pink/60 shadow-[0_0_30px_rgba(244,114,182,0.12)]" : ""}`}
            >
              {guild.iconUrl ? <div className="absolute inset-x-0 top-0 h-32 bg-cover bg-center opacity-35" style={{ backgroundImage: `linear-gradient(180deg, transparent, rgba(4, 19, 27, 0.98)), url(${JSON.stringify(guild.iconUrl)})` }} aria-hidden="true" /> : null}
              <div className="relative flex items-start gap-3">
                <span className="bg-gradient-brand font-mono-ui grid size-12 shrink-0 place-items-center rounded-2xl text-xs font-bold tracking-widest">{guild.tag}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-display truncate text-lg font-bold">{guild.name}</p>
                    {guild.isOwner ? <Crown className="text-rarity-legend size-4 shrink-0" /> : null}
                  </div>
                  <p className="text-muted-foreground font-mono-ui text-[10px] tracking-[0.18em] uppercase">Level {guild.level} · {guild.memberCount}/{guild.memberCapacity} members</p>
                </div>
                <span className="glass font-mono-ui rounded-full px-2.5 py-1 text-[10px]">{(guild.taxRate * 100).toFixed(0)}% tax</span>
              </div>

              <p className="relative mt-4 min-h-10 flex-1 text-sm text-muted-foreground">{guild.description || "A new constellation waiting for its first story."}</p>

              <div className="relative mt-5 space-y-3 rounded-2xl bg-background/20 p-4">
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[11px]"><span className="flex items-center gap-1.5"><Star className="text-neon-pink size-3.5" /> Guild XP</span><span className="font-mono-ui text-muted-foreground">{guild.guildXp.toLocaleString()} / {guild.guildXpRequired.toLocaleString()}</span></div>
                  <ProgressBar value={xpProgress} />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[11px]"><span className="flex items-center gap-1.5"><Coins className="text-neon-pink size-3.5" /> Treasury</span><span className="font-mono-ui text-muted-foreground">{formatCoins(guild.bank)} / {formatCoins(guild.upgradeTreasuryRequired)}</span></div>
                  <ProgressBar value={treasuryProgress} tone="cyan" />
                </div>
              </div>

              <div className="relative mt-4 grid grid-cols-2 gap-2 text-[11px]">
                <span className="glass rounded-xl px-3 py-2">Next level <strong className="ml-1">{guild.level + 1}</strong></span>
                <span className="glass rounded-xl px-3 py-2">Crew goal <strong className="ml-1">{guild.upgradeMembersRequired}</strong></span>
              </div>

              <div className="relative mt-4">
                <div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-1.5 text-[11px] font-semibold"><Users className="size-3.5" /> Members</span><span className="text-muted-foreground text-[10px]">{guild.memberCount} names synced</span></div>
                <div className="flex flex-wrap gap-2">
                  {guild.members.slice(0, 8).map((member) => (
                    <div key={member.id} className="group flex items-center gap-1.5" title={member.name}><UserAvatar name={member.name} src={member.avatarUrl} videoSrc={member.avatarVideoUrl} className="size-7 border border-white/15" /><span className="max-w-20 truncate text-[10px]">{member.name}</span></div>
                  ))}
                </div>
              </div>

              <div className="relative mt-5 flex items-center gap-2">
                <span className="glass font-mono-ui flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px]"><Coins className="text-neon-pink size-3.5" /> {formatCoins(guild.bank)}</span>
                {ready && guild.isOwner ? (
                  <button onClick={() => upgradeMutation.mutate()} disabled={upgradeMutation.isPending} className="text-emerald-200 hover:text-emerald-100 flex items-center gap-1 text-[10px] font-semibold transition-colors">
                    <ArrowUpCircle className="size-3.5" /> Upgrade
                  </button>
                ) : ready ? (
                  <span className="text-emerald-200 flex items-center gap-1 text-[10px] font-semibold"><ArrowUpCircle className="size-3.5" /> Upgrade ready</span>
                ) : (
                  <span className="text-muted-foreground text-[10px]">Reqs not met</span>
                )}
                
                {guild.isOwner && (
                  <button 
                    onClick={() => {
                      setEditing(guild.id);
                      setEditForm({ description: guild.description, iconUrl: guild.iconUrl || "", bannerUrl: "" });
                    }}
                    className="glass glass-hover rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase"
                  >
                    Settings
                  </button>
                )}

                <button onClick={() => joinMutation.mutate(guild.id)} disabled={guild.isMember || joinMutation.isPending} className="bg-gradient-brand text-foreground ml-auto rounded-full px-5 py-2 text-[11px] font-bold tracking-[0.14em] uppercase transition-transform active:scale-[0.97] disabled:opacity-40">{guild.isMember ? "Joined" : "Join"}</button>
              </div>

              {editing === guild.id && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="relative mt-4 space-y-3 border-t border-white/10 pt-4">
                  <input value={editForm.iconUrl} onChange={(e) => setEditForm({...editForm, iconUrl: e.target.value})} placeholder="Icon URL" className="glass w-full rounded-xl px-3 py-2 text-xs outline-none" />
                  <textarea value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} placeholder="Description" rows={2} className="glass w-full resize-none rounded-xl px-3 py-2 text-xs outline-none" />
                  <div className="flex gap-2">
                    <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 flex-1 rounded-xl py-2 text-[10px] font-bold uppercase transition-colors">Save</button>
                    <button onClick={() => setEditing(null)} className="glass flex-1 rounded-xl py-2 text-[10px] font-bold uppercase">Cancel</button>
                  </div>
                </motion.div>
              )}
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
