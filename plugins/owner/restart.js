/**
 * KELIN MD — .restart
 * Sends a confirmation message then reconnects WhatsApp in-process.
 * This keeps panel hosts running instead of terminating the application.
 */

import { restartConnection } from "../../lib/bot.mjs";

export default {
  name: "restart",
  aliases: ["reboot", "rs"],
  description: "Restart the WhatsApp connection without stopping the panel (owner only)",
  category: "owner",
  usage: ".restart",
  isStaff: true,

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;

    await sock.sendMessage(jid, {
      text:
`╭━━━〔 🔄 *RESTARTING BOT* 〕━━━╮
│
│  ⚡ Bot is restarting…
│  Please wait a few seconds.
│
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
    }, { quoted: msg });

    // Small delay so the message is delivered before the socket reconnects
    await new Promise(r => setTimeout(r, 2000));

    restartConnection();
  },
};
