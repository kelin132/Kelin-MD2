import { getUser, saveUser, requireRegistration } from "./database.js";

export default {
  name: "edit",
  aliases: ["editprofile", "ep"],
  category: "economy",
  description: "Edit your profile fields (bio, age, name)",
  usage: ".edit bio <text>  |  .edit age <number>  |  .edit name <text>",

  async run({ sock, msg, sender, args }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const jid   = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

    if (!args[0]) {
      const user = await getUser(sender);
      return reply(
`📝 *EDIT PROFILE*

👤 Name : ${user.name || "Not set"}
📖 Bio  : ${user.bio  || "Not set"}
🎂 Age  : ${user.age  ?? "Not set"}

*Usage:*
.edit name <new name>
.edit bio <your bio>
.edit age <your age>`
      );
    }

    const field = args[0].toLowerCase();
    const value = args.slice(1).join(" ").trim();

    if (!value) return reply(`❌ Provide a value for *${field}*.`);

    const user = await getUser(sender);

    if (field === "bio") {
      if (value.length > 120) return reply("❌ Bio must be 120 characters or less.");
      user.bio = value;
      await saveUser(sender, user);
      return reply(`✅ Bio updated!\n\n📖 "${value}"`);
    }

    if (field === "age") {
      const age = parseInt(value);
      if (isNaN(age) || age < 1 || age > 120) return reply("❌ Enter a valid age between 1 and 120.");
      user.age = age;
      await saveUser(sender, user);
      return reply(`✅ Age updated to *${age}*!`);
    }

    if (field === "name") {
      if (value.length < 2 || value.length > 24) return reply("❌ Name must be 2–24 characters.");
      user.name = value;
      await saveUser(sender, user);
      return reply(`✅ Name updated to *${value}*!`);
    }

    return reply("❌ Unknown field.\n\nEditable fields: *bio*, *age*, *name*");
  },
};
