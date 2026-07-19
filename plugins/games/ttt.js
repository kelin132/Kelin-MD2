// plugins/games/ttt.js

import { games, TicTacToe } from "../../lib/tictactoe.js";

export default {
    name: "ttt",
    description: "Challenge someone to Tic Tac Toe",
    category: "games",
    usage: ".ttt @user",
    aliases: ["tictactoe"],
    cooldown: 5,
    isOwner: false,
    isAdmin: false,
    isPremium: false,
    version: "1.0.0",

    async run({ sock, msg }) {

        const jid = msg.key.remoteJid;

        if (!jid.endsWith("@g.us")) {
            return sock.sendMessage(jid, {
                text: "❌ This command only works in groups."
            });
        }

        if (games.has(jid)) {
            return sock.sendMessage(jid, {
                text: "🎮 A Tic Tac Toe game is already running in this group."
            });
        }

        const mentioned =
            msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

        if (!mentioned.length) {
            return sock.sendMessage(jid, {
                text: "Usage:\n.ttt @user"
            });
        }

        const challenger = msg.key.participant || msg.key.remoteJid;
        const opponent = mentioned[0];

        if (challenger === opponent) {
            return sock.sendMessage(jid, {
                text: "❌ You cannot play against yourself."
            });
        }

        const game = new TicTacToe(
            challenger,
            opponent,
            jid
        );

        games.set(jid, game);

        await sock.sendMessage(jid, {
            text:
`🎮 *Tic Tac Toe Started!*

❌ @${challenger.split("@")[0]}
⭕ @${opponent.split("@")[0]}

${game.render()}

🎯 Turn:
@${challenger.split("@")[0]}

Reply with a number (1-9) to make your move.`,
            mentions: [challenger, opponent]
        });

    }
};