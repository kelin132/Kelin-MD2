/**
 * KELIN MD — Fun shift-work mini-game (.work)
 *
 * Pick the next job (1/2/3), send your crew out, and they work 4
 * back-to-back shifts. Money and loot are held until the crew clocks out,
 * then .work collect pays everything out at once.
 *
 * Coworkers are fictional bot NPCs generated per site — never real
 * group members — so nobody is pinged, credited, or blamed by mistake.
 */

import { getUser, saveUser, addMoney, addHistory, requireRegistration } from "./database.js";

// ─── Config ────────────────────────────────────────────────────────────────

const SHIFTS_PER_SITE = 4;

const SITES = {
  1: {
    key: "mine",
    name: "Mining Site",
    emoji: "⛏️",
    verb: "mining",
    shiftDuration: 45 * 1000,
    payMin: 10_000,
    payMax: 15_000,
    loot: ["raw_ore", "iron_ore", "gold_nugget", "gemstone"],
    flavor: [
      "swung a pickaxe deep in the shaft",
      "hauled a cart of ore to the surface",
      "cracked open a vein of raw ore",
      "dodged a small cave-in without a scratch",
    ],
  },
  2: {
    key: "workshop",
    name: "Tool Workshop",
    emoji: "🔧",
    verb: "gathering tools",
    shiftDuration: 60 * 1000,
    payMin: 12_000,
    payMax: 18_000,
    loot: ["iron_pickaxe", "steel_hammer", "tool_kit", "spare_parts"],
    flavor: [
      "forged a fresh set of tools",
      "restocked the workshop shelves",
      "fixed up a broken tool kit",
      "sharpened every blade in the rack",
    ],
  },
  3: {
    key: "depot",
    name: "Equipment Depot",
    emoji: "📦",
    verb: "gathering equipment",
    shiftDuration: 75 * 1000,
    payMin: 15_000,
    payMax: 22_000,
    loot: ["tactical_vest", "supply_crate", "gear_pack", "utility_belt"],
    flavor: [
      "packed a crate of gear for transport",
      "ran inventory on the whole depot",
      "loaded the truck with fresh supplies",
      "found a stash of spare equipment",
    ],
  },
};

// ─── Fictional NPC crew (never real members) ────────────────────────────────

const NPC_FIRST = ["Rex", "Mika", "Dobby", "Ash", "Nova", "Kip", "Zed", "Luna", "Bram", "Yumi", "Otto", "Fern"];
const NPC_LAST = ["Ironhand", "Swiftfoot", "Nightshade", "Copperfield", "Vane", "Ashworth", "Quickdraw", "Marrow"];

function randomNpcName() {
  return `${NPC_FIRST[Math.floor(Math.random() * NPC_FIRST.length)]} ${NPC_LAST[Math.floor(Math.random() * NPC_LAST.length)]}`;
}

function randomCrew(count) {
  const names = new Set();
  while (names.size < count) names.add(randomNpcName());
  return [...names];
}

function randomPay(site) {
  return Math.floor(Math.random() * (site.payMax - site.payMin + 1)) + site.payMin;
}

function randomLoot(site, count = 1) {
  const picks = [];
  for (let i = 0; i < count; i++) {
    picks.push(site.loot[Math.floor(Math.random() * site.loot.length)]);
  }
  return picks;
}

function formatMoney(amount) {
  return `$${Math.round(amount).toLocaleString()}`;
}

function mentionLabel(sender) {
  const value = String(sender);
  if (value.startsWith("discord:")) return `<@${value.slice("discord:".length)}>`;
  return `@${value.split("@")[0].split(":")[0]}`;
}

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${String(seconds).padStart(2, "0")}s` : `${seconds}s`;
}

function itemLabel(key) {
  return key.replace(/_/g, " ");
}

function summarizeItems(items) {
  const count = {};
  items.forEach((i) => { count[i] = (count[i] || 0) + 1; });
  return Object.entries(count)
    .map(([item, qty]) => `• ${itemLabel(item)} x${qty}`)
    .join("\n");
}

// ─── Active work state (in-memory, per sender) ──────────────────────────────
// { siteKey, shift, moneyEarned, items[], crew[], status: "working"|"ready", endsAt, timeout }

const WORK_STATE = new Map();

function siteMenuText() {
  return [
    `Work: tell your crew what to do next.`,
    `1. Mine ore and gems (about $40k-$60k after 4 shifts)`,
    `2. Make tools and parts (about $48k-$72k after 4 shifts)`,
    `3. Gather equipment and crates (about $60k-$88k after 4 shifts)`,
    `Use .work 1, .work 2, or .work 3.`,
  ].join("\n");
}

// ─── Shift runner ────────────────────────────────────────────────────────────

function scheduleShift(sock, jid, sender) {
  const state = WORK_STATE.get(sender);
  if (!state) return;
  const site = SITES[state.siteKey];

  state.endsAt = Date.now() + site.shiftDuration;
  state.timeout = setTimeout(() => runShiftEnd(sock, jid, sender), site.shiftDuration);
}

async function runShiftEnd(sock, jid, sender) {
  const state = WORK_STATE.get(sender);
  if (!state) return;
  const site = SITES[state.siteKey];

  const pay = randomPay(site);
  const drop = randomLoot(site, 1);
  state.moneyEarned += pay;
  state.items.push(...drop);

  if (state.shift < SHIFTS_PER_SITE) {
    state.shift += 1;
    scheduleShift(sock, jid, sender);
  } else {
    state.status = "ready";
    state.timeout = null;
  }
}

// ─── Plugin ──────────────────────────────────────────────────────────────────

export default {
  name: "work",
  description: "Send a bot crew to a site for 4 shifts, then collect the pay and loot",
  category: "economy",
  cooldown: 3,
  usage: ".work start | .work <1|2|3> | .work status | .work collect",
  checkJail: true,

  async run({ sock, msg, sender, args }) {
    if (!(await requireRegistration(sock, msg, sender))) return;

    const jid = msg.key.remoteJid;
    const reply = (text, mentions = [sender]) =>
      sock.sendMessage(jid, { text, mentions }, { quoted: msg });
    const sub = (args[0] || "").toLowerCase();
    const state = WORK_STATE.get(sender);

    // ── .work collect ──────────────────────────────────────────────────────
    if (sub === "collect") {
      if (!state || state.status !== "ready") {
        return reply(
          state
            ? state.status === "choosing"
              ? `${mentionLabel(sender)} work has started. Choose .work 1, .work 2, or .work 3 first.`
              : `${mentionLabel(sender)} your crew isn't back yet. Check .work status.`
            : `${mentionLabel(sender)} start with .work start, then choose .work 1, .work 2, or .work 3.`
        );
      }
      if (state.collecting) {
        return reply(`${mentionLabel(sender)} your crew's haul is already being loaded. Please wait.`);
      }

      state.collecting = true;
      try {
        await addMoney(sender, state.moneyEarned);
        await addHistory(sender, "work", state.moneyEarned, `${SITES[state.siteKey].name} — ${SHIFTS_PER_SITE} shifts`);

        const user = await getUser(sender);
        user.inventory = [...(user.inventory || []), ...state.items];
        await saveUser(sender, user);
      } catch (err) {
        state.collecting = false;
        console.error("[work] collect failed:", err);
        return reply(`⚠️ Something went wrong collecting your haul. Try again.`);
      }

      const site = SITES[state.siteKey];
      WORK_STATE.delete(sender);

      return reply([
        `${mentionLabel(sender)} your crew is home from ${site.name}.`,
        `Money collected: +${formatMoney(state.moneyEarned)}`,
        `Items collected: ${summarizeItems(state.items).replace(/\n/g, ", ")}`,
        `Use .work start to send them out again.`,
      ].join("\n"));
    }

    // ── .work status ───────────────────────────────────────────────────────
    if (sub === "status") {
      if (!state) return reply(`${mentionLabel(sender)} start with .work start, then choose .work 1, .work 2, or .work 3.`);
      if (state.status === "choosing") {
        return reply(`${mentionLabel(sender)} work has started. Choose .work 1, .work 2, or .work 3.`);
      }
      const site = SITES[state.siteKey];

      if (state.status === "ready") {
        return reply(`${mentionLabel(sender)} your crew is home from ${site.name}.\nMoney ready: ${formatMoney(state.moneyEarned)}\nUse .work collect.`);
      }

      const remaining = Math.max(0, state.endsAt - Date.now());
      return reply(`${mentionLabel(sender)} ${site.name}: shift ${state.shift}/${SHIFTS_PER_SITE}.\nNext shift in ${formatRemaining(remaining)}.\nMoney held so far: ${formatMoney(state.moneyEarned)}.`);
    }

    // ── .work start (open the job selection) ───────────────────────────────
    if (sub === "start") {
      if (state) {
        if (state.status === "choosing") {
          return reply(`${mentionLabel(sender)}\n${siteMenuText()}`);
        }
        if (state.status === "ready") {
          return reply(`${mentionLabel(sender)} your crew is already home with ${formatMoney(state.moneyEarned)} waiting.\nUse .work collect.`);
        }
        const remaining = Math.max(0, state.endsAt - Date.now());
        return reply(`${mentionLabel(sender)} your crew is already working at ${SITES[state.siteKey].name}, shift ${state.shift}/${SHIFTS_PER_SITE}.\nNext shift in ${formatRemaining(remaining)}.`);
      }
      WORK_STATE.set(sender, {
        status: "choosing",
        startedAt: Date.now(),
        collecting: false,
      });
      return reply(`${mentionLabel(sender)}\n${siteMenuText()}`);
    }

    // ── .work without start ────────────────────────────────────────────────
    if (!sub) {
      return reply(`${mentionLabel(sender)} start with .work start, then choose .work 1, .work 2, or .work 3.`);
    }

    // ── .work 1 / .work 2 / .work 3 (choose the next crew job) ────────────
    const site = SITES[sub];
    if (!site) return reply(`${mentionLabel(sender)} start with .work start, then choose .work 1, .work 2, or .work 3.`);

    if (state) {
      if (state.status !== "choosing") {
        if (state.status === "ready") {
          return reply(`${mentionLabel(sender)} your crew is already home with ${formatMoney(state.moneyEarned)} waiting.\nUse .work collect.`);
        }
        return reply(`${mentionLabel(sender)} your crew is already working at ${SITES[state.siteKey].name}. Check .work status.`);
      }
    } else {
      return reply(`${mentionLabel(sender)} start with .work start, then choose .work 1, .work 2, or .work 3.`);
    }

    const crew = randomCrew(2 + Math.floor(Math.random() * 2)); // 2-3 NPCs

    WORK_STATE.set(sender, {
      siteKey: sub,
      shift: 1,
      moneyEarned: 0,
      items: [],
      crew,
      status: "working",
      endsAt: 0,
      timeout: null,
      collecting: false,
    });

    await reply([
      `${mentionLabel(sender)} sent ${crew.join(", ")} to ${site.name}.`,
      `Next job: ${site.verb}.`,
      `They will work ${SHIFTS_PER_SITE} shifts and can earn ${formatMoney(site.payMin * SHIFTS_PER_SITE)}-${formatMoney(site.payMax * SHIFTS_PER_SITE)}.`,
      `One message only while they work. Use .work status to check them, then .work collect when they are home.`,
    ].join("\n"));

    scheduleShift(sock, jid, sender);
  },
};