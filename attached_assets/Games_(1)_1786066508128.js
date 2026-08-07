const mongoose = require("mongoose");

const GameSchema = new mongoose.Schema({
  jid: { type: String, required: true }, // Group JID
  gameType: { type: String, enum: ["wcg", "ttt", "chess", "c4"], required: true },
  status: { type: String, enum: ["waiting", "playing", "finished"], default: "waiting" },
  players: [{
    jid: String,
    name: String,
    score: { type: Number, default: 0 }
  }],
  turn: { type: String }, // JID of the player whose turn it is
  state: { type: mongoose.Schema.Types.Mixed }, // Specific game state (board, words used, etc.)
  lastMoveAt: { type: Date, default: Date.now },
  winner: { type: String }, // JID of the winner
}, { timestamps: true });

module.exports = mongoose.model("Game", GameSchema);