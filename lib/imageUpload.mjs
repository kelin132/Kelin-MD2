/**
 * Upload an image buffer to a public temporary URL.
 *
 * PrinceTech's Remini endpoint fetches the image server-side, so a WhatsApp
 * media buffer must be uploaded before it can be enhanced.
 */
export async function uploadImageForProcessing(
  buffer,
  { filename = "image.jpg", mimetype = "image/jpeg" } = {},
) {
  const form = new FormData();
  form.append("files[]", new Blob([buffer], { type: mimetype }), filename);

  const response = await fetch("https://uguu.se/upload.php", {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    throw new Error(`Image upload failed (HTTP ${response.status})`);
  }

  const data = await response.json().catch(() => null);
  const url = data?.files?.[0]?.url;
  if (!data?.success || typeof url !== "string" || !url.startsWith("http")) {
    throw new Error("Image upload service returned no usable URL");
  }

  return url;
}