import fs from "fs";
import path from "path";

const GROUPS_FILE = path.resolve("database", "groups.json");

function loadGroups() {
  try {
    if (fs.existsSync(GROUPS_FILE)) {
      const data = fs.readFileSync(GROUPS_FILE, "utf8");
      return JSON.parse(data || "{}");
    }
  } catch (e) {
    console.error("Error loading groups:", e);
  }
  return {};
}

function saveGroups(groups) {
  try {
    const dir = path.dirname(GROUPS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2));
  } catch (e) {
    console.error("Error saving groups:", e);
  }
}

class GroupSettings {
  constructor() {
    this.groups = loadGroups();
  }

  get(jid) {
    return this.groups[jid] || {};
  }

  set(jid, settings) {
    this.groups[jid] = { ...this.groups[jid], ...settings };
    saveGroups(this.groups);
  }

  delete(jid) {
    delete this.groups[jid];
    saveGroups(this.groups);
  }
}

export const groupSettings = new GroupSettings();
