import { groupSettings } from "../../lib/groupSettings.js";

const DEFAULT_INACTIVE_DAYS = 7;

export default {
  name: "inactive",
  aliases: ["lurkers", "silent"],
  description: "List group members who have been inactive",
  category: "group",
  usage: ".inactive [days]",
  cooldown: 10,
  IsAdmin: true,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    if (!jid?.endsWith("@g.us")) {
      return sock.sendMessage(jid, { text: "👥 This command can only be used in groups." }, { quoted: msg });
    }

    const days = Math.max(1, Number.parseInt(args?.[0], 10) || DEFAULT_INACTIVE_DAYS);
    const cutoff = Date.now() - days * 86_400_000;
    const activityLastSeen = groupSettings.get(jid).activityLastSeen || {};
    const botJid = normalizeJid(sock.user?.id);

    try {
      const meta = await sock.groupMetadata(jid);
      const inactive = (meta.participants || []).filter((participant) => {
        const member = participant.id || participant.jid || participant.lid;
        if (!member || normalizeJid(member) === botJid) return false;
        const lastSeen = findLastSeen(activityLastSeen, member);
        return !lastSeen || Number(lastSeen) < cutoff;
      });

      if (!inactive.length) {
        return sock.sendMessage(jid, {
          text: `✅ No inactive members found in the last ${days} days.`,
        }, { quoted: msg });
      }

      const shown = inactive.slice(0, 50);
      const mentions = shown.map((participant) => participant.id || participant.jid || participant.lid);
      const lines = shown.map((participant, index) => {
        const member = participant.id || participant.jid || participant.lid;
        const role = participant.admin ? " · admin" : "";
        return `${index + 1}. @${member.split("@")[0].split(":")[0]}${role}`;
      });
      const extra = inactive.length > shown.length ? `\n…and ${inactive.length - shown.length} more.` : "";

      return sock.sendMessage(jid, {
        text: `💤 *Inactive Members*\n\nNo activity recorded for ${days}+ days:\n\n${lines.join("\n")}${extra}`,
        mentions,
      }, { quoted: msg });
    } catch (err) {
      console.error("[inactive]", err.message);
      return sock.sendMessage(jid, { text: "❌ Failed to fetch member activity." }, { quoted: msg });
    }
  },
};

function normalizeJid(value) {
  return String(value || "").split(":")[0].replace(/@lid$/, "@s.whatsapp.net");
}

function findLastSeen(activityLastSeen, member) {
  if (activityLastSeen[member] != null) return activityLastSeen[member];
  const normalized = normalizeJid(member);
  const entry = Object.entries(activityLastSeen).find(([jid]) => normalizeJid(jid) === normalized);
  return entry?.[1] || null;
}
