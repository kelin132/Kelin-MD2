import {
  previewUserIdentityRecovery,
  restoreUserIdentity,
} from "../../lib/userIdentityRecovery.mjs";

function referencedJid(msg) {
  const context =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo ||
    {};
  return context.mentionedJid?.[0] || context.participant || "";
}

function idLabel(value) {
  return String(value || "").replace(/@s\.whatsapp\.net$/, "@phone");
}

function summary(label, user) {
  if (!user) return `${label}: no record`;
  return [
    `${label}: ${idLabel(user.id)}`,
    `  Name: ${user.name}`,
    `  Registered: ${user.registered ? "yes" : "no"}`,
    `  Money: ${user.money.toLocaleString()}`,
    `  Bank: ${user.bank.toLocaleString()}`,
    `  Vault: ${user.vault.toLocaleString()}`,
    `  Level / XP: ${user.level} / ${user.xp}`,
    `  Inventory entries: ${user.inventoryItems}`,
    `  History entries: ${user.historyEntries}`,
  ].join("\n");
}

function linkedLines(items) {
  return items
    .filter((item) => item.sourceRecords || item.targetRecords)
    .map((item) => {
      const conflict = item.targetRecords > 0 ? " (target already has data; left unchanged)" : "";
      return `  ${item.collection}: ${item.sourceRecords} old, ${item.targetRecords} current${conflict}`;
    });
}

export default {
  name: "restoreuser",
  aliases: ["recoveruser", "restorejid"],
  description: "Recover a user's legacy JID/LID data into their current identity",
  category: "owner",
  usage: ".restoreuser <old_jid> <new_jid> [confirm]",
  isOwner: true,
  cooldown: 10,

  async run({ sock, msg, args }) {
    const chatId = msg.key.remoteJid;
    const confirm = args.at(-1)?.toLowerCase() === "confirm";
    const values = confirm ? args.slice(0, -1) : args;

    const oldId = values[0];
    const newId = values[1] || referencedJid(msg);

    if (!oldId || !newId) {
      return sock.sendMessage(chatId, {
        text: [
          "Usage:",
          "`.restoreuser <old_jid> <new_jid>` — preview the recovery",
          "`.restoreuser <old_jid> <new_jid> confirm` — apply it",
          "",
          "You can replace `<new_jid>` by replying to or mentioning the user.",
          "The old record is kept as a backup; recovery is never automatic.",
        ].join("\n"),
      }, { quoted: msg });
    }

    try {
      const plan = confirm
        ? await restoreUserIdentity(oldId, newId)
        : await previewUserIdentityRecovery(oldId, newId);
      const lines = [
        confirm ? "✅ *User identity recovery complete*" : "🔎 *User identity recovery preview*",
        "",
        summary("Legacy record", plan.legacySummary),
        "",
        summary("Current record", plan.currentSummary),
      ];

      const linked = linkedLines(plan.linkedSummary);
      if (linked.length) lines.push("", "*Linked data*", ...linked);

      if (confirm) {
        lines.push(
          "",
          `Audit record: \`${plan.auditId}\``,
          "The legacy record was kept for rollback and audit purposes.",
        );
      } else {
        lines.push(
          "",
          "Nothing has been changed.",
          `Run \`.restoreuser ${oldId} ${newId} confirm\` after reviewing the values.`,
        );
      }

      return sock.sendMessage(chatId, { text: lines.join("\n") }, { quoted: msg });
    } catch (error) {
      return sock.sendMessage(chatId, {
        text: `❌ Recovery stopped: ${error.message || "unknown error"}`,
      }, { quoted: msg });
    }
  },
};