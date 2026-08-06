/**
 * KELIN MD — .aquiz command
 * Anime Quiz — lobby-based, registered economy users only.
 *
 * Usage:
 *   .aquiz          — open a lobby (type "join" to enter, auto-starts in 1 min)
 *   .aquiz start    — force-start the lobby early (lobby creator only)
 *   .aquiz stop     — end the current game
 *   .aquiz score    — show current scoreboard
 *
 * How to play:
 *   • Type *join* (no prefix) while the lobby is open to enter
 *   • Answer questions by typing the answer — no prefix needed
 *   • Wrong answer = locked out for that question
 *   • First to 10 points wins $10,000–$100,000!
 */
import {
  openQuizLobby,
  forceStartQuiz,
  stopQuizSession,
  quizSessions,
} from "../../lib/animeQuizGame.mjs";
import { getUser } from "../economy/database.js";

function formatScoreboard(scores, players) {
  const allPlayers = [...new Set([...Object.keys(scores), ...(players ? [...players] : [])])];
  const sorted     = allPlayers
    .map(jid => [jid, scores[jid] ?? 0])
    .sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return "  _No players yet_";
  return sorted
    .map(([jid, pts], i) =>
      `  ${i + 1}. @${jid.split("@")[0]} — *${pts} pt${pts !== 1 ? "s" : ""}*`
    )
    .join("\n");
}

export default {
  name:        "aquiz",
  description: "Anime quiz game — lobby-based, first to 10 points wins cash!",
  category:    "games",
  usage:       ".aquiz | .aquiz start | .aquiz stop | .aquiz score",
  aliases:     ["animequiz", "aquestion"],

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;
    const sub = (args[0] ?? "").toLowerCase();

    // Groups only
    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, {
        text: "❌ The anime quiz can only be played in *groups*!\nAdd me to a group and try again.",
      }, { quoted: msg });
    }

    // ── Force-start ───────────────────────────────────────────────────────
    if (sub === "start") {
      return forceStartQuiz(sock, jid, sender);
    }

    // ── Stop ──────────────────────────────────────────────────────────────
    if (sub === "stop" || sub === "end" || sub === "quit") {
      return stopQuizSession(sock, jid);
    }

    // ── Scoreboard ────────────────────────────────────────────────────────
    if (sub === "score" || sub === "scores" || sub === "lb") {
      const session = quizSessions.get(jid);
      if (!session) {
        return sock.sendMessage(jid, {
          text: "❌ No anime quiz is running.\n\nStart one with *.aquiz*",
        }, { quoted: msg });
      }
      const board    = formatScoreboard(session.scores, session.players);
      const mentions = [...session.players];
      const stateTag = session.state === "lobby"
        ? "⏳ *Lobby open* — waiting for game to start"
        : "🎮 *Game in progress*";
      return sock.sendMessage(jid, {
        text:
          `📊 *Anime Quiz — Scoreboard*\n\n${stateTag}\n\n${board}\n\n` +
          `🏆 First to *10 points* wins the prize!`,
        mentions,
      }, { quoted: msg });
    }

    // ── Open lobby ────────────────────────────────────────────────────────
    return openQuizLobby(sock, jid, sender, getUser);
  },
};
