import {
  previewAllUserIdentityRecoveries,
  previewUserIdentityRecovery,
  restoreAllUserIdentities,
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

function batchLines(candidates, { limit = 20 } = {}) {
  const lines = candidates.slice(0, limit).map((item) =>
    `  ${idLabel(item.sourceId)} → ${idLabel(item.targetId)}`
  );
  if (candidates.length > limit) {
    lines.push(`  … and ${candidates.length - limit} more`);
  }
  return lines;
}

export default {
  name: "restoreuser",
  aliases: ["recoveruser", "restorejid", "restoruser"],
  description: "Recover one user or every legacy user identity",
  category: "owner",
  usage: ".restoreuser <old_jid> <new_jid> [confirm] | .restoreuser all [confirm]",
  isOwner: true,
  cooldown: 10,

  async run({ sock, msg, args }) {
    const chatId = msg.key.remoteJid;
    const confirm = args.at(-1)?.toLowerCase() === "confirm";
    const values = confirm ? args.slice(0, -1) : args;

    if (values[0]?.toLowerCase() === "all") {
      try {
        const result = confirm
          ? await restoreAllUserIdentities()
          : await previewAllUserIdentityRecoveries();

        if (!result.total) {
          return sock.sendMessage(chatId, {
            text: [
              confirm ? "✅ *Batch user recovery finished*" : "🔎 *Batch user recovery preview*",
              "",
              "No legacy phone/device user records were found.",
              "LID-only records are skipped because they need WhatsApp runtime mapping.",
            ].join("\n"),
          }, { quoted: msg });
        }

        const lines = [
          confirm ? "✅ *Batch user identity recovery complete*" : "🔎 *Batch user identity recovery preview*",
          "",
          `Legacy records found: ${result.total}`,
        ];

        if (confirm) {
          lines.push(
            `Restored: ${result.restoredCount}`,
            `Failed: ${result.failedCount}`,
          );
          if (result.failedCount) {
            lines.push(
              "",
              "*Failures*",
              ...result.failed.map((item) =>
                `  ${idLabel(item.sourceId)} → ${idLabel(item.targetId)}: ${item.error}`
              ).slice(0, 20),
            );
          }
          lines.push(
            "",
            "Legacy records were kept as backups. Each successful recovery has its own audit record.",
          );
        } else {
          lines.push(
            "",
            "*Mappings to be recovered*",
            ...batchLines(result.candidates),
            "",
            "Nothing has been changed.",
            "Run `.restoreuser all confirm` to restore every listed legacy identity.",
          );
        }

        return sock.sendMessage(chatId, { text: lines.join("\n") }, { quoted: msg });
      } catch (error) {
        return sock.sendMessage(chatId, {
          text: `❌ Batch recovery stopped: ${error.message || "unknown error"}`,
        }, { quoted: msg });
      }
    }

    const oldId = values[0];
    const newId = values[1] || referencedJid(msg);

    if (!oldId || !newId) {
      return sock.sendMessage(chatId, {
        text: [
          "Usage:",
          "`.restoreuser <old_jid> <new_jid>` — preview the recovery",
          "`.restoreuser <old_jid> <new_jid> confirm` — apply it",
          "`.restoreuser all` — preview every legacy user recovery",
          "`.restoreuser all confirm` — apply every legacy user recovery",
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