/** Active math sessions: jid → { answer, timer } */
const sessions = new Map();

function generate(difficulty) {
  const d = difficulty || "medium";
  let a, b, op, ans, expr;

  if (d === "easy") {
    a  = Math.floor(Math.random() * 50) + 1;
    b  = Math.floor(Math.random() * 50) + 1;
    op = ["+", "-"][Math.floor(Math.random() * 2)];
    ans  = op === "+" ? a + b : a - b;
    expr = `${a} ${op} ${b}`;
  } else if (d === "hard") {
    a  = Math.floor(Math.random() * 99) + 2;
    b  = Math.floor(Math.random() * 99) + 2;
    op = ["×", "÷"][Math.floor(Math.random() * 2)];
    if (op === "÷") { ans = a; a = a * b; } else ans = a * b;
    expr = `${a} ${op} ${b}`;
  } else {
    a  = Math.floor(Math.random() * 20) + 2;
    b  = Math.floor(Math.random() * 20) + 2;
    op = ["+", "-", "×"][Math.floor(Math.random() * 3)];
    ans  = op === "+" ? a + b : op === "-" ? a - b : a * b;
    expr = `${a} ${op} ${b}`;
  }

  return { expr, ans: String(ans) };
}

export default {
  name: "math",
  description: "Solve a math challenge — fastest answer wins",
  category: "games",
  usage: ".math [easy|medium|hard]",
  aliases: ["mathquiz", "calculate"],
  cooldown: 5,

  async run({ sock, msg, sender, args }) {
    const jid  = msg.key.remoteJid;

    // Check if answering
    if (args[0] && !["easy","medium","hard"].includes(args[0])) {
      const session = sessions.get(jid);
      if (!session) {
        return sock.sendMessage(jid, { text: "❌ No active math quiz! Start one with *.math*" }, { quoted: msg });
      }
      const guess = args[0].trim();
      if (guess === session.answer) {
        clearTimeout(session.timer);
        sessions.delete(jid);
        return sock.sendMessage(jid, {
          text: `🎉 *Correct!* @${sender.split("@")[0]} answered *${session.answer}*!`,
          mentions: [sender],
        }, { quoted: msg });
      } else {
        return sock.sendMessage(jid, { text: "❌ Wrong answer! Keep trying!" }, { quoted: msg });
      }
    }

    if (sessions.has(jid)) {
      return sock.sendMessage(jid, { text: "⚠️ A math quiz is already running! Answer it first." }, { quoted: msg });
    }

    const diff   = ["easy","medium","hard"].includes(args[0]) ? args[0] : "medium";
    const { expr, ans } = generate(diff);

    const timer = setTimeout(async () => {
      sessions.delete(jid);
      try {
        await sock.sendMessage(jid, { text: `⏰ *Time's up!*\nThe answer was *${ans}*` });
      } catch { /* ignore */ }
    }, 20_000);

    sessions.set(jid, { answer: ans, timer });

    await sock.sendMessage(jid, {
      text:
`🧮 *MATH CHALLENGE!* [${diff.toUpperCase()}]

❓ What is: *${expr}* = ?

⏰ You have *20 seconds!*
📝 Reply: *.math <answer>*`
    }, { quoted: msg });
  }
};
