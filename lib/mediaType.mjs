export function detectMediaType(buffer) {
  if (!buffer || buffer.length < 4) return "unknown";

  const signature = buffer.subarray(0, 12);
  if (signature.subarray(0, 6).toString("ascii") === "GIF87a"
    || signature.subarray(0, 6).toString("ascii") === "GIF89a") {
    return "gif";
  }
  if (signature.subarray(4, 8).toString("ascii") === "ftyp") {
    return "mp4";
  }
  if (signature.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) {
    return "png";
  }
  if (signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff) {
    return "jpeg";
  }
  if (signature.subarray(0, 4).toString("ascii") === "RIFF"
    && signature.subarray(8, 12).toString("ascii") === "WEBP") {
    return "webp";
  }
  return "unknown";
}
