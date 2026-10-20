import { guildSystem } from "../../lib/guildSystem.js";
import { requireRegistration } from "./database.js";

export default {
  name: "joinguild",
  description: "Apply to join a guild",
  category: "guild",
  usage: ".joinguild <guild_name>",
  aliases: ["guildjoin", "gjoin"],
  cooldown: 10,

  async run({ sock, msg, sender, text }) {
    const chat = msg.key.remoteJid;
    if (!await requireRegistration(sock, msg, sender)) return;
    const guildName = String(text || "").trim();
    if (!guildName) {
      return sock.sendMessage(chat, {
        text: "Apply to a guild with *.joinguild <name>*. The leader reviews requests with *.guildapps* and *.guildapprove <code>*.",
      }, { quoted: msg });
    }

    const result = await guildSystem.requestMembership(guildName, sender, "");
    if (!result.ok) {
      const messages = {
        guild_missing: `Guild *${guildName}* was not found. Use *.guildlist* to browse.`,
        already_member: `You already belong to *${guildName}*.`,
        already_in_guild: `You are already a member of *${result.guildName}*. Leave it before applying elsewhere.`,
        member_cap: `*${guildName}* is full at ${result.capacity} members.`,
      };
      return sock.sendMessage(chat, { text: `❌ ${messages[result.reason] || "Could not submit the application."}` }, { quoted: msg });
    }

    return sock.sendMessage(chat, {
      text: result.alreadyPending
        ? `⏳ Your application to *${guildName}* is already waiting for review${result.code ? ` (code: ${result.code})` : ""}.`
        : `✅ Application sent to *${guildName}*. You will only join after its leader approves it.${result.code ? `\n\nApplication code: *${result.code}*` : ""}`,
    }, { quoted: msg });
  },
};
