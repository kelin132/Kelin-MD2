import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import os from "os";
import path from "path";

export async function uploadToCatbox(buffer, filename = "image.jpg") {
  const tempFile = path.join(os.tmpdir(), filename);

  fs.writeFileSync(tempFile, buffer);

  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("fileToUpload", fs.createReadStream(tempFile));

  const { data } = await axios.post(
    "https://catbox.moe/user/api.php",
    form,
    {
      headers: form.getHeaders(),
    }
  );

  fs.unlinkSync(tempFile);

  return data; // https://files.catbox.moe/xxxxx.jpg
}