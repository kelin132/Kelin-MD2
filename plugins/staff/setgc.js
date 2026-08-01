/**
 * .setgc <setting> <value>
 * Configure per-group bot settings.
 * Settings: prefix, antilink, welcome, goodbye
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";

const SETTINGS_FILE = path.resolve("data", "groupSettings.json");

function loadSettings() {
  if (!existsSync(SETTINGS_FILE)) return {};
  try { return JSON.parse(readFileSync(SETTINGS_FILE, "utf8")); } catch { return {}; }
}

function saveSettings(data) {
  import("fs").then(({ mkdirSync }) => {
    try { mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true }); } catch {}
  });
  writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
}

const ALLOWED = {
  prefix:   { type: "string", desc: "Bot command prefix (e.g. `.` or `!`)" },
  antilink: { type: "bool",   desc: "Enable/disable anti-link (on/off)" },
  welcome:  { type: "bool",   desc: "Enable/disable welcome messages (on/off)" },
  goodbye:  { type: "bool",   desc: "Enable/disable goodbye messages (on/off)" },
};

export default {
  name: "setgc",
  description: "Configure group bot settings",
  category: "staff",
  usage: ".setgc <setting> <value>",
  aliases: ["groupconfig", "gcset", "botconfig"],
  isMod: true,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;

    // Must be in a group
    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, { text: "❌ This command can only be used in a group." }, { quoted: msg });
    }

    if (args.length < 2) {
      const list = Object.entries(ALLOWED).map(([k, v]) => `• \`${k}\` — ${v.desc}`).join("\n");
      return sock.sendMessage(jid, {
        text: `⚙️ *Group Config*\n\n*Available settings:*\n${list}\n\n*Usage:* \`.setgc <setting> <value>\``
      }, { quoted: msg });
    }

    const setting = args[0].toLowerCase();
    const rawVal  = args.slice(1).join(" ");

    if (!ALLOWED[setting]) {
      return sock.sendMessage(jid, {
        text: `❌ Unknown setting \`${setting}\`. Use: ${Object.keys(ALLOWED).join(", ")}`
      }, { quoted: msg });
    }

    const meta = ALLOWED[setting];
    let value;

    if (meta.type === "bool") {
      if (!["on", "off", "true", "false", "1", "0"].includes(rawVal.toLowerCase())) {
        return sock.sendMessage(jid, { text: `❌ Value for \`${setting}\` must be \`on\` or \`off\`.` }, { quoted: msg });
      }
      value = ["on", "true", "1"].includes(rawVal.toLowerCase());
    } else {
      value = rawVal;
    }

    const settings = loadSettings();
    if (!settings[jid]) settings[jid] = {};
    settings[jid][setting] = value;
    saveSettings(settings);

    await sock.sendMessage(jid, {
      text:
        `⚙️ *Group Setting Updated*\n\n` +
        `📋 Setting : \`${setting}\`\n` +
        `✅ Value   : \`${value}\`\n\n` +
        `_This group's config has been saved._`
    }, { quoted: msg });
  }
};
