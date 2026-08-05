import { guildSystem } from "../../lib/guildSystem.js";

export default {
  name: "resetguilds",
  description: "Wipe all guilds from the database (staff only)",
  category: "staff",
  usage: ".resetguilds confirm",
  isStaff: true,
  cooldown: 10,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;

    // Require explicit confirmation to avoid accidents
    if ((args[0] || "").toLowerCase() !== "confirm") {
      return sock.sendMessage(jid, {
        text:
`╭─❀「 🗑️ *𝐑𝐄𝐒𝐄𝐓 𝐆𝐔𝐈𝐋𝐃𝐒* 」❀─╮
│ ⚠️ *Result*  :: *AWAITING CONFIRM 🟡*
│ 🍃 *Flavour* :: _全ギルドを削除するぞ！_
│
│ ❗ This will delete *ALL* guilds!
│ ❗ This *cannot* be undone!
│
│ Type *.resetguilds confirm* to proceed.
╰───────────────❀`
      }, { quoted: msg });
    }

    const count = await guildSystem.clearAllGuilds();

    return sock.sendMessage(jid, {
      text:
`╭─❀「 🗑️ *𝐑𝐄𝐒𝐄𝐓 𝐆𝐔𝐈𝐋𝐃𝐒* 」❀─╮
│ 🌙 *Result*  :: *DONE 🟢*
│ 🍃 *Flavour* :: _全部消えた！白紙に戻った！_
│
│ 🗑️ *Deleted* :: *${count} guild${count === 1 ? "" : "s"}*
│
│ All guilds have been wiped.
╰───────────────❀`
    }, { quoted: msg });
  }
};
