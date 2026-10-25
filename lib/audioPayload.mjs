const FORMATS = [
  { mime: "audio/mpeg", extension: "mp3", test: (b) =>
    (b.length >= 3 && b.subarray(0, 3).toString("ascii") === "ID3") ||
    (b.length >= 2 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  { mime: "audio/ogg", extension: "ogg", test: (b) => b.length >= 4 && b.subarray(0, 4).toString("ascii") === "OggS" },
  { mime: "audio/flac", extension: "flac", test: (b) => b.length >= 4 && b.subarray(0, 4).toString("ascii") === "fLaC" },
  { mime: "audio/wav", extension: "wav", test: (b) =>
    b.length >= 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WAVE" },
  { mime: "audio/mp4", extension: "m4a", test: (b) =>
    b.length >= 12 && b.subarray(4, 8).toString("ascii") === "ftyp" &&
    /^(M4A |M4B |M4P |F4A )$/.test(b.subarray(8, 12).toString("ascii")) },
];

export function inspectAudioPayload(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value ?? []);
  if (!buffer.length) return null;
  return FORMATS.find((format) => format.test(buffer)) ?? null;
}

export function requireAudioPayload(value) {
  const format = inspectAudioPayload(value);
  if (!format) throw new Error("Downloaded payload is not a recognized audio file");
  return format;
}
