//#region node_modules/.nitro/vite/services/ssr/assets/game-qTZOZDmK.js
/**
* Kelin-MD2's authoritative pet artwork prompts. Keep these keys and the URL
* generation algorithm aligned with the bot so the same species renders with
* the same stable artwork in WhatsApp and on the website.
*/
var PET_IMAGE_PROMPTS = {
	cat: "cute anime style chibi cat pet, big sparkling eyes, pastel colors, mascot art, white background",
	dog: "cute anime style chibi puppy pet, big sparkling eyes, fluffy fur, mascot art, white background",
	bunny: "cute anime style chibi bunny pet, big sparkling eyes, pastel fur, mascot art, white background",
	chicken: "cute anime style chibi chicken pet, big sparkling eyes, fluffy feathers, mascot art, white background",
	fox: "cute anime style chibi fox pet, orange fur, big sparkling eyes, mascot art, white background",
	wolf: "cool anime style chibi wolf pet, grey fur, glowing eyes, mascot art, white background",
	panda: "cute anime style chibi panda pet, black and white fur, big sparkling eyes, mascot art, white background",
	owl: "cute anime style chibi owl pet, big round eyes, fluffy feathers, mascot art, white background",
	moon_cat: "mystical anime style chibi cat pet, silver fur, glowing crescent moon markings, sparkles, white background",
	sakura_bunny: "cute anime style chibi bunny pet, pink fur, cherry blossom petals floating around it, white background",
	fire_slime: "cute anime style chibi slime creature pet, translucent orange body, small flame on top, glossy, white background",
	tiger: "cool anime style chibi tiger pet, orange and black stripes, glowing eyes, mascot art, white background",
	falcon: "sleek anime style chibi falcon pet, sharp wings, glowing eyes, mascot art, white background",
	shark: "cool anime style chibi shark pet, blue and white body, small fins, mascot art, white background",
	bear: "cute anime style chibi bear cub pet, brown fur, big round eyes, mascot art, white background",
	spirit_wolf: "mystical anime style chibi wolf pet, translucent pale blue fur, ghostly aura, glowing eyes, white background",
	thunder_fox: "cool anime style chibi fox pet, golden fur, small lightning sparks around it, glowing eyes, white background",
	frost_wolf: "cool anime style chibi wolf pet, icy white-blue fur, frost crystals, glowing eyes, white background",
	kitsune: "elegant anime style chibi fox spirit pet, white fur, multiple fluffy tails, glowing eyes, mystical aura, white background",
	phoenix_chick: "cute anime style chibi baby phoenix pet, small fiery wings, glowing orange and gold feathers, white background",
	baby_dragon: "cute anime style chibi baby dragon pet, small wings, big sparkling eyes, colorful scales, white background",
	griffin: "majestic anime style chibi griffin pet, eagle head and wings, lion body, mascot art, white background",
	nine_tailed_fox: "legendary anime style chibi nine-tailed fox spirit pet, elegant white and gold fur, nine fluffy tails, glowing aura, white background",
	kirin: "legendary anime style chibi kirin pet, dragon-like scaled body, deer antlers, glowing golden mane, mystical aura, white background",
	cerberus: "legendary anime style chibi three-headed dog pet, dark fur, glowing red eyes, fiery aura, white background",
	leviathan: "epic anime style chibi sea serpent dragon pet, deep blue scales, glowing eyes, water aura, white background",
	bahamut: "epic anime style chibi legendary dragon pet, platinum scales, majestic wings, glowing golden aura, white background",
	shadow_dragon: "epic anime style chibi dragon pet, dark purple-black scales, glowing violet eyes, shadowy aura, white background"
};
function petImageSeed(speciesKey) {
	let hash = 0;
	for (const character of speciesKey) hash = hash * 31 + character.charCodeAt(0) >>> 0;
	return hash % 1e6;
}
function petImageForSpecies(species, name) {
	const key = String(species ?? name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
	const prompt = PET_IMAGE_PROMPTS[key];
	if (!prompt) return null;
	const params = new URLSearchParams({
		width: "768",
		height: "768",
		seed: String(petImageSeed(key)),
		nologo: "true"
	});
	return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
}
function guildTaxRateForLevel(level) {
	const safeLevel = Math.max(1, Math.min(20, Math.floor(Number(level) || 1)));
	return Math.min(.2, .05 + (safeLevel - 1) * .01);
}
function guildUpgradeRequirementsForLevel(level) {
	const currentLevel = Math.max(1, Math.min(20, Math.floor(Number(level) || 1)));
	return {
		currentLevel,
		nextLevel: Math.min(20, currentLevel + 1),
		treasury: currentLevel * 5e3,
		guildXp: currentLevel * 1e3,
		members: Math.min(12, currentLevel + 1),
		memberCapacity: 8 + currentLevel * 2,
		taxRate: guildTaxRateForLevel(currentLevel)
	};
}
var GUILD_CREATION_COST = 5e3;
var PET_RARITY_LABEL = {
	common: "COMMON",
	uncommon: "UNCOMMON",
	rare: "RARE",
	epic: "EPIC",
	legendary: "LEGENDARY",
	mythic: "MYTHIC"
};
function trainerLevelProgress(level, xp) {
	const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
	const current = Math.max(0, Math.floor(Number(xp) || 0));
	const needed = safeLevel * 100;
	return {
		level: safeLevel,
		current,
		needed,
		percent: Math.min(100, Math.round(current / needed * 100))
	};
}
function rankFromLevel(level) {
	if (level >= 60) return "Master Rank";
	if (level >= 40) return "Vanguard";
	if (level >= 25) return "Elite";
	if (level >= 12) return "Drifter";
	return "Rookie";
}
function formatCoins(n) {
	return new Intl.NumberFormat("en-US").format(Math.max(0, Math.round(n)));
}
function formatCompactCoins(n) {
	const value = Math.max(0, Number(n) || 0);
	if (value < 1e6) return formatCoins(value);
	const unit = [
		{
			threshold: 0xe8d4a51000,
			suffix: "t"
		},
		{
			threshold: 1e9,
			suffix: "b"
		},
		{
			threshold: 1e6,
			suffix: "m"
		},
		{
			threshold: 1e3,
			suffix: "k"
		}
	].find(({ threshold }) => value >= threshold);
	if (!unit) return formatCoins(value);
	const amount = value / unit.threshold;
	const digits = amount >= 100 ? 0 : amount >= 10 ? 1 : 2;
	return `${amount.toFixed(digits).replace(/\\.?0+$/, "")}${unit.suffix}`;
}
//#endregion
export { guildTaxRateForLevel as a, rankFromLevel as c, formatCompactCoins as i, trainerLevelProgress as l, PET_RARITY_LABEL as n, guildUpgradeRequirementsForLevel as o, formatCoins as r, petImageForSpecies as s, GUILD_CREATION_COST as t };
