const Game = require("../../models/Games");
const { drawTTT } = require("../../utils/Games");

moon({
  name: "ttt",
  category: "games",
  description: "Tic-Tac-Toe Game",
  async execute(sock, jid, sender, args, m, { reply }) {
    const sub = (args[0] || "").toLowerCase();
    let game = await Game.findOne({ jid, gameType: "ttt", status: { $ne: "finished" } });

    if (sub === "start") {
      if (game) return reply("❌ A game is already in progress.");
      game = await Game.create({
        jid,
        gameType: "ttt",
        status: "waiting",
        players: [{ jid: sender, name: m.pushName || "Player 1" }],
        state: { board: Array(9).fill(null) }
      });
      return reply("✅ TTT Started! Use `.ttt join` to join. Max 2 players.");
    }

    if (sub === "join") {
      if (!game) return reply("❌ No game waiting.");
      if (game.players.length >= 2) return reply("❌ Game full.");
      if (game.players.find(p => p.jid === sender)) return reply("❌ Already joined.");

      game.players.push({ jid: sender, name: m.pushName || "Player 2" });
      game.status = "playing";
      game.turn = game.players[0].jid;
      await game.save();

      const buffer = await drawTTT(game.state.board);
      return await sock.sendMessage(jid, { 
        image: buffer, 
        caption: `✅ Game Started!\nTurn: @${game.turn.split("@")[0]}\nMove: .m <1-9>`,
        mentions: [game.turn]
      }, { quoted: m });
    }

    return reply("📌 Usage:\n.ttt start\n.ttt join\n.m <1-9>");
  }
});

// Update the 'm' command in wcg.js or add logic here