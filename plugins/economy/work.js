/**
 * KELIN MD — Fun shift-work mini-game (.work)
 *
 * Pick a site (1/2/3), send your crew out, and they work 4 back-to-back
 * shifts. Money builds up as they go; the loot (ore/tools/equipment)
 * only gets handed over once the crew clocks out for good and comes
 * back to you — then you run .work collect to grab everything at once.
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
    payMin: 500,
    payMax: 1_400,
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
    payMin: 700,
    payMax: 1_800,
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
    payMin: 900,
    payMax: 2_200,
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

function randomFlavor(site) {
  return site.flavor[Math.floor(Math.random() * site.flavor.length)];
}

function formatMoney(amount) {
  return `$${Math.round(amount).toLocaleString()}`;
}

function formatRemaining(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${String(seconds).padStart(2, "0")}s` : `${seconds}s`;
}

function shiftDots(current, total = SHIFTS_PER_SITE) {
  return "●".repeat(current - 1) + "◐" + "○".repeat(total - current);
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
    `╭───〔 💼 *WORK* 〕───╮`,
    `│ Choose a site to send your crew:`,
    `│`,
    `│ *1* ⛏️ Mining Site — ore & gems`,
    `│ *2* 🔧 Tool Workshop — tools & parts`,
    `│ *3* 📦 Equipment Depot — gear & crates`,
    `│`,
    `│ Crew works *${SHIFTS_PER_SITE} shifts* back-to-back,`,
    `│ then brings everything home to you.`,
    `│`,
    `│ Type *.work 1*, *.work 2*, or *.work 3*`,
    `╰────────────────────────────`,
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

  const worker = state.crew[Math.floor(Math.random() * state.crew.length)];

  if (state.shift < SHIFTS_PER_SITE) {
    const finishedShift = state.shift;
    state.shift += 1;

    await sock.sendMessage(jid, {
      text: [
        `${site.emoji} *Shift ${finishedShift}/${SHIFTS_PER_SITE} complete* — ${site.name}`,
        `${shiftDots(state.shift)}`,
        ``,
        `${worker} ${randomFlavor(site)}.`,
        `💰 +${formatMoney(pay)}  (total so far: ${formatMoney(state.moneyEarned)})`,
        `🎒 +1 ${itemLabel(drop[0])}`,
        ``,
        `➡️ Crew is heading into shift ${state.shift}/${SHIFTS_PER_SITE}...`,
      ].join("\n"),
    });

    scheduleShift(sock, jid, sender);
  } else {
    state.status = "ready";
    state.timeout = null;

    await sock.sendMessage(jid, {
      text: [
        `✅ *All shifts are complete — the workers have gone home.*`,
        ``,
        `${site.emoji} *${site.name}* — ${SHIFTS_PER_SITE}/${SHIFTS_PER_SITE} shifts complete`,
        `${worker} ${randomFlavor(site)} on the final shift.`,
        ``,
        `🏠 The crew is back with everything they gathered:`,
        summarizeItems(state.items),
        ``,
        `💰 Total pay ready to collect: *${formatMoney(state.moneyEarned)}*`,
        ``,
        `Use *.work collect* to grab it all.`,
      ].join("\n"),
    });
  }
}

// ─── Plugin ──────────────────────────────────────────────────────────────────

export default {
  name: "work",
  description: "Send a bot crew to a site for 4 shifts, then collect the pay and loot",
  category: "economy",
  cooldown: 3,
  usage: ".work | .work <1|2|3> | .work status | .work collect",
  checkJail: true,

  async run({ sock, msg, sender, args }) {
    if (!(await requireRegistration(sock, msg, sender))) return;

    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
    const sub = (args[0] || "").toLowerCase();
    const state = WORK_STATE.get(sender);

    // ── .work collect ──────────────────────────────────────────────────────
    if (sub === "collect") {
      if (!state || state.status !== "ready") {
        return reply(
          state
            ? `⏳ Your crew isn't back yet. Check *.work status*.`
            : `❌ Nobody's out working. Use *.work* to send a crew.`
        );
      }
      if (state.collecting) {
        return reply(`📦 Your crew's haul is already being loaded. Please wait a moment.`);
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
        `╭───〔 🧾 *COLLECTED* 〕───╮`,
        `│ ${site.emoji} ${site.name}`,
        `│`,
        `│ 💰 +${formatMoney(state.moneyEarned)} added to your wallet`,
        `│ 🎒 Items added to inventory:`,
        ...summarizeItems(state.items).split("\n").map((l) => `│   ${l}`),
        `│`,
        `│ Use *.work* to send your crew out again.`,
        `╰────────────────────────────`,
      ].join("\n"));
    }

    // ── .work status ───────────────────────────────────────────────────────
    if (sub === "status") {
      if (!state) return reply(`❌ Nobody's out working. Use *.work* to see site options.`);
      const site = SITES[state.siteKey];

      if (state.status === "ready") {
        return reply(`🏠 Crew is back from *${site.name}* with ${formatMoney(state.moneyEarned)} ready.\n\nUse *.work collect* to grab it.`);
      }

      const remaining = Math.max(0, state.endsAt - Date.now());
      return reply([
        `${site.emoji} *${site.name}*`,
        `${shiftDots(state.shift)}  Shift ${state.shift}/${SHIFTS_PER_SITE}`,
        `⏱️ Next shift ends in *${formatRemaining(remaining)}*`,
        `💰 Earned so far: ${formatMoney(state.moneyEarned)}`,
      ].join("\n"));
    }

    // ── .work / .work start (menu) ─────────────────────────────────────────
    if (!sub || sub === "start") {
      if (state) {
        if (state.status === "ready") {
          return reply(`🏠 Your crew is already back with ${formatMoney(state.moneyEarned)} waiting.\n\nUse *.work collect* first.`);
        }
        const remaining = Math.max(0, state.endsAt - Date.now());
        return reply(`⏳ Your crew is already out at *${SITES[state.siteKey].name}* (shift ${state.shift}/${SHIFTS_PER_SITE}).\nNext shift ends in *${formatRemaining(remaining)}*.`);
      }
      return reply(siteMenuText());
    }

    // ── .work 1 / .work 2 / .work 3 (choose site) ──────────────────────────
    const site = SITES[sub];
    if (!site) return reply(`❌ Not a valid site.\n\n${siteMenuText()}`);

    if (state) {
      if (state.status === "ready") {
        return reply(`🏠 Your crew is already back with ${formatMoney(state.moneyEarned)} waiting.\n\nUse *.work collect* first.`);
      }
      return reply(`⏳ Your crew is already out at *${SITES[state.siteKey].name}*. Finish that up first.`);
    }

    const user = await getUser(sender);
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
      `╭───〔 ${site.emoji} *SITE STARTED* 〕───╮`,
      `│ ${site.name}`,
      `│`,
      `│ ${user?.name || "You"} sent out: ${crew.join(", ")}`,
      `│ Job: ${site.verb}`,
      `│`,
      `│ ${shiftDots(1)}  Shift 1/${SHIFTS_PER_SITE}`,
      `│ ⏱️ Shift length: ${formatRemaining(site.shiftDuration)}`,
      `│`,
      `│ _Check *.work status* anytime._`,
      `╰────────────────────────────`,
    ].join("\n"));

    scheduleShift(sock, jid, sender);
  },
};