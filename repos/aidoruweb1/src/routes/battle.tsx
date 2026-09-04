import { createFileRoute } from "@tanstack/react-router";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Clipboard, Eye, Link2, LoaderCircle, Plus, Radio, Swords, Users } from "lucide-react";
import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { AppShell, PokeballMark } from "@/components/aidoru/AppShell";
import { fetchBattleRooms, openBattleRoom, fetchGyms, openGymRoom } from "@/lib/aidoru.functions";
import type { BattleRoomSummary } from "@/lib/game";

export const Route = createFileRoute("/battle")({
  head: () => ({
    meta: [
      { title: "Pokémon Battle — AIDORU" },
      { name: "description", content: "Create a Pokémon battle room, join with a code, or watch an active arena." },
    ],
  }),
  component: BattleLobbyPage,
});

function BattleLobbyPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  if (pathname.startsWith("/battle/")) return <Outlet />;
  return (
    <AppShell title="Pokémon Battle" subtitle="Create a match, join a room, or spectate a live battle.">
      <BattleLobby />
    </AppShell>
  );
}

function BattleLobby() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"play" | "watch">("play");
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get("room") || params.get("code");
    if (roomId) window.location.replace(`/battle/${encodeURIComponent(decodeRoomReference(roomId))}`);
  }, []);

  const listRooms = useServerFn(fetchBattleRooms);
  const openRoom = useServerFn(openBattleRoom);
  const listGyms = useServerFn(fetchGyms);
  const openGym = useServerFn(openGymRoom);
  const query = useQuery({
    queryKey: ["aidoru", "battle-rooms"],
    queryFn: () => listRooms(),
    refetchInterval: 4000,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: () => openRoom(),
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ["aidoru", "battle-rooms"] });
      window.location.assign(battleRoomPath(room.code));
    },
  });
  const gymQuery = useQuery({ queryKey: ["aidoru", "gyms"], queryFn: () => listGyms(), retry: false });
  const gymMutation = useMutation({
    mutationFn: (gymId: string) => openGym({ data: { gymId } }),
    onSuccess: (room) => window.location.assign(battleRoomPath(room.code)),
  });

  const rooms = (query.data ?? []) as BattleRoomSummary[];
  const gyms = (gymQuery.data ?? []) as Array<{ id: string; name: string; type: string; leader: string; badge: string; description: string; accent: string; rewardCoins: number; rewardXp: number; unlocked: boolean; earned: boolean }>;
  const activeRooms = rooms.filter((room) => room.status === "active");
  const copy = (value: string, key: string) => {
    void navigator.clipboard?.writeText(value).then(() => {
      setCopied(key);
      window.setTimeout(() => setCopied((current) => current === key ? null : current), 1600);
    });
  };

  return (
    <div className="aidoru-page aidoru-page-battle battle-lobby-page pb-12">
      <section className="battle-lobby-heading">
        <div className="battle-lobby-heading-mark"><PokeballMark /></div>
        <div>
          <p className="hof-kicker">AIDORU arena</p>
          <h1 className="battle-lobby-title">Pokémon Battle</h1>
          <p className="battle-lobby-subtitle">Create a match or watch trainers fight live.</p>
        </div>
        <span className="battle-online-pill"><span className="battle-online-dot" />Online</span>
      </section>

      <section id="battle-room" className="battle-room-panel hof-panel">
        <BattleLobbyBackdrop />
        <div className="relative z-10">
          <div className="battle-panel-heading">
            <div>
              <p className="hof-kicker">Battle room</p>
              <h2 className="battle-panel-title">Find your next match</h2>
            </div>
            <div className="battle-room-count"><Users className="size-3.5" />{rooms.length} open</div>
          </div>

          <div className="battle-view-tabs" role="tablist" aria-label="Battle room views">
            <button type="button" role="tab" aria-selected={view === "play"} onClick={() => setView("play")} className={`battle-view-tab ${view === "play" ? "battle-view-tab-active" : ""}`}>
              <Swords className="size-4" />Play
            </button>
            <button type="button" role="tab" aria-selected={view === "watch"} onClick={() => setView("watch")} className={`battle-view-tab ${view === "watch" ? "battle-view-tab-active" : ""}`}>
              <Eye className="size-4" />Spectate <span className="battle-view-count">{activeRooms.length}</span>
            </button>
          </div>

          {view === "play" ? (
            <>
              <div className="battle-play-copy">
                <p>Create a match and send the room link to another signed-in trainer.</p>
                <p className="battle-play-hint">The first trainer who opens your code joins automatically.</p>
              </div>
              <button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending} className="battle-primary-button">
                {mutation.isPending ? <LoaderCircle className="size-5 animate-spin" /> : <Plus className="size-5" />}
                {mutation.isPending ? "Creating match…" : "Create a match"}
              </button>
              {mutation.isError && <p className="battle-inline-error">{mutation.error instanceof Error ? mutation.error.message : "Unable to create a battle room."}</p>}
              <JoinBattleCard />
            </>
          ) : (
            <WatchRooms rooms={rooms} loading={query.isLoading} error={query.isError} onCopy={copy} copied={copied} />
          )}
        </div>
      </section>

      {view === "play" && <section className="hof-panel mt-5 p-5 sm:p-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div><p className="hof-kicker">Badge circuit</p><h2 className="battle-panel-title">Challenge a gym</h2><p className="mt-2 text-sm leading-6 text-slate-300">Every gym keeps the same reliable battle controls, but has its own leader, team, theme, badge, and reward.</p></div>
          <span className="hidden rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100 sm:inline-flex">{gyms.filter((gym) => gym.earned).length}/{gyms.length} badges</span>
        </div>
        {gymQuery.isLoading ? <div className="battle-empty battle-empty-compact">Loading gyms…</div> : gymQuery.isError ? <div className="battle-inline-error">Start your Pokémon journey in WhatsApp to unlock the Gym Circuit.</div> : <div className="grid gap-3 sm:grid-cols-2">{gyms.map((gym) => <article key={gym.id} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4" style={{ "--gym-accent": gym.accent } as CSSProperties}><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.2em] text-slate-400">{gym.type} gym</p><h3 className="mt-1 font-display text-xl font-bold text-white">{gym.name}</h3><p className="mt-1 text-sm text-slate-300">Leader {gym.leader}</p></div><span className="rounded-full border border-white/10 px-2 py-1 text-xs text-slate-200">{gym.earned ? "Badge earned" : gym.unlocked ? "Unlocked" : "Locked"}</span></div><p className="mt-3 text-sm leading-6 text-slate-400">{gym.description}</p><div className="mt-4 flex items-center justify-between gap-3"><span className="text-xs text-cyan-100">{gym.badge} · {gym.rewardCoins.toLocaleString()} coins</span><button type="button" disabled={!gym.unlocked || gymMutation.isPending} onClick={() => gymMutation.mutate(gym.id)} className="rounded-full px-4 py-2 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40" style={{ background: gym.accent }}>{gymMutation.isPending ? "Opening…" : gym.earned ? "Rematch" : "Challenge"}</button></div></article>)}</div>}
        {gymMutation.isError && <p className="mt-3 battle-inline-error">{gymMutation.error instanceof Error ? gymMutation.error.message : "Unable to open the gym arena."}</p>}
      </section>}

      {view === "play" && <section className="battle-watch-preview hof-panel">
        <div>
          <p className="hof-kicker">Spectator feed</p>
          <h2 className="battle-panel-title">Spectate live battles</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">Spectate is read-only mode. You can follow the arena, combat log, party health, and every move without taking a trainer seat.</p>
        </div>
        <button type="button" onClick={() => setView("watch")} className="hof-button-secondary inline-flex items-center gap-2 whitespace-nowrap"><Eye className="size-4" />Open Spectate</button>
      </section>}
    </div>
  );
}


function JoinBattleCard() {
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const join = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizeRoomInput(roomCode);
    if (!normalized) {
      setError("Enter a six-character room code or paste a battle-room link.");
      return;
    }
    setError(null);
    window.location.assign(battleRoomPath(normalized));
  };

  return (
    <div className="battle-join-section">
      <div className="battle-divider"><span>or join with a code</span></div>
      <form onSubmit={join} className="battle-join-form">
        <label className="sr-only" htmlFor="battle-room-code">Room code</label>
        <input id="battle-room-code" value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} placeholder="6-character room code" className="battle-room-input" autoComplete="off" maxLength={64} />
        <button type="submit" className="battle-secondary-button"><span>Join room</span><ArrowRight className="size-4" /></button>
      </form>
      {error && <p className="battle-inline-error">{error}</p>}
    </div>
  );
}

function WatchRooms({ rooms, loading, error, onCopy, copied }: { rooms: BattleRoomSummary[]; loading: boolean; error: boolean; onCopy: (value: string, key: string) => void; copied: string | null }) {
  const active = rooms.filter((room) => room.status === "active");
  const waiting = rooms.filter((room) => room.status === "waiting");
  if (loading) return <div className="battle-empty battle-empty-compact"><LoaderCircle className="size-6 animate-spin text-cyan-200" />Scanning live rooms…</div>;
  if (error) return <div className="battle-empty battle-empty-compact text-rose-100">The spectator feed is offline. Try again in a moment.</div>;
  if (rooms.length === 0) return <div className="battle-empty battle-empty-compact"><Eye className="size-6 text-cyan-200" /><span>No rooms are open yet. Create the first match.</span></div>;
  return (
    <div className="battle-watch-list">
      {active.length > 0 && <p className="battle-list-label"><span className="battle-live-dot" />Live now</p>}
      {active.map((room) => <BattleRoomCard key={room.id} room={room} onCopy={onCopy} copied={copied} />)}
      {waiting.length > 0 && <p className="battle-list-label battle-list-label-waiting">Waiting for a trainer</p>}
      {waiting.map((room) => <BattleRoomCard key={room.id} room={room} onCopy={onCopy} copied={copied} />)}
    </div>
  );
}

function BattleRoomCard({ room, onCopy, copied }: { room: BattleRoomSummary; onCopy: (value: string, key: string) => void; copied: string | null }) {
  const roomUrl = `${typeof window === "undefined" ? "" : window.location.origin}${battleRoomPath(room.code)}`;
  const isLive = room.status === "active";
  return (
    <article className="battle-room-card battle-room-card-reference">
      <div className="battle-room-card-top">
        <div><span className={`battle-status battle-status-${room.status}`}>{isLive ? "Live" : "Open"}</span><span className="battle-room-code-label">Code {room.code}</span></div>
        <span className="battle-room-spectators"><Eye className="size-3.5" />{room.spectators} watching</span>
      </div>
      <div className="battle-room-matchup"><TrainerMini name={room.challenger.name} avatar={room.challenger.avatarUrl} /><span className="battle-vs">VS</span><TrainerMini name={room.opponent?.name ?? "Waiting"} avatar={room.opponent?.avatarUrl ?? null} align="right" /></div>
      <div className="battle-room-card-actions">
        <a href={battleRoomPath(room.code)} className="battle-primary-button battle-card-action"><Eye className="size-4" />{isLive ? "Spectate" : "Join room"}</a>
        <button type="button" onClick={() => onCopy(roomUrl, room.id)} className="battle-secondary-button battle-card-action">{copied === room.id ? <><Check className="size-4" />Copied</> : <><Clipboard className="size-4" />Copy link</>}</button>
      </div>
    </article>
  );
}

function normalizeRoomInput(value: string) {
  const input = value.trim();
  if (!input) return "";
  const codeMatch = input.match(/(?:[?&](?:code|room)=|\/battle\/)([a-z0-9-]+)/i);
  return decodeRoomReference(codeMatch?.[1] ?? input);
}

function decodeRoomReference(value: string) {
  try {
    return decodeURIComponent(value).replace(/^\/+|\/+$/g, "").trim();
  } catch {
    return value.replace(/^\/+|\/+$/g, "").trim();
  }
}

function battleRoomPath(roomReference: string) {
  return `/battle?room=${encodeURIComponent(decodeRoomReference(roomReference))}`;
}

function BattleLobbyBackdrop() {
  const pokemon = [
    { name: "Pikachu", src: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png", className: "battle-lobby-pokemon battle-lobby-pikachu" },
    { name: "Dragonite", src: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/149.png", className: "battle-lobby-pokemon battle-lobby-dragonite" },
    { name: "Charizard", src: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png", className: "battle-lobby-pokemon battle-lobby-charizard" },
    { name: "Jigglypuff", src: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/39.png", className: "battle-lobby-pokemon battle-lobby-jigglypuff" },
  ];
  return (
    <div className="battle-lobby-backdrop" aria-hidden="true">
      <div className="battle-lobby-nebula" /><div className="battle-lobby-grid" />
      <div className="battle-lobby-particle-cloud">{Array.from({ length: 18 }, (_, index) => <i key={index} style={{ ["--particle-index" as string]: index, ["--particle-top" as string]: `${8 + index * 4.8}%`, ["--particle-left" as string]: `${3 + ((index * 17) % 94)}%` } as CSSProperties} />)}</div>
      {pokemon.map((item) => <img key={item.name} className={item.className} src={item.src} alt="" />)}
    </div>
  );
}

function TrainerMini({ name, avatar, align = "left" }: { name: string; avatar: string | null; align?: "left" | "right" }) {
  return <div className={`flex min-w-0 items-center gap-2 ${align === "right" ? "justify-end text-right" : ""}`}><div className="battle-avatar">{avatar ? <img src={avatar} alt="" loading="lazy" /> : <PokeballMark small />}</div><span className="truncate font-display text-lg font-bold">{name}</span></div>;
}
