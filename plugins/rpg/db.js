import { getDb } from "../../lib/mongo.mjs";
import { normalizeJid } from "../../lib/identity.mjs";

export const CLASSES = {
  warrior: { name: "Warrior", hp: 150, atk: 15, def: 10, speed: 5, emoji: "⚔️" },
  mage:    { name: "Mage",    hp: 100, atk: 25, def: 5,  speed: 8, emoji: "🧙" },
  rogue:   { name: "Rogue",   hp: 120, atk: 20, def: 8,  speed: 12, emoji: "🗡️" },
};

export const Col = {
  rpg: async () => (await getDb()).collection("rpg_users"),
};

function attachSave(user) {
  if (!user) return null;
  user.save = async () => saveRpgUser(user._id, user);
  return user;
}

export function ensureRpgDefaults(user) {
  if (!user) return null;
  user.inventory = Array.isArray(user.inventory) ? user.inventory : [];
  user.equipment = {
    weapon: user.equipment?.weapon || null,
    armor: user.equipment?.armor || null,
  };
  user.gold = Number(user.gold) || 0;
  user.xp = Number(user.xp) || 0;
  user.level = Math.max(1, Number(user.level) || 1);
  user.maxHp = Math.max(1, Number(user.maxHp) || 1);
  user.hp = Math.max(0, Number(user.hp) || user.maxHp);
  user.lastHunt = Number(user.lastHunt) || 0;
  user.lastDungeon = Number(user.lastDungeon) || 0;
  return user;
}

export async function getRpgUser(sender) {
  const col = await Col.rpg();
  const id = normalizeJid(sender);
  let user = await col.findOne({ _id: id });

  return attachSave(ensureRpgDefaults(user));
}

export async function createRpgUser(sender, className, username) {
  const col = await Col.rpg();
  const id = normalizeJid(sender);
  const charClass = CLASSES[className.toLowerCase()] || CLASSES.warrior;
  
  const user = {
    _id: id,
    username: username || "Hero",
    class: charClass.name,
    level: 1,
    xp: 0,
    hp: charClass.hp,
    maxHp: charClass.hp,
    atk: charClass.atk,
    def: charClass.def,
    speed: charClass.speed,
    gold: 100,
    inventory: [],
    equipment: {
      weapon: null,
      armor: null,
    },
    lastHunt: 0,
    lastDungeon: 0,
    lastDaily: 0,
    dailyStreak: 0,
    activeQuest: null,
    lastQuest: 0,
    registered: true,
    createdAt: new Date(),
  };
  
  await col.updateOne({ _id: id }, { $set: user }, { upsert: true });
  return await getRpgUser(sender);
}

export async function saveRpgUser(sender, data) {
  const col = await Col.rpg();
  const id = normalizeJid(sender);
  const { _id, save, ...safeData } = data;
  await col.updateOne({ _id: id }, { $set: safeData }, { upsert: true });
}

export function addInventoryItem(user, itemId) {
  ensureRpgDefaults(user);
  user.inventory.push(itemId);
}

export function removeInventoryItem(user, itemId) {
  ensureRpgDefaults(user);
  const index = user.inventory.indexOf(itemId);
  if (index === -1) return false;
  user.inventory.splice(index, 1);
  return true;
}

export function countInventoryItem(user, itemId) {
  ensureRpgDefaults(user);
  return user.inventory.filter((entry) => entry === itemId).length;
}

export function advanceQuest(user, type, amount = 1) {
  if (!user?.activeQuest || user.activeQuest.type !== type) return false;
  user.activeQuest.progress = Math.min(
    Number(user.activeQuest.goal) || 0,
    (Number(user.activeQuest.progress) || 0) + Math.max(0, Number(amount) || 0),
  );
  return true;
}

export function addXp(user, amount) {
  ensureRpgDefaults(user);
  let remaining = Math.max(0, Number(amount) || 0);
  let levels = 0;
  while (remaining > 0) {
    const needed = Math.max(100, user.level * 100);
    const missing = needed - user.xp;
    if (remaining < missing) {
      user.xp += remaining;
      break;
    }
    remaining -= Math.max(1, missing);
    user.xp = 0;
    user.level += 1;
    user.maxHp += 20;
    user.hp = user.maxHp;
    user.atk += 5;
    user.def += 3;
    levels += 1;
  }
  return levels;
}
