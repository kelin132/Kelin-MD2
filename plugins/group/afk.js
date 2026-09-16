/**
 * KELIN MD — .afk command
 */
import { getUser, saveUser } from "../economy/database.js";
import { setAfkUser } from "../../lib/pluginManager.mjs";

function cleanJid(jid = "") {
  return jid.split(":")[0].replace(/@s\.whatsapp\.net$/, "") + "@s.whatsapp.net";
}

export default {
  name: "afk",
  aliases: ["away"],
  category: "group",
  cooldown: 3,
  description: "Set your AFK status.",
  usage: ".afk [reason]",

  async run({ sock, msg, sender, text: rawText }) {
    const userJid = cleanJid(sender);
    const reason  = (rawText || "").trim() || "No reason given";
    const phone   = userJid.split("@")[0];
    const user    = await getUser(userJid);
    const since   = Date.now();

    // Save State
    user.afk = { active: true, message: reason, since };
    await saveUser(userJid, user);
    setAfkUser(userJid, { reason, time: since, username: phone });

    // Send Message with Mention
    return sock.sendMessage(
      msg.key.remoteJid,
      {
        text: `🌙 *@${phone}* is now AFK!\n\n📝 *Reason:* ${reason}`,
        mentions: [userJid],
      },
      { quoted: msg }
    );
  },
};
