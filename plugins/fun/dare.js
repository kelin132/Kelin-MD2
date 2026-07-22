// plugins/fun/dare.js
// .deltod — Delete a running Truth or Dare game in this chat
import { truthDareGames } from "../../lib/todGame.mjs";

export default {
  name: "deltod",
  description: "Delete the running Truth or Dare game",
  category: "fun",
  usage: ".deltod",
  aliases: ["endtod", "stoptod"],
  cooldown: 5,

  async run({ sock, msg }) {
    const jid  = msg.key.remoteJid;
    const send = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    const found = Object.values(truthDareGames).find(
      (game) => game.chat === jid && game.status !== "ENDED"
    );

    if (found) {
      delete truthDareGames[found.id];
      return await send("✅ *Game deleted!*");
    }

    return await send("❌ *No active game in this chat.*");
  },
};
