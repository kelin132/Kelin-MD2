/**
 * KELIN MD — .aquiz command
 * Anime Quiz game — multiplayer/solo, first to 10 points wins a cash prize.
 *
 * Usage:
 *   .aquiz        — start the quiz in this group
 *   .aquiz stop   — end the current quiz early
 *   .aquiz score  — show current scoreboard
 *
 * How to play:
 *   A question appears and the first person to type the correct answer
 *   (no command prefix needed) wins 1 point.
 *   Reach 10 points to win $10,000–$100,000!
 */
import { startQuizSession, stopQuizSession, quizSessions } from "../../lib/animeQuizGame.mjs";

function formatScoreboard(scores) {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return "  _No scores yet — answer a question!_";
  return sorted
    .map(([jid, pts], i) => `  ${i + 1}. @${jid.split("@")[0]} — *${pts} pt${pts !== 1 ? "s" : ""}*`)
    .join("\n");
}

export default {
  name:        "aquiz",
  description: "Play an anime quiz game — first to 10 points wins a cash prize!",
  category:    "games",
  usage:       ".aquiz | .aquiz stop | .aquiz score",
  aliases:     ["animequiz", "aquestion"],

  async run({ sock, msg, sender, args }) {
    const jid     = msg.key.remoteJid;
    const sub     = (args[0] ?? "").toLowerCase();

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
      const board    = formatScoreboard(session.scores);
      const mentions = Object.keys(session.scores);
      return sock.sendMessage(jid, {
        text: `📊 *Anime Quiz — Scoreboard*\n\n${board}\n\n🏆 First to *10 points* wins the prize!`,
        mentions,
      }, { quoted: msg });
    }

    // ── Start ─────────────────────────────────────────────────────────────
    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, {
        text: "❌ The anime quiz can only be played in groups!\nAdd me to a group and try again.",
      }, { quoted: msg });
    }

    return startQuizSession(sock, jid, sender);
  },
};
