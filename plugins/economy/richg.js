import { getDb } from "../../lib/mongo.mjs";
import { normalizeJid } from "../../lib/identity.mjs";
import { formatAnimeLeaderboard } from "../../lib/animeLeaderboard.mjs";

export default {
  name: "richg",
  aliases: ["grouprich", "glb"],
  category: "economy",
  description: "Richest players in this group",
  usage: ".richg",
  cooldown: 15,

  async run({ sock, msg }) {
    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    if (!jid.endsWith("@g.us")) {
      return reply("❌ This command only works in groups!");
    }

    try {
      const meta    = await sock.groupMetadata(jid);
      const members = [...new Set(
        meta.participants
          .map(p => normalizeJid(p.id))
          .filter(Boolean)
      )];
      const db = await getDb();

      // One aggregation replaces one users.findOne call per group member.
      // Large groups otherwise create a burst of MongoDB requests for a
      // command that only needs the top ten rows.
      const users = await db.collection("users").aggregate([
        { $match: { _id: { $in: members }, registered: true } },
        {
          $project: {
            _id: 1,
            name: 1,
            net: {
              $add: [
                { $convert: { input: { $ifNull: ["$money", 0] }, to: "double", onError: 0, onNull: 0 } },
                { $convert: { input: { $ifNull: ["$bank", 0] }, to: "double", onError: 0, onNull: 0 } },
              ],
            },
          },
        },
        { $sort: { net: -1, _id: 1 } },
        { $limit: 10 },
      ]).toArray();

      if (!users.length) {
        return reply("❌ No registered users in this group yet.\n\nUse *.register <name>* to join!");
      }

      const text = formatAnimeLeaderboard({
        subtitle: `GROUP WEALTH · ${meta.subject}`,
        rows: users.map((u) => ({
          name: u.name || `User_${String(u._id || "").split("@")[0].slice(-4) || "???"}`,
          value: u.net,
        })),
        valueIcon: "💰",
        valueLabel: "𝐖𝐄𝐀𝐋𝐓𝐇",
        footer: "🌸 𝐆𝐑𝐎𝐔𝐏 𝐋𝐄𝐆𝐄𝐍𝐃𝐒",
      });
      return reply(text);
    } catch (err) {
      console.error("RICHG ERROR:", err);
      return reply("❌ Failed to load group leaderboard.");
    }
  },
};
