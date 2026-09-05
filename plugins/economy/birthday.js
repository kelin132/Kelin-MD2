import { getUser, saveUser, requireRegistration } from "./database.js";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseBirthday(input) {
  const value = String(input || "").trim().replace(/[,/-]+/g, " ").replace(/\s+/g, " ");
  const parts = value.split(" ");
  if (parts.length !== 2) return null;

  let day;
  let month;
  if (/^\d{1,2}$/.test(parts[0])) {
    day = Number(parts[0]);
    month = MONTHS.findIndex((name) => name.toLowerCase().startsWith(parts[1].toLowerCase()));
  } else if (/^\d{1,2}$/.test(parts[1])) {
    day = Number(parts[1]);
    month = MONTHS.findIndex((name) => name.toLowerCase().startsWith(parts[0].toLowerCase()));
  } else {
    return null;
  }

  if (month < 0 || day < 1 || day > new Date(2024, month + 1, 0).getDate()) return null;
  return `${day} ${MONTHS[month]}`;
}

export default {
  name: "birthday",
  aliases: ["bday"],
  category: "economy",
  cooldown: 5,
  description: "Set or view your birthday",
  usage: ".birthday 18 May",

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
    const user = await getUser(sender);

    if (!args.length) {
      return reply(`🎂 *Birthday:* ${user.birthday || "N/A"}\n\nUse *.birthday 18 May* to set it.`);
    }

    const birthday = parseBirthday(args.join(" "));
    if (!birthday) return reply("❌ Use a valid date like *.birthday 18 May*.");

    user.birthday = birthday;
    await saveUser(sender, user);
    return reply(`✅ Birthday set to *${birthday}*!`);
  },
};
