const MAX_PAGE_CHARS = 3400;
const INVITE_LOOKUP_CONCURRENCY = 5;

async function mapWithLimit(items, limit, callback) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, limit), items.length);

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await callback(items[index], index);
    }
  }));

  return results;
}

function cleanGroupName(name) {
  return String(name || "Unnamed group").replace(/\s+/g, " ").trim() || "Unnamed group";
}

function makePages(rows, groupCount) {
  const pages = [];
  let current = `👥 *Groups this bot is in: ${groupCount}*`;

  for (const row of rows) {
    if (current.length + row.length + 1 > MAX_PAGE_CHARS && current.length > 0) {
      pages.push(current);
      current = "👥 *Group list (continued)*";
    }
    current += `\n${row}`;
  }

  if (current) pages.push(current);
  return pages;
}

export default {
  name: "groups",
  aliases: ["grouplist", "botgroups", "mygroups"],
  category: "staff",
  description: "List all WhatsApp groups the bot has joined with their invite links",
  usage: ".groups",
  cooldown: 15,

  async run({ sock, msg }) {
    const chatJid = msg.key.remoteJid;

    try {
      const participating = await sock.groupFetchAllParticipating();
      const groups = Object.entries(participating || {})
        .map(([jid, group]) => ({ ...group, id: group?.id || jid }))
        .filter(group => String(group.id || "").endsWith("@g.us"))
        .sort((a, b) => cleanGroupName(a.subject).localeCompare(cleanGroupName(b.subject)));

      if (groups.length === 0) {
        return sock.sendMessage(chatJid, {
          text: "🤖 The bot isn't in any WhatsApp groups right now.",
        }, { quoted: msg });
      }

      const rows = await mapWithLimit(groups, INVITE_LOOKUP_CONCURRENCY, async (group, index) => {
        let inviteLink = "invite link unavailable";
        try {
          const code = await sock.groupInviteCode(group.id);
          if (code) inviteLink = `https://chat.whatsapp.com/${code}`;
        } catch {
          // Some groups don't let this account read the invite code.
        }

        return `${index + 1}. *${cleanGroupName(group.subject)}* | ${inviteLink} | ✅ bot is in group`;
      });

      const pages = makePages(rows, groups.length);
      for (let index = 0; index < pages.length; index++) {
        if (index === 0) {
          await sock.sendMessage(chatJid, { text: pages[index] }, { quoted: msg });
        } else {
          await sock.sendMessage(chatJid, { text: pages[index] });
        }
      }
    } catch (error) {
      console.error("[groups] Could not fetch participating groups:", error?.message || error);
      return sock.sendMessage(chatJid, {
        text: "❌ Couldn't load the bot's group list. Please try again in a moment.",
      }, { quoted: msg });
    }
  },
};
