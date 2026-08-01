import fs from "fs";
import path from "path";

const USERS_FILE = path.resolve("database", "users.json");

function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, "utf8");
      return JSON.parse(data || "{}");
    }
  } catch (e) {
    console.error("Error loading users:", e);
  }
  return {};
}

function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (e) {
    console.error("Error saving users:", e);
  }
}

class UserProfile {
  constructor() {
    this.users = loadUsers();
  }

  isRegistered(jid) {
    return !!this.users[jid];
  }

  register(jid, name) {
    this.users[jid] = {
      name: name || "User",
      balance: 1000,
      guild: null,
      registeredAt: new Date().toISOString(),
      guildLevel: 0
    };
    saveUsers(this.users);
  }

  getProfile(jid) {
    return this.users[jid] || null;
  }

  updateBalance(jid, amount) {
    if (!this.users[jid]) return;
    this.users[jid].balance = (this.users[jid].balance || 0) + amount;
    saveUsers(this.users);
  }

  setGuild(jid, guildName) {
    if (!this.users[jid]) return;
    this.users[jid].guild = guildName;
    saveUsers(this.users);
  }

  getBalance(jid) {
    return this.users[jid]?.balance || 0;
  }
}

export const userProfile = new UserProfile();
