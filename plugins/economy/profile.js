import { getUser, requireRegistration } from "./database.js";
import { generateProfileImage, getProfilePic, resolveRole } from "../../lib/profileGen.mjs";
import { getLevelRole, getAllEarnedRoles, getLevelRoleLabel } from "../../lib/levelRoles.mjs";

const xpForLevel = (level) => level * 100;

function fmtDate(iso) {
  if (!iso) return "Unknown";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return "Unknown"; }
}

export default {
  name: "profile",
  description: "View your economy profile card",
  category: "economy",
  usage: ".profile [@user]",
  aliases: ["me", "acc", "account", "p"],
  cooldown: 5,

  async run({ sock, msg, sender, isOwner, isMod, isStaff }) {
    const jid = msg.key.remoteJid;

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const target    = mentioned || sender;

    if (target === sender && !await requireRegistration(sock, msg, sender)) return;

    const [user, profilePic] = await Promise.all([
      getUser(target),
      getProfilePic(sock, target),
    ]);

    const tag   = target.split("@")[0].split(":")[0];
    const level = user.level ?? 1;
    const xp    = user.xp    ?? 0;

    const role = resolveRole({
      isOwner:    target === sender ? isOwner  : false,
      isMod:      target === sender ? isMod    : (user.staffLevel >= 1),
      isStaff:    target === sender ? isStaff  : (user.staffLevel >= 2),
      isPremium:  user.isPremium,
      staffLevel: user.staffLevel ?? 0,
    });

    const levelRole   = getLevelRole(level);
    const earnedRoles = getAllEarnedRoles(level);
    const roleLabel   = getLevelRoleLabel(level);

    const lastDaily       = user.lastDaily ?? 0;
    const hoursSinceDaily = (Date.now() - lastDaily) / 36e5;
    const streak          = hoursSinceDaily < 48 ? (user.streak ?? 1) : 0;

    const daysActive = user.registeredAt
      ? Math.max(0, Math.floor((Date.now() - new Date(user.registeredAt).getTime()) / 86400000))
      : 0;
    const caption =
`╭─❀「 ✨ *PROFILE* 」❀─╮
│ 👤 *Profile : @${tag}*
│ 🎭 *Role :* ${role} • ${roleLabel}
│
│ 🏅 *Achievements* 🏅
│ 🌟 Days Active : ${daysActive}
│ 🃏 Cards       : ${user.totalCards ?? user.cards?.length ?? 0}
│ 🎮 Games       : ${user.gamesPlayed ?? user.games ?? 0}
│ 💸 Casino      : ${user.casinoGames ?? user.casino ?? 0}
│
│ ⭐ Level : ${level}
│ 📚 XP    : ${xp.toLocaleString()} / ${xpForLevel(level).toLocaleString()}
│
│ 💰 Wallet   : $${(user.money ?? 0).toLocaleString()}
│ 🏦 Bank     : $${(user.bank ?? 0).toLocaleString()}
│ 💎 Diamonds : ${(user.diamonds ?? 0).toLocaleString()}
│ 🎒 Items    : ${user.inventory?.length ?? 0}
│
│ 📝 *Bio:* ${user.bio || "No bio set."}
│ ⚜️ Clan : ${user.guild || "None"}
│ 📅 Joined : ${fmtDate(user.registeredAt)}
╰───────────────❀`;

    try {
      const imgBuffer = await generateProfileImage({
        username:     user.name || tag,
        tag,
        role,
        level,
        xp,
        xpTarget:     xpForLevel(level),
        wallet:       user.money    ?? 0,
        bank:         user.bank     ?? 0,
        bio:          user.bio      || "No bio set.",
        guild:        user.guild    || null,
        joined:       fmtDate(user.registeredAt),
        streak,
        items:        user.inventory?.length ?? 0,
        transactions: user.history?.length   ?? 0,
        profileImage: profilePic,
        levelRole,
        earnedRoles,
      });

      await sock.sendMessage(jid, { image: imgBuffer, caption }, { quoted: msg });
    } catch (err) {
      console.error("[profile] Canvas error:", err.message);
      await sock.sendMessage(jid, { text: caption, mentions: [target] }, { quoted: msg });
    }
  },
};
