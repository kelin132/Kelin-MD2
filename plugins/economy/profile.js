import { getUser, requireRegistration } from "./database.js";
import { generateProfileImage, getProfilePic, resolveRole } from "../../lib/profileGen.mjs";
import { getLevelRole, getAllEarnedRoles, getLevelRoleLabel } from "../../lib/levelRoles.mjs";
import { getUser as getCardUser } from "../cards/db.js";
import { countTrainerPokemon } from "../../lib/pokemon/pokemonDb.mjs";
import { guildSystem } from "../../lib/guildSystem.js";
import { GYMS } from "../../lib/pokemon/gymData.mjs";
import { getTrainer } from "../../lib/pokemon/players.mjs";
import { buildEconomyExternalAdReply } from "../../lib/economyPreview.mjs";

const xpForLevel = (level) => level * 100;

function withTimeout(promise, timeoutMs, fallback = null) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(fallback), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function sendProfileFallback({ sock, jid, msg, caption, profilePic, target, externalAdReply }) {
  const contextInfo = externalAdReply ? { externalAdReply } : undefined;
  if (profilePic) {
    try {
      await sock.sendMessage(
        jid,
        { image: { url: profilePic }, caption, contextInfo },
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
    { text: caption, mentions: [target], contextInfo },
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

function gymAchievementSummary(trainer) {
  const badges = Array.isArray(trainer?.badges) ? trainer.badges.map(String) : [];
  const rewards = trainer?.gymRewards && typeof trainer.gymRewards === "object"
    ? Object.keys(trainer.gymRewards)
    : [];
  const earnedIds = new Set(
    [...badges, ...rewards]
      .map((value) => value.trim().toLowerCase().replace(/-badge$/i, ""))
      .filter(Boolean),
  );
  const earnedGyms = GYMS.filter((gym) => earnedIds.has(gym.id));
  const explicitWins = [trainer?.gymWins, trainer?.gymBattleWins, trainer?.gymVictories]
    .map(Number)
    .find((value) => Number.isFinite(value) && value >= 0);
  const wins = explicitWins ?? earnedGyms.length;
  const nextGym = GYMS.find((gym) => !earnedGyms.some((earned) => earned.id === gym.id));

  return {
    wins,
    completed: earnedGyms.length,
    total: GYMS.length,
    badges: earnedGyms.length ? earnedGyms.map((gym) => gym.badge).join(", ") : "None yet",
    next: nextGym ? nextGym.name : "Circuit complete",
  };
}

export default {
  name: "profile",
  description: "View your economy profile card",
  category: "economy",
  usage: ".profile [@user]",
  aliases: ["me", "acc", "account", "p"],
  cooldown: 5,

  async run({ sock, msg, sender, cmd, isOwner, isMod, isStaff }) {
    const jid = msg.key.remoteJid;

    // Check for @mention or quoted/replied message author
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo || msg.message?.imageMessage?.contextInfo || msg.message?.videoMessage?.contextInfo;
    const mentioned   = contextInfo?.mentionedJid?.[0];
    const quotedUser  = contextInfo?.participant;

    const target = mentioned || quotedUser || sender;

    if (target === sender && !await requireRegistration(sock, msg, sender)) return;

    // `.p` is the fast self-profile shortcut. The generated image does not
    // use card/Pokémon/trainer details, so avoid those extra database reads.
    const isQuickProfile = cmd === "p" && target === sender;

    // Keep every independent lookup in one batch so another user's profile
    // does not wait for the cards query before starting the other reads.
    const [cardUser, user, profilePicFromSocket, pokemonCount, guild, trainer] = await Promise.all([
      isQuickProfile ? Promise.resolve(null) : getCardUser(target),
      getUser(target),
      withTimeout(getProfilePic(sock, target), 2500),
      isQuickProfile ? Promise.resolve(0) : countTrainerPokemon(target),
      withTimeout(guildSystem.getUserPrimaryGuild(target), 2500),
      isQuickProfile ? Promise.resolve(null) : withTimeout(getTrainer(target), 2500),
    ]);
    const websiteAvatar = [cardUser?.profilePictureUrl, cardUser?.profileImage, cardUser?.avatarUrl]
      .find((value) => typeof value === "string" && /^https?:\/\//i.test(value));
    const profilePic = websiteAvatar || profilePicFromSocket;

    const tag   = target.split("@")[0].split(":")[0];
    const level = user.level ?? 1;
    const xp    = user.xp    ?? 0;
    const registeredName = String(user.name || "User").trim() || "User";
    const cardsOwned = isQuickProfile
      ? 0
      : Array.isArray(cardUser?.cards)
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
    const guildName   = String(guild?.name || user.guildName || user.guild || "None").trim() || "None";
    const joinedDate  = fmtDate(user.registeredAt);
    const roleShort = {
      Owner: "OWNER",
      Moderator: "MOD",
      Staff: "STAFF",
      Premium: "PREMIUM",
      Member: "MEMBER",
    }[role] || role.toUpperCase();
    const gymProgress = gymAchievementSummary(trainer);

    const lastDaily       = user.lastDaily ?? 0;
    const hoursSinceDaily = (Date.now() - lastDaily) / 36e5;
    const streak          = hoursSinceDaily < 48 ? (user.streak ?? 1) : 0;

    const daysActive = user.registeredAt
      ? Math.max(0, Math.floor((Date.now() - new Date(user.registeredAt).getTime()) / 86400000))
      : 0;

    const reach = Number.isFinite(Number(user.reach)) ? Number(user.reach) : daysActive;
    const displayName = registeredName;
    const profileAge = user.age === null || user.age === undefined || user.age === "" ? "N/A" : user.age;
    const profileBirthday = String(user.birthday || "N/A").trim() || "N/A";
    const profileBio = String(user.bio || "N/A").trim() || "N/A";
    const profileCards = isQuickProfile
      ? "—"
      : Number.isFinite(Number(cardsOwned)) ? Number(cardsOwned).toLocaleString() : "N/A";
    const profilePokemon = isQuickProfile
      ? "—"
      : Number.isFinite(Number(pokemonCount)) ? Number(pokemonCount).toLocaleString() : "N/A";
    const profileBadges = isQuickProfile
      ? "—"
      : Number.isFinite(Number(gymProgress.completed)) ? gymProgress.completed : "N/A";
    const caption =
`╭━━━〔 🌸 𝗣𝗥𝗢𝗙𝗜𝗟𝗘 〕━━━╮
│ ❀ Name : \`${displayName}\`
│ ❀ Age : \`${profileAge}\`
│ ❀ Bday : \`${profileBirthday}\`
│ ❀ Bio : \`${profileBio}\`
│ ❀ Cards : \`${profileCards}\`
│ ❀ Pokémon : \`${profilePokemon}\`
│ ❀ Badges : \`${profileBadges}\`
│ ❀ Role : \`${role}\`
│
│  *view and edit your profile image*
│ *here:*
│  *https://aidoru.zone.id/profile*
╰━━━━━━━━━━━━━━━━━━━━━━╯`;

    let imgBuffer;
    const externalAdReply = cmd === "profile"
      ? await buildEconomyExternalAdReply("profile")
      : null;
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
        profileFrame: user.profileFrame || null,
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
      await sendProfileFallback({ sock, jid, msg, caption, profilePic, target, externalAdReply });
      return;
    }

    try {
      await sock.sendMessage(
        jid,
        {
          image: imgBuffer,
          caption,
          contextInfo: externalAdReply ? { externalAdReply } : undefined,
        },
        { quoted: msg },
      );
    } catch (err) {
      console.error(
        "[profile] Canvas image delivery failed:",
        err.stack || err.message || err
      );
      await sendProfileFallback({ sock, jid, msg, caption, profilePic, target, externalAdReply });
    }
  },
};
