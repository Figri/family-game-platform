"use client";

export type Player = "black" | "white";
export type Cell = Player | null;
export type GameMode = "pvp" | "pve";
export type GameStatus = "playing" | "won" | "draw" | "surrender";

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  position: Position;
  player: Player;
}

export interface GameState {
  board: Cell[][];
  currentPlayer: Player;
  status: GameStatus;
  winner: Player | null;
  history: Move[];
  winningLine: Position[];
  mode: GameMode;
  surrenderPlayer: Player | null;
}

const BOARD_SIZE = 15;

export function createBoard(): Cell[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => null)
  );
}

export function createInitialState(mode: GameMode): GameState {
  return {
    board: createBoard(),
    currentPlayer: "black",
    status: "playing",
    winner: null,
    history: [],
    winningLine: [],
    mode,
    surrenderPlayer: null,
  };
}

export function isValidMove(state: GameState, row: number, col: number): boolean {
  if (state.status !== "playing") return false;
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return false;
  return state.board[row][col] === null;
}

const DIRECTIONS: [number, number][] = [
  [0, 1],   // horizontal
  [1, 0],   // vertical
  [1, 1],   // diagonal \
  [1, -1],  // diagonal /
];

export function checkWin(
  board: Cell[][],
  row: number,
  col: number,
  player: Player
): Position[] | null {
  for (const [dr, dc] of DIRECTIONS) {
    const line: Position[] = [{ row, col }];

    // forward direction
    for (let i = 1; i < 5; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
        line.push({ row: r, col: c });
      } else {
        break;
      }
    }

    // backward direction
    for (let i = 1; i < 5; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
        line.push({ row: r, col: c });
      } else {
        break;
      }
    }

    if (line.length >= 5) {
      return line;
    }
  }
  return null;
}

export function isBoardFull(board: Cell[][]): boolean {
  return board.every((row) => row.every((cell) => cell !== null));
}

export function makeMove(state: GameState, row: number, col: number): GameState {
  if (!isValidMove(state, row, col)) return state;

  const newBoard = state.board.map((r) => [...r]);
  newBoard[row][col] = state.currentPlayer;

  const newHistory: Move[] = [
    ...state.history,
    { position: { row, col }, player: state.currentPlayer },
  ];

  const winningLine = checkWin(newBoard, row, col, state.currentPlayer);
  if (winningLine) {
    return {
      ...state,
      board: newBoard,
      history: newHistory,
      status: "won",
      winner: state.currentPlayer,
      winningLine,
    };
  }

  if (isBoardFull(newBoard)) {
    return {
      ...state,
      board: newBoard,
      history: newHistory,
      status: "draw",
      winner: null,
    };
  }

  return {
    ...state,
    board: newBoard,
    currentPlayer: state.currentPlayer === "black" ? "white" : "black",
    history: newHistory,
  };
}

export function undoMove(state: GameState): GameState {
  if (state.history.length === 0) return state;

  // In PvE mode, undo both AI and player moves if possible
  const movesToUndo = state.mode === "pve" && state.history.length >= 2 ? 2 : 1;
  const newHistory = state.history.slice(0, -movesToUndo);
  const newBoard = createBoard();

  for (const move of newHistory) {
    newBoard[move.position.row][move.position.col] = move.player;
  }

  const lastMove = newHistory[newHistory.length - 1];
  return {
    ...state,
    board: newBoard,
    currentPlayer: lastMove ? lastMove.player : "black",
    history: newHistory,
    status: "playing",
    winner: null,
    winningLine: [],
  };
}

export function surrender(state: GameState, player: Player): GameState {
  if (state.status !== "playing") return state;
  const winner = player === "black" ? "white" : "black";
  return {
    ...state,
    status: "surrender",
    winner,
    surrenderPlayer: player,
  };
}

export function drawGame(state: GameState): GameState {
  if (state.status !== "playing") return state;
  return {
    ...state,
    status: "draw",
    winner: null,
  };
}

// ==================== Simple AI ====================

const SCORES: Record<number, number> = {
  5: 100000,
  4: 10000,
  3: 1000,
  2: 100,
  1: 10,
};

function countInDirection(
  board: Cell[][],
  row: number,
  col: number,
  dr: number,
  dc: number,
  player: Player
): number {
  let count = 0;
  for (let i = 1; i < 5; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

function evaluatePosition(
  board: Cell[][],
  row: number,
  col: number,
  player: Player
): number {
  let score = 0;
  for (const [dr, dc] of DIRECTIONS) {
    const forward = countInDirection(board, row, col, dr, dc, player);
    const backward = countInDirection(board, row, col, -dr, -dc, player);
    const total = forward + backward + 1;
    if (total >= 5) {
      score += SCORES[5] || 0;
    } else {
      score += SCORES[total] || 0;
    }
  }
  return score;
}

function getCandidateMoves(board: Cell[][]): Position[] {
  const moves: Position[] = [];
  const visited = new Set<string>();

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== null) {
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            const key = `${nr},${nc}`;
            if (
              nr >= 0 && nr < BOARD_SIZE &&
              nc >= 0 && nc < BOARD_SIZE &&
              board[nr][nc] === null &&
              !visited.has(key)
            ) {
              visited.add(key);
              moves.push({ row: nr, col: nc });
            }
          }
        }
      }
    }
  }

  // If board is empty, return center
  if (moves.length === 0) {
    return [{ row: 7, col: 7 }];
  }

  return moves;
}

export function getAIMove(state: GameState): Position | null {
  if (state.status !== "playing") return null;

  const aiPlayer: Player = "white";
  const humanPlayer: Player = "black";
  const board = state.board;

  const candidates = getCandidateMoves(board);
  let bestMove: Position | null = null;
  let bestScore = -Infinity;

  for (const { row, col } of candidates) {
    // AI attack score
    const attackScore = evaluatePosition(board, row, col, aiPlayer);
    // Defense score (block human)
    const defenseScore = evaluatePosition(board, row, col, humanPlayer);

    const totalScore = attackScore * 1.1 + defenseScore;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestMove = { row, col };
    }
  }

  return bestMove;
}

export function getPlayerLabel(player: Player): string {
  return player === "black" ? "黑棋" : "白棋";
}

export function getPlayerEmoji(player: Player): string {
  return player === "black" ? "⚫" : "⚪";
}
