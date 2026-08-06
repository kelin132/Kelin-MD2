import { getUser, requireRegistration } from "./database.js";
import { generateProfileImage, getProfilePic, resolveRole } from "../../lib/profileGen.mjs";
import { getLevelRole, getAllEarnedRoles, getLevelRoleLabel } from "../../lib/levelRoles.mjs";
import { getUser as getCardUser } from "../cards/db.js";

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

    const [user, profilePic, cardUser] = await Promise.all([
      getUser(target),
      getProfilePic(sock, target),
      getCardUser(target),
    ]);

    const tag   = target.split("@")[0].split(":")[0];
    const level = user.level ?? 1;
    const xp    = user.xp    ?? 0;
    const registeredName = String(user.name || "User").trim() || "User";
    const cardsOwned = Array.isArray(cardUser?.cards)
      ? cardUser.cards.length
      : (cardUser?.totalCards ?? 0);
    const history = Array.isArray(user.history) ? user.history : [];
    const gameTypes = new Set(["bet", "coinflip", "slots", "roulette", "scratch", "gamble"]);
    const casinoTypes = new Set(["slots", "roulette", "scratch", "gamble"]);
    const gamesPlayed = history.filter((entry) => gameTypes.has(entry.type)).length;
    const casinoGames = history.filter((entry) => casinoTypes.has(entry.type)).length;

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
│ 👤 *Profile : ${registeredName}*
│ 🎭 *Role :* ${role} • ${roleLabel}
│
│ 🏅 *Achievements* 🏅
│ 🌟 Days Active : ${daysActive}
│ 🃏 Cards       : ${cardsOwned}
│ 🎮 Games       : ${gamesPlayed}
│ 💸 Casino      : ${casinoGames}
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
        username:     registeredName,
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
