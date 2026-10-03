import { getRuntimeSettings } from "../../lib/runtimeSettings.mjs";
import { getDb } from "../../lib/mongo.mjs";
import { getUser as getEconomyUser } from "../economy/database.js";

function digits(value) {
  return String(value ?? "").split("@")[0].split(":")[0].replace(/\D/g, "");
}

async function isAuctionAdmin(sender) {
  const ownerNumber = String(
    getRuntimeSettings().ownerNumber || process.env.OWNER_NUMBER || "",
  ).replace(/\D/g, "");
  if (ownerNumber && digits(sender) === ownerNumber) return true;

  const user = await getEconomyUser(sender);
  const linkedNumbers = [user.phoneNumber, user.phone, user.whatsappNumber, user.whatsappId]
    .map(digits)
    .filter(Boolean);
  return (
    Number(user.staffLevel || 0) >= 3 ||
    Boolean(ownerNumber && linkedNumbers.includes(ownerNumber))
  );
}

export default {
  name: "auctiongroup",
  aliases: ["aucgroup"],
  category: "cards",
  description: "Choose the WhatsApp group for AIDORU website auction posts",
  usage: ".auctiongroup set|off",
  cooldown: 5,

  async run({ sock, msg, args, sender }) {
    const groupJid = msg.key.remoteJid || "";
    const prefix = getRuntimeSettings().prefix || ".";
    const reply = (text) => sock.sendMessage(groupJid, { text }, { quoted: msg });

    if (!groupJid.endsWith("@g.us")) {
      return reply("Use this command inside the group that should receive auction cards.");
    }
    if (!(await isAuctionAdmin(sender))) {
      return reply("Only the bot owner or a level-3 admin can change the auction group.");
    }

    const action = String(args[0] || "").toLowerCase();
    const settings = getDb().collection("mn_web_auction_settings");

    if (action === "set") {
      await settings.updateOne(
        { _id: "default" },
        {
          $set: {
            announcementGroupJid: groupJid,
            announcementGroupSetAt: new Date(),
            announcementGroupSetBy: sender,
          },
        },
        { upsert: true },
      );
      return reply("This group will receive each card when a website auction round starts.");
    }

    if (action === "off") {
      await settings.updateOne(
        { _id: "default" },
        { $unset: { announcementGroupJid: "", announcementGroupSetAt: "", announcementGroupSetBy: "" } },
        { upsert: true },
      );
      return reply("Automatic auction posts are off.");
    }

    return reply(
      `Use ${prefix}auctiongroup set in the announcement group, or ${prefix}auctiongroup off to stop automatic posts.`,
    );
  },
};