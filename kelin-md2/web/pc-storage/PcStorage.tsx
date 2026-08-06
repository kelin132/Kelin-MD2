import { useState } from "react";

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  fire:     { bg: "bg-orange-500/20",  text: "text-orange-400",  border: "border-orange-500/40" },
  water:    { bg: "bg-blue-500/20",    text: "text-blue-400",    border: "border-blue-500/40" },
  grass:    { bg: "bg-green-500/20",   text: "text-green-400",   border: "border-green-500/40" },
  electric: { bg: "bg-yellow-400/20",  text: "text-yellow-400",  border: "border-yellow-400/40" },
  psychic:  { bg: "bg-pink-500/20",    text: "text-pink-400",    border: "border-pink-500/40" },
  normal:   { bg: "bg-gray-400/20",    text: "text-gray-300",    border: "border-gray-400/40" },
  flying:   { bg: "bg-sky-400/20",     text: "text-sky-400",     border: "border-sky-400/40" },
  bug:      { bg: "bg-lime-500/20",    text: "text-lime-400",    border: "border-lime-500/40" },
  poison:   { bg: "bg-purple-500/20",  text: "text-purple-400",  border: "border-purple-500/40" },
  rock:     { bg: "bg-stone-400/20",   text: "text-stone-400",   border: "border-stone-400/40" },
  ground:   { bg: "bg-amber-600/20",   text: "text-amber-500",   border: "border-amber-600/40" },
  ice:      { bg: "bg-cyan-400/20",    text: "text-cyan-400",    border: "border-cyan-400/40" },
  fighting: { bg: "bg-red-600/20",     text: "text-red-400",     border: "border-red-600/40" },
  ghost:    { bg: "bg-violet-600/20",  text: "text-violet-400",  border: "border-violet-600/40" },
  dragon:   { bg: "bg-indigo-600/20",  text: "text-indigo-400",  border: "border-indigo-600/40" },
  dark:     { bg: "bg-slate-600/20",   text: "text-slate-400",   border: "border-slate-600/40" },
  steel:    { bg: "bg-zinc-400/20",    text: "text-zinc-400",    border: "border-zinc-400/40" },
  fairy:    { bg: "bg-rose-400/20",    text: "text-rose-400",    border: "border-rose-400/40" },
};

const TYPE_EMOJIS: Record<string, string> = {
  fire: "🔥", water: "💧", grass: "🍃", electric: "⚡", psychic: "🔮",
  normal: "⭐", flying: "🌤️", bug: "🐛", poison: "☠️", rock: "🪨",
  ground: "🌍", ice: "❄️", fighting: "🥊", ghost: "👻", dragon: "🐉",
  dark: "🌑", steel: "⚙️", fairy: "🌸",
};

interface Pokemon {
  id: number;
  name: string;
  displayName: string;
  type: string;
  level: number;
  hp: number;
  maxHp: number;
  xp: number;
  xpNeeded: number;
  shiny?: boolean;
  nickname?: string;
  sprite: string;
}

const MOCK_POKEMON: Pokemon[] = [
  { id: 1, name: "charmander",  displayName: "Charmander",  type: "fire",     level: 8,  hp: 52,  maxHp: 52,  xp: 493, xpNeeded: 577, sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png" },
  { id: 2, name: "throh",       displayName: "Throh",       type: "fighting",  level: 7,  hp: 162, maxHp: 162, xp: 380, xpNeeded: 485, sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/538.png" },
  { id: 3, name: "palkia",      displayName: "Palkia",      type: "dragon",    level: 5,  hp: 112, maxHp: 112, xp: 12,  xpNeeded: 324, sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/484.png" },
  { id: 4, name: "eevee",       displayName: "Eevee",       type: "normal",    level: 12, hp: 45,  maxHp: 60,  xp: 740, xpNeeded: 900, sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/133.png" },
  { id: 5, name: "gengar",      displayName: "Gengar",      type: "ghost",     level: 20, hp: 0,   maxHp: 120, xp: 1200, xpNeeded: 2150, sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/94.png" },
  { id: 6, name: "lapras",      displayName: "Lapras",      type: "water",     level: 15, hp: 200, maxHp: 200, xp: 980, xpNeeded: 1200, sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/131.png" },
  { id: 7, name: "flygon",      displayName: "Flygon",      type: "dragon",    level: 18, hp: 134, maxHp: 140, xp: 1580, xpNeeded: 1800, shiny: true, sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/330.png" },
  { id: 8, name: "jolteon",     displayName: "Jolteon",     type: "electric",  level: 11, hp: 65,  maxHp: 65,  xp: 620, xpNeeded: 800, sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/135.png" },
  { id: 9, name: "roserade",    displayName: "Roserade",    type: "grass",     level: 9,  hp: 50,  maxHp: 72,  xp: 540, xpNeeded: 660, sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/407.png" },
  { id: 10, name: "alakazam",   displayName: "Alakazam",    type: "psychic",   level: 22, hp: 88,  maxHp: 88,  xp: 2100, xpNeeded: 2600, nickname: "Zam", sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/65.png" },
];

const PAGE_SIZE = 8;

function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const pct = maxHp > 0 ? Math.round((hp / maxHp) * 100) : 0;
  const color = pct > 50 ? "bg-emerald-500" : pct > 20 ? "bg-yellow-400" : "bg-red-500";
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-white/50 tabular-nums shrink-0">{hp}/{maxHp}</span>
    </div>
  );
}

function XpBar({ xp, xpNeeded }: { xp: number; xpNeeded: number }) {
  const pct = xpNeeded > 0 ? Math.min(100, Math.round((xp / xpNeeded) * 100)) : 100;
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-white/50 tabular-nums shrink-0">{xp}/{xpNeeded}</span>
    </div>
  );
}

function PokemonCard({ pokemon, selected, onClick }: { pokemon: Pokemon; selected: boolean; onClick: () => void }) {
  const colors = TYPE_COLORS[pokemon.type] || TYPE_COLORS.normal;
  const fainted = pokemon.hp === 0;
  const hpPct = pokemon.maxHp > 0 ? (pokemon.hp / pokemon.maxHp) * 100 : 0;

  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all w-full
        ${selected
          ? `${colors.bg} ${colors.border} border shadow-lg shadow-black/20`
          : "bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20"}
        ${fainted ? "opacity-60" : ""}
      `}
    >
      {/* Sprite */}
      <div className={`relative shrink-0 w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
        <img
          src={pokemon.sprite}
          alt={pokemon.displayName}
          className={`w-9 h-9 object-contain pixelated ${fainted ? "grayscale" : ""}`}
          style={{ imageRendering: "pixelated" }}
        />
        {pokemon.shiny && (
          <span className="absolute -top-1 -right-1 text-[10px]">✨</span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-sm font-semibold text-white truncate leading-none">
            {pokemon.nickname ? pokemon.nickname : pokemon.displayName}
          </span>
          {pokemon.nickname && (
            <span className="text-[10px] text-white/40 truncate">({pokemon.displayName})</span>
          )}
          <span className={`ml-auto shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${colors.bg} ${colors.text} border ${colors.border}`}>
            {TYPE_EMOJIS[pokemon.type]} {pokemon.type}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] text-white/50">Lv.<span className="text-white/70 font-medium">{pokemon.level}</span></span>
          {fainted && <span className="text-[10px] text-red-400 font-medium">FAINTED</span>}
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-red-400/80 w-5 shrink-0">❤️</span>
            <HpBar hp={pokemon.hp} maxHp={pokemon.maxHp} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-blue-400/80 w-5 shrink-0">✨</span>
            <XpBar xp={pokemon.xp} xpNeeded={pokemon.xpNeeded} />
          </div>
        </div>
      </div>
    </button>
  );
}

function DetailPanel({ pokemon }: { pokemon: Pokemon | null }) {
  if (!pokemon) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/20 gap-2">
        <span className="text-4xl">📦</span>
        <p className="text-sm">Select a Pokémon</p>
      </div>
    );
  }

  const colors = TYPE_COLORS[pokemon.type] || TYPE_COLORS.normal;
  const hpPct = pokemon.maxHp > 0 ? Math.round((pokemon.hp / pokemon.maxHp) * 100) : 0;
  const xpPct = pokemon.xpNeeded > 0 ? Math.min(100, Math.round((pokemon.xp / pokemon.xpNeeded) * 100)) : 100;
  const hpColor = hpPct > 50 ? "text-emerald-400" : hpPct > 20 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Sprite big */}
      <div className={`rounded-2xl ${colors.bg} border ${colors.border} flex items-center justify-center py-6 relative`}>
        <img
          src={pokemon.sprite}
          alt={pokemon.displayName}
          className="w-24 h-24 object-contain"
          style={{ imageRendering: "pixelated" }}
        />
        {pokemon.shiny && (
          <span className="absolute top-2 right-2 text-lg">✨</span>
        )}
      </div>

      {/* Name & type */}
      <div className="text-center">
        <h2 className="text-white font-bold text-xl leading-none">
          {pokemon.nickname || pokemon.displayName}
        </h2>
        {pokemon.nickname && (
          <p className="text-white/40 text-xs mt-0.5">{pokemon.displayName}</p>
        )}
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
            {TYPE_EMOJIS[pokemon.type]} {pokemon.type.charAt(0).toUpperCase() + pokemon.type.slice(1)}
          </span>
          <span className="text-xs text-white/50 bg-white/10 px-2.5 py-1 rounded-full">
            Lv. {pokemon.level}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-white/50 flex items-center gap-1">❤️ HP</span>
            <span className={`text-xs font-semibold tabular-nums ${hpColor}`}>{pokemon.hp}/{pokemon.maxHp}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${hpPct > 50 ? "bg-emerald-500" : hpPct > 20 ? "bg-yellow-400" : "bg-red-500"}`}
              style={{ width: `${hpPct}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-white/50 flex items-center gap-1">✨ XP</span>
            <span className="text-xs font-semibold tabular-nums text-blue-400">{pokemon.xp}/{pokemon.xpNeeded}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${xpPct}%` }} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-auto grid grid-cols-2 gap-2">
        <button className="text-xs bg-white/10 hover:bg-white/15 text-white/70 rounded-lg py-2 transition-colors">
          ↩ To Party
        </button>
        <button className="text-xs bg-white/10 hover:bg-white/15 text-white/70 rounded-lg py-2 transition-colors">
          🔍 Info
        </button>
      </div>
    </div>
  );
}

export function PcStorage() {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Pokemon | null>(MOCK_POKEMON[0]);

  const totalPages = Math.ceil(MOCK_POKEMON.length / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE;
  const slice = MOCK_POKEMON.slice(start, start + PAGE_SIZE);

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4 font-['Inter']">
      <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#161922] shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <span className="text-lg">📦</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-base leading-none">PC Storage</h1>
              <p className="text-white/40 text-xs mt-0.5">{MOCK_POKEMON.length} Pokémon stored</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded-lg bg-white/8 hover:bg-white/12 disabled:opacity-30 text-white/70 text-sm transition-colors flex items-center justify-center"
            >‹</button>
            <span className="text-xs text-white/40 tabular-nums px-1">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 rounded-lg bg-white/8 hover:bg-white/12 disabled:opacity-30 text-white/70 text-sm transition-colors flex items-center justify-center"
            >›</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex" style={{ height: 520 }}>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
            {slice.map(p => (
              <PokemonCard
                key={p.id}
                pokemon={p}
                selected={selected?.id === p.id}
                onClick={() => setSelected(p)}
              />
            ))}
          </div>

          {/* Detail panel */}
          <div className="w-52 shrink-0 border-l border-white/8 bg-white/[0.015]">
            <DetailPanel pokemon={selected} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/8 flex items-center justify-between bg-white/[0.01]">
          <p className="text-xs text-white/30">Tap a Pokémon to inspect • Use *.pc &lt;page&gt;* to navigate</p>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${page === i + 1 ? "bg-indigo-400" : "bg-white/20"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
