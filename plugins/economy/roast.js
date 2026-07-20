const ROASTS = [
  "You're the reason they put instructions on shampoo bottles.",
  "I'd roast you, but my mom said I'm not allowed to burn trash.",
  "You're not stupid — you just have bad luck thinking.",
  "If brains were gasoline, you wouldn't have enough to power an ant's scooter.",
  "You're a living proof that even nature makes mistakes.",
  "I've seen better arguments on a cereal box.",
  "You're like a cloud — when you disappear, it's a beautiful day.",
  "Your wifi password is probably 'password123', isn't it?",
  "I'm not saying you're dumb, but you'd lose a debate with a traffic cone.",
  "You're the human equivalent of a participation trophy.",
  "If you were a vegetable, you'd be a cab-bage.",
  "I'd explain it to you, but I left my crayons at home.",
  "You have the energy of a Monday morning.",
  "Even your shadow gave up trying to follow you.",
  "You're not the dumbest person alive, but you better hope that person doesn't die.",
  "I'd agree with you, but then we'd both be wrong.",
  "Your cooking is so bad even the smoke alarm cheers you on.",
  "You bring everyone so much joy when you leave the room.",
  "You're like a speed bump — nobody sees you as useful, just annoying.",
  "I'd say you're funny, but I don't want to lie to your face.",
  "You're proof that even gravity has favourites.",
  "Your secrets are safe with me. I never listen when you talk.",
  "I've met salads with more personality than you.",
  "You're the type to trip over a wireless router.",
  "If I wanted to kill myself, I'd climb your ego and jump to your IQ.",
  "You're like a light switch — everyone has an urge to turn you off.",
  "You're so predictable even your WiFi has trust issues.",
  "Your vibe is a loading screen that never finishes.",
  "You're the reason why we have warning labels.",
  "Keep rolling your eyes — maybe you'll find your brain back there.",
  "You're not a mistake, you're a *plot twist* nobody asked for.",
  "You have the vibe of a group project where everyone does the work.",
];

export default {
  name: "roast",
  aliases: ["r"],
  category: "economy",
  description: "Roast someone (or yourself) with a savage line",
  usage: ".roast [@user]",

  async run({ sock, msg, sender }) {
    const jid      = msg.key.remoteJid;
    const target   = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
                  || msg.message?.extendedTextMessage?.contextInfo?.quotedParticipant
                  || sender;

    const roast    = ROASTS[Math.floor(Math.random() * ROASTS.length)];
    const tag      = `@${target.split("@")[0].split(":")[0]}`;

    await sock.sendMessage(jid, {
      text: `🔥 *ROAST* 🔥\n\n${tag}, ${roast}`,
      mentions: [target],
    }, { quoted: msg });
  },
};
