import { getUser, requireRegistration } from "./database.js";
import { generateProfileImage, getProfilePic, resolveRole } from "../../lib/profileGen.mjs";
import { getLevelRole, getAllEarnedRoles, getLevelRoleLabel } from "../../lib/levelRoles.mjs";
import { getUser as getCardUser } from "../cards/db.js";
import { countTrainerPokemon } from "../../lib/pokemon/pokemonDb.mjs";

const xpForLevel = (level) => level * 100;

function withTimeout(promise, timeoutMs, fallback = null) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(fallback), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function sendProfileFallback({ sock, jid, msg, caption, profilePic, target }) {
  if (profilePic) {
    try {
      await sock.sendMessage(
        jid,
        { image: { url: profilePic }, caption },
        { quoted: msg }
      );
      return;
    } catch (fallbackError) {
      console.error(
        "[profile] Avatar fallback delivery failed:",
        fallbackError.stack || fallbackError.message || fallbackError
      );
    }
  }

  await sock.sendMessage(
    jid,
    { text: caption, mentions: [target] },
    { quoted: msg }
  );
}

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

    const cardUser = await getCardUser(target);
    const websiteAvatar = [cardUser?.profilePictureUrl, cardUser?.profileImage, cardUser?.avatarUrl]
      .find((value) => typeof value === "string" && /^https?:\/\//i.test(value));
    const [user, profilePic, pokemonCount] = await Promise.all([
      getUser(target),
      withTimeout(getProfilePic(sock, target, websiteAvatar), 2500),
      countTrainerPokemon(target),
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
    const guildName   = String(user.guildName || user.guild || "None").trim() || "None";
    const joinedDate  = fmtDate(user.registeredAt);
    const roleShort = {
      Owner: "OWNER",
      Moderator: "MOD",
      Staff: "STAFF",
      Premium: "PREMIUM",
      Member: "MEMBER",
    }[role] || role.toUpperCase();

    const lastDaily       = user.lastDaily ?? 0;
    const hoursSinceDaily = (Date.now() - lastDaily) / 36e5;
    const streak          = hoursSinceDaily < 48 ? (user.streak ?? 1) : 0;

    const daysActive = user.registeredAt
      ? Math.max(0, Math.floor((Date.now() - new Date(user.registeredAt).getTime()) / 86400000))
      : 0;
    // Reach is supported as a stored value when another system provides it.
    // Existing accounts get a useful, stable fallback based on active days.
    const reach = Number.isFinite(Number(user.reach)) ? Number(user.reach) : daysActive;
    const displayName = registeredName.toUpperCase();
    const caption =
`╭━━━〔 🌸 𝗣𝗥𝗢𝗙𝗜𝗟𝗘 〕━━━╮
│
│ ── ✦ 𝗦𝗧𝗔𝗧𝗦 ✦ ──
│ 🌟 Active ${daysActive}
│ 🃏 Cards ${cardsOwned}
│ 🐾 Pokémon ${pokemonCount}
│
│ ── ✦ 𝗪𝗘𝗔𝗟𝗧𝗛 ✦ ──
│ 💰 $${(user.money ?? 0).toLocaleString()}
│ 🏦 $${(user.bank ?? 0).toLocaleString()}
│ 💎 ${(user.diamonds ?? 0).toLocaleString()} 
│
│ 🎨 Edit your background PFP at:
│ https://aidoru.zone.id/profile
╰━━━━━━━━━━━━━━━━━━━━━━╯`;

    let imgBuffer;
    try {
      imgBuffer = await generateProfileImage({
        username:     registeredName,
        tag,
        role,
        level,
        xp,
        xpTarget:     xpForLevel(level),
        reach,
        wallet:       user.money    ?? 0,
        bank:         user.bank     ?? 0,
        bio:          user.bio      || "No bio set.",
        guild:        guildName,
        joined:       joinedDate,
        streak,
        items:        user.inventory?.length ?? 0,
        transactions: user.history?.length   ?? 0,
        profileImage: profilePic,
        profileBackground: user.profileBackground || null,
        levelRole,
        earnedRoles,
        daysActive,
        cards: cardsOwned,
        games: gamesPlayed,
        pokemon: pokemonCount,
        diamonds: user.diamonds ?? 0,
      });

    } catch (err) {
      console.error(
        "[profile] Canvas generation failed:",
        err.stack || err.message || err
      );
      await sendProfileFallback({ sock, jid, msg, caption, profilePic, target });
      return;
    }

    try {
      await sock.sendMessage(jid, { image: imgBuffer, caption }, { quoted: msg });
    } catch (err) {
      console.error(
        "[profile] Canvas image delivery failed:",
        err.stack || err.message || err
      );
      await sendProfileFallback({ sock, jid, msg, caption, profilePic, target });
    }
  },
};
