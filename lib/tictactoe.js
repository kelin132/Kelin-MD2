// lib/tictactoe.js

export const games = new Map();

export class TicTacToe {
    constructor(playerX, playerO, group) {
        this.group = group;
        this.playerX = playerX;
        this.playerO = playerO;

        this.turn = playerX;

        this.board = [
            "1", "2", "3",
            "4", "5", "6",
            "7", "8", "9"
        ];

        this.symbols = {
            [playerX]: "❌",
            [playerO]: "⭕"
        };

        this.finished = false;
        this.winner = null;
    }

    render() {
        return `
╭─── Tic Tac Toe ───╮

 ${this.board[0]} │ ${this.board[1]} │ ${this.board[2]}
───┼───┼───
 ${this.board[3]} │ ${this.board[4]} │ ${this.board[5]}
───┼───┼───
 ${this.board[6]} │ ${this.board[7]} │ ${this.board[8]}

╰──────────────────╯
`;
    }

    move(player, position) {

        if (this.finished)
            return {
                success: false,
                message: "Game already finished."
            };

        if (player !== this.turn)
            return {
                success: false,
                message: "It's not your turn."
            };

        position--;

        if (position < 0 || position > 8)
            return {
                success: false,
                message: "Choose a number from 1-9."
            };

        if (
            this.board[position] === "❌" ||
            this.board[position] === "⭕"
        )
            return {
                success: false,
                message: "That position is already taken."
            };

        this.board[position] = this.symbols[player];

        if (this.checkWinner()) {
            this.finished = true;
            this.winner = player;

            return {
                success: true,
                winner: true
            };
        }

        if (this.isDraw()) {
            this.finished = true;

            return {
                success: true,
                draw: true
            };
        }

        this.turn =
            this.turn === this.playerX
                ? this.playerO
                : this.playerX;

        return {
            success: true
        };
    }

    checkWinner() {

        const b = this.board;

        const wins = [
            [0,1,2],
            [3,4,5],
            [6,7,8],

            [0,3,6],
            [1,4,7],
            [2,5,8],

            [0,4,8],
            [2,4,6]
        ];

        return wins.some(([a,b1,c]) =>
            b[a] === b[b1] &&
            b[b1] === b[c]
        );
    }

    isDraw() {

        return this.board.every(cell =>
            cell === "❌" ||
            cell === "⭕"
        );
    }
}