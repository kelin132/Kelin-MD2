const settings = {
  packname: 'Kelin-MD',
  botName: "KELIN-MD",
  botOwner: 'KELIN-MD', // Your name
  ownerNumber: '', // Leave blank — set OWNER_NUMBER in your .env or panel env vars instead
  ownerContact: '2348152077346', // Number shown when someone uses .owner command
  giphyApiKey: 'NrSjG6var2uiuSYDm0xTqCX0xcFgGj4s',
  commandMode: "private",
  maxStoreMessages: 20,
  storeWriteInterval: 10000,
  description: "Daratech - a multi-purpose WhatsApp bot with 1000+ commands.",
  version: "1.0.0",
  // GitHub repo — used for git auto-update AND as ZIP fallback
  githubRepo: "https://github.com/kelin132/Kelin-MD2.git",
  githubBranch: "main",
  updateZipUrl: "https://github.com/kelin132/Kelin-MD2/archive/refs/heads/main.zip",
  // How often (in seconds) the bot checks for updates automatically (default: 39s)
  autoUpdateInterval: 39,
};

module.exports = settings;