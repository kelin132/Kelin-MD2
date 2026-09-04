import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { ArrowDownToLine, ArrowUpFromLine, BookOpen, Crown, Gift, Grip, Search, Swords } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/aidoru/AppShell";
import { UserAvatar } from "@/components/aidoru/UserAvatar";
import { useSession, useSessionWriter } from "@/components/aidoru/session";
import { claimDailyReward, movePartyPokemon, reorderParty, setLead } from "@/lib/aidoru.functions";
import { DAILY_BASE_REWARD, formatCoins, type OwnedPokemon } from "@/lib/game";

export const Route = createFileRoute("/journey")({
  head: () => ({
    meta: [
      { title: "Journey — AIDORU Pokémon party" },
      {
        name: "description",
        content: "Manage the live Pokémon party and PC from your AIDORU trainer account.",
      },
    ],
  }),
  component: JourneyPage,
});

function JourneyPage() {
  return (
    <AppShell
      title="Your Journey"
      subtitle="The same Pokémon party that battles for you in WhatsApp."
    >
      <JourneyBody />
    </AppShell>
  );
}

function JourneyBody() {
  const { data: user } = useSession();
  const writeSession = useSessionWriter();
  const [firstSlot, setFirstSlot] = useState<number | null>(null);
  const [secondSlot, setSecondSlot] = useState<number | null>(null);
  const [pokedexSearch, setPokedexSearch] = useState("");
  const [pokedex, setPokedex] = useState<Array<{ name: string; id: number }>>([]);
  useEffect(() => {
    let cancelled = false;
    fetch("https://pokeapi.co/api/v2/pokemon?limit=1025")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Pokédex unavailable")))
      .then((payload: { results?: Array<{ name: string; url: string }> }) => {
        if (cancelled) return;
        setPokedex((payload.results ?? []).map((entry) => ({ name: entry.name, id: Number(entry.url.split("/").filter(Boolean).pop()) })).filter((entry) => entry.id > 0));
      })
      .catch(() => { if (!cancelled) setPokedex([]); });
    return () => { cancelled = true; };
  }, []);
  const claim = useServerFn(claimDailyReward);
  const lead = useServerFn(setLead);
  const reorder = useServerFn(reorderParty);
  const move = useServerFn(movePartyPokemon);

  const claimMutation = useMutation({
    mutationFn: () => claim(),
    onSuccess: (result) => {
      writeSession(result.user);
      void confetti({ particleCount: 90, spread: 70, colors: ["#18e0e7", "#f8c84e"] });
      toast.success(`+${formatCoins(result.reward)} coins · day ${result.streak}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const leadMutation = useMutation({
    mutationFn: (pokemonId: string) => lead({ data: { pokemonId } }),
    onSuccess: (next) => {
      writeSession(next);
      toast.success("Lead Pokémon updated.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const reorderMutation = useMutation({
    mutationFn: () => reorder({ data: { first: firstSlot!, second: secondSlot! } }),
    onSuccess: (next) => {
      writeSession(next);
      setFirstSlot(null);
      setSecondSlot(null);
      toast.success("Party order updated.");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const moveMutation = useMutation({
    mutationFn: (data: { pokemonId: string; destination: "party" | "pc" }) => move({ data }),
    onSuccess: (next) => {
      writeSession(next);
      toast.success("Trainer party updated.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!user) return null;
  const party = user.partyPokemon ?? [];
  const pc = user.pcPokemon ?? [];
  const pokedexResults = useMemo(() => pokedex.filter((entry) => entry.name.includes(pokedexSearch.trim().toLowerCase())).slice(0, 18), [pokedex, pokedexSearch]);
  const selectedCount = [firstSlot, secondSlot].filter(Boolean).length;

  return (
    <div className="space-y-6 pb-10">
      <section className="hof-panel relative overflow-hidden p-5 sm:p-7">
        <div className="absolute -right-20 -top-24 size-64 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          <UserAvatar
            name={user.name}
            src={user.avatarUrl}
            videoSrc={user.avatarVideoUrl}
            className="size-20 border-2 border-cyan-300/60"
          />
          <div className="min-w-0 flex-1">
            <p className="hof-kicker">Battle trainer</p>
            <h2 className="hof-heading mt-1 text-3xl">{user.name}'s party</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Level {user.trainerLevel} · {formatCoins(user.trainerXp)} trainer XP · {party.length}
              /6 party slots
            </p>
          </div>
          <button
            type="button"
            onClick={() => claimMutation.mutate()}
            disabled={claimMutation.isPending}
            className="hof-button inline-flex items-center gap-2"
          >
            <Gift className="size-4" />
            {claimMutation.isPending ? "Claiming…" : `Daily +${DAILY_BASE_REWARD}`}
          </button>
        </div>
      </section>

      <section className="hof-panel p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="hof-kicker">National archive</p>
            <h2 className="hof-heading mt-1 text-3xl">Pokédex search</h2>
            <p className="mt-2 text-sm text-muted-foreground">Search the full Pokémon index, then use your owned Pokémon cards below to manage party and PC placement.</p>
          </div>
          <BookOpen className="size-7 text-cyan-300" />
        </div>
        <label className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-3">
          <Search className="size-4 text-cyan-300" />
          <input value={pokedexSearch} onChange={(event) => setPokedexSearch(event.target.value)} placeholder="Search Pokémon by name…" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </label>
        {pokedexSearch.trim() && <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {pokedexResults.map((entry) => <div key={entry.id} className="rounded-2xl border border-white/10 bg-black/15 p-3 text-center">
            <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${entry.id}.png`} alt={entry.name} loading="lazy" className="mx-auto size-20 object-contain" />
            <p className="truncate font-display text-sm font-semibold capitalize">{entry.name.replaceAll("-", " ")}</p>
            <p className="font-mono-ui text-[9px] text-cyan-200">#{String(entry.id).padStart(3, "0")}</p>
          </div>)}
          {pokedex.length > 0 && pokedexResults.length === 0 && <p className="col-span-full text-sm text-muted-foreground">No Pokémon matched that search.</p>}
        </div>}
      </section>

      <section className="hof-panel p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="hof-kicker">Battle formation</p>
            <h2 className="hof-heading mt-1 text-3xl">Active party</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Tap two slots to swap them, or make a living Pokémon your lead.
            </p>
          </div>
          <Swords className="size-7 text-cyan-300" />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {party.map((pokemon, index) => (
            <PartyCard
              key={pokemon.id}
              pokemon={pokemon}
              slot={index + 1}
              lead={user.leadPokemonId === pokemon.id}
              selected={firstSlot === index + 1 || secondSlot === index + 1}
              onSlot={() => {
                if (!firstSlot || firstSlot === index + 1) setFirstSlot(index + 1);
                else setSecondSlot(index + 1);
              }}
              onLead={() => leadMutation.mutate(pokemon.id)}
              onMove={() => moveMutation.mutate({ pokemonId: pokemon.id, destination: "pc" })}
            />
          ))}
          {party.length === 0 && (
            <EmptyState text="No active party found. Start your Pokémon journey in WhatsApp with .startjourney." />
          )}
        </div>
        {selectedCount === 2 && (
          <button
            type="button"
            onClick={() => reorderMutation.mutate()}
            disabled={reorderMutation.isPending}
            className="hof-button mt-5"
          >
            {reorderMutation.isPending ? "Swapping…" : `Swap slots ${firstSlot} and ${secondSlot}`}
          </button>
        )}
      </section>

      <section className="hof-panel p-5 sm:p-7">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="hof-kicker">Trainer storage</p>
            <h2 className="hof-heading mt-1 text-3xl">Your PC</h2>
          </div>
          <Grip className="size-7 text-cyan-300" />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {pc.map((pokemon) => (
            <PcCard
              key={pokemon.id}
              pokemon={pokemon}
              onMove={() => moveMutation.mutate({ pokemonId: pokemon.id, destination: "party" })}
            />
          ))}
          {pc.length === 0 && (
            <EmptyState text="Your PC is empty. Catch more Pokémon through the bot to expand your collection." />
          )}
        </div>
      </section>
    </div>
  );
}

function PartyCard({
  pokemon,
  slot,
  lead,
  selected,
  onSlot,
  onLead,
  onMove,
}: {
  pokemon: OwnedPokemon;
  slot: number;
  lead: boolean;
  selected: boolean;
  onSlot: () => void;
  onLead: () => void;
  onMove: () => void;
}) {
  return (
    <article
      className={`hof-pokemon-card relative overflow-hidden rounded-3xl border p-4 ${lead ? "border-cyan-300/70" : "border-white/10"} ${selected ? "ring-2 ring-amber-300/80" : ""}`}
    >
      <button
        type="button"
        onClick={onSlot}
        className="absolute left-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-black/60 font-mono-ui text-xs text-cyan-200"
      >
        {slot}
      </button>
      {lead && (
        <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-cyan-300 px-2 py-1 font-mono-ui text-[9px] font-bold text-[#03232e] uppercase">
          <Crown className="size-3" /> Lead
        </span>
      )}
      <img
        src={pokemon.imageUrl}
        alt={pokemon.displayName}
        className="mx-auto h-40 w-full object-contain"
        loading="lazy"
      />
      <div className="text-center">
        <p className="font-display text-xl font-bold">{pokemon.nickname || pokemon.displayName}</p>
        <p className="mt-1 font-mono-ui text-[10px] text-cyan-200">
          LV {pokemon.level} · {pokemon.hp}/{pokemon.maxHp} HP
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onLead}
          disabled={lead}
          className="hof-tab px-2 py-2 font-mono-ui text-[9px] uppercase disabled:opacity-40"
        >
          {lead ? "Lead" : "Set lead"}
        </button>
        <button
          type="button"
          onClick={onMove}
          className="hof-tab inline-flex items-center justify-center gap-1 px-2 py-2 font-mono-ui text-[9px] uppercase"
        >
          <ArrowDownToLine className="size-3" /> PC
        </button>
      </div>
    </article>
  );
}

function PcCard({ pokemon, onMove }: { pokemon: OwnedPokemon; onMove: () => void }) {
  return (
    <article className="hof-pokemon-card rounded-3xl border border-white/10 p-4 text-center">
      <img
        src={pokemon.imageUrl}
        alt={pokemon.displayName}
        className="mx-auto h-32 w-full object-contain"
        loading="lazy"
      />
      <p className="font-display text-lg font-bold">{pokemon.nickname || pokemon.displayName}</p>
      <p className="mt-1 font-mono-ui text-[10px] text-muted-foreground">LV {pokemon.level}</p>
      <button
        type="button"
        onClick={onMove}
        className="hof-tab mt-4 inline-flex items-center gap-1 px-3 py-2 font-mono-ui text-[9px] uppercase"
      >
        <ArrowUpFromLine className="size-3" /> Add to party
      </button>
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="col-span-full rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}
