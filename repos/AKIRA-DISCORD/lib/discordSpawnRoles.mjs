export const SPAWN_ROLE_DEFINITIONS = Object.freeze({
  card: Object.freeze({
    name: "Card Spawn Pings",
    color: "#31C8FF",
    emoji: "🃏",
    label: "Card Spawn Pings",
  }),
  pokemon: Object.freeze({
    name: "Pokémon Spawn Pings",
    color: "#FF4FA3",
    emoji: "🌿",
    label: "Pokémon Spawn Pings",
  }),
});

export function getSpawnRoleDefinition(type) {
  return SPAWN_ROLE_DEFINITIONS[type] || null;
}

export function findSpawnRole(guild, type) {
  const definition = getSpawnRoleDefinition(type);
  if (!definition || !guild?.roles?.cache) return null;
  const roles = guild.roles.cache;
  const matches = (role) => role.name === definition.name && !role.managed;
  if (typeof roles.find === "function") return roles.find(matches) || null;
  return Array.from(roles.values?.() || roles).find(matches) || null;
}

export async function ensureSpawnRole(guild, type) {
  const definition = getSpawnRoleDefinition(type);
  if (!definition || !guild?.roles?.create) return null;

  const existing = findSpawnRole(guild, type);
  if (existing) return existing;

  return guild.roles.create({
    name: definition.name,
    color: definition.color,
    mentionable: false,
    reason: "Create AIDORU opt-in spawn notification role",
  });
}

export function getSpawnRoleMention(guild, type) {
  const role = findSpawnRole(guild, type);
  return role ? `<@&${role.id}>` : "";
}