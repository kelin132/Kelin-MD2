// plugins/naruto/nbattle.js

import players from "../../lib/naruto/players.js";
import battle from "../../lib/naruto/battle.js";

export default {
  name: "nbattle",
  description: "Battle another ninja",
  category: "naruto",
  usage: ".nbattle @user",

  async run({ sock, msg, sender }) {

    try {

      const mentioned =
        msg.message?.extendedTextMessage
          ?.contextInfo
          ?.mentionedJid;


      if (!mentioned || !mentioned[0]) {
        return sock.sendMessage(
          sender,
          {
            text:
`⚔️ Mention a ninja to battle.

Example:
.nbattle @user`
          },
          { quoted: msg }
        );
      }


      const opponent =
        mentioned[0];


      const player =
        await players.get(sender);


      const enemy =
        await players.get(opponent);


      if (!player || !enemy) {
        return sock.sendMessage(
          sender,
          {
            text:
`❌ Both players need a ninja profile.

Use:
.nstart`
          },
          { quoted: msg }
        );
      }


      if (sender === opponent) {
        return sock.sendMessage(
          sender,
          {
            text:
`❌ You cannot fight yourself.`
          },
          { quoted: msg }
        );
      }


      let fight =
        battle.create(
          player,
          enemy
        );


      let log = [];


      // Decide who starts

      let first =
        fight.player.speed >= fight.enemy.speed
          ? "player"
          : "enemy";


      if (first === "player") {

        const hit =
          battle.attack(
            fight.player,
            fight.enemy
          );

        log.push(hit.message);


      } else {

        const hit =
          battle.attack(
            fight.enemy,
            fight.player
          );

        log.push(hit.message);

      }


      // Second turn

      if (
        fight.player.hp > 0 &&
        fight.enemy.hp > 0
      ) {

        const hit =
          battle.attack(
            first === "player"
              ? fight.enemy
              : fight.player,

            first === "player"
              ? fight.player
              : fight.enemy
          );

        log.push(hit.message);
      }


      let winner;


      if (fight.enemy.hp <= 0) {

        winner = player;

        player.wins++;
        player.xp += 100;
        player.ryo += 300;

      }


      if (fight.player.hp <= 0) {

        winner = enemy;

        enemy.wins++;
        enemy.xp += 100;
        enemy