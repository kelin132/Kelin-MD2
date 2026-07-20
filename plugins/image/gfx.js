import axios from "axios";

const BASE = "https://api.nexoracle.com/image-creating";
const KEY  = "free_key@maher_apis";

const GFX_TYPES = {
  gfx:   { id: "gfx",   twoText: true,   threeText: false, label: "GFX 1" },
  gfx1:  { id: "gfx",   twoText: true,   threeText: false, label: "GFX 1" },
  gfx2:  { id: "gfx2",  twoText: true,   threeText: false, label: "GFX 2" },
  gfx3:  { id: "gfx3",  twoText: true,   threeText: false, label: "GFX 3" },
  gfx4:  { id: "gfx4",  twoText: true,   threeText: false, label: "GFX 4" },
  gfx5:  { id: "gfx5",  twoText: false,  threeText: true,  label: "GFX 5" },
  gfx6:  { id: "gfx6",  twoText: false,  threeText: true,  label: "GFX 6" },
  gfx7:  { id: "gfx7",  twoText: true,   threeText: false, label: "GFX 7" },
  gfx8:  { id: "gfx8",  twoText: true,   threeText: false, label: "GFX 8" },
  gfx9:  { id: "gfx9",  twoText: false,  threeText: false, label: "GFX 9",  oneText: true },
  gfx10: { id: "gfx10", twoText: false,  threeText: false, label: "GFX 10", oneText: true },
  gfx11: { id: "gfx11", twoText: false,  threeText: false, label: "GFX 11", oneText: true },
  gfx12: { id: "gfx12", twoText: false,  threeText: false, label: "GFX 12", oneText: true },
};

export default {
  name: "gfx",
  aliases: ["gfx1","gfx2","gfx3","gfx4","gfx5","gfx6","gfx7","gfx8","gfx9","gfx10","gfx11","gfx12"],
  description: "Create stylish GFX images with text. Use gfx1–gfx12 for different styles",
  category: "image",
  usage: ".gfx1 Text1;Text2  |  .gfx5 Text1;Text2;Text3  |  .gfx9 YourText",
  cooldown: 5,

  async run({ sock, msg, cmd, text }) {
    const jid  = msg.key.remoteJid;
    const type = GFX_TYPES[cmd] || GFX_TYPES["gfx"];

    if (!text) {
      const ex = type.threeText ? `${cmd} Hello;World;Bot`
               : type.twoText   ? `${cmd} Hello;World`
               :                  `${cmd} KelinMD`;
      return sock.sendMessage(jid, { text: `❌ Provide text.\n\nExample: .${ex}` }, { quoted: msg });
    }

    try {
      const parts = text.split(";").map(p => p.trim());
      let url;

      if (type.threeText) {
        if (parts.length < 3) return sock.sendMessage(jid, { text: `❌ Provide three texts separated by ; for ${type.label}\n\nExample: .${cmd} Hello;World;Bot` }, { quoted: msg });
        url = `${BASE}/${type.id}?apikey=${KEY}&text1=${encodeURIComponent(parts[0])}&text2=${encodeURIComponent(parts[1])}&text3=${encodeURIComponent(parts[2])}`;
      } else if (type.twoText) {
        if (parts.length < 2) return sock.sendMessage(jid, { text: `❌ Provide two texts separated by ; for ${type.label}\n\nExample: .${cmd} Hello;World` }, { quoted: msg });
        url = `${BASE}/${type.id}?apikey=${KEY}&text1=${encodeURIComponent(parts[1])}&text2=${encodeURIComponent(parts[0])}`;
      } else {
        url = `${BASE}/${type.id}?apikey=${KEY}&text=${encodeURIComponent(text)}`;
      }

      await sock.sendMessage(jid, { image: { url }, caption: `✨ *${type.label}* created!` }, { quoted: msg });
    } catch (err) {
      console.error(err);
      await sock.sendMessage(jid, { text: `❌ Failed to create ${type.label} image. Try again!` }, { quoted: msg });
    }
  },
};
