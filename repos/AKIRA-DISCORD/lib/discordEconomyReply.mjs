function compactDescription(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line
      .replace(/^[\s│║|]+/, "")
      .replace(/[│║|]\s*$/, "")
      .trim())
    .filter((line) => line && !/^[╭╰┌└┐┘]/.test(line) && !/^[─━═❀]+$/.test(line))
    .join("\n")
    .replace(/\s*::\s*/g, ": ");
}

export function sendEconomyReply({
  sock,
  jid,
  msg,
  discord,
  text,
  title,
  color = "#FFD166",
}) {
  if (discord?.message) {
    return sock.sendMessage(jid, {
      discordEmbed: {
        title,
        description: compactDescription(text),
        color,
      },
    }, { quoted: msg });
  }

  return sock.sendMessage(jid, { text }, { quoted: msg });
}