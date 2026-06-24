export type TetrominoType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
export type GameMode = "single" | "duo";
export type GameStatus = "idle" | "running" | "paused" | "over";

export interface Position {
  x: number;
  y: number;
}

export interface Tetromino {
  type: TetrominoType;
  shape: number[][];
  position: Position;
  color: string;
}

export interface PlayerState {
  board: (string | null)[][];
  currentPiece: Tetromino;
  nextPiece: TetrominoType;
  score: number;
  level: number;
  lines: number;
  gameOver: boolean;
  garbageQueue: number; // pending garbage lines to receive
}

export interface TetrisGameState {
  players: PlayerState[];
  status: GameStatus;
  winner: number | null; // 0 or 1 for duo mode, null otherwise
}

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

// SRS (Super Rotation System) piece definitions
export const TETROMINO_SHAPES: Record<TetrominoType, number[][][]> = {
  I: [
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
    [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
    [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
  ],
  O: [
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
  ],
  T: [
    [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 1], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 1, 0], [0, 1, 0]],
  ],
  S: [
    [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 1], [0, 0, 1]],
    [[0, 0, 0], [0, 1, 1], [1, 1, 0]],
    [[1, 0, 0], [1, 1, 0], [0, 1, 0]],
  ],
  Z: [
    [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    [[0, 0, 1], [0, 1, 1], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 0], [0, 1, 1]],
    [[0, 1, 0], [1, 1, 0], [1, 0, 0]],
  ],
  J: [
    [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 1], [0, 1, 0], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 1], [0, 0, 1]],
    [[0, 1, 0], [0, 1, 0], [1, 1, 0]],
  ],
  L: [
    [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 0], [0, 1, 1]],
    [[0, 0, 0], [1, 1, 1], [1, 0, 0]],
    [[1, 1, 0], [0, 1, 0], [0, 1, 0]],
  ],
};

export const TETROMINO_COLORS: Record<TetrominoType, string> = {
  I: "#06b6d4", // cyan
  O: "#eab308", // yellow
  T: "#a855f7", // purple
  S: "#22c55e", // green
  Z: "#ef4444", // red
  J: "#3b82f6", // blue
  L: "#f97316", // orange
};

const TETROMINO_TYPES: TetrominoType[] = ["I", "O", "T", "S", "Z", "J", "L"];

function getRandomPiece(): TetrominoType {
  return TETROMINO_TYPES[Math.floor(Math.random() * TETROMINO_TYPES.length)];
}

function createEmptyBoard(): (string | null)[][] {
  return Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null));
}

function createPiece(type: TetrominoType): Tetromino {
  return {
    type,
    shape: TETROMINO_SHAPES[type][0],
    position: { x: Math.floor(BOARD_WIDTH / 2) - Math.floor(TETROMINO_SHAPES[type][0][0].length / 2), y: 0 },
    color: TETROMINO_COLORS[type],
  };
}

function getInitialPosition(type: TetrominoType): Position {
  const shape = TETROMINO_SHAPES[type][0];
  return {
    x: Math.floor(BOARD_WIDTH / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

export function createInitialPlayerState(): PlayerState {
  const first = getRandomPiece();
  const next = getRandomPiece();
  return {
    board: createEmptyBoard(),
    currentPiece: { ...createPiece(first), position: getInitialPosition(first) },
    nextPiece: next,
    score: 0,
    level: 1,
    lines: 0,
    gameOver: false,
    garbageQueue: 0,
  };
}

export function createInitialState(mode: GameMode): TetrisGameState {
  if (mode === "duo") {
    return {
      players: [createInitialPlayerState(), createInitialPlayerState()],
      status: "idle",
      winner: null,
    };
  }
  return {
    players: [createInitialPlayerState()],
    status: "idle",
    winner: null,
  };
}

function isValidPosition(board: (string | null)[][], piece: Tetromino, offsetX: number, offsetY: number, newShape?: number[][]): boolean {
  const shape = newShape || piece.shape;
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        const newX = piece.position.x + x + offsetX;
        const newY = piece.position.y + y + offsetY;
        if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) return false;
        if (newY >= 0 && board[newY][newX] !== null) return false;
      }
    }
  }
  return true;
}

function lockPiece(board: (string | null)[][], piece: Tetromino): (string | null)[][] {
  const newBoard = board.map((row) => [...row]);
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x]) {
        const boardY = piece.position.y + y;
        const boardX = piece.position.x + x;
        if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
          newBoard[boardY][boardX] = piece.color;
        }
      }
    }
  }
  return newBoard;
}

function clearLines(board: (string | null)[][]): { newBoard: (string | null)[][]; linesCleared: number } {
  const newBoard: (string | null)[][] = [];
  let linesCleared = 0;

  for (let y = 0; y < BOARD_HEIGHT; y++) {
    if (board[y].every((cell) => cell !== null)) {
      linesCleared++;
    } else {
      newBoard.push(board[y]);
    }
  }

  while (newBoard.length < BOARD_HEIGHT) {
    newBoard.unshift(Array(BOARD_WIDTH).fill(null));
  }

  return { newBoard, linesCleared };
}

function getScoreForLines(lines: number): number {
  switch (lines) {
    case 1: return 100;
    case 2: return 300;
    case 3: return 600;
    case 4: return 1200;
    default: return 0;
  }
}

function getGarbageLines(lines: number): number {
  // Attack table: 1->0, 2->1, 3->2, 4->4
  switch (lines) {
    case 1: return 0;
    case 2: return 1;
    case 3: return 2;
    case 4: return 4;
    default: return 0;
  }
}

function addGarbageLines(board: (string | null)[][], count: number): (string | null)[][] {
  if (count <= 0) return board;
  const newBoard = board.map((row) => [...row]);
  for (let i = 0; i < count; i++) {
    newBoard.shift();
    const garbageRow = Array(BOARD_WIDTH).fill("#64748b"); // slate-500 for garbage
    // Leave one random hole
    const holeX = Math.floor(Math.random() * BOARD_WIDTH);
    garbageRow[holeX] = null;
    newBoard.push(garbageRow);
  }
  return newBoard;
}

function spawnNewPiece(player: PlayerState): PlayerState {
  const newPiece = createPiece(player.nextPiece);
  newPiece.position = getInitialPosition(player.nextPiece);

  // Check if new piece can be placed
  if (!isValidPosition(player.board, newPiece, 0, 0)) {
    return { ...player, gameOver: true };
  }

  return {
    ...player,
    currentPiece: newPiece,
    nextPiece: getRandomPiece(),
  };
}

function applyGarbage(player: PlayerState): PlayerState {
  if (player.garbageQueue <= 0) return player;
  const newBoard = addGarbageLines(player.board, player.garbageQueue);
  // Check if current piece is still valid after garbage
  if (!isValidPosition(newBoard, player.currentPiece, 0, 0)) {
    return { ...player, board: newBoard, gameOver: true, garbageQueue: 0 };
  }
  return { ...player, board: newBoard, garbageQueue: 0 };
}

export function movePiece(state: TetrisGameState, playerIndex: number, dx: number, dy: number): TetrisGameState {
  if (state.status !== "running") return state;
  const player = state.players[playerIndex];
  if (!player || player.gameOver) return state;

  if (isValidPosition(player.board, player.currentPiece, dx, dy)) {
    const newPlayers = [...state.players];
    newPlayers[playerIndex] = {
      ...player,
      currentPiece: {
        ...player.currentPiece,
        position: {
          x: player.currentPiece.position.x + dx,
          y: player.currentPiece.position.y + dy,
        },
      },
    };
    return { ...state, players: newPlayers };
  }

  // If moving down and blocked, lock the piece
  if (dy > 0) {
    return lockAndSpawn(state, playerIndex);
  }

  return state;
}

// SRS wall kick data
const WALL_KICKS_JLSTZ: Record<string, Position[]> = {
  "0->1": [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
  "1->0": [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
  "1->2": [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
  "2->1": [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
  "2->3": [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],
  "3->2": [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }],
  "3->0": [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }],
  "0->3": [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],
};

const WALL_KICKS_I: Record<string, Position[]> = {
  "0->1": [{ x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: -1 }, { x: 1, y: 2 }],
  "1->0": [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 1 }, { x: -1, y: -2 }],
  "1->2": [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 2 }, { x: 2, y: -1 }],
  "2->1": [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: -2 }, { x: -2, y: 1 }],
  "2->3": [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 1 }, { x: -1, y: -2 }],
  "3->2": [{ x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: -1 }, { x: 1, y: 2 }],
  "3->0": [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: -2 }, { x: -2, y: 1 }],
  "0->3": [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 2 }, { x: 2, y: -1 }],
};

function getRotationState(shape: number[][]): number {
  // Determine rotation state by comparing shape to known rotations
  for (let state = 0; state < 4; state++) {
    for (const type of TETROMINO_TYPES) {
      if (shape.length === TETROMINO_SHAPES[type][state].length) {
        let match = true;
        for (let y = 0; y < shape.length; y++) {
          for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x] !== TETROMINO_SHAPES[type][state][y][x]) {
              match = false;
              break;
            }
          }
          if (!match) break;
        }
        if (match) return state;
      }
    }
  }
  return 0;
}

function getShapeForState(type: TetrominoType, state: number): number[][] {
  return TETROMINO_SHAPES[type][((state % 4) + 4) % 4];
}

export function rotatePiece(state: TetrisGameState, playerIndex: number, clockwise: boolean = true): TetrisGameState {
  if (state.status !== "running") return state;
  const player = state.players[playerIndex];
  if (!player || player.gameOver) return state;

  const currentState = getRotationState(player.currentPiece.shape);
  const newState = clockwise ? (currentState + 1) % 4 : (currentState + 3) % 4;
  const newShape = getShapeForState(player.currentPiece.type, newState);

  const kicks = player.currentPiece.type === "I" ? WALL_KICKS_I : WALL_KICKS_JLSTZ;
  const key = clockwise ? `${currentState}->${newState}` : `${newState}->${currentState}`;
  const kickData = kicks[key] || [{ x: 0, y: 0 }];

  for (const kick of kickData) {
    const kickX = clockwise ? kick.x : -kick.x;
    const kickY = clockwise ? kick.y : -kick.y;
    if (isValidPosition(player.board, player.currentPiece, kickX, kickY, newShape)) {
      const newPlayers = [...state.players];
      newPlayers[playerIndex] = {
        ...player,
        currentPiece: {
          ...player.currentPiece,
          shape: newShape,
          position: {
            x: player.currentPiece.position.x + kickX,
            y: player.currentPiece.position.y + kickY,
          },
        },
      };
      return { ...state, players: newPlayers };
    }
  }

  return state;
}

export function hardDrop(state: TetrisGameState, playerIndex: number): TetrisGameState {
  if (state.status !== "running") return state;
  const player = state.players[playerIndex];
  if (!player || player.gameOver) return state;

  let dropDistance = 0;
  while (isValidPosition(player.board, player.currentPiece, 0, dropDistance + 1)) {
    dropDistance++;
  }

  if (dropDistance > 0) {
    const newPlayers = [...state.players];
    newPlayers[playerIndex] = {
      ...player,
      currentPiece: {
        ...player.currentPiece,
        position: {
          x: player.currentPiece.position.x,
          y: player.currentPiece.position.y + dropDistance,
        },
      },
      score: player.score + dropDistance * 2, // bonus for hard drop
    };
    return lockAndSpawn({ ...state, players: newPlayers }, playerIndex);
  }

  return lockAndSpawn(state, playerIndex);
}

function lockAndSpawn(state: TetrisGameState, playerIndex: number): TetrisGameState {
  const player = state.players[playerIndex];

  // Lock piece
  let newBoard = lockPiece(player.board, player.currentPiece);

  // Clear lines
  const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard);
  newBoard = clearedBoard;

  const scoreGain = getScoreForLines(linesCleared) * player.level;
  const newLines = player.lines + linesCleared;
  const newLevel = Math.floor(newLines / 10) + 1;

  let newPlayer: PlayerState = {
    ...player,
    board: newBoard,
    score: player.score + scoreGain,
    lines: newLines,
    level: newLevel,
  };

  // Spawn new piece
  newPlayer = spawnNewPiece(newPlayer);

  // Apply any pending garbage
  newPlayer = applyGarbage(newPlayer);

  const newPlayers = [...state.players];
  newPlayers[playerIndex] = newPlayer;

  // In duo mode, send garbage to opponent
  if (state.players.length > 1 && linesCleared > 0) {
    const garbage = getGarbageLines(linesCleared);
    if (garbage > 0) {
      const opponentIndex = playerIndex === 0 ? 1 : 0;
      const opponent = newPlayers[opponentIndex];
      if (opponent && !opponent.gameOver) {
        newPlayers[opponentIndex] = {
          ...opponent,
          garbageQueue: opponent.garbageQueue + garbage,
        };
      }
    }
  }

  // Check game over
  let newStatus: GameStatus = state.status;
  let winner: number | null = state.winner;

  if (newPlayers.length === 1) {
    if (newPlayers[0].gameOver) {
      newStatus = "over";
    }
  } else {
    const alivePlayers = newPlayers.filter((p) => !p.gameOver);
    if (alivePlayers.length <= 1) {
      newStatus = "over";
      if (alivePlayers.length === 1) {
        winner = newPlayers.findIndex((p) => !p.gameOver);
      } else {
        // Both dead - higher score wins
        winner = newPlayers[0].score >= newPlayers[1].score ? 0 : 1;
      }
    }
  }

  // Save score on game over
  if (newStatus === "over" && state.status !== "over") {
    newPlayers.forEach((p, idx) => {
      addLeaderboardEntry({
        score: p.score,
        date: new Date().toISOString(),
        mode: newPlayers.length === 1 ? "single" : "duo",
      });
    });
  }

  return { ...state, players: newPlayers, status: newStatus, winner };
}

export function togglePause(state: TetrisGameState): TetrisGameState {
  if (state.status === "running") {
    return { ...state, status: "paused" };
  } else if (state.status === "paused" || state.status === "idle") {
    return { ...state, status: "running" };
  }
  return state;
}

export function resetGame(state: TetrisGameState, mode: GameMode): TetrisGameState {
  return createInitialState(mode);
}

export function getDropInterval(level: number): number {
  // Speed increases with level
  const base = 1000;
  const min = 100;
  return Math.max(min, base - (level - 1) * 80);
}

export function getGhostPosition(board: (string | null)[][], piece: Tetromino): Position {
  let dropDistance = 0;
  while (isValidPosition(board, piece, 0, dropDistance + 1)) {
    dropDistance++;
  }
  return {
    x: piece.position.x,
    y: piece.position.y + dropDistance,
  };
}

// Leaderboard
export interface LeaderboardEntry {
  score: number;
  date: string;
  mode: GameMode;
}

const LEADERBOARD_KEY = "tetris_leaderboard";

export function getLeaderboard(): LeaderboardEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(LEADERBOARD_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addLeaderboardEntry(entry: LeaderboardEntry): void {
  if (typeof window === "undefined") return;
  const board = getLeaderboard();
  board.push(entry);
  board.sort((a, b) => b.score - a.score);
  const trimmed = board.slice(0, 100);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(trimmed));
}

export function getHighScore(mode?: GameMode): number {
  const board = getLeaderboard();
  const filtered = mode ? board.filter((e) => e.mode === mode) : board;
  return filtered.length > 0 ? filtered[0].score : 0;
}

export function getTodayLeaderboard(): LeaderboardEntry[] {
  const board = getLeaderboard();
  const today = new Date().toISOString().split("T")[0];
  return board.filter((e) => e.date.startsWith(today));
}

export function getWeekLeaderboard(): LeaderboardEntry[] {
  const board = getLeaderboard();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return board.filter((e) => new Date(e.date) >= weekAgo);
}

export function getAllTimeLeaderboard(): LeaderboardEntry[] {
  return getLeaderboard();
}

// Key mappings
export const PLAYER1_KEYS: Record<string, string> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowDown: "down",
  ArrowUp: "rotate",
  a: "left",
  A: "left",
  d: "right",
  D: "right",
  s: "down",
  S: "down",
  w: "rotate",
  W: "rotate",
  " ": "hardDrop",
};

export const PLAYER2_KEYS: Record<string, string> = {
  j: "left",
  J: "left",
  l: "right",
  L: "right",
  k: "down",
  K: "down",
  i: "rotate",
  I: "rotate",
  m: "hardDrop",
  M: "hardDrop",
};

export { BOARD_WIDTH, BOARD_HEIGHT };
