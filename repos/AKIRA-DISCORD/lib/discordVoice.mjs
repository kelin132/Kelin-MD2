import { spawn } from "node:child_process";

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
  existing?.ffmpeg?.kill("SIGKILL");
  existing?.connection?.destroy();

  let connection;
  let lastConnectionError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
      break;
    } catch (error) {
      lastConnectionError = error;
      connection.destroy();
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 750));
    }
  }
  if (!connection || connection.state.status !== VoiceConnectionStatus.Ready) {
    throw new Error(
      `Voice connection did not become ready: ${lastConnectionError?.message || "connection aborted"}`,
    );
  }

  const ffmpeg = spawn(process.env.FFMPEG_PATH || "ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    "pipe:0",
    "-vn",
    "-ac",
    "2",
    "-ar",
    "48000",
    "-c:a",
    "libopus",
    "-b:a",
    "128k",
    "-f",
    "ogg",
    "pipe:1",
  ], { stdio: ["pipe", "pipe", "pipe"] });

  const cleanup = () => {
    if (!ffmpeg.killed) ffmpeg.kill("SIGKILL");
    connection.destroy();
    if (activePlayers.get(message.guildId)?.connection === connection) {
      activePlayers.delete(message.guildId);
    }
  };
  let ffmpegError = "";
  ffmpeg.stderr.on("data", (chunk) => {
    ffmpegError += String(chunk);
  });
  ffmpeg.once("error", (error) => {
    console.error("[discord voice] ffmpeg error:", error.message);
    cleanup();
  });
  ffmpeg.once("close", (code) => {
    if (code && code !== 0 && !ffmpeg.killed) {
      console.error("[discord voice] ffmpeg exited:", code, ffmpegError.trim());
    }
  });
  ffmpeg.stdin.end(audioBuffer);
  ffmpeg.stdin.on("error", (error) => {
    if (error.code !== "EPIPE") {
      console.error("[discord voice] ffmpeg input error:", error.message);
    }
  });

  const player = createAudioPlayer({
    behaviors: { noSubscriber: NoSubscriberBehavior.Play },
  });
  const resource = createAudioResource(ffmpeg.stdout, {
    inputType: StreamType.OggOpus,
    metadata: { title },
  });

  player.on("error", (error) => {
    console.error("[discord voice] audio player error:", error.message);
    cleanup();
  });
  player.once(AudioPlayerStatus.Idle, () => {
    cleanup();
  });

  connection.subscribe(player);
  activePlayers.set(message.guildId, { connection, player, ffmpeg });
  player.play(resource);

  return {
    ok: true,
    channel: voiceChannel,
    title,
  };
}