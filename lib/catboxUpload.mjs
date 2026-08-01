import fs from "fs";
import os from "os";
import path from "path";

export async function uploadToCatbox(buffer, filename = "image.jpg") {
  const tempFile = path.join(os.tmpdir(), filename);

  fs.writeFileSync(tempFile, buffer);

  try {
    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append(
      "fileToUpload",
      new Blob([buffer], { type: "application/octet-stream" }),
      filename
    );

    const response = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: form,
    });

    if (!response.ok) {
      throw new Error(`Catbox upload failed with HTTP ${response.status}`);
    }

    return await response.text(); // https://files.catbox.moe/xxxxx.jpg
  } finally {
    try {
      fs.unlinkSync(tempFile);
    } catch {}
  }
}