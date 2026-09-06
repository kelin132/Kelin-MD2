import { Readable } from "node:stream";

let voiceModulePromise;
const activePlayers = new Map();

async function getVoiceModule() {
  voiceModulePromise ??= import("@discordjs/voice");
  return voiceModulePromise;
}

export async function playDiscordVoice({ client, message, audioBuffer, title }) {
  const voiceChannel = message.member?.voice?.channel;
  if (!voiceChannel) {
    return { ok: false, reason: "not-in-voice" };
  }

  const permissions = voiceChannel.permissionsFor(client.user);
  if (
    !permissions?.has("Connect") ||
    !permissions?.has("Speak")
  ) {
    return { ok: false, reason: "missing-permissions", channel: voiceChannel };
  }

  const {
    AudioPlayerStatus,
    NoSubscriberBehavior,
    StreamType,
    VoiceConnectionStatus,
    createAudioPlayer,
    createAudioResource,
    entersState,
    joinVoiceChannel,
  } = await getVoiceModule();

  const existing = activePlayers.get(message.guildId);
  existing?.connection?.destroy();

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: true,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
  } catch (error) {
    connection.destroy();
    throw new Error(`Voice connection did not become ready: ${error.message}`);
  }

  const player = createAudioPlayer({
    behaviors: { noSubscriber: NoSubscriberBehavior.Play },
  });
  const resource = createAudioResource(Readable.from(audioBuffer), {
    inputType: StreamType.Arbitrary,
    metadata: { title },
  });

  player.on("error", (error) => {
    console.error("[discord voice] audio player error:", error.message);
    connection.destroy();
    activePlayers.delete(message.guildId);
  });
  player.once(AudioPlayerStatus.Idle, () => {
    connection.destroy();
    activePlayers.delete(message.guildId);
  });

  connection.subscribe(player);
  player.play(resource);
  activePlayers.set(message.guildId, { connection, player });

  return {
    ok: true,
    channel: voiceChannel,
    title,
  };
}