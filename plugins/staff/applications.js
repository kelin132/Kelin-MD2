/**
 * .applications
 * Review moderator and staff applications submitted through the AIDORU website.
 *
 * Usage:
 *   .applications             — list pending applications
 *   .applications 1           — show the first recent application
 *   .applications <id>        — show a specific application
 */
import { getDb } from "../../lib/mongo.mjs";

const COLLECTION = "moderator_applications";
const ACTIVE_STATUSES = ["pending", "reviewed"];
const ROLE_LABELS = { mod: "Moderator", staff: "Staff" };
const KNOWLEDGE_LABELS = {
  new: "New",
  basic: "Basic",
  confident: "Confident",
  expert: "Expert",
};

function formatDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : "Unknown";
}

function shortId(value) {
  return String(value || "").slice(0, 8);
}

async function getRecentApplications() {
  return getDb()
    .collection(COLLECTION)
    .find({ status: { $in: ACTIVE_STATUSES } })
    .sort({ submittedAt: -1 })
    .limit(10)
    .toArray();
}

export default {
  name: "applications",
  description: "Review moderator and staff applications",
  category: "staff",
  usage: ".applications [number|application-id]",
  aliases: ["application", "apps", "modapps", "applied"],
  isMod: true,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const requested = args[0]?.trim();
    const recent = await getRecentApplications();

    if (!requested) {
      if (!recent.length) {
        return sock.sendMessage(jid, {
          text: "📋 *Applications*\n\nNo pending applications found.",
        }, { quoted: msg });
      }

      const rows = recent.map((application, index) => [
        `╭─❖ *${index + 1}. ${application.name || "Unknown"}*`,
        `│ ID: \`${shortId(application._id)}\``,
        `│ Role: ${ROLE_LABELS[application.requestedRole] || application.requestedRole || "Unknown"}`,
        `│ Phone: ${application.phoneNumber || "Unknown"}`,
        `│ Submitted: ${formatDate(application.submittedAt)}`,
        "╰──────────────",
      ].join("\n"));

      return sock.sendMessage(jid, {
        text:
          `╭━━━〔 📝 *APPLICATIONS* 〕━━━╮\n` +
          `│ Pending/reviewed: *${recent.length}*\n` +
          `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n` +
          `${rows.join("\n\n")}\n\n` +
          "Use `.applications 1` or `.applications <id>` for full details.",
      }, { quoted: msg });
    }

    let application;
    if (/^\d+$/.test(requested)) {
      application = recent[Number(requested) - 1];
    } else {
      application = await getDb().collection(COLLECTION).findOne({ _id: requested });
    }

    if (!application) {
      return sock.sendMessage(jid, {
        text: "❌ Application not found. Run `.applications` to see the current list.",
      }, { quoted: msg });
    }

    const role = ROLE_LABELS[application.requestedRole] || application.requestedRole || "Unknown";
    const knowledge = KNOWLEDGE_LABELS[application.botKnowledge] || application.botKnowledge || "Unknown";
    const status = application.status || "pending";

    return sock.sendMessage(jid, {
      text: [
        `╭━━━〔 📝 *APPLICATION DETAILS* 〕━━━╮`,
        `│ ID: \`${application._id}\``,
        `│ Status: *${status.toUpperCase()}*`,
        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
        "",
        `👤 Name: ${application.name || "Unknown"}`,
        `📱 Phone: ${application.phoneNumber || "Unknown"}`,
        `🛡️ Requested role: ${role}`,
        `🤖 Bot knowledge: ${knowledge}`,
        `⚧ Gender: ${application.gender || "Unknown"}`,
        `🕒 Submitted: ${formatDate(application.submittedAt)}`,
        "",
        "💬 Reason:",
        application.reason || "No reason provided.",
      ].join("\n"),
    }, { quoted: msg });
  },
};