import { isRegistered, registerUser } from "./database.js";

export default {
  name: "register",
  description: "Register your account to access economy commands",
  category: "economy",
  usage: ".register <your_name>",
  aliases: ["reg", "signup"],
  cooldown: 5,

  async run({ sock, msg, sender, text }) {
    const already = await isRegistered(sender);

    if (already) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "✅ You are already registered!\n\n💡 Use *.profile* to view your account."
      }, { quoted: msg });
    }

    const name = text?.trim() || `User_${sender.split("@")[0].slice(-4)}`;

    if (name.length > 20) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "❌ Name is too long! Max 20 characters."
      }, { quoted: msg });
    }

    await registerUser(sender, name);

  await sock.sendMessage(msg.key.remoteJid, {
  text: `╭━━━『 🌸 AKIRA ECONOMY 🌸 』━━━╮
┃
┃  ✨ *NEW PLAYER REGISTERED* ✨
┃
┃  🎴 Welcome, *${name}*
┃  Your adventure has begun!
┃
┣━━━━━━━━━━━━━━━━━━
┃  🪪 *PLAYER CARD*
┃
┃  👤 Name   : ${name}
┃  💰 Money  : ¥1,000
┃  🏦 Bank   : ¥0
┃  ⭐ Level  : 1
┃  🎖 Rank   : Beginner
┃
┣━━━━━━━━━━━━━━━━━━
┃  ⚔️ *START YOUR JOURNEY*
┃
┃  🌅 *.daily*
┃  └ Claim your daily rewards
┃
┃  🔥 *.work*
┃  └ Earn coins through missions
┃
┃  💳 *.balance*
┃  └ Check your wealth
┃
┃  🛒 *.shop*
┃  └ Buy powerful items
┃
┃  🏯 *.guildhelp*
┃  └ Find your guild
┃
┣━━━━━━━━━━━━━━━━━━
┃
┃  🌟 "Every legend starts with a
┃      single step..."
┃
┃  🍀 Good luck, ${name}!
┃
╰━━━『 ⚡ AKIRA RPG SYSTEM ⚡ 』━━━╯`,
}, { quoted: msg });