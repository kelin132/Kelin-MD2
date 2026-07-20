import { getUser, requireRegistration } from "./database.js";
import { generateProfileImage, getProfilePic, resolveRole } from "../../lib/profileGen.mjs";

// XP needed to reach the NEXT level — keep in sync with any levelling logic
const xpForLevel = (level) => level * 100;

export default {
  name: "profile",
  description: "View your economy profile card",
  category: "economy",
  usage: ".profile [@user]",
  aliases: ["me", "acc", "account", "p"],
  cooldown: 5,

  async run({ sock, msg, sender, isOwner, isMod, isStaff }) {
    const jid = msg.key.remoteJid;

    // Allow viewing someone else's profile by @mention
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const target    = mentioned || sender;

    if (target === sender && !await requireRegistration(sock, msg, sender)) return;

    const user  = await getUser(target);
    const tag   = target.split("@")[0].split(":")[0];
    const level = user.level ?? 1;
    const xp    = user.xp    ?? 0;

    // Role — pass sender's perms for their own profile; for others just use their DB fields
    const role = resolveRole({
      isOwner:    target === sender ? isOwner  : false,
      isMod:      target === sender ? isMod    : (user.staffLevel >= 1),
      isStaff:    target === sender ? isStaff  : (user.staffLevel >= 2),
      isPremium:  user.isPremium,
      staffLevel: user.staffLevel ?? 0,
    });

    const profilePic = await getProfilePic(sock, target);

    const caption =
`👤 *${user.name || "User"}*  •  ${role}

💰 Wallet   : $${(user.money ?? 0).toLocaleString()}
🏦 Bank     : $${(user.bank  ?? 0).toLocaleString()}
💎 Net Worth: $${((user.money ?? 0) + (user.bank ?? 0)).toLocaleString()}

⭐ Level    : ${level}
🔮 XP       : ${xp} / ${xpForLevel(level)}
🎒 Items    : ${user.inventory?.length ?? 0}
⛓️ Jailed   : ${user.jail ? "Yes 🔒" : "No ✅"}`;

    try {
      const imgBuffer = await generateProfileImage({
        username:        user.name || tag,
        role,
        level,
        xp,
        xpTarget:        xpForLevel(level),
        wallet:          user.money ?? 0,
        bank:            user.bank  ?? 0,
        bio:             user.bio   || "No bio set.",
        profileImage:    profilePic,
        backgroundImage: profilePic,
      });

      await sock.sendMessage(jid, {
        image:   imgBuffer,
        caption,
      }, { quoted: msg });
    } catch (err) {
      console.error("[profile] Canvas error:", err.message);
      // Fall back to text card
      await sock.sendMessage(jid, {
        text:     caption,
        mentions: [target],
      }, { quoted: msg });
    }
  },
};
