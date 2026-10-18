import { getUser, requireRegistration } from "./database.js";
import { generateProfileImage, getProfilePic, resolveRole } from "../../lib/profileGen.mjs";
import { getLevelRole, getAllEarnedRoles, getLevelRoleLabel } from "../../lib/levelRoles.mjs";
import { getUser as getCardUser } from "../cards/db.js";
import { countTrainerPokemon } from "../../lib/pokemon/pokemonDb.mjs";
import { guildSystem } from "../../lib/guildSystem.js";
import { GYMS } from "../../lib/pokemon/gymData.mjs";
import { getTrainer } from "../../lib/pokemon/players.mjs";
import { buildEconomyExternalAdReply } from "../../lib/economyPreview.mjs";
import { normalizeJid } from "../../lib/identity.mjs";

const xpForLevel = (level) => level * 100;

function withTimeout(promise, timeoutMs, fallback = null) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(fallback), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function sendProfileFallback({ sock, jid, msg, caption, profilePic, target, externalAdReply }) {
  const contextInfo = externalAdReply ? { externalAdReply } : undefined;
  if (profilePic) {
    try {
      await sock.sendMessage(
        jid,
        { image: { url: profilePic }, caption, contextInfo },
        { quoted: msg }
      );
      return;
    } catch (fallbackError) {
      console.error(
        "[profile] Avatar fallback delivery failed:",
        fallbackError.stack || fallbackError.message || fallbackError
      );
    }
  }

  await sock.sendMessage(
    jid,
    { text: caption, mentions: [target], contextInfo },
    { quoted: msg }
  );
}

function fmtDate(iso) {
  if (!iso) return "Unknown";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return "Unknown"; }
}

function gymAchievementSummary(trainer) {
  const badges = Array.isArray(trainer?.badges) ? trainer.badges.map(String) : [];
  const rewards = trainer?.gymRewards && typeof trainer.gymRewards === "object"
    ? Object.keys(trainer.gymRewards)
    : [];
  const earnedIds = new Set(
    [...badges, ...rewards]
      .map((value) => value.trim().toLowerCase().replace
