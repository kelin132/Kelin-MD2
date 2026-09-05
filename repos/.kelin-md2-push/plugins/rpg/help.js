export default {
  name: "rpg-help",
  aliases: ["rpghelp", "rpgmenu", "rpgcommands"],
  category: "rpg",
  description: "Show all RPG commands",
  usage: ".rpg-help",

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    return sock.sendMessage(jid, {
      text: [
        "🎮 *KELIN RPG COMMANDS*",
        "",
        "🧙 *.rpg-start warrior|mage|rogue* — create your hero",
        "👤 *.rpg-profile* — view stats",
        "🏆 *.rpglb [5-20]* — leaderboard",
        "⚔️ *.rpg-hunt* — fight monsters",
        "🏰 *.rpg-dungeon* — enter a dungeon",
        "📜 *.quest* / *.quest claim* — daily quest and reward",
        "🎁 *.rpg-daily* — daily gold",
        "🏪 *.rpg-shop* — browse and buy gear/items",
        "🎒 *.rpg-inventory* — view your bag",
        "🧪 *.rpg-use item_id* — use a consumable",
        "💚 *.rpg-heal* — restore HP for gold",
        "",
        "Tip: *.rpg-shop buy small_potion*",
      ].join("\n"),
    }, { quoted: msg });
  },
};