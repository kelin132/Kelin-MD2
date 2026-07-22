/**
 * .bid <amount>
 * Place a bid on the active group auction.
 */
import {
  getAuction, placeBid, timeLeft,
} from "../../lib/auctionManager.mjs";
import {
  getUser       as getEconomyUser,
  isRegistered,
} from "../economy/database.js";

export default {
  name:        "bid",
  aliases:     ["b"],
  category:    "cards",
  description: "Place a bid on the active group auction",
  usage:       ".bid <amount>",
  cooldown:    2,

  async run({ sock, msg, args, sender }) {
    const groupJid = msg.key.remoteJid;
    const reply    = (text) => sock.sendMessage(groupJid, { text }, { quoted: msg });

    // ── Groups only ────────────────────────────────────────────────────────
    if (!groupJid.endsWith("@g.us")) {
      return reply("❌ Auctions only run in groups.");
    }

    // ── Active auction? ────────────────────────────────────────────────────
    const auction = getAuction(groupJid);
    if (!auction) {
      return reply("❌ No active auction in this group right now.\n\nStart one with *.auction <index>*");
    }

    // ── Usage ──────────────────────────────────────────────────────────────
    if (!args[0]) {
      const secs = timeLeft(groupJid);
      return reply(
        `🔨 *ACTIVE AUCTION*\n\n` +
        `🃏 *${auction.card.name}* [${auction.card.tier}]\n` +
        `💰 Current bid : ${auction.currentBid > 0 ? `$${auction.currentBid.toLocaleString()}` : "No bids yet"}\n` +
        `💵 Minimum     : $${Math.max(auction.startBid, auction.currentBid + 1).toLocaleString()}\n` +
        `⏱️ Time left    : ${secs}s\n\n` +
        `Use *.bid <amount>* to place your bid!`
      );
    }

    // ── Economy registration ───────────────────────────────────────────────
    if (!await isRegistered(sender)) {
      return reply("❌ You need an economy account to bid.\n\nUse *.register <your name>* first.");
    }

    // ── Parse amount ───────────────────────────────────────────────────────
    const amount = parseInt(args[0].replace(/[^0-9]/g, ""));
    if (isNaN(amount) || amount <= 0) {
      return reply("❌ Enter a valid bid amount. Example: *.bid 1500*");
    }

    // ── Check wallet ───────────────────────────────────────────────────────
    const user = await getEconomyUser(sender);
    if ((user.money || 0) < amount) {
      return reply(
        `❌ Not enough money!\n\n` +
        `💵 Your wallet : $${(user.money || 0).toLocaleString()}\n` +
        `🎯 Your bid    : $${amount.toLocaleString()}`
      );
    }

    // ── Place bid ──────────────────────────────────────────────────────────
    const result = placeBid(groupJid, sender, amount);

    if (!result.ok) {
      if (result.reason === "own_auction") {
        return reply("❌ You can't bid on your own auction!");
      }
      if (result.reason === "too_low") {
        return reply(
          `❌ Bid too low!\n\n` +
          `💰 Current highest : $${result.current.toLocaleString()}\n` +
          `📌 You must bid more than the current highest bid.`
        );
      }
      if (result.reason === "below_start") {
        return reply(`❌ Minimum starting bid is $${result.start.toLocaleString()}.`);
      }
      return reply("❌ Could not place bid. The auction may have just ended.");
    }

    // ── Success ────────────────────────────────────────────────────────────
    const secs      = timeLeft(groupJid);
    const bidderNum = sender.split("@")[0].split(":")[0];

    return sock.sendMessage(groupJid, {
      text: [
        `💰 *NEW HIGHEST BID!*`,
        ``,
        `🃏 *${auction.card.name}* [${auction.card.tier}]`,
        ``,
        `🏆 Leader  : @${bidderNum}`,
        `💵 Bid     : $${amount.toLocaleString()}`,
        `⏱️ Time left: ${secs}s`,
        ``,
        `Beat it with *.bid <higher amount>*!`,
      ].join("\n"),
      mentions: [sender],
    }, { quoted: msg });
  },
};
