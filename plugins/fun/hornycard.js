// plugins/fun/hornycard.js
// .hornycard — Generate a horny card image for a mentioned/replied user

export default {
  name: "hornycard",
  aliases: ["hornylicense"],
  description: "Generate a horny card for a user",
  category: "fun",
  usage: ".hornycard @user  or reply to a message",

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;

    // Resolve target: quoted sender > mentioned > self
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const quoted    = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;

    const who = quotedParticipant || mentioned[0] || sender;

    let avatar;
    try {
      const ppResult = await sock.profilePictureUrl(who, "image");
      avatar = ppResult;
    } catch {
      avatar = "https://telegra.ph/file/24fa902ead26340f3df2c.png";
    }

    const apiUrl = `https://some-random-api.com/canvas/misc/horny?avatar=${encodeURIComponent(avatar)}`;

    try {
      const res = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());

      await sock.sendMessage(jid, {
        image: buf,
        caption: `😈 Horny Card for @${who.split("@")[0]}`,
        mentions: [who],
      }, { quoted: msg });
    } catch (err) {
      await sock.sendMessage(jid, {
        text: `❌ Couldn't generate horny card: ${err.message}`,
      }, { quoted: msg });
    }
  },
};
