    const enabled = settings.antibot === true;
    const mode = settings.antibotMode || "kick";

    if (!["on", "off", "warn", "kick", "status", "scan"].includes(action)) {
      return sock.sendMessage(jid, {
        text:
`🤖 Anti-Bot

Status: ${enabled ? "✅ ACTIVE" : "❌ INACTIVE"}
Mode: ${mode.toUpperCase()}

Usage:
.antibot on
.antibot kick
.antibot warn
.antibot off
.antibot status
.antibot scan`,
      }, { quoted: msg });
    }

    if (action === "status") {
      return sock.sendMessage(jid, {
        text: `🤖 Anti-Bot Status\n\nStatus: ${enabled ? "✅ ACTIVE" : "❌ INACTIVE"}\nMode: ${mode.toUpperCase()}`,
      }, { quoted: msg });
    }

    if (action === "off") {
      groupSettings.set(jid, { antibot: false });
      return sock.sendMessage(jid, { text: "❌ Anti-Bot disabled." }, { quoted: msg });
    }

    if (["on", "warn", "kick"].includes(action)) {
      groupSettings.set(jid, {
        antibot: true,
        antibotMode: action === "warn" ? "warn" : "kick",
      });
      return sock.sendMessage(jid, {
        text: `✅ Anti-Bot enabled.\n\nMode: ${(action === "warn" ? "warn" : "kick").toUpperCase()}`,
      }, { quoted: msg });
    }

    try {
      const meta = await sock.groupMetadata(jid);
      const botJids = new Set(
        [sock.user?.id, sock.user?.lid, sock.user?.jid]
          .filter(Boolean)
          .map((value) => normalizeJid(value))
      );
      const detected = (meta.participants || []).filter((participant) => {
        const member = participant.id || participant.jid || participant.lid;
        return member &&
          !participant.admin &&
          !botJids.has(normalizeJid(member)) &&
          (participant.isBot === true || participant.bot === true || participant.isBotUser === true);
      });

      if (!detected.length) {
        return sock.sendMessage(jid, {
          text: `✅ No high-confidence bot signatures detected.\n\nScanned ${(meta.participants || []).length} members.`,
        }, { quoted: msg });
      }

      if (mode === "warn") {
        return sock.sendMessage(jid, {
          text: `⚠️ ${detected.length} suspected bot(s) found. Warn mode is active, so nobody was removed.`,
        }, { quoted: msg });
      }

      let removed = 0;
      for (const participant of detected) {
        const member = participant.id || participant.jid || participant.lid;
        try {
          await sock.groupParticipantsUpdate(jid, [member], "remove");
          removed++;
        } catch {}
      }
      return sock.sendMessage(jid, {
        text: `🤖 Removed ${removed}/${detected.length} suspected bot(s).`,
      }, { quoted: msg });
    } catch (err) {
      return sock.sendMessage(jid, { text: `❌ Anti-Bot scan failed: ${err.message}` }, { quoted: msg });
    }
  },
};

function normalizeJid(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const [local = "", server = "s.whatsapp.net"] = raw.split("@");
  const cleanLocal = local.split(":")[0];
  const normalizedServer = (server || "s.whatsapp.net").toLowerCase() === "c.us"
    ? "s.whatsapp.net"
    : (server || "s.whatsapp.net").toLowerCase();
  return `${cleanLocal}@${normalizedServer}`;
}
