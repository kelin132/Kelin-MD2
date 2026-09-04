import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  DoorOpen,
  Eye,
  Flame,
  Heart,
  LoaderCircle,
  Package,
  Radio,
  RotateCcw,
  Share2,
  Shield,
  Sparkles,
  Swords,
  UserRound,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AppShell } from "@/components/aidoru/AppShell";
import { applyBattleAction, fetchBattleRoom } from "@/lib/aidoru.functions";
import type { BattleAction, BattlePokemon, BattleRoom, BattleTrainer } from "@/lib/game";

export const Route = createFileRoute("/battle/$roomId")({
  head: () => ({
    meta: [
      { title: "Battle Room — AIDORU" },
      {
        name: "description",
        content: "A live Pokémon battle room with moves, items, switching, and spectators.",
      },
    ],
  }),
  component: BattleRoomPage,
});

function BattleRoomPage() {
  const { roomId } = Route.useParams();
  return (
    <AppShell
      title="Pokémon Battle"
      subtitle="Enter the arena, ready your party, or spectate the live battle."
    >
      <BattleRoomBody roomId={roomId} />
    </AppShell>
  );
}

function BattleRoomBody({ roomId }: { roomId: string }) {
  const queryClient = useQueryClient();
  const loadRoom = useServerFn(fetchBattleRoom);
  const act = useServerFn(applyBattleAction);
  const query = useQuery({
    queryKey: ["aidoru", "battle-room", roomId],
    queryFn: () => loadRoom({ data: { roomId } }),
    refetchInterval: 1400,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: (action: BattleAction) => act({ data: { roomId, action } }),
    onSuccess: (room) => queryClient.setQueryData(["aidoru", "battle-room", roomId], room),
  });
  const [flash, setFlash] = useState<string | null>(null);
  const [spectatorView, setSpectatorView] = useState<"challenger" | "opponent">("challenger");
  const redirectedToLogin = useRef(false);
  const room = query.data;

  useEffect(() => {
    const message = query.error instanceof Error ? query.error.message : "";
    if (!query.isError || redirectedToLogin.current || !/^not signed in\.$/i.test(message)) return;
    redirectedToLogin.current = true;
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.assign(`/?returnTo=${encodeURIComponent(returnTo)}`);
  }, [query.error, query.isError]);

  if (query.isLoading)
    return (
      <RoomState
        icon={<LoaderCircle className="size-7 animate-spin" />}
        text="Loading battle room…"
      />
    );
  if (query.isError || !room) {
    const message = query.error instanceof Error ? query.error.message : "Battle room unavailable.";
    return (
      <RoomState
        icon={<DoorOpen className="size-7" />}
        text={
          message === "Not signed in."
            ? "Opening the trainer portal so you can sign in and return to this battle…"
            : message
        }
      />
    );
  }

  const perform = (action: BattleAction) => {
    setFlash(null);
    mutation.mutate(action, {
      onError: (error) =>
        setFlash(error instanceof Error ? error.message : "That battle action failed."),
    });
  };
  const isFinished = room.status === "finished";
  const isSpectator = room.joinedAs === "spectator";
  const me = room.joinedAs === "challenger" ? room.challenger : room.opponent;
  const foe = room.joinedAs === "challenger" ? room.opponent : room.challenger;
  const viewedMe = isSpectator
    ? spectatorView === "challenger" ? room.challenger : room.opponent
    : me;
  const viewedFoe = isSpectator
    ? spectatorView === "challenger" ? room.opponent : room.challenger
    : foe;
  const waitingForOpponent = !room.opponent;
  const waitingForReady = Boolean(room.opponent && room.status === "waiting");
  const forcedSwitch = room.forcedSwitch === room.joinedAs;
  const myTurn = room.turn === room.joinedAs;
  const shareUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/battle?room=${encodeURIComponent(room.code)}`;

  return (
    <div className="aidoru-page aidoru-page-battle-room space-y-5 pb-12">
      <BattleMusic status={room.status} />
      <BattleEndSound status={room.status} winnerId={room.winnerId} playerId={me?.id ?? null} />
      <section className="battle-room-toolbar hof-panel flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className="battle-live-dot" />
          <div>
            <p className="hof-kicker">Room {room.code}</p>
            <p className="font-display text-lg font-bold">
              {room.status === "active"
                ? "Live combat"
                : room.status === "finished"
                  ? "Battle complete"
                  : "Waiting room"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <BattleSoundscape combatLog={room.combatLog} status={room.status} />
          <button
            type="button"
            onClick={() =>
              void navigator.clipboard
                ?.writeText(shareUrl)
                .then(() => setFlash("Battle link copied."))
            }
            className="hof-button-secondary inline-flex items-center gap-2 px-3 py-2 text-xs"
          >
            <Copy className="size-3" />
            Share room
          </button>
          <a
            href="/battle"
            className="hof-button-secondary inline-flex items-center gap-2 px-3 py-2 text-xs"
          >
            <Radio className="size-3" />
            All rooms
          </a>
        </div>
      </section>

      {waitingForOpponent && <WaitingRoomCard room={room} />}
      {isSpectator && (
        <section className="battle-spectator-banner">
          <Eye className="size-5 text-cyan-200" />
          <div>
            <p className="font-display text-lg font-bold text-cyan-100">Spectate mode</p>
            <p className="text-sm text-slate-300">
              You are watching this room read-only. Trainers keep control of their Pokémon.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSpectatorView((side) => side === "challenger" ? "opponent" : "challenger")}
            className="hof-button-secondary ml-auto inline-flex items-center gap-2 px-3 py-2 text-xs"
          >
            <RotateCcw className="size-3" />
            View {spectatorView === "challenger" ? "opponent" : "challenger"}
          </button>
        </section>
      )}
      {waitingForReady && (
        <section className="battle-ready-banner hof-panel p-5">
          <p className="hof-kicker">Both parties loaded</p>
          <h2 className="hof-heading mt-1 text-3xl">Ready when you are.</h2>
          <p className="mt-2 text-sm text-slate-300">
            The room is shared. Each trainer must press ready before the first lead Pokémon is sent
            out.
          </p>
          <button
            type="button"
            onClick={() => perform({ type: "ready" })}
            disabled={mutation.isPending || me?.ready}
            className="hof-button mt-4 inline-flex items-center gap-2"
          >
            <Check className="size-4" />
            {me?.ready ? "Ready" : "Ready up"}
          </button>
        </section>
      )}

      <BattleArena
        room={room}
        me={viewedMe}
        foe={viewedFoe}
        myTurn={myTurn}
        forcedSwitch={forcedSwitch}
        isSpectator={isSpectator}
        mutationPending={mutation.isPending}
        onAction={perform}
      />
      {flash && (
        <p className="rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
          {flash}
        </p>
      )}
    </div>
  );
}

function WaitingRoomCard({ room }: { room: BattleRoom }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const roomUrl = `${typeof window === "undefined" ? "" : window.location.origin}/battle?room=${encodeURIComponent(room.code)}`;
  const copy = (value: string, kind: "code" | "link") => {
    const clipboard = navigator.clipboard;
    if (!clipboard) return;
    void clipboard.writeText(value).then(() => {
      setCopied(kind);
      window.setTimeout(() => setCopied((current) => (current === kind ? null : current)), 1600);
    });
  };
  const share = () => {
    if (navigator.share) {
      void navigator
        .share({
          title: "AIDORU Pokémon Battle",
          text: `Join my Pokémon battle with code ${room.code}.`,
          url: roomUrl,
        })
        .catch(() => undefined);
      return;
    }
    copy(roomUrl, "link");
  };

  return (
    <section className="battle-waiting-card hof-panel">
      <div className="battle-waiting-heading">
        <div>
          <p className="hof-kicker">Room ready</p>
          <h2 className="battle-panel-title">Waiting for trainer</h2>
        </div>
        <span className="battle-waiting-status">
          <span className="battle-waiting-dot" />
          Open
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">
        Share this code or link. The first signed-in trainer who opens it joins automatically.
      </p>
      <div className="battle-code-box">
        <p className="hof-kicker">Room code</p>
        <p className="battle-code-value">{room.code}</p>
        <p className="battle-code-url">{roomUrl}</p>
      </div>
      <div className="battle-waiting-actions">
        <button
          type="button"
          onClick={() => copy(room.code, "code")}
          className="battle-secondary-button"
        >
          {copied === "code" ? (
            <>
              <Check className="size-4" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-4" />
              Copy code
            </>
          )}
        </button>
        <button type="button" onClick={share} className="battle-primary-button">
          <Share2 className="size-4" />
          {copied === "link" ? "Link copied" : "Share room"}
        </button>
      </div>
      <a href="/battle" className="battle-back-link">
        Return to battle lobby
      </a>
    </section>
  );
}

function BattleSoundscape({
  combatLog,
  status,
}: {
  combatLog: string[];
  status: BattleRoom["status"];
}) {
  const [enabled, setEnabled] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const previousLength = useRef(combatLog.length);

  const context = () => {
    if (typeof window === "undefined") return null;
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    audioRef.current ??= new AudioContextCtor();
    void audioRef.current.resume();
    return audioRef.current;
  };

  const tone = (
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
    volume = 0.035,
  ) => {
    const ctx = context();
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  };

  useEffect(() => {
    if (!enabled) {
      previousLength.current = combatLog.length;
      return;
    }
    const latest = combatLog[combatLog.length - 1] ?? "";
    if (combatLog.length > previousLength.current) {
      if (/fainted/i.test(latest)) {
        tone(180, 0.24, "sawtooth", 0.06);
        window.setTimeout(() => tone(110, 0.35, "triangle", 0.045), 100);
      } else if (/wins|victory|complete/i.test(latest) || status === "finished") {
        tone(523, 0.18, "triangle");
        window.setTimeout(() => tone(659, 0.24, "triangle"), 130);
      } else if (/hit|damage|used|attacked|sent out/i.test(latest)) {
        tone(260, 0.08, "square", 0.025);
      }
      previousLength.current = combatLog.length;
    }
  }, [combatLog, enabled, status]);

  useEffect(() => {
    if (!enabled) return;
    const ctx = context();
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 98;
    gain.gain.value = 0.006;
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    const pulse = window.setInterval(() => {
      oscillator.frequency.setTargetAtTime(98 + Math.random() * 16, ctx.currentTime, 0.8);
    }, 1800);
    return () => {
      window.clearInterval(pulse);
      oscillator.stop();
      oscillator.disconnect();
      gain.disconnect();
    };
  }, [enabled]);

  return (
    <button
      type="button"
      onClick={() => setEnabled((value) => !value)}
      className="hof-button-secondary inline-flex items-center gap-2 px-3 py-2 text-xs"
      aria-pressed={enabled}
    >
      <Radio className={`size-3 ${enabled ? "text-cyan-200" : ""}`} />
      {enabled ? "Sound on" : "Sound"}
    </button>
  );
}

function BattleWildlife() {
  return (
    <div className="battle-wildlife" aria-hidden="true">
      <img className="battle-wildlife-one" src="/pokemon-gifs/10.gif" alt="" />
      <img className="battle-wildlife-two" src="/pokemon-gifs/25.gif" alt="" />
      <img className="battle-wildlife-three" src="/pokemon-gifs/133.gif" alt="" />
    </div>
  );
}

function BattleTrainerSprite({
  trainer,
  side,
}: {
  trainer: BattleTrainer | null;
  side: "me" | "foe";
}) {
  return (
    <div className={`battle-trainer trainer-${side}`} aria-hidden="true">
      {trainer?.trainerSpriteUrl ? (
        <img src={trainer.trainerSpriteUrl} alt="" />
      ) : (
        <UserRound className="size-10 text-cyan-100/70" />
      )}
    </div>
  );
}

const battleMusicTracks = [
  "mus_vs_trainer",
  "mus_vs_wild",
  "mus_vs_gym_leader",
  "mus_vs_champion",
] as const;
const victoryTracks = [
  "mus_victory_trainer",
  "mus_victory_gym_leader",
  "mus_victory_road",
] as const;
const defeatTracks = ["mus_too_bad", "se_failure", "se_faint"] as const;

function BattleMusic({ status }: { status: BattleRoom["status"] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [track] = useState(
    () => battleMusicTracks[Math.floor(Math.random() * battleMusicTracks.length)],
  );
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const active = enabled && status !== "finished";
    audio.volume = 0.22;
    audio.loop = true;
    audio.preload = "auto";
    const resume = () => {
      if (active && audio.paused) void audio.play().catch(() => undefined);
    };
    const watchdog = window.setInterval(resume, 1500);
    if (active) resume();
    else audio.pause();
    window.addEventListener("pointerdown", resume);
    window.addEventListener("touchstart", resume, { passive: true });
    window.addEventListener("keydown", resume);
    window.addEventListener("visibilitychange", resume);
    window.addEventListener("pageshow", resume);
    audio.addEventListener("ended", resume);
    audio.addEventListener("pause", resume);
    audio.addEventListener("canplay", resume);
    return () => {
      window.clearInterval(watchdog);
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("touchstart", resume);
      window.removeEventListener("keydown", resume);
      window.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pageshow", resume);
      audio.removeEventListener("ended", resume);
      audio.removeEventListener("pause", resume);
      audio.removeEventListener("canplay", resume);
      audio.pause();
    };
  }, [enabled, status]);
  return (
    <div className="battle-music-control">
      <audio ref={audioRef} src={`/battle-music/${track}.mp3`} loop autoPlay preload="auto" />
      <button
        type="button"
        className="hof-button-secondary inline-flex items-center gap-2 px-3 py-2 text-xs"
        onClick={() => setEnabled((value) => !value)}
        aria-pressed={enabled}
      >
        {enabled ? "Music on" : "Music off"}
      </button>
    </div>
  );
}

function BattleEndSound({
  status,
  winnerId,
  playerId,
}: {
  status: BattleRoom["status"];
  winnerId: string | null;
  playerId: string | null;
}) {
  const playedKey = useRef<string | null>(null);
  const [track] = useState(() => ({
    victory: victoryTracks[Math.floor(Math.random() * victoryTracks.length)],
    defeat: defeatTracks[Math.floor(Math.random() * defeatTracks.length)],
  }));
  const won = Boolean(winnerId && playerId && winnerId === playerId);
  const result = won ? "victory" : "defeat";
  useEffect(() => {
    if (status !== "finished" || !playerId || playedKey.current === `${winnerId}:${playerId}`)
      return;
    playedKey.current = `${winnerId}:${playerId}`;
    const audio = new Audio(`/battle-music/${track[result]}.mp3`);
    audio.volume = 0.46;
    void audio.play().catch(() => undefined);
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [playerId, result, status, track, winnerId]);
  return null;
}

function BattleArena({
  room,
  me,
  foe,
  myTurn,
  forcedSwitch,
  isSpectator,
  mutationPending,
  onAction,
}: {
  room: BattleRoom;
  me: BattleTrainer | null;
  foe: BattleTrainer | null;
  myTurn: boolean;
  forcedSwitch: boolean;
  isSpectator: boolean;
  mutationPending: boolean;
  onAction: (action: BattleAction) => void;
}) {
  const activeMe = me?.party[me.activeIndex] ?? null;
  const activeFoe = foe?.party[foe.activeIndex] ?? null;
  const [tab, setTab] = useState<"moves" | "items" | "switch">("moves");
  const [recallSide, setRecallSide] = useState<"me" | "foe" | null>(null);
  const [sendOutSide, setSendOutSide] = useState<"me" | "foe" | null>(null);
  const [damageSide, setDamageSide] = useState<"me" | "foe" | null>(null);
  const [damageAmount, setDamageAmount] = useState<number | null>(null);
  const [damageId, setDamageId] = useState(0);
  const previousHp = useRef({ me: activeMe?.hp ?? null, foe: activeFoe?.hp ?? null });
  const previousActiveIds = useRef({ me: activeMe?.id ?? null, foe: activeFoe?.id ?? null });
  useEffect(() => {
    const next = { me: activeMe?.hp ?? null, foe: activeFoe?.hp ?? null };
    const faintedSide =
      previousHp.current.me !== null &&
      previousHp.current.me > 0 &&
      next.me !== null &&
      next.me <= 0
        ? "me"
        : previousHp.current.foe !== null &&
            previousHp.current.foe > 0 &&
            next.foe !== null &&
            next.foe <= 0
          ? "foe"
          : null;
    const hitSide =
      previousHp.current.me !== null && next.me !== null && next.me < previousHp.current.me
        ? "me"
        : previousHp.current.foe !== null && next.foe !== null && next.foe < previousHp.current.foe
          ? "foe"
          : null;
    previousHp.current = next;
    if (hitSide) {
      const pkmn = hitSide === "me" ? activeMe : activeFoe;
      const cryUrl = pkmn ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/cries/${pkmn.pokedexId}.ogg` : null;
      const sound = new Audio(faintedSide ? "/battle-music/se_faint.mp3" : (cryUrl || "/battle-music/se_ball_throw.mp3"));
      sound.volume = faintedSide ? 0.5 : 0.28;
      void sound.play().catch(() => undefined);
    }
    if (!faintedSide) return;
    setRecallSide(faintedSide);
    const timer = window.setTimeout(
      () => setRecallSide((side) => (side === faintedSide ? null : side)),
      1150,
    );
    return () => window.clearTimeout(timer);
  }, [activeMe?.hp, activeFoe?.hp]);
  useEffect(() => {
    const next = { me: activeMe?.id ?? null, foe: activeFoe?.id ?? null };
    const changedSide =
      previousActiveIds.current.me && next.me && previousActiveIds.current.me !== next.me
        ? "me"
        : previousActiveIds.current.foe && next.foe && previousActiveIds.current.foe !== next.foe
          ? "foe"
          : null;
    previousActiveIds.current = next;
    if (!changedSide) return;
    setSendOutSide(changedSide);
    const timer = window.setTimeout(
      () => setSendOutSide((side) => (side === changedSide ? null : side)),
      1050,
    );
    return () => window.clearTimeout(timer);
  }, [activeMe?.id, activeFoe?.id]);
  const [transitionId, setTransitionId] = useState(0);
  const [superEffectiveId, setSuperEffectiveId] = useState(0);
  const [superEffectiveActive, setSuperEffectiveActive] = useState(false);
  const previousLogLength = useRef(room.combatLog.length);
  useEffect(() => {
    if (room.combatLog.length <= previousLogLength.current) return;
    setTransitionId((value) => value + 1);
    const latest = room.combatLog[room.combatLog.length - 1] ?? "";
    previousLogLength.current = room.combatLog.length;
    const damagedSide =
      activeMe && latest.includes(`${activeMe.displayName} used`)
        ? "foe"
        : activeFoe && latest.includes(`${activeFoe.displayName} used`)
          ? "me"
          : null;
    const damageMatch = latest.match(/(\d+) damage/i);
    if (damagedSide && damageMatch) {
      setDamageSide(damagedSide);
      setDamageAmount(Number(damageMatch[1]));
      setDamageId((value) => value + 1);
      window.setTimeout(() => {
        setDamageSide((side) => (side === damagedSide ? null : side));
        setDamageAmount((amount) => (amount === Number(damageMatch[1]) ? null : amount));
      }, 950);
    }
    if (!/super effective!/i.test(latest)) return;
    setSuperEffectiveId((value) => value + 1);
    setSuperEffectiveActive(true);
    const timer = window.setTimeout(() => setSuperEffectiveActive(false), 900);
    return () => window.clearTimeout(timer);
  }, [room.combatLog.length, room.combatLog]);
  const winnerName =
    room.winnerId === room.challenger.id
      ? room.challenger.name
      : room.winnerId === room.opponent?.id
        ? room.opponent.name
        : null;
  const statusText =
    room.status === "finished"
      ? winnerName
        ? `${winnerName} has won the battle!`
        : "Battle complete"
      : room.status === "waiting"
        ? room.opponent
          ? "Both trainers loaded"
          : "Waiting for opponent"
        : forcedSwitch
          ? "Choose a replacement Pokémon"
          : myTurn
            ? "Your turn"
            : isSpectator
              ? "Spectating live battle"
              : "Opponent’s turn";
  const canAct =
    !isSpectator && !mutationPending && room.status === "active" && (myTurn || forcedSwitch);

  return (
    <section 
      className={`battle-arena hof-panel overflow-hidden ${room.gym ? `battle-gym-theme-${room.gym.theme}` : ""}`} 
      style={room.gym ? ({ 
        "--gym-accent": room.gym.accent,
        "--gym-bg": `url("${room.gym.background}")`
      } as CSSProperties) : undefined}
    >
      <div className="battle-arena-top flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <Swords className="size-4 text-cyan-200" />
          <span className="font-display text-lg font-bold">
            {room.challenger.name} <span className="text-cyan-300">vs</span>{" "}
            {room.opponent?.name ?? "Waiting"}
          </span>
        </div>
                  <div className="flex items-center gap-2"><span className="battle-turn-label">{statusText}</span>{room.gym && <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs font-bold text-white">{room.gym.badge} · {room.gym.rewardCoins.toLocaleString()} coins</span>}</div>

      </div>
      <div className="battle-message-strip" role="status">
        <span className="battle-message-dot" />
        {room.combatLog[room.combatLog.length - 1] ?? "The Pokémon match is ready."}
      </div>
      <div
        className={`battle-field ${room.gym ? `battle-gym-field battle-gym-field-${room.gym.theme}` : ""} ${transitionId > 0 ? "battle-field-pulse" : ""} ${superEffectiveActive ? "battle-field-super-effective" : ""} ${myTurn ? "battle-field-my-turn" : ""} ${room.status === "finished" ? "battle-field-finished" : ""}`}
        style={room.gym ? ({ "--gym-accent": room.gym.accent } as CSSProperties) : undefined}
      >
        {superEffectiveActive && <SuperEffectiveBurst key={superEffectiveId} />}
        {activeFoe && (
          <BattlePokemonSprite
            key={`foe-${activeFoe.id}`}
            pokemon={activeFoe}
            side="foe"
            defeated={activeFoe.hp <= 0}
            hit={damageSide === "foe"}
            sendOut={sendOutSide === "foe"}
          />
        )}
        {activeMe && (
          <BattlePokemonSprite
            key={`me-${activeMe.id}`}
            pokemon={activeMe}
            side="me"
            defeated={activeMe.hp <= 0}
            hit={damageSide === "me"}
            sendOut={sendOutSide === "me"}
          />
        )}
        {recallSide && (
          <div
            className={`battle-pokeball-recall battle-pokeball-recall-${recallSide}`}
            aria-hidden="true"
          >
            <span />
          </div>
        )}
        <div className="battle-platform platform-foe" />
        <div className="battle-platform platform-me" />
        {damageSide && <BattleDamageBurst key={damageId} side={damageSide} amount={damageAmount} />}
        {sendOutSide && (
          <div
            className={`battle-pokeball-sendout battle-pokeball-sendout-${sendOutSide}`}
            aria-hidden="true"
          >
            <span />
          </div>
        )}
        <BattleHud pokemon={activeFoe} trainer={foe} side="foe" />
        <BattleHud pokemon={activeMe} trainer={me} side="me" />
        {transitionId > 0 && <BattleParticleTransition key={transitionId} />}
      </div>

      <div className="battle-controls border-t border-white/10 bg-black/25 p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="hof-kicker">{room.gym ? `${room.gym.name} · Leader ${room.gym.leader}` : "Command console"}</p>
            <p className="mt-1 text-sm text-slate-300">
              {forcedSwitch
                ? "Your active Pokémon fainted. Send out a healthy teammate."
                : "Select a move or switch your active Pokémon."}
            </p>
          </div>
          {!isSpectator && room.status === "active" && (
            <button
              type="button"
              onClick={() => onAction({ type: "forfeit" })}
              disabled={mutationPending}
              className="text-xs text-rose-200/75 underline underline-offset-4"
            >
              Forfeit
            </button>
          )}
        </div>
        {room.status === "waiting" && (
          <div className="battle-spectator-note">
            <Radio className="size-4 text-cyan-200" />
            {room.opponent
              ? "Both Pokémon parties are loaded. Ready up or wait for the match to start."
              : "This Pokémon arena is open. Share the room link with the opposing trainer to load their party."}
          </div>
        )}
        {!isSpectator && room.status === "active" && (
          <div className="mb-4 flex gap-2 overflow-x-auto">
            <TabButton
              active={tab === "moves"}
              onClick={() => setTab("moves")}
              icon={<Flame className="size-4" />}
            >
              Moves
            </TabButton>
            <TabButton
              active={tab === "items"}
              onClick={() => setTab("items")}
              icon={<Package className="size-4" />}
            >
              Items
            </TabButton>
            <TabButton
              active={tab === "switch"}
              onClick={() => setTab("switch")}
              icon={<RotateCcw className="size-4" />}
            >
              Switch
            </TabButton>
          </div>
        )}
        {isSpectator && (
          <div className="battle-spectator-note">
            <Radio className="size-4 text-cyan-200" />
            Spectator mode is read-only. Share the room URL with another trainer to fill the next
            seat.
          </div>
        )}
        {!isSpectator && tab === "moves" && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {activeMe?.moves.map((move, index) => (
              <button
                key={`${move.name}-${index}`}
                type="button"
                onClick={() => onAction({ type: "move", moveIndex: index })}
                disabled={!canAct || forcedSwitch}
                className="battle-move-button"
              >
                <span className="font-display text-base font-bold">{move.name}</span>
                <span className="mt-1 text-[10px] uppercase tracking-[0.15em] text-cyan-200/70">
                  {move.type} · {move.power || "status"}
                </span>
              </button>
            ))}
          </div>
        )}
        {!isSpectator && tab === "items" && (
          <div className="rounded-2xl border border-amber-200/20 bg-amber-300/10 p-5 text-center">
            <p className="font-display text-base font-bold text-amber-100">Healing items are disabled during battles</p>
            <p className="mt-2 text-xs leading-5 text-slate-300">Switch to another healthy Pokémon during combat. Use healing items only after the battle ends.</p>
          </div>
        )}
        {!isSpectator && tab === "switch" && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {me?.party.map((pokemon, index) => (
              <SwitchButton
                key={pokemon.id}
                pokemon={pokemon}
                active={index === me.activeIndex}
                disabled={!canAct || pokemon.hp <= 0 || (!forcedSwitch && index === me.activeIndex)}
                onClick={() => onAction({ type: "switch", pokemonIndex: index })}
              />
            ))}
          </div>
        )}
      </div>

      {room.status === "finished" && winnerName && (
        <div className="battle-winner-banner">
          <Sparkles className="size-5" />
          <strong>{winnerName} has won the battle!</strong>
          <Sparkles className="size-5" />
        </div>
      )}
      <div className="grid gap-4 border-t border-white/10 bg-[#061019]/85 p-4 sm:grid-cols-[1fr_1.35fr] sm:p-6">
        <div>
          <p className="hof-kicker">Battle log</p>
          <div className="battle-log mt-2">
            {room.combatLog
              .slice()
              .reverse()
              .map((line, index) => (
                <p key={`${line}-${index}`} className={index === 0 ? "text-cyan-100" : ""}>
                  {line}
                </p>
              ))}
          </div>
        </div>
        <div>
          <p className="hof-kicker">Party status</p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {Array.from({ length: 6 }, (_, index) => (
              <PartyDot
                key={me?.party[index]?.id ?? `empty-${index}`}
                pokemon={me?.party[index] ?? null}
                active={index === me?.activeIndex}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SuperEffectiveBurst() {
  return (
    <div className="battle-super-effective-burst" aria-hidden="true">
      <strong>SUPER EFFECTIVE!</strong>
      {Array.from({ length: 28 }, (_, index) => (
        <i key={index} style={{ ["--super-index" as string]: index } as CSSProperties} />
      ))}
    </div>
  );
}

function BattleParticleTransition() {
  return (
    <div className="battle-particle-transition" aria-hidden="true">
      <span className="battle-transition-ring" />
      <span className="battle-transition-ring" />
      {Array.from({ length: 12 }, (_, index) => (
        <i key={index} style={{ ["--burst-index" as string]: index } as CSSProperties} />
      ))}
    </div>
  );
}

function BattlePokemonSprite({
  pokemon,
  side,
  defeated,
  hit,
  sendOut,
}: {
  pokemon: BattlePokemon;
  side: "me" | "foe";
  defeated: boolean;
  hit: boolean;
  sendOut: boolean;
}) {
  const sources = animatedPokemonUrls(pokemon, side);
  const [sourceIndex, setSourceIndex] = useState(0);
  useEffect(
    () => setSourceIndex(0),
    [pokemon.id, pokemon.pokedexId, pokemon.name, pokemon.shiny, side],
  );
  const source =
    sources[Math.min(sourceIndex, sources.length - 1)] ??
    pokemon[side === "me" ? "backSpriteUrl" : "frontSpriteUrl"];
  const scaleClass = battlePokemonScaleClass(pokemon);
  
  // Logic to determine if we should flip the sprite
  // Most front sprites face left. If on foe side (right), they should face left (towards player).
  // If on player side (left), they should face right (towards foe).
  // Most back sprites face right. If on player side (left), they should face right (towards foe).
  const isBackSprite = source.includes('/back/');
  const shouldFlip = side === 'me' ? !isBackSprite : isBackSprite;

  return (
    <div
      className={`battle-pokemon battle-pokemon-${side} ${scaleClass} ${defeated ? "battle-pokemon-fainted" : ""} ${hit ? "battle-pokemon-hit" : ""} ${sendOut ? "battle-pokemon-sendout" : ""}`}
    >
      <img
        src={source}
        alt={pokemon.displayName}
        loading="eager"
        decoding="async"
        style={{ transform: shouldFlip ? 'scaleX(-1)' : 'scaleX(1)' }}
        fetchPriority={sourceIndex === 0 ? "high" : "auto"}
        onError={(event) => {
          setSourceIndex((index) => {
            if (index < sources.length - 1) return index + 1;
            event.currentTarget.style.visibility = "hidden";
            return index;
          });
        }}
      />
      <span className="battle-pokemon-shadow" />
    </div>
  );
}

function battlePokemonScaleClass(pokemon: BattlePokemon) {
  const id = Number(pokemon.pokedexId);
  const name = `${pokemon.name} ${pokemon.displayName}`.toLowerCase();
  if (
    [382, 383, 384, 493, 483, 484, 487, 643, 644, 646, 717, 718, 791, 792, 800, 888, 889, 890].includes(
      id,
    ) ||
    /arceus|rayquaza|groudon|kyogre|lugia|ho[- ]oh|giratina|eternatus|zygarde|xerneas|yveltal|solgaleo|lunala|necrozma|zacian|zamazenta|reshiram|zekrom/i.test(
      name,
    )
  ) {
    return /rayquaza|eternatus|zygarde|kyogre|groudon/i.test(name) ||
      [382, 383, 384, 890].includes(id)
      ? "battle-pokemon-huge-wide"
      : "battle-pokemon-huge";
  }
  if (
    [6, 149, 248, 373, 376, 445, 635, 706].includes(id) ||
    /charizard|dragonite|tyranitar|salamence|metagross|garchomp|hydreigon|goodra/i.test(name)
  ) {
    return "battle-pokemon-large";
  }
  if (
    [7, 25, 133, 152, 155, 447, 656, 810, 813, 816].includes(id) ||
    /sobble|froakie|pikachu|eevee|scorbunny|grookey|rowlet|rattata/i.test(name)
  ) {
    return "battle-pokemon-small";
  }
  return "battle-pokemon-standard";
}

function animatedPokemonUrls(pokemon: BattlePokemon, side: "me" | "foe" = "foe") {
  const id = Math.max(1, Math.floor(Number(pokemon.pokedexId) || 1));
  const baseName = String(pokemon.name || pokemon.displayName || "pokemon")
    .trim()
    .replace(/[- ]+(gigantamax|gmax)$/i, "")
    .replace(/_+(gigantamax|gmax)$/i, "");
  const titleCase = baseName
    ? `${baseName.charAt(0).toUpperCase()}${baseName.slice(1)}`
    : "Pokemon";
  const shinySuffix = pokemon.shiny ? "_Shiny" : "";
  const generationEightNames = Array.from(
    new Set([
      `${pokemon.name}${shinySuffix}`,
      `${titleCase}${shinySuffix}`,
      `${titleCase}_Gigantamax${shinySuffix}`,
      `${titleCase}_Gmax${shinySuffix}`,
    ]),
  );
  const generationEight = generationEightNames.map(
    (name) =>
      `https://raw.githubusercontent.com/kelin132/gmax-gifs/master/Generation%208/${encodeURIComponent(name)}.gif`,
  );
  const local = id <= 500 ? `/pokemon-gifs/${id}.gif` : "";
  const repositoryFront = `https://raw.githubusercontent.com/kelin132/animated-pokemon-gifs/master/${id}.gif`;
  const repositoryBack = `https://raw.githubusercontent.com/kelin132/animated-pokemon-gifs/master/back/${id}.gif`;
  const showdownFront = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${id}.gif`;
  const showdownBack = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/back/${id}.gif`;
  const animatedBwFront = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif`;
  const animatedBwBack = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/${id}.gif`;
  const preferredSideSprite = side === "me" ? pokemon.backSpriteUrl : pokemon.frontSpriteUrl;
  const animatedStoredSprite = /^https?:\/\/.*\.gif(?:\?.*)?$/i.test(preferredSideSprite)
    ? preferredSideSprite
    : "";
  const animatedCandidates =
    side === "me"
      ? [repositoryBack, showdownBack, animatedBwBack, animatedStoredSprite, repositoryFront, local]
      : [
          ...(pokemon.pokedexId >= 810 && pokemon.pokedexId <= 905 ? generationEight : []),
          repositoryFront,
          showdownFront,
          animatedBwFront,
          animatedStoredSprite,
          local,
        ];
  return [...new Set(animatedCandidates.filter(Boolean))];
}

function BattleDamageBurst({ side, amount }: { side: "me" | "foe"; amount: number | null }) {
  return (
    <div className={`battle-impact battle-impact-${side}`} aria-hidden="true">
      <span className="battle-impact-core" />
      <strong className="battle-damage-label">-{amount ?? ""}</strong>
      {Array.from({ length: 10 }, (_, index) => (
        <i key={index} style={{ ["--impact-index" as string]: index } as CSSProperties} />
      ))}
    </div>
  );
}

function BattleHud({
  pokemon,
  trainer,
  side,
}: {
  pokemon: BattlePokemon | null;
  trainer: BattleTrainer | null;
  side: "me" | "foe";
}) {
  if (!pokemon) return null;
  const hp = Math.max(0, Math.min(100, pokemon.maxHp ? (pokemon.hp / pokemon.maxHp) * 100 : 0));
  return (
    <div className={`battle-hud battle-hud-${side}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="truncate font-display text-lg font-bold">{pokemon.displayName}</span>
        <span className="font-mono-ui text-[10px] text-slate-300">Lv. {pokemon.level}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/50">
        <div
          className={`h-full rounded-full transition-all ${hp < 25 ? "bg-rose-400" : hp < 55 ? "bg-amber-300" : "bg-emerald-300"}`}
          style={{ width: `${hp}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between font-mono-ui text-[10px] text-slate-300">
        <span>{trainer?.name}</span>
        <span>
          {pokemon.hp}/{pokemon.maxHp} HP
        </span>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`battle-tab ${active ? "battle-tab-active" : ""}`}
    >
      {icon}
      {children}
    </button>
  );
}

function BattleThumbnail({
  pokemon,
  side = "foe",
  className = "",
  alt = "",
}: {
  pokemon: BattlePokemon;
  side?: "me" | "foe";
  className?: string;
  alt?: string;
}) {
  const sources = animatedPokemonUrls(pokemon, side);
  const [sourceIndex, setSourceIndex] = useState(0);
  useEffect(
    () => setSourceIndex(0),
    [pokemon.id, pokemon.pokedexId, pokemon.name, pokemon.shiny, side],
  );
  const source = sources[Math.min(sourceIndex, sources.length - 1)] ?? "";
  return (
    <img
      className={className}
      src={source}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={(event) => {
        setSourceIndex((index) => {
          if (index < sources.length - 1) return index + 1;
          event.currentTarget.style.visibility = "hidden";
          return index;
        });
      }}
    />
  );
}

function SwitchButton({
  pokemon,
  active,
  disabled,
  onClick,
}: {
  pokemon: BattlePokemon;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`battle-switch-button ${active ? "battle-switch-active" : ""} ${pokemon.hp <= 0 ? "battle-switch-fainted" : ""}`}
    >
      <BattleThumbnail pokemon={pokemon} className="battle-switch-sprite" alt="" />
      <span className="min-w-0 text-left">
        <span className="block truncate font-display text-sm font-bold">{pokemon.displayName}</span>
        <span className="font-mono-ui text-[9px] text-slate-400">
          {pokemon.hp > 0 ? `${pokemon.hp}/${pokemon.maxHp} HP` : "FAINTED"}
        </span>
      </span>
    </button>
  );
}

function PartyDot({ pokemon, active }: { pokemon: BattlePokemon | null; active: boolean }) {
  if (!pokemon)
    return (
      <div className="battle-party-dot battle-party-empty" aria-label="Empty party slot">
        <span>＋</span>
      </div>
    );
  return (
    <div
      className={`battle-party-dot ${active ? "battle-party-active" : ""} ${pokemon.hp <= 0 ? "battle-party-fainted" : ""}`}
      title={`${pokemon.displayName}: ${pokemon.hp}/${pokemon.maxHp} HP`}
    >
      <BattleThumbnail
        pokemon={pokemon}
        className="battle-party-sprite"
        alt={pokemon.displayName}
      />
    </div>
  );
}

function RoomState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <section className="hof-panel battle-empty flex min-h-52 flex-col items-center justify-center gap-3 p-8 text-center">
      {icon}
      <p className="max-w-md text-sm text-slate-300">{text}</p>
    </section>
  );
}

function UsersIcon() {
  return (
    <div className="grid size-9 place-items-center rounded-full border border-cyan-300/30 bg-cyan-300/10">
      <UserRound className="size-4 text-cyan-200" />
    </div>
  );
}
