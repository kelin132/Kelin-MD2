/**
 * KELIN MD — .afk command
 */
import { getUser, saveUser } from "../economy/database.js";
import { setAfkUser } from "../../lib/pluginManager.mjs";
import { normalizeJid } from "../../lib/identity.mjs";

export default {
  name: "afk",
  aliases: ["away"],
  category: "group",
  cooldown: 3,
  description: "Set your AFK status.",
  usage: ".afk [reason]",

  async run({ sock, msg, sender, text: rawText }) {
    const userJid = normalizeJid(sender);
    const reason  = (rawText || "").trim() || "No reason given";
    const phone   = userJid.split("@")[0];
    const user    = await getUser(userJid);
    const since   = Date.now();

    // Save State
    user.afk = { active: true, message: reason, since };
    await saveUser(userJid, user);
    setAfkUser(userJid, { reason, time: since, username: phone });

    // Keep the response compact so it is readable in busy group chats.
    return sock.sendMessage(
      msg.key.remoteJid,
      {
        text: `🌙 *@${phone}* is now AFK\nReason: ${reason}`,
        mentions: [userJid],
      },
      { quoted: msg }
    );
  },
};
