/**
 * KELIN MD — Truth or Dare game engine
 * Shared game state + question bank + text handler
 */

// ── In-memory game state ─────────────────────────────────────────────────────
export const truthDareGames = {};

// ── Question banks ───────────────────────────────────────────────────────────
const truths = [
  "What's the most embarrassing thing you've ever texted the wrong person?",
  "Have you ever lied about your age?",
  "What's the weirdest dream you've ever had?",
  "Have you ever stalked someone's profile for more than 30 minutes?",
  "What's the longest you've gone without showering?",
  "Who was your first crush?",
  "Have you ever had a secret crush on a friend?",
  "What's your biggest fear?",
  "Have you ever cheated on a test?",
  "What's a secret you've never told your parents?",
  "Have you ever pretended to be sick to skip school or work?",
  "What's the biggest lie you've ever told?",
  "Who in this chat would you trust with your biggest secret?",
  "Have you ever cried over someone?",
  "What's your most awkward date story?",
  "What's your guilty pleasure?",
  "Have you ever been caught lying?",
  "Who do you miss the most right now?",
  "What's something you're glad your parents don't know?",
  "Have you ever had a fake account?",
  "Have you ever fallen asleep in class?",
  "What's the dumbest thing you've spent money on?",
  "Have you ever stolen something?",
  "What's your worst habit?",
  "Who was the last person you stalked online?",
  "Have you ever been rejected?",
  "What's the most childish thing you still do?",
  "Have you ever had a paranormal experience?",
  "What's your biggest insecurity?",
  "What's your biggest regret?",
  "Have you ever broken someone's heart?",
  "Has someone ever broken yours?",
  "What's something you've never admitted to anyone?",
  "What's your most embarrassing childhood memory?",
  "What's the meanest thing you've ever said to someone?",
  "Have you ever ghosted someone?",
  "What's something illegal you've done?",
  "Have you ever snooped through someone's phone?",
  "Have you ever blamed someone else for something you did?",
  "What's your biggest turn-off?",
  "What's your biggest turn-on?",
  "Who in this chat do you think is the funniest?",
  "Who in this chat do you think is the most attractive?",
  "Have you ever had a crush on a teacher?",
  "Have you ever liked your best friend's partner?",
  "What's the worst gift you've ever received?",
  "What's the weirdest food you've eaten?",
  "What's the strangest rumor you've heard about yourself?",
  "Have you ever cried during a movie?",
  "What's your biggest pet peeve?",
  "What's the most embarrassing thing your parents have caught you doing?",
  "What's something you're addicted to?",
  "Have you ever skipped class?",
  "What's the longest you've stayed awake?",
  "What's the worst trouble you've ever gotten into?",
  "Have you ever lied to your best friend?",
  "What's one thing you'd change about yourself?",
  "What's your biggest weakness?",
  "What's your biggest strength?",
  "Have you ever accidentally broken something expensive?",
  "What's your biggest flex?",
  "What's the worst haircut you've ever had?",
  "What's your most irrational fear?",
  "Who do you secretly admire?",
  "What's something you wish you were better at?",
  "Have you ever laughed at the wrong moment?",
  "What's your most embarrassing nickname?",
  "What's something you've done that you're proud of?",
  "What's your favorite memory?",
  "What's the weirdest thing you've searched online?",
  "What's the most embarrassing photo of you?",
  "What's the last thing that made you cry?",
  "Have you ever been friend-zoned?",
  "Have you ever put someone in the friend zone?",
  "What's your biggest red flag?",
  "Have you ever had a one-sided crush?",
  "What's your biggest green flag?",
  "Who was the last person you apologized to?",
  "Have you ever pretended to like a gift?",
  "What's the funniest lie you've ever believed?",
  "What's your biggest life goal?",
  "What's your worst cooking disaster?",
  "Have you ever sent a risky message and regretted it?",
  "What's the most embarrassing thing you've done in public?",
  "Have you ever had feelings for two people at once?",
  "What's your dream vacation?",
  "What's your most used emoji?",
  "What's your most embarrassing autocorrect fail?",
  "Have you ever been caught talking to yourself?",
  "What's your biggest achievement so far?",
  "If you had to marry someone in this chat, who would it be?",
  "If you could erase one memory, what would it be?",
  "What's one thing you wish you could tell your younger self?",
  "What's the funniest prank you've ever pulled?",
  "Have you ever accidentally called a teacher 'Mom' or 'Dad'?",
  "What's your worst fashion mistake?",
  "What's your most embarrassing social media post?",
  "Have you ever had a secret relationship?",
  "What's one thing you wish people knew about you?",
  "What's the last lie you told?",
  "Who do you think knows you best?",
  "If you could switch lives with anyone for a day, who would it be?",
  "What's one thing you can never forgive?",
  "What's your biggest motivation in life?",
  "What's something you've always wanted to try but never have?",
  "What's your most awkward family moment?",
  "Have you ever laughed so hard you cried?",
  "What's your weirdest talent?",
  "What's one thing you're secretly proud of?",
  "What's the most random compliment you've ever received?",
  "If today was your last day, who would you message first?",
];

const dares = [
  "Send a voice note singing your favorite song.",
  "Change your profile picture to a potato for 10 minutes.",
  "Send a 👍 emoji to the last 5 people you chatted with.",
  "Text 'I appreciate you!' to someone you haven't talked to in a while.",
  "Send a message using only emojis.",
  "Talk in all caps for the next 5 messages.",
  "Type with your eyes closed and don't correct mistakes.",
  "Reply to the next message with only 'Interesting.'",
  "Send a selfie making the funniest face you can.",
  "Change your WhatsApp bio to 'Professional banana inspector' for 10 minutes.",
  "Record yourself saying the alphabet backwards (or try).",
  "Send your favorite meme to the group.",
  "Compliment everyone in the group with one word.",
  "Use only GIFs for the next 5 minutes.",
  "Talk like a pirate for the next 10 messages.",
  "Pretend you're a robot in your next 5 replies.",
  "Send the oldest photo in your gallery.",
  "Send the newest photo in your gallery.",
  "Change your display name to 'Chicken Nugget' for 10 minutes.",
  "Describe yourself using only three emojis.",
  "Try to make everyone laugh with one message.",
  "Send a random fun fact.",
  "Write a four-line poem about pizza.",
  "Speak in rhymes for the next 5 messages.",
  "Message your best friend 'Guess what?' and don't reply for 5 minutes.",
  "Send a voice note laughing for 10 seconds.",
  "Write a short rap about yourself.",
  "Use only questions for your next 5 messages.",
  "Describe your day using movie titles.",
  "Spell your name backwards.",
  "Tell a terrible dad joke.",
  "Say something nice about the person who sent the last message.",
  "Send your favorite emoji 20 times.",
  "Use the word 'banana' in every sentence for 5 messages.",
  "Pretend to be a news reporter for your next message.",
  "Invent a new word and define it.",
  "Act like you're famous for the next 5 messages.",
  "Describe your favorite food without naming it.",
  "Send a picture of your shoes.",
  "Send a random picture from your camera roll.",
  "Type your next message with one hand.",
  "Talk like a baby for the next 5 messages.",
  "Write a compliment that rhymes.",
  "Name 10 countries in 20 seconds (honor system).",
  "Send a voice note in your best movie trailer voice.",
  "Make up a superhero name for yourself.",
  "Describe the person above you using only emojis.",
  "Change your status to 'Powered by Wi-Fi' for 10 minutes.",
  "Pretend you're an alien visiting Earth.",
  "Tell the group your favorite snack dramatically.",
  "Send the last screenshot you took.",
  "Balance a book on your head for 30 seconds.",
  "Do 10 jumping jacks and tell us how it went.",
  "Touch your toes for 30 seconds.",
  "Spin around 10 times before sending your next message.",
  "Sing 'Happy Birthday' in a voice note.",
  "Talk without using the letter 'E' for your next 3 messages.",
  "Write a slogan for toothpaste.",
  "Say the first word that comes to your mind.",
  "Describe your dream house in one sentence.",
  "Pretend you're the group's motivational speaker.",
  "Use an accent for your next voice note.",
  "Create a nickname for everyone in the group.",
  "Tell everyone your favorite movie quote.",
  "Write a sentence where every word starts with the same letter.",
  "Say 'I'm awesome' five times in a voice note.",
  "Draw a smiley face and send a picture of it.",
  "Send a picture of something blue near you.",
  "Post a random animal emoji every minute for 5 minutes.",
  "Write a fake advertisement for water.",
  "Describe your phone without saying its color.",
  "Use only one-word answers for 5 minutes.",
  "Pretend you're a teacher grading this group.",
  "Create a new holiday and explain it.",
  "Write a haiku about your day.",
  "Name five things that make you smile.",
  "Say something kind to the oldest person in the chat.",
  "Message someone 'Have an amazing day!'",
  "Pretend you're a detective solving a mystery.",
  "Write a fake weather forecast for tomorrow.",
  "Describe yourself like you're a video game character.",
  "Write a pickup line using fruit.",
  "Say the alphabet as fast as you can in a voice note.",
  "Use only animal sounds for your next 3 messages.",
  "Send your favorite quote.",
  "Tell everyone your favorite hobby.",
  "Write a movie title about your life.",
  "Describe your pet (or dream pet) dramatically.",
  "Pretend you're invisible for your next 5 messages.",
  "Tell the group your favorite dessert.",
  "Create a superhero catchphrase.",
  "Use only emojis to describe your mood.",
  "Tell everyone one random fact about yourself.",
  "Make up a tongue twister.",
  "Write a one-sentence horror story.",
  "Write a one-sentence comedy story.",
  "Pretend you're hosting an award show.",
  "Give yourself a funny title.",
  "Write the chorus of an imaginary song.",
  "Describe your room using only adjectives.",
  "Tell everyone what superpower you'd want.",
  "Send a voice note saying 'I accept the challenge!' dramatically.",
  "Pretend you're an AI trying to understand humans.",
  "Write a compliment to the entire group.",
  "Say your favorite food in the most dramatic way possible.",
  "End every message with 😎 for the next 10 minutes.",
  "Send a random positive affirmation.",
  "Describe your dream vacation using only emojis.",
];

export function getQuestion(type) {
  const pool = type === "truth" ? truths : dares;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Text handler (non-prefixed in-game messages) ─────────────────────────────
export async function handleTodText(sock, msg) {
  try {
    const chat   = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const body =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      "";

    const message = body.toLowerCase().trim();
    if (!message) return;

    const game = Object.values(truthDareGames).find(
      (g) => g.chat === chat && g.status !== "ENDED"
    );
    if (!game) return;

    const send = (text, opts = {}) =>
      sock.sendMessage(chat, { text, ...opts }, { quoted: msg });

    // ── join ─────────────────────────────────────────────────────────────────
    if (message === "join" && game.status === "WAITING") {
      if (game.players.includes(sender)) {
        return await send("✅ *Already joined!*");
      }
      if (game.players.length >= 10) {
        return await send("❌ *Game full!* (10 max)");
      }

      game.players.push(sender);
      game.scores[sender] = 0;

      const playerList = game.players
        .map((p, i) => `${i + 1}. @${p.split("@")[0]}`)
        .join("\n");

      return await send(
        `✅ *@${sender.split("@")[0]} joined!*\n\n👥 *Players (${game.players.length}/10):*\n${playerList}`,
        { mentions: game.players }
      );
    }

    // ── start ────────────────────────────────────────────────────────────────
    if (message === "start" && game.status === "WAITING") {
      if (game.players.length < 2) {
        return await send(`❌ *Need 2+ players!*\n\nCurrent: ${game.players.length}`);
      }

      game.status = "PLAYING";
      game.round  = 1;

      const randomIndex = Math.floor(Math.random() * game.players.length);
      game.currentPlayerIndex = randomIndex;
      const firstPlayer = game.players[randomIndex];

      const playerList = game.players
        .map((p, i) => `${i + 1}. @${p.split("@")[0]} - 0 pts`)
        .join("\n");

      return await send(
        `🎉 *GAME STARTED!*\n\n🎯 *Round 1*\n👤 *First turn (random):* @${firstPlayer.split("@")[0]}\n\n📊 *Players:*\n${playerList}\n\n💡 Type "truth" or "dare" when it's your turn!`,
        { mentions: [firstPlayer] }
      );
    }

    // ── leave ────────────────────────────────────────────────────────────────
    if (message === "leave") {
      if (!game.players.includes(sender)) {
        return await send("❌ *Not in game!*");
      }

      const playerIndex = game.players.indexOf(sender);
      game.players.splice(playerIndex, 1);
      delete game.scores[sender];

      if (game.status === "PLAYING") {
        if (game.currentPlayerIndex >= playerIndex) {
          game.currentPlayerIndex = Math.max(0, game.currentPlayerIndex - 1);
        }
        if (game.players.length === 0) {
          game.status = "ENDED";
          delete truthDareGames[game.id];
          return await send("🏁 *Game ended!*");
        }
        if (playerIndex === game.currentPlayerIndex) {
          game.currentPlayerIndex = game.currentPlayerIndex % game.players.length;
        }
      }

      await send(`👋 *@${sender.split("@")[0]} left!*\n\nRemaining: ${game.players.length}`);

      if (game.players.length === 0) delete truthDareGames[game.id];
      return;
    }

    // ── score ────────────────────────────────────────────────────────────────
    if (message === "score") {
      const playersWithScores = game.players
        .map((p) => ({ id: p, name: p.split("@")[0], score: game.scores[p] || 0 }))
        .sort((a, b) => b.score - a.score);

      const medals = ["🥇", "🥈", "🥉"];
      let scoreboard = "🏆 *SCORES*\n\n";
      playersWithScores.forEach((player, index) => {
        const medal = index < 3 ? medals[index] : `${index + 1}.`;
        scoreboard += `${medal} @${player.name}: ${player.score} pts`;
        if (game.status === "PLAYING" && game.players[game.currentPlayerIndex] === player.id) {
          scoreboard += " 👈 *TURN*";
        }
        scoreboard += "\n";
      });
      scoreboard += `\n🎮 ${game.status === "WAITING" ? "Waiting to start" : `Playing - Round ${game.round}`}`;

      return await send(scoreboard, { mentions: game.players });
    }

    // ── end ──────────────────────────────────────────────────────────────────
    if (message === "end") {
      game.status = "ENDED";

      const playersWithScores = game.players
        .map((p) => ({ id: p, name: p.split("@")[0], score: game.scores[p] || 0 }))
        .sort((a, b) => b.score - a.score);

      const medals = ["🥇", "🥈", "🥉"];
      let finalMessage = "🏁 *GAME OVER*\n\n";
      if (playersWithScores.length > 0) {
        finalMessage += "🏆 *FINAL:*\n";
        playersWithScores.forEach((player, index) => {
          const medal = index < 3 ? medals[index] : `${index + 1}.`;
          finalMessage += `${medal} @${player.name}: ${player.score}\n`;
        });
        finalMessage += `\n👑 *WINNER:* @${playersWithScores[0].name}\n`;
        finalMessage += `🎯 Rounds: ${game.round}\n`;
        finalMessage += `👥 Players: ${game.players.length}\n`;
      }

      await send(finalMessage, { mentions: game.players });
      delete truthDareGames[game.id];
      return;
    }

    // ── in-game turn actions (only for the current player) ───────────────────
    if (game.status !== "PLAYING") return;

    const currentPlayer = game.players[game.currentPlayerIndex];
    if (sender !== currentPlayer) return;

    if (message === "truth" || message === "dare") {
      const question = getQuestion(message);
      game.type     = message;
      game.question = question;

      return await send(
        `${message === "truth" ? "🤔" : "😈"} *${message.toUpperCase()}*\n\n"${question}"\n\n🎯 *Player:* @${sender.split("@")[0]}\n\n💡 Type "done" when finished\n💢 Type "skip" to skip (-5 pts)`,
        { mentions: [sender] }
      );
    }

    if (message === "done") {
      if (!game.type || !game.question) {
        return await send("❌ *Choose truth/dare first!*");
      }

      game.scores[sender] = (game.scores[sender] || 0) + 10;
      game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
      if (game.currentPlayerIndex === 0) game.round++;

      const nextPlayer = game.players[game.currentPlayerIndex];
      game.type     = null;
      game.question = null;

      return await send(
        `✅ *Completed!*\n\n🏆 @${sender.split("@")[0]} +10 pts\n📊 Total: ${game.scores[sender]} pts\n\n🎯 *Round ${game.round}*\n👤 *Next:* @${nextPlayer.split("@")[0]}\n\n💡 Type "truth" or "dare"!`,
        { mentions: [sender, nextPlayer] }
      );
    }

    if (message === "skip") {
      if (!game.type || !game.question) {
        return await send("❌ *Choose truth/dare first!*");
      }

      game.scores[sender] = Math.max(0, (game.scores[sender] || 0) - 5);
      game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
      if (game.currentPlayerIndex === 0) game.round++;

      const nextPlayer = game.players[game.currentPlayerIndex];
      game.type     = null;
      game.question = null;

      return await send(
        `⏭️ *Skipped!*\n\n❌ @${sender.split("@")[0]} -5 pts\n📊 Total: ${game.scores[sender]} pts\n\n🎯 *Round ${game.round}*\n👤 *Next:* @${nextPlayer.split("@")[0]}\n\n💡 Type "truth" or "dare"!`,
        { mentions: [sender, nextPlayer] }
      );
    }
  } catch (e) {
    console.error("TOD text handler error:", e);
  }
}

// ── Stale game cleanup (auto-expire after 1 hour) ────────────────────────────
setInterval(() => {
  const now     = Date.now();
  const oneHour = 60 * 60 * 1000;
  for (const [gameId, game] of Object.entries(truthDareGames)) {
    if (now - game.createdAt > oneHour) {
      delete truthDareGames[gameId];
    }
  }
}, 30 * 60 * 1000);

console.log("🎮 Truth or Dare engine loaded");
