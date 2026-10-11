import { guildSystem } from "../../lib/guildSystem.js";
import { guildWarSystem } from "../../lib/guildWarSystem.mjs";
import { formatGuildWarStatus, GUILD_WAR_DURATION_MS } from "../../lib/guildWarRules.mjs";

const HELP = [
  "╭─〔 ⚔️ GUILD WAR COMMANDS 〕",
  "│ .war challenge <guild name>",
  "│ .war accept",
  "│ .war status",
  "│ .war win <match #> <a|b>",
  "│ .war forfeit <match #> <a|b>",
  "│ .war cancel  (challenger, before acceptance)",
  "│",
  "│ Only guild owners can challenge, accept, or report results.",
  "│ A or B is the side shown by the matchup order.",
  "╰────────────────────────",
].join("\n");

const HOURS = GUILD_WAR_DURATION_MS / (60 * 60 * 1000);

function errorMessage(reason) {
  const messages = {
    challenger_missing: "❌ Your guild could not be found.",
    opponent_missing: "❌ That guild could not be found. Use its exact guild name.",
    same_guild: "❌ Choose a different guild to challenge.",
    not_owner: "❌ Only a guild owner can do that.",
    not_opponent_owner: "❌ Only the challenged guild's owner can accept.",
    not_challenger_owner: "❌ Only the challenging guild's owner can cancel.",
    guild_busy: "❌ One of those guilds already has a pending or active war.",
    no_challenge: "❌ There is no pending challenge for your guild.",
    challenge_expired: "⌛ That challenge expired or was already handled.",
    guild_missing: "❌ A guild in this war no longer exists.",
    no_members: "❌ Each guild needs at least one current member to start.",
    no_active_war: "❌ Your guild has no active war.",
    war_expired: "⌛ The 48-hour battle has ended.",
    invalid_result: "❌ Use `a` or `b` for a side and choose `win` or `forfeit`.",
    invalid_matchup: "❌ That matchup number does not exist.",
    matchup_resolved: "❌ That matchup was already reported.",
  };
  return messages[reason] || "❌ The guild-war action could not be completed.";
}

export default {
  name: "war",
  description: "Challenge a guild and track an eight-player war",
  category: "guild",
  usage: ".war <challenge|accept|status|win|forfeit|cancel>",
  aliases: ["guildwar"],
  cooldown: 5,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const input = String(text || "").trim();
    const action = input.split(/\s+/, 1)[0] || "help";
    const argumentText = input.slice(action.length).trim();
    const guild = await guildSystem.getUserPrimaryGuild(sender);

    if (["help", "commands"].includes(action.toLowerCase())) {
      return sock.sendMessage(jid, { text: HELP }, { quoted: msg });
    }

    if (!guild) {
      return sock.sendMessage(jid, {
        text: "❌ Join or create a guild before using guild wars.",
      }, { quoted: msg });
    }

    switch (action.toLowerCase()) {
      case "challenge": {
        if (!argumentText) {
          return sock.sendMessage(jid, {
            text: "Usage: *.war challenge <exact guild name>*",
          }, { quoted: msg });
        }
        const result = await guildWarSystem.challenge({
          ownerJid: sender,
          challengerName: guild.name,
          opponentName: argumentText,
          channelId: jid,
        });
        if (!result.ok) {
          return sock.sendMessage(jid, { text: errorMessage(result.reason) }, { quoted: msg });
        }
        return sock.sendMessage(jid, {
          text:
            `⚔️ *${result.war.guildA.name}* challenged *${result.war.guildB.name}*.\n` +
            `The challenged guild's owner has ${HOURS} hours to accept with *.war accept*. ` +
            `The battle timer starts when accepted. Use *.war status* to check it.`,
        }, { quoted: msg });
      }

      case "accept": {
        const result = await guildWarSystem.accept({
          ownerJid: sender,
          guildName: guild.name,
        });
        if (!result.ok) {
          return sock.sendMessage(jid, { text: errorMessage(result.reason) }, { quoted: msg });
        }
        return sock.sendMessage(jid, {
          text:
            `⚔️ *War accepted:* ${result.war.guildA.name} vs ${result.war.guildB.name}.\n` +
            `${result.war.matchups.length} member matchups are set for ${HOURS} hours. ` +
            `Leaders report results with *.war win <match #> <a|b>* or ` +
            `*.war forfeit <match #> <a|b>*.`,
        }, { quoted: msg });
      }

      case "status": {
        const war = await guildWarSystem.status(guild.name);
        return sock.sendMessage(jid, {
          text: war ? formatGuildWarStatus(war) : "⚔️ No guild war found for your guild.",
        }, { quoted: msg });
      }

      case "win":
      case "forfeit": {
        const [matchupNumber, side, ...extra] = argumentText.split(/\s+/);
        if (!matchupNumber || !side || extra.length || !/^\d+$/.test(matchupNumber)) {
          return sock.sendMessage(jid, {
            text: `Usage: *.war ${action.toLowerCase()} <match #> <a|b>*`,
          }, { quoted: msg });
        }
        const result = await guildWarSystem.report({
          ownerJid: sender,
          guildName: guild.name,
          matchupNumber: Number(matchupNumber),
          resultType: action.toLowerCase(),
          side: side.toLowerCase(),
        });
        if (!result.ok) {
          return sock.sendMessage(jid, { text: errorMessage(result.reason) }, { quoted: msg });
        }
        return sock.sendMessage(jid, {
          text: `✅ Matchup ${matchupNumber} recorded.\n${formatGuildWarStatus(result.war)}`,
        }, { quoted: msg });
      }

      case "cancel": {
        const result = await guildWarSystem.cancel({
          ownerJid: sender,
          guildName: guild.name,
        });
        if (!result.ok) {
          return sock.sendMessage(jid, { text: errorMessage(result.reason) }, { quoted: msg });
        }
        return sock.sendMessage(jid, {
          text: "Challenge cancelled before acceptance.",
        }, { quoted: msg });
      }

      default:
        return sock.sendMessage(jid, { text: HELP }, { quoted: msg });
    }
  },
};
