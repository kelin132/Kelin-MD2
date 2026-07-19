// lib/naruto/battle.js

import { calculateDamage, chance, random } from "./utils.js";
import jutsuList from "./jutsu.js";

class Battle {

  create(player, enemy) {
    return {
      player: {
        name: player.username,
        hp: player.hp,
        maxHp: player.maxHp,
        chakra: player.chakra,
        attack: player.attack,
        defense: player.defense,
        speed: player.speed,
        jutsu: player.jutsu
      },

      enemy: {
        name: enemy.name,
        hp: enemy.hp,
        maxHp: enemy.hp,
        chakra: enemy.chakra,
        attack: enemy.attack,
        defense: enemy.defense,
        speed: enemy.speed,
        jutsu: enemy.jutsu || []
      },

      turn: "player",
      log: []
    };
  }


  attack(attacker, defender) {
    const damage = calculateDamage(
      attacker,
      defender,
      null
    );

    defender.hp -= damage;

    return {
      damage,
      message:
        `${attacker.name} attacked and dealt ${damage} damage!`
    };
  }


  useJutsu(attacker, defender, jutsuId) {

    const jutsu = jutsuList.find(
      j => j.id === jutsuId
    );

    if (!jutsu) {
      return {
        error: "Jutsu not found"
      };
    }


    if (attacker.chakra < jutsu.chakra) {
      return {
        error: "Not enough chakra!"
      };
    }


    attacker.chakra -= jutsu.chakra;


    let damage = calculateDamage(
      attacker,
      defender,
      jutsu
    );


    defender.hp -= damage;


    return {
      damage,
      jutsu,
      message:
      `${attacker.name} used ${jutsu.name} and dealt ${damage} damage!`
    };
  }


  enemyTurn(player, enemy) {

    let result;

    // 30% chance enemy uses special attack
    if (enemy.jutsu.length && chance(30)) {

      const skill = random(enemy.jutsu);

      result = this.useJutsu(
        enemy,
        player,
        skill
      );

    } else {

      result = this.attack(
        enemy,
        player
      );

    }

    return result;
  }


  isFinished(battle) {

    return (
      battle.player.hp <= 0 ||
      battle.enemy.hp <= 0
    );

  }


  winner(battle) {

    if (battle.player.hp <= 0) {
      return "enemy";
    }

    if (battle.enemy.hp <= 0) {
      return "player";
    }

    return null;
  }

}


export default new Battle();