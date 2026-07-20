// plugins/pets/release.js
// .release <petId> — Release a pet (cannot be undone)
import { getAllPets, getActivePet, releasePet, setActivePet } from "../../lib/petDatabase.js";
import { RARITIES } from "../../lib/petData.js";

// Pending confirmation map: sender → { petId, petName, expiresAt }
const pending = new Map();

export default {
  name: "release",
  description: "Release a pet (permanent)",
  category: "pets",
  usage: ".release <petId|confirm|cancel>",
  aliases: ["releasepet", "freepet"],
  checkJail: true,

  async run({ sock, msg, args }) {
    const jid    = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const sub = (args[0] || "").toLowerCase();

    // ── Confirm ─────────────────────────────────────────────────────────────
    if (sub === "confirm") {
      const data = pending.get(sender);
      if (!data || Date.now() > data.expiresAt) {
        pending.delete(sender);
        return sock.sendMessage(jid, { text: `❌ No pending release. Use *.release <petId>* first.` }, { quoted: msg });
      }

      await releasePet(sender, data.petId);
      pending.delete(sender);

      // If released pet was active, set another as active
      const remaining = await getAllPets(sender);
      if (remaining.length > 0 && data.wasActive) {
        await setActivePet(sender, remaining[0].petId);
      }

      return sock.sendMessage(jid, {
        text: `💔 *${data.petName}* has been released...\n\nThey'll always be in your heart. 🌟`,
      }, { quoted: msg });
    }

    // ── Cancel ──────────────────────────────────────────────────────────────
    if (sub === "cancel") {
      pending.delete(sender);
      return sock.sendMessage(jid, { text: `✅ Release cancelled. Your pet is safe!` }, { quoted: msg });
    }

    // ── Initiate release ────────────────────────────────────────────────────
    const petIdInput = args[0];
    if (!petIdInput) {
      const all = await getAllPets(sender);
      if (!all.length) {
        return sock.sendMessage(jid, { text: `🐾 You have no pets to release.` }, { quoted: msg });
      }
      const list = all.map(p => {
        const r = RARITIES[p.rarity] || RARITIES.common;
        return `${r.color} *${p.name}* (Lv.${p.level}) — ID: \`${p.petId.slice(0, 8)}\``;
      }).join("\n");
      return sock.sendMessage(jid, {
        text: `💔 Usage: *.release <petId>*\n\nYour pets:\n${list}`,
      }, { quoted: msg });
    }

    const all   = await getAllPets(sender);
    const found = all.find(p => p.petId === petIdInput || p.petId.startsWith(petIdInput));

    if (!found) {
      return sock.sendMessage(jid, { text: `❌ No pet found with that ID.\n\nUse *.pets* to see your pet IDs.` }, { quoted: msg });
    }

    // Warn for high rarity pets
    const rarity = RARITIES[found.rarity] || RARITIES.common;
    const warn   = ["epic", "legendary", "mythic"].includes(found.rarity)
      ? `\n\n⚠️ *${rarity.label}* pets are very rare! Are you sure?`
      : "";

    pending.set(sender, {
      petId:     found.petId,
      petName:   found.name,
      wasActive: found.isActive,
      expiresAt: Date.now() + 30_000,
    });

    return sock.sendMessage(jid, {
      text: [
        `💔 Release *${found.name}* (${rarity.label}, Lv.${found.level})?`,
        ``,
        `This *cannot be undone!*${warn}`,
        ``,
        `✅ *.release confirm* — Yes, release`,
        `❌ *.release cancel*  — Keep my pet`,
        ``,
        `⏳ You have 30 seconds to decide.`,
      ].join("\n"),
    }, { quoted: msg });
  },
};
