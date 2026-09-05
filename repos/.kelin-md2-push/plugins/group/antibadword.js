/**
 * KELIN MD — .antibadword
 * Filter bad/offensive words in the group.
 * Usage: .antibadword on | off | add <word> | remove <word> | list
 */
import { groupSettings } from "../../lib/groupSettings.js";

export default {
  name: "antibadword",
  description: "Filter bad words in the group",
  category: "group",
  usage: ".antibadword on|off|add <word>|remove <word>|list",
  aliases: ["badword", "antiswear"],
  cooldown: 5,
  isAdmin: true,

  async run({ sock, msg, args }) {
    const jid    = msg.key.remoteJid;
    const option = args[0]?.toLowerCase();

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, {
        text: "❌ This command can only be used in groups.",
      }, { quoted: msg });
    }

    const settings  = groupSettings.get(jid) || {};
    const wordList  = settings.badwords || [];

    if (!option) {
      const status = settings.antibadword ? "✅ ON" : "❌ OFF";
      return sock.sendMessage(jid, {
        text:
`🤬 *Anti Bad Word Settings*

Status: ${status}
Words filtered: ${wordList.length}

Commands:
• *.antibadword on* — enable filter
• *.antibadword off* — disable filter
• *.antibadword add <word>* — add a word
• *.antibadword remove <word>* — remove a word
• *.antibadword list* — show all filtered words`,
      }, { quoted: msg });
    }

    if (option === "on") {
      groupSettings.set(jid, { antibadword: true });
      return sock.sendMessage(jid, {
        text: `✅ *Anti bad word enabled!*\n\n${wordList.length ? `Filtering ${wordList.length} word(s).` : "Add words with *.antibadword add <word>*"}`,
      }, { quoted: msg });
    }

    if (option === "off") {
      groupSettings.set(jid, { antibadword: false });
      return sock.sendMessage(jid, {
        text: "❌ Anti bad word *disabled*.",
      }, { quoted: msg });
    }

    if (option === "list") {
      if (!wordList.length) {
        return sock.sendMessage(jid, {
          text: "📋 No bad words added yet.\nUse *.antibadword add <word>*",
        }, { quoted: msg });
      }
      return sock.sendMessage(jid, {
        text: `📋 *Filtered Words* (${wordList.length})\n\n${wordList.map((w, i) => `${i + 1}. ${w}`).join("\n")}`,
      }, { quoted: msg });
    }

    if (option === "add") {
      const word = args[1]?.toLowerCase();
      if (!word) {
        return sock.sendMessage(jid, { text: "❌ Provide a word: *.antibadword add <word>*" }, { quoted: msg });
      }
      if (wordList.includes(word)) {
        return sock.sendMessage(jid, { text: `❌ "*${word}*" is already in the list.` }, { quoted: msg });
      }
      wordList.push(word);
      groupSettings.set(jid, { badwords: wordList });
      return sock.sendMessage(jid, { text: `✅ "*${word}*" added to bad word list.` }, { quoted: msg });
    }

    if (option === "remove") {
      const word = args[1]?.toLowerCase();
      if (!word) {
        return sock.sendMessage(jid, { text: "❌ Provide a word: *.antibadword remove <word>*" }, { quoted: msg });
      }
      const idx = wordList.indexOf(word);
      if (idx === -1) {
        return sock.sendMessage(jid, { text: `❌ "*${word}*" is not in the list.` }, { quoted: msg });
      }
      wordList.splice(idx, 1);
      groupSettings.set(jid, { badwords: wordList });
      return sock.sendMessage(jid, { text: `✅ "*${word}*" removed from bad word list.` }, { quoted: msg });
    }

    return sock.sendMessage(jid, {
      text: "❌ Unknown option. Use: *on | off | add | remove | list*",
    }, { quoted: msg });
  },
};
