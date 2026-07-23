/**
 * KELIN MD — .setwelcome
 * Sets a custom welcome message for the group.
 * Supports multi-line messages (use actual line breaks or \n escape).
 * Supports welcome card images via the David Cyril Canvas API.
 * Actual welcome sending is handled by lib/groupEventHandler.mjs
 */
import { groupSettings } from "../../lib/groupSettings.js";

export default {
  name: "setwelcome",
  description: "Set a custom welcome message for the group",
  category: "group",
  usage: ".setwelcome <message>",
  aliases: ["customwelcome"],
  cooldown: 5,
  isAdmin: true,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith("@g.us")) {
      return sock.sendMessage(jid, { text: "❌ This command only works in groups." }, { quoted: msg });
    }

    // Extract full message body preserving newlines
    const rawBody =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      "";
    // Strip command prefix + command name (e.g. ".setwelcome ")
    const prefixMatch = rawBody.match(/^[.!#/]?(setwelcome|customwelcome)\s*/i);
    const text = prefixMatch
      ? rawBody.slice(prefixMatch[0].length).trimEnd()
      : args.join(" ").trim();

    // ── .setwelcome card on|off ───────────────────────────────────────────────
    if (/^card\s+(on|off)$/i.test(text)) {
      const enabled = /on$/i.test(text);
      groupSettings.set(jid, { welcomeCard: enabled });
      return sock.sendMessage(jid, {
        text: enabled
          ? `🖼️ *Welcome card mode ENABLED!*\n\nNew members will be greeted with a card image that includes their profile picture.\n\nTip: set a background with *.setwelcome bg <image_url>*`
          : `💬 *Welcome card mode DISABLED.*\n\nNew members will be greeted with a text message instead.`,
      }, { quoted: msg });
    }

    // ── .setwelcome bg <url> ─────────────────────────────────────────────────
    if (/^bg\s+\S+/i.test(text)) {
      const bgUrl = text.replace(/^bg\s+/i, "").trim();
      // Basic URL validation
      if (!/^https?:\/\//i.test(bgUrl)) {
        return sock.sendMessage(jid, {
          text: "❌ Invalid URL. Please provide a valid image URL starting with http:// or https://",
        }, { quoted: msg });
      }
      groupSettings.set(jid, { welcomeCardBg: bgUrl });
      return sock.sendMessage(jid, {
        text: `✅ *Welcome card background saved!*\n\n🖼️ Background: ${bgUrl}\n\nEnable card mode with *.setwelcome card on*`,
      }, { quoted: msg });
    }

    // ── .setwelcome bg reset ─────────────────────────────────────────────────
    if (/^bg\s+reset$/i.test(text)) {
      const s = groupSettings.get(jid) || {};
      delete s.welcomeCardBg;
      groupSettings.set(jid, s);
      return sock.sendMessage(jid, {
        text: "🔄 Welcome card background removed. A default style will be used.",
      }, { quoted: msg });
    }

    // ── No argument → show help ───────────────────────────────────────────────
    if (!text) {
      const settings = groupSettings.get(jid);
      const current  = settings?.welcome      || "_(not set — default will be used)_";
      const cardMode = settings?.welcomeCard  ? "✅ ON"  : "❌ OFF";
      const cardBg   = settings?.welcomeCardBg || "_(not set — default style)_";
      return sock.sendMessage(jid, {
        text:
`📝 *SET WELCOME MESSAGE*

*Text message settings:*
  *.setwelcome <your message>* — set custom text
  *.setwelcome reset*          — reset to default text

Variables:
  @user  — new member's number
  @group — group name
  @count — total member count

Paragraph spacing:
  • Send a multi-line message (press Enter between lines)
  • Or type *\\n* where you want a line break

*Welcome card settings (image with member PFP):*
  *.setwelcome card on*        — enable card image mode
  *.setwelcome card off*       — disable card image mode
  *.setwelcome bg <url>*       — set background image for card
  *.setwelcome bg reset*       — remove background image

*Current settings:*
  Card mode : ${cardMode}
  Card bg   : ${cardBg}
  Message   : ${current}

To toggle on/off: *.welcome on* / *.welcome off*`,
      }, { quoted: msg });
    }

    // ── Reset to default ─────────────────────────────────────────────────────
    if (text.toLowerCase() === "reset") {
      const s = groupSettings.get(jid) || {};
      delete s.welcome;
      groupSettings.set(jid, s);
      return sock.sendMessage(jid, {
        text: "🔄 Welcome message reset to default.",
      }, { quoted: msg });
    }

    // ── Save custom text message ─────────────────────────────────────────────
    groupSettings.set(jid, { welcome: text });

    // Build a preview using placeholder values (also process \n escapes)
    const preview = text
      .replace(/@user/g,  "0712345678")
      .replace(/@group/g, "Your Group")
      .replace(/@count/g, "42")
      .replace(/\\n/g, "\n");

    await sock.sendMessage(jid, {
      text:
`✅ *Welcome message saved!*

📝 Template:
${text}

👁 Preview:
${preview}

💡 Want an image card instead? Use *.setwelcome card on*`,
    }, { quoted: msg });
  },
};
