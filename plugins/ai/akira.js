/**
 * KELIN MD — Akira command plugin
 * .akira <message> | .akira reset | .akira info
 * AI logic lives in lib/akiraAI.mjs (shared with the group auto-trigger).
 */
import { callAkira, chatHistory } from "../../lib/akiraAI.mjs";

const AKIRA_INFO_CARD = `╭━━━〔 🌸 *AKIRA* 〕━━━╮

  *"H-hey! Don't stare at me like that, baka~"*

  👤 Name      : Akira
  🎂 Age       : 17
  🏙️ Origin    : Akihabara, Tokyo
  💜 Type      : Tsundere • Genki
  ✨ Lives in  : KELIN MD

  📖 *About me:*
  I was just a normal high school girl
  until Kelin digitized me into this bot.
  Don't feel sorry for me — I actually
  like it in here! (S-sort of...)

  💕 *Likes:*
  Anime • Ramen • Cats • Stargazing
  Talking to senpai~ ehe

  💢 *Dislikes:*
  Being called a robot • Spiders
  When senpai ignores me

  🌸 *How to summon me in a group:*
  Just say my name — *Akira* — or tag me,
  or reply to any of my messages!
  I'll come running~ (n-not that I wanted to!)

  🗣️ *Direct chat:*
  *.akira <message>*

  💫 *Reset our chat:*
  *.akira reset*

╰━━━━━━━━━━━━━━━━━━━━╯

`;

export default {
  name: "akira",
  description: "Chat with Akira — your anime girl AI companion",
  category: "ai",
  usage: ".akira <message> | .akira reset | .akira info",
  aliases: ["ak"],
  cooldown: 5,

  async run({ sock, msg, text, args }) {
    const jid = msg.key.remoteJid;
    const sub = args[0]?.toLowerCase();

    if (sub === "info" || sub === "profile" || sub === "card") {
      return sock.sendMessage(jid, { text: AKIRA_INFO_CARD }, { quoted: msg });
    }

    if (sub === "reset" || sub === "clear" || sub === "forget") {
      chatHistory.delete(jid);
      return sock.sendMessage(jid, {
        text:
          `Eh? You want me to forget everything?\n\n` +
          `...Fine. Conversation cleared. I-it's not like I'll miss it or anything, baka~\n\n` +
          `_Say \`.akira hello\` to start fresh!_`
      }, { quoted: msg });
    }

    if (!text || !text.trim()) {
      return sock.sendMessage(jid, {
        text:
          `Nee, senpai~ You called me but said nothing? Mou!\n\n` +
          `Say something already!\n\n` +
          `📝 *.akira <message>* — talk to me\n` +
          `📋 *.akira info* — see my profile\n` +
          `🔄 *.akira reset* — start fresh\n` +
          `💡 _In groups just say "Akira", tag me, or reply to my messages!_`
      }, { quoted: msg });
    }

    await callAkira(sock, msg, text);
  }
};
