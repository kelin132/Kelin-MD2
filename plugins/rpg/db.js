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

export async function getRpgUser(sender) {
  const col = await Col.rpg();
  const id = normalizeJid(sender);
  let user = await col.findOne({ _id: id });
  
  if (user) {
    user.save = async () => {
      const c = await Col.rpg();
      const { _id, save, ...data } = user;
      await c.updateOne({ _id }, { $set: data });
    };
  }
  
  return user;
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
    createdAt: new Date(),
  };
  
  await col.insertOne(user);
  return await getRpgUser(sender);
}
