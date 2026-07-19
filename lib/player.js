// lib/naruto/players.js

import NarutoPlayer from "../../database/models/NarutoPlayer.js";

class Players {
  async get(jid) {
    return await NarutoPlayer.findOne({ jid });
  }

  async create(data) {
    return await NarutoPlayer.create(data);
  }

  async exists(jid) {
    return !!(await NarutoPlayer.findOne({ jid }));
  }

  async update(jid, update) {
    return await NarutoPlayer.findOneAndUpdate(
      { jid },
      update,
      { new: true }
    );
  }

  async delete(jid) {
    return await NarutoPlayer.deleteOne({ jid });
  }

  async addXP(jid, amount) {
    const player = await this.get(jid);
    if (!player) return null;

    player.xp += amount;

    while (player.xp >= player.xpNeeded) {
      player.xp -= player.xpNeeded;
      player.level++;
      player.xpNeeded = Math.floor(player.xpNeeded * 1.25);

      player.maxHp += 20;
      player.maxChakra += 15;
      player.attack += 3;
      player.defense += 2;
      player.speed += 2;

      player.hp = player.maxHp;
      player.chakra = player.maxChakra;
    }

    await player.save();
    return player;
  }

  async addRyo(jid, amount) {
    return await this.update(jid, {
      $inc: { ryo: amount }
    });
  }

  async heal(jid) {
    const player = await this.get(jid);
    if (!player) return null;

    player.hp = player.maxHp;
    player.chakra = player.maxChakra;

    await player.save();
    return player;
  }

  async addItem(jid, item) {
    return await this.update(jid, {
      $push: { inventory: item }
    });
  }

  async learnJutsu(jid, jutsu) {
    return await this.update(jid, {
      $addToSet: { jutsu }
    });
  }
}

export default new Players();