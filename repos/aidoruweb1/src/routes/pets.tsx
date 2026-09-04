import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Egg, Heart, PawPrint, Sparkles, Utensils, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/aidoru/AppShell";
import { buyPetCareItem, feedMyPet, hatchMyPet, playWithPet, releaseMyPet, selectMyPet, fetchMyPets } from "@/lib/aidoru.functions";
import { formatCoins, petImageForSpecies, PET_RARITY_LABEL, type OwnedPet } from "@/lib/game";

export const Route = createFileRoute("/pets")({
  head: () => ({
    meta: [
      { title: "Pet Lounge — AIDORU" },
      { name: "description", content: "Feed, play with, hatch, and manage your live pets." },
    ],
  }),
  component: PetsPage,
});

const PET_SHOP = [
  { key: "kibble", name: "Kibble", price: 200, detail: "+40 hunger" },
  { key: "meal", name: "Premium Meal", price: 500, detail: "Full hunger · +10 happiness" },
  { key: "toy", name: "Toy", price: 300, detail: "+35 happiness" },
  { key: "exppotion", name: "EXP Potion", price: 800, detail: "+150 EXP" },
  { key: "revival", name: "Revival Tonic", price: 600, detail: "+60 hunger · +40 happiness" },
] as const;

function PetsPage() {
  return (
    <AppShell title="Pet Lounge" subtitle="Care for the same companions you manage through the bot’s pet commands.">
      <PetsBody />
    </AppShell>
  );
}

function PetsBody() {
  const queryClient = useQueryClient();
  const fetchPets = useServerFn(fetchMyPets);
  const query = useQuery({ queryKey: ["aidoru", "my-pets"], queryFn: () => fetchPets(), retry: false });
  const [flash, setFlash] = useState<string | null>(null);
  const [busyPet, setBusyPet] = useState<string | null>(null);
  const action = async (petId: string, fn: (options: { data: { petId: string } }) => Promise<OwnedPet[]>, message: string) => {
    setBusyPet(petId);
    setFlash(null);
    try {
      await fn({ data: { petId } });
      await queryClient.invalidateQueries({ queryKey: ["aidoru", "my-pets"] });
      setFlash(message);
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "The pet action could not be completed.");
    } finally {
      setBusyPet(null);
    }
  };
  const feed = useServerFn(feedMyPet);
  const play = useServerFn(playWithPet);
  const select = useServerFn(selectMyPet);
  const release = useServerFn(releaseMyPet);
  const hatch = useServerFn(hatchMyPet);
  const buy = useServerFn(buyPetCareItem);
  const pets = query.data ?? [];
  const active = pets.find((pet) => pet.isActive) ?? pets[0];

  const doHatch = async () => {
    setBusyPet("hatch");
    setFlash(null);
    try {
      await hatch();
      await queryClient.invalidateQueries({ queryKey: ["aidoru", "my-pets"] });
      setFlash("A new companion hatched from the egg.");
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "The egg could not be hatched.");
    } finally {
      setBusyPet(null);
    }
  };

  const doShop = async (itemKey: string, petId: string, itemName: string) => {
    setBusyPet(`${petId}-${itemKey}`);
    setFlash(null);
    try {
      await buy({ data: { itemKey: itemKey as "kibble" | "meal" | "toy" | "exppotion" | "revival", petId } });
      await queryClient.invalidateQueries({ queryKey: ["aidoru", "my-pets"] });
      setFlash(`${itemName} used successfully.`);
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "The pet-care purchase could not be completed.");
    } finally {
      setBusyPet(null);
    }
  };

  return (
    <div className="aidoru-page aidoru-page-pets space-y-6 pb-10">
      <section className="hof-panel relative overflow-hidden p-5 sm:p-7">
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="hof-kicker">Companion management</p>
            <h2 className="hof-heading mt-1 text-4xl">Your Pets</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">Feed, play, care, hatch, select, and release companions from the same live pet collection.</p>
          </div>
          <button type="button" onClick={() => void doHatch()} disabled={busyPet !== null || pets.length >= 5} className="hof-button inline-flex items-center gap-2 px-4 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-45"><Egg className="size-4" />{busyPet === "hatch" ? "Hatching…" : "Hatch egg"}</button>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 sm:grid-cols-3">
          <MiniStat label="Stable" value={`${pets.length}/5`} />
          <MiniStat label="Active" value={active?.name ?? "None"} />
          <MiniStat label="Care shop" value="5 items" />
        </div>
      </section>

      {flash && <div className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100">{flash}</div>}
      {query.isLoading && <div className="hof-panel py-16 text-center text-sm text-muted-foreground"><PawPrint className="mx-auto mb-3 size-8 animate-bounce text-cyan-300" />Loading your companions…</div>}
      {query.isError && <div className="hof-panel py-16 text-center"><PawPrint className="mx-auto mb-3 size-8 text-cyan-300/70" /><p className="font-display text-2xl font-semibold">Pet stable unavailable</p><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">The live pets collection could not be reached. Try refreshing once the shared database is online.</p></div>}
      {!query.isLoading && !query.isError && pets.length === 0 && <div className="hof-panel py-16 text-center"><Egg className="mx-auto mb-3 size-8 text-cyan-300/70" /><p className="font-display text-2xl font-semibold">Your stable is empty</p><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Hatch an egg here or use .adopt in WhatsApp to meet your first companion.</p></div>}

      {pets.length > 0 && <div className="grid gap-4 lg:grid-cols-2">{pets.map((pet) => <PetCard key={pet.petId} pet={pet} busy={busyPet?.startsWith(pet.petId) ?? false} onFeed={() => void action(pet.petId, feed, `${pet.name} enjoyed a meal.`)} onPlay={() => void action(pet.petId, play, `${pet.name} had a playful session.`)} onSelect={() => void action(pet.petId, select, `${pet.name} is now your active companion.`)} onRelease={() => { if (window.confirm(`Release ${pet.name}? This removes it from your stable.`)) void action(pet.petId, release, `${pet.name} was released.`); }} onShop={(key, name) => void doShop(key, pet.petId, name)} />)}</div>}

      <section className="hof-panel p-5 sm:p-6">
        <div className="flex items-end justify-between gap-3"><div><p className="hof-kicker">Bot parity shop</p><h2 className="hof-heading mt-1 text-3xl">Pet care supplies</h2></div><Utensils className="size-6 text-cyan-300" /></div>
        <p className="mt-2 text-xs text-muted-foreground">Prices and effects mirror .petshop. Select a companion card below before buying.</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{PET_SHOP.map((item) => <div key={item.key} className="rounded-xl border border-white/10 bg-black/15 p-3"><p className="font-display text-lg font-semibold">{item.name}</p><p className="mt-1 text-xs text-muted-foreground">{item.detail}</p><p className="mt-3 font-mono-ui text-xs text-cyan-200">{formatCoins(item.price)} coins</p>{active && <button type="button" onClick={() => void doShop(item.key, active.petId, item.name)} disabled={busyPet !== null} className="mt-3 w-full rounded-lg border border-cyan-300/25 bg-cyan-300/10 px-2 py-2 font-display text-sm font-semibold text-cyan-100 disabled:opacity-50">Use on active</button>}</div>)}</div>
      </section>
    </div>
  );
}

function PetCard({ pet, busy, onFeed, onPlay, onSelect, onRelease, onShop }: { pet: OwnedPet; busy: boolean; onFeed: () => void; onPlay: () => void; onSelect: () => void; onRelease: () => void; onShop: (key: string, name: string) => void }) {
  return (
    <motion.article layout animate={busy ? { scale: [1, 1.02, 1], rotate: [0, -1, 1, 0] } : {}} transition={{ duration: 0.5 }} className={`hof-panel relative overflow-hidden p-4 sm:p-5 ${pet.isActive ? "border-cyan-300/45" : ""}`}>
      <div className="flex gap-4">
        <div className="aidoru-pet-avatar relative grid size-28 shrink-0 place-items-center overflow-hidden rounded-2xl border border-cyan-300/20 bg-cyan-300/10 sm:size-36">
          <PetImage pet={pet} />
          {busy && <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 0.8 }} className="absolute inset-0 grid place-items-center bg-cyan-300/20"><Sparkles className="size-10 text-white" /></motion.div>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2"><div><p className="hof-kicker">{PET_RARITY_LABEL[pet.rarity] ?? pet.rarity}</p><h3 className="truncate font-display text-2xl font-bold">{pet.name}</h3><p className="text-xs text-muted-foreground">{pet.species} · #{pet.petId}</p></div>{pet.isActive && <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-2 py-1 font-mono-ui text-[9px] text-cyan-200">ACTIVE</span>}</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs"><Progress label="Hunger" value={pet.hunger} tone="bg-amber-300" /><Progress label="Happiness" value={pet.happiness} tone="bg-pink-300" /></div>
          <p className="mt-3 text-xs text-muted-foreground">LV {pet.level} · HP {pet.hp}/{pet.maxHp} · ATK {pet.attack} · DEF {pet.defense}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><button type="button" onClick={onFeed} disabled={busy} className="pet-action"><Utensils className="size-3.5" />Feed</button><button type="button" onClick={onPlay} disabled={busy} className="pet-action"><Heart className="size-3.5" />Play</button>{!pet.isActive && <button type="button" onClick={onSelect} disabled={busy} className="pet-action">Select</button>}<button type="button" onClick={onRelease} disabled={busy} className="pet-action border-rose-300/20 text-rose-100"><X className="size-3.5" />Release</button></div>
      <div className="mt-3 flex flex-wrap gap-2">{PET_SHOP.slice(0, 3).map((item) => <button key={item.key} type="button" onClick={() => onShop(item.key, item.name)} disabled={busy} className="rounded-full border border-white/10 px-3 py-1.5 font-mono-ui text-[9px] text-muted-foreground transition hover:border-cyan-300/30 hover:text-cyan-100">{item.name}</button>)}</div>
    </motion.article>
  );
}

function PetImage({ pet }: { pet: OwnedPet }) {
  const botArtwork = petImageForSpecies(pet.species, pet.name);
  const fallback = botArtwork ?? `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(pet.name)}`;
  const [src, setSrc] = useState(pet.imageUrl || fallback);
  useEffect(() => setSrc(pet.imageUrl || fallback), [pet.imageUrl, fallback]);
  if (!src) return <PawPrint className="size-12 text-cyan-200" />;
  return <img src={src} alt={pet.name} loading="lazy" className="size-full object-contain p-3" onError={() => setSrc((current) => current === fallback ? "" : fallback)} />;
}

function Progress({ label, value, tone }: { label: string; value: number; tone: string }) { return <div><div className="mb-1 flex justify-between font-mono-ui text-[9px] text-muted-foreground"><span>{label}</span><span>{value}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${tone}`} style={{ width: `${value}%` }} /></div></div>; }
function MiniStat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/10 bg-black/15 px-3 py-2"><p className="hof-label">{label}</p><p className="mt-1 truncate font-mono-ui text-xs font-bold text-cyan-100">{value}</p></div>; }
