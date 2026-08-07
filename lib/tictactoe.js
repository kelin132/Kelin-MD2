// lib/tictactoe.js

export const games = new Map();

export const GAME_TIMEOUT_MS = 30 * 60 * 1000;

const EMPTY_BOARD = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function playerKey(jid) {
  return String(jid || "").split(":")[0];
}

export class TicTacToe {
  constructor(playerX, playerO, group) {
    this.group = group;
    this.playerX = playerX;
    this.playerO = playerO;
    this.turn = playerX;
    this.board = [...EMPTY_BOARD];
    this.symbols = {
      [playerKey(playerX)]: "❌",
      [playerKey(playerO)]: "⭕",
    };
    this.finished = false;
    this.winner = null;
    this.winningLine = [];
    this.createdAt = Date.now();
    this.lastMoveAt = this.createdAt;
  }

  hasPlayer(player) {
    const key = playerKey(player);
    return key === playerKey(this.playerX) || key === playerKey(this.playerO);
  }

  isExpired(now = Date.now()) {
    return now - this.lastMoveAt >= GAME_TIMEOUT_MS;
  }

  symbolFor(player) {
    return this.symbols[playerKey(player)];
  }

  render() {
    const [a, b, c, d, e, f, g, h, i] = this.board;
    return `
╭━━━━━━━━━━━━━━━━━━╮
┃   T I C  T A C  T O E   ┃
┣━━━━━━━━━━━━━━━━━━┫
┃      ${a}  │  ${b}  │  ${c}      ┃
┣━━━━━━━━━━━━━━━━━━┫
┃      ${d}  │  ${e}  │  ${f}      ┃
┣━━━━━━━━━━━━━━━━━━┫
┃      ${g}  │  ${h}  │  ${i}      ┃
╰━━━━━━━━━━━━━━━━━━╯
`;
  }

  move(player, rawPosition) {
    if (this.finished) {
      return { success: false, message: "Game already finished." };
    }

    if (this.isExpired()) {
      this.finished = true;
      return {
        success: false,
        expired: true,
        message: "This game expired after 30 minutes of inactivity.",
      };
    }

    if (!this.hasPlayer(player)) {
      return { success: false, message: "You are not a player in this game." };
    }

    if (playerKey(player) !== playerKey(this.turn)) {
      return { success: false, message: "It's not your turn." };
    }

    const position = Number(rawPosition);
    if (!Number.isInteger(position) || position < 1 || position > 9) {
      return { success: false, message: "Choose a whole number from 1-9." };
    }

    const index = position - 1;
    if (this.board[index] === "❌" || this.board[index] === "⭕") {
      return { success: false, message: "That position is already taken." };
    }

    this.board[index] = this.symbolFor(player);
    this.lastMoveAt = Date.now();
    this.winningLine = this.getWinningLine();

    if (this.winningLine.length > 0) {
      this.finished = true;
      this.winner = player;
      return {
        success: true,
        winner: true,
        position,
        winningLine: this.winningLine,
      };
    }

    if (this.isDraw()) {
      this.finished = true;
      return { success: true, draw: true, position };
    }

    this.turn =
      playerKey(this.turn) === playerKey(this.playerX)
        ? this.playerO
        : this.playerX;

    return { success: true, position, nextTurn: this.turn };
  }

  getWinningLine() {
    return (
      WINNING_LINES.find(([a, b, c]) => {
        const symbol = this.board[a];
        return (
          (symbol === "❌" || symbol === "⭕") &&
          this.board[b] === symbol &&
          this.board[c] === symbol
        );
      }) || []
    );
  }

  checkWinner() {
    return this.getWinningLine().length > 0;
  }

  isDraw() {
    return this.board.every((cell) => cell === "❌" || cell === "⭕");
  }
}
