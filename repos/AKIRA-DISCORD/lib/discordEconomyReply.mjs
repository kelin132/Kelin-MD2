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
  mentions = [],
  footer = "AIDORU • Economy",
  fields = [],
}) {
  if (discord?.message) {
    return sock.sendMessage(jid, {
      discordEmbed: {
        title,
        description: compactDescription(text),
        color,
        ...(fields.length ? { fields } : {}),
        footer: { text: footer },
      },
      mentions,
    }, { quoted: msg });
  }

  return sock.sendMessage(jid, { text, mentions }, { quoted: msg });
}