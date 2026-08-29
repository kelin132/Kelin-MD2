import { groupSettings } from "../../lib/groupSettings.js";

export default {
  name: "akira-toggle",
  aliases: ["akira-on", "akira-off"],
  description: "Turn Akira auto-responder on or off for this group",
  category: "group",
  usage: ".akira-on | .akira-off",
  cooldown: 5,
  isAdmin: true,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    if (!jid || !jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, { text: "❌ This command only works in groups." }, { quoted: msg });
    }

    const cmd = (msg.message?.conversation || "").trim().split(/\s+/)[0].toLowerCase();
    const enable = cmd === ".akira-on" || cmd === "akira-on";

    const settings = groupSettings.get(jid) || {};
    settings.akiraEnabled = enable;
    groupSettings.set(jid, settings);

    return sock.sendMessage(jid, {
      text: enable ? "✅ Akira auto-responses are now ENABLED for this group." : "❌ Akira auto-responses are now DISABLED for this group.",
    }, { quoted: msg });
  }
};
