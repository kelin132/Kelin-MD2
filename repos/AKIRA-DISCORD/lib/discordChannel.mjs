export function requestedChannelId(discord, args = []) {
  const mentioned = discord?.message?.mentions?.channels?.first?.();
  return mentioned?.id || String(args[1] || "").replace(/[<#>]/g, "");
}

export async function fetchWritableGuildChannel(discord, guildId, args) {
  const requestedId = requestedChannelId(discord, args);
  if (!requestedId) return { channel: null, requestedId: null };

  const channel = await discord?.client?.channels?.fetch(requestedId).catch(() => null);
  if (!channel || String(channel.guildId) !== String(guildId) || !channel.isTextBased?.()) {
    return { channel: null, requestedId, error: "Choose a text channel from this server." };
  }

  const botMember = channel.guild?.members?.me
    || channel.guild?.members?.cache?.get(discord.client.user?.id);
  if (botMember && !channel.permissionsFor(botMember)?.has("SendMessages")) {
    return { channel: null, requestedId, error: "I cannot send messages in that channel." };
  }

  return { channel, requestedId };
}