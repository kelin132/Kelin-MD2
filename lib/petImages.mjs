/**
 * KELIN MD — Pet image lookup (anime style)
 *
 * Pets have no bundled art, so this generates an anime-style
 * illustration for each species using Pollinations.ai — a free,
 * keyless AI image generation endpoint (simple GET request, no
 * account or API key required).
 *
 * Each species has a fixed prompt + a stable seed derived from its
 * key, so every "Cat" pet gets the *same* piece of art rather than
 * a new random image every time — consistent, like real game sprites.
 *
 * This never throws: if a species has no prompt mapped, getPetImage()
 * returns null and callers should just fall back to a text-only
 * message.
 */

const PET_PROMPTS = {
  // Common
  cat:      "cute anime style chibi cat pet, big sparkling eyes, pastel colors, mascot art, white background",
  dog:      "cute anime style chibi puppy pet, big sparkling eyes, fluffy fur, mascot art, white background",
  bunny:    "cute anime style chibi bunny pet, big sparkling eyes, pastel fur, mascot art, white background",
  chicken:  "cute anime style chibi chicken pet, big sparkling eyes, fluffy feathers, mascot art, white background",

  // Uncommon
  fox:          "cute anime style chibi fox pet, orange fur, big sparkling eyes, mascot art, white background",
  wolf:         "cool anime style chibi wolf pet, grey fur, glowing eyes, mascot art, white background",
  panda:        "cute anime style chibi panda pet, black and white fur, big sparkling eyes, mascot art, white background",
  owl:          "cute anime style chibi owl pet, big round eyes, fluffy feathers, mascot art, white background",
  moon_cat:     "mystical anime style chibi cat pet, silver fur, glowing crescent moon markings, sparkles, white background",
  sakura_bunny: "cute anime style chibi bunny pet, pink fur, cherry blossom petals floating around it, white background",
  fire_slime:   "cute anime style chibi slime creature pet, translucent orange body, small flame on top, glossy, white background",

  // Rare
  tiger:       "cool anime style chibi tiger pet, orange and black stripes, glowing eyes, mascot art, white background",
  falcon:      "sleek anime style chibi falcon pet, sharp wings, glowing eyes, mascot art, white background",
  shark:       "cool anime style chibi shark pet, blue and white body, small fins, mascot art, white background",
  bear:        "cute anime style chibi bear cub pet, brown fur, big round eyes, mascot art, white background",
  spirit_wolf: "mystical anime style chibi wolf pet, translucent pale blue fur, ghostly aura, glowing eyes, white background",
  thunder_fox: "cool anime style chibi fox pet, golden fur, small lightning sparks around it, glowing eyes, white background",
  frost_wolf:  "cool anime style chibi wolf pet, icy white-blue fur, frost crystals, glowing eyes, white background",

  // Epic
  kitsune:       "elegant anime style chibi fox spirit pet, white fur, multiple fluffy tails, glowing eyes, mystical aura, white background",
  phoenix_chick: "cute anime style chibi baby phoenix pet, small fiery wings, glowing orange and gold feathers, white background",
  baby_dragon:   "cute anime style chibi baby dragon pet, small wings, big sparkling eyes, colorful scales, white background",
  griffin:       "majestic anime style chibi griffin pet, eagle head and wings, lion body, mascot art, white background",

  // Legendary
  nine_tailed_fox: "legendary anime style chibi nine-tailed fox spirit pet, elegant white and gold fur, nine fluffy tails, glowing aura, white background",
  kirin:           "legendary anime style chibi kirin pet, dragon-like scaled body, deer antlers, glowing golden mane, mystical aura, white background",
  cerberus:        "legendary anime style chibi three-headed dog pet, dark fur, glowing red eyes, fiery aura, white background",

  // Mythic
  leviathan:     "epic anime style chibi sea serpent dragon pet, deep blue scales, glowing eyes, water aura, white background",
  bahamut:       "epic anime style chibi legendary dragon pet, platinum scales, majestic wings, glowing golden aura, white background",
  shadow_dragon: "epic anime style chibi dragon pet, dark purple-black scales, glowing violet eyes, shadowy aura, white background",
};

/** Deterministic small hash so the same species always renders the same art. */
function seedFor(key) {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 1_000_000;
}

/**
 * Get an anime-style image URL for a pet species. Returns null (never
 * throws) if the species has no prompt mapped — callers should treat
 * null as "send text only."
 *
 * The URL points at Pollinations.ai's generation endpoint — WhatsApp/
 * Baileys fetches it directly when sending, same as any other image URL.
 */
export async function getPetImage(speciesKey) {
  const prompt = PET_PROMPTS[speciesKey];
  if (!prompt) return null;

  const seed = seedFor(speciesKey);
  const params = new URLSearchParams({
    width: "768",
    height: "768",
    seed: String(seed),
    nologo: "true",
  });

  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
}
