import fs from "fs";
import path from "path";

const ADMINS_FILE = path.resolve("database", "admins.json");

function loadAdmins() {
  try {
    if (fs.existsSync(ADMINS_FILE)) {
      const data = fs.readFileSync(ADMINS_FILE, "utf8");
      return JSON.parse(data || "[]");
    }
  } catch (e) {
    console.error("Error loading admins:", e);
  }
  return [];
}

function saveAdmins(admins) {
  try {
    const dir = path.dirname(ADMINS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ADMINS_FILE, JSON.stringify(admins, null, 2));
  } catch (e) {
    console.error("Error saving admins:", e);
  }
}

export const adminSystem = {
  getAdmins: () => loadAdmins(),
  
  addAdmin: (jid) => {
    const admins = loadAdmins();
    if (!admins.includes(jid)) {
      admins.push(jid);
      saveAdmins(admins);
      return true;
    }
    return false;
  },
  
  removeAdmin: (jid) => {
    const admins = loadAdmins();
    const index = admins.indexOf(jid);
    if (index > -1) {
      admins.splice(index, 1);
      saveAdmins(admins);
      return true;
    }
    return false;
  },
  
  isAdmin: (jid) => {
    const admins = loadAdmins();
    return admins.includes(jid);
  }
};
