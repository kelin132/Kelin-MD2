/**
 * KELIN MD — .groupsettings
 * Show all toggleable group features and their current status.
 * Admins can toggle any feature directly from this command.
 *
 * Usage:
 *   .groupsettings          — show all settings & statuses
 *   .groupsettings <feature> on|off  — toggle a feature
 *
 * Features covered:
 *   antilink, antibadword, antispam, welcome, goodbye,
 *   cardspawn (card auto-spawn), pokespawn (pokémon auto-spawn)
 */

import { groupSettings } from "../../lib/groupSettings.js";
import { isSpawnEnabled, setSpawnEnabled } from "../cards/db.js";
import { getDb } from "../../lib/mongo.mjs";

const POKE_COLLECTION = "pokemon_autospawn_chats";

async function getPokeSpawn(chatId) {
  const db  = await getDb();
  const doc = await db.collection(POKE_COLLECTION).findOne({ _id: chatId });
  return doc?.enabled ?? false;
}

async function setPokeSpawn(chatId, enabled) {
  const db = await getDb();
  await db.collection(POKE_COLLECTION).updateOne(
    { _id: chatId },
    { $set: { enabled } },
    { upsert: true }
  );
}

// All toggleable features
const FEATURES = [
  {
    key:     "antilink",
    label:   "Anti-Link",
    emoji:   "🔗",
    desc:    "Removes links sent by non-admins",
    cmd:     ".antilink on delete | .antilink on kick | .antilink off",
    getStatus: (settings) => settings?.antilink ? "✅ ON" : "❌ OFF",
    toggle:  async (jid, settings, enable) => {
      settings.antilink = enable;
      if (!enable) settings.antilinkAction = null;
      groupSettings.set(jid, settings);
    },
  },
  {
    key:     "antibadword",
    label:   "Anti Bad Word",
    emoji:   "🤬",
    desc:    "Filters offensive words in the group",
    cmd:     ".antibadword on | .antibadword off | .antibadword add <word>",
    getStatus: (settings) => settings?.antibadword ? "✅ ON" : "❌ OFF",
    toggle:  async (jid, settings, enable) => {
      settings.antibadword = enable;
      groupSettings.set(jid, settings);
    },
  },
  {
    key:     "antispam",
    label:   "Anti Spam",
    emoji:   "🛡️",
    desc:    "Warns then removes users who spam 5+ messages in 5s",
    cmd:     ".antispam on | .antispam off",
    getStatus: (settings) => settings?.antispam ? "✅ ON" : "❌ OFF",
    toggle:  async (jid, settings, enable) => {
      settings.antispam = enable;
      groupSettings.set(jid, settings);
    },
  },
  {
    key:     "welcome",
    label:   "Welcome Message",
    emoji:   "👋",
    desc:    "Greets new members when they join",
    cmd:     ".welcome on | .welcome off | .setwelcome <message>",
    getStatus: (settings) => settings?.welcome ? "✅ ON" : "❌ OFF",
    toggle:  async (jid, settings, enable) => {
      settings.welcome = enable;
      groupSettings.set(jid, settings);
    },
  },
  {
    key:     "goodbye",
    label:   "Goodbye Message",
    emoji:   "👋",
    desc:    "Sends a farewell when members leave",
    cmd:     ".goodbye on | .goodbye off | .setgoodbye <message>",
    getStatus: (settings) => settings?.goodbye ? "✅ ON" : "❌ OFF",
    toggle:  async (jid, settings, enable) => {
      settings.goodbye = enable;
      groupSettings.set(jid, settings);
    },
  },
  {
    key:     "cardspawn",
    label:   "Card Auto-Spawn",
    emoji:   "🃏",
    desc:    "Spawns a random collectible card every 15 minutes",
    cmd:     ".cardspawn on | .cardspawn off",
    getStatus: async (settings, jid) => (await isSpawnEnabled(jid)) ? "✅ ON" : "❌ OFF",
    toggle:  async (jid, settings, enable) => {
      await setSpawnEnabled(jid, enable);
    },
    async: true,
  },
  {
    key:     "pokespawn",
    label:   "Pokémon Auto-Spawn",
    emoji:   "🌿",
    desc:    "Spawns a wild Pokémon every 10 minutes",
    cmd:     ".pokespawn on | .pokespawn off",
    getStatus: async (settings, jid) => (await getPokeSpawn(jid)) ? "✅ ON" : "❌ OFF",
    toggle:  async (jid, settings, enable) => {
      await setPokeSpawn(jid, enable);
    },
    async: true,
  },
];

export default {
  name:        "groupsettings",
  aliases:     ["gsettings", "groupset", "gset"],
  description: "View and toggle all group features (admins only)",
  category:    "group",
  usage:       ".groupsettings [feature] [on|off]",
  isAdmin:     true,
  cooldown:    5,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, { text: "❌ This command only works in groups." }, { quoted: msg });
    }

    const settings = groupSettings.get(jid) || {};

    // ── Toggle a specific feature ───────────────────────────────────────────
    if (args[0] && args[1]) {
      const featureKey = args[0].toLowerCase();
      const action     = args[1].toLowerCase();

      if (!["on", "off", "enable", "disable"].includes(action)) {
        return sock.sendMessage(jid, {
          text: "❌ Use *on* or *off*.\nExample: `.groupsettings pokespawn on`",
        }, { quoted: msg });
      }

      const feature = FEATURES.find(f => f.key === featureKey);
      if (!feature) {
        const keys = FEATURES.map(f => f.key).join(", ");
        return sock.sendMessage(jid, {
          text: `❌ Unknown feature: *${featureKey}*\n\nAvailable: ${keys}`,
        }, { quoted: msg });
      }

      const enable = action === "on" || action === "enable";
      await feature.toggle(jid, settings, enable);

      const statusStr = enable ? "✅ *ENABLED*" : "❌ *DISABLED*";
      return sock.sendMessage(jid, {
        text: `${feature.emoji} *${feature.label}* → ${statusStr}`,
      }, { quoted: msg });
    }

    // ── Show all settings ───────────────────────────────────────────────────
    const lines = await Promise.all(
      FEATURES.map(async (f) => {
        const status = typeof f.getStatus === "function" && f.async
          ? await f.getStatus(settings, jid)
          : f.getStatus(settings, jid);
        return `${f.emoji} *${f.label}* — ${status}\n   ↳ ${f.desc}\n   ↳ Toggle: \`.groupsettings ${f.key} on|off\`\n   ↳ Full command: \`${f.cmd}\``;
      })
    );

    await sock.sendMessage(jid, {
      text:
`⚙️ *GROUP SETTINGS*
_Admins can enable or disable any feature below_

${lines.join("\n\n")}

━━━━━━━━━━━━━━━━━━━━
*Quick toggle:* \`.groupsettings <feature> on|off\`
*Example:* \`.groupsettings pokespawn on\``,
    }, { quoted: msg });
  },
};
