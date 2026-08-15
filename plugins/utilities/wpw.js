import {
  setWebsitePassword,
  WEBSITE_PASSWORD_MAX_LENGTH,
  WEBSITE_PASSWORD_MIN_LENGTH,
} from "../../lib/websiteAuth.mjs";

function scheduleSensitiveMessageDeletion(sock, msg) {
  setTimeout(() => {
    sock.sendMessage(msg.key.remoteJid, { delete: msg.key }).catch(() => {
      // WhatsApp may reject deletion after delivery; never expose the password in an error.
    });
  }, 1000);
}

export default {
  name: "wpw",
  description: "Set or change your AIDORU website password",
  category: "utilities",
  usage: ".wpw <password>",
  cooldown: 15,

  async run({ sock, msg, sender, args }) {
    const chatId = msg.key.remoteJid;
    if (chatId?.endsWith("@g.us")) {
      return sock.sendMessage(chatId, {
        text: "🔒 Set your website password in a private chat with the bot so nobody else can see it.",
      }, { quoted: msg });
    }

    // Delete the command message even when validation or hashing fails, because it may contain
    // a password. The deletion is intentionally best-effort because WhatsApp controls delivery.
    scheduleSensitiveMessageDeletion(sock, msg);

    const password = args.join(" ").trim();
    if (!password) {
      return sock.sendMessage(chatId, {
        text: `Use *.wpw <password>* with ${WEBSITE_PASSWORD_MIN_LENGTH}-${WEBSITE_PASSWORD_MAX_LENGTH} characters.`,
      }, { quoted: msg });
    }

    try {
      await setWebsitePassword(sender, password);
      await sock.sendMessage(chatId, {
        text: [
          "✅ *AIDORU website password saved.*",
          "",
          "Use *.id* to get your AIDORU ID, then sign in on the website with that ID and password.",
          "",
          "Never share your password with anyone.",
        ].join("\n"),
      }, { quoted: msg });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save your website password.";
      await sock.sendMessage(chatId, { text: `❌ ${message}` }, { quoted: msg });
    }
  },
};
