export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
export type GameMode = "single" | "duo";
export type GameStatus = "idle" | "running" | "paused" | "over";

export interface Position {
  x: number;
  y: number;
}

export interface Snake {
  body: Position[];
  direction: Direction;
  nextDirection: Direction;
  alive: boolean;
  score: number;
}

export interface Food {
  position: Position;
}

export interface SnakeGameState {
  snakes: Snake[];
  food: Food;
  status: GameStatus;
  winner: number | null; // 0 or 1 for duo mode, null otherwise
  gridSize: number;
}

const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 2;
const MIN_SPEED = 60;

export function getInitialSnakes(mode: GameMode): Snake[] {
  if (mode === "duo") {
    return [
      {
        body: [
          { x: 5, y: 10 },
          { x: 4, y: 10 },
          { x: 3, y: 10 },
        ],
        direction: "RIGHT",
        nextDirection: "RIGHT",
        alive: true,
        score: 0,
      },
      {
        body: [
          { x: 14, y: 10 },
          { x: 15, y: 10 },
          { x: 16, y: 10 },
        ],
        direction: "LEFT",
        nextDirection: "LEFT",
        alive: true,
        score: 0,
      },
    ];
  }
  return [
    {
      body: [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 },
      ],
      direction: "RIGHT",
      nextDirection: "RIGHT",
      alive: true,
      score: 0,
    },
  ];
}

export function generateFood(snakes: Snake[], gridSize: number = GRID_SIZE): Food {
  const occupied = new Set<string>();
  for (const snake of snakes) {
    for (const seg of snake.body) {
      occupied.add(`${seg.x},${seg.y}`);
    }
  }

  const available: Position[] = [];
  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      if (!occupied.has(`${x},${y}`)) {
        available.push({ x, y });
      }
    }
  }

  if (available.length === 0) {
    return { position: { x: 0, y: 0 } };
  }

  const idx = Math.floor(Math.random() * available.length);
  return { position: available[idx] };
}

export function createInitialState(mode: GameMode): SnakeGameState {
  const snakes = getInitialSnakes(mode);
  return {
    snakes,
    food: generateFood(snakes),
    status: "idle",
    winner: null,
    gridSize: GRID_SIZE,
  };
}

function getNextPosition(head: Position, direction: Direction): Position {
  switch (direction) {
    case "UP":
      return { x: head.x, y: head.y - 1 };
    case "DOWN":
      return { x: head.x, y: head.y + 1 };
    case "LEFT":
      return { x: head.x - 1, y: head.y };
    case "RIGHT":
      return { x: head.x + 1, y: head.y };
  }
}

function isOpposite(dir1: Direction, dir2: Direction): boolean {
  return (
    (dir1 === "UP" && dir2 === "DOWN") ||
    (dir1 === "DOWN" && dir2 === "UP") ||
    (dir1 === "LEFT" && dir2 === "RIGHT") ||
    (dir1 === "RIGHT" && dir2 === "LEFT")
  );
}

function isOutOfBounds(pos: Position, gridSize: number): boolean {
  return pos.x < 0 || pos.x >= gridSize || pos.y < 0 || pos.y >= gridSize;
}

function isSelfCollision(snake: Snake, pos: Position): boolean {
  // Exclude tail because it will move
  for (let i = 0; i < snake.body.length - 1; i++) {
    if (snake.body[i].x === pos.x && snake.body[i].y === pos.y) {
      return true;
    }
  }
  return false;
}

function isOtherSnakeCollision(snakes: Snake[], snakeIndex: number, pos: Position): boolean {
  for (let i = 0; i < snakes.length; i++) {
    if (i === snakeIndex) continue;
    for (const seg of snakes[i].body) {
      if (seg.x === pos.x && seg.y === pos.y) {
        return true;
      }
    }
  }
  return false;
}

export function updateGame(state: SnakeGameState): SnakeGameState {
  if (state.status !== "running") return state;

  const newSnakes = state.snakes.map((snake, index) => {
    if (!snake.alive) return snake;

    const direction = snake.nextDirection;
    const head = snake.body[0];
    const newHead = getNextPosition(head, direction);

    // Check wall collision
    if (isOutOfBounds(newHead, state.gridSize)) {
      return { ...snake, alive: false, direction };
    }

    // Check self collision
    if (isSelfCollision(snake, newHead)) {
      return { ...snake, alive: false, direction };
    }

    // Check other snake collision (duo mode)
    if (state.snakes.length > 1 && isOtherSnakeCollision(state.snakes, index, newHead)) {
      return { ...snake, alive: false, direction };
    }

    // Move
    const newBody = [newHead, ...snake.body];

    // Check food
    const ateFood = newHead.x === state.food.position.x && newHead.y === state.food.position.y;
    if (!ateFood) {
      newBody.pop();
    }

    return {
      ...snake,
      body: newBody,
      direction,
      score: ateFood ? snake.score + 10 : snake.score,
    };
  });

  // Check if any snake ate food
  const foodEaten = newSnakes.some(
    (snake) =>
      snake.alive &&
      snake.body[0].x === state.food.position.x &&
      snake.body[0].y === state.food.position.y
  );

  const newFood = foodEaten ? generateFood(newSnakes, state.gridSize) : state.food;

  // Check game over
  const aliveSnakes = newSnakes.filter((s) => s.alive);
  let newStatus: GameStatus = state.status;
  let winner: number | null = state.winner;

  if (newSnakes.length === 1) {
    if (aliveSnakes.length === 0) {
      newStatus = "over";
    }
  } else {
    if (aliveSnakes.length <= 1) {
      newStatus = "over";
      if (aliveSnakes.length === 1) {
        winner = newSnakes.findIndex((s) => s.alive);
      } else {
        // Both dead simultaneously - higher score wins
        winner = newSnakes[0].score >= newSnakes[1].score ? 0 : 1;
      }
    }
  }

  return {
    ...state,
    snakes: newSnakes,
    food: newFood,
    status: newStatus,
    winner,
  };
}

export function changeDirection(state: SnakeGameState, snakeIndex: number, direction: Direction): SnakeGameState {
  const snake = state.snakes[snakeIndex];
  if (!snake || !snake.alive) return state;
  if (isOpposite(snake.direction, direction)) return state;

  const newSnakes = [...state.snakes];
  newSnakes[snakeIndex] = { ...snake, nextDirection: direction };
  return { ...state, snakes: newSnakes };
}

export function togglePause(state: SnakeGameState): SnakeGameState {
  if (state.status === "running") {
    return { ...state, status: "paused" };
  } else if (state.status === "paused" || state.status === "idle") {
    return { ...state, status: "running" };
  }
  return state;
}

export function resetGame(state: SnakeGameState, mode: GameMode): SnakeGameState {
  return createInitialState(mode);
}

export function getGameSpeed(state: SnakeGameState): number {
  const maxScore = Math.max(...state.snakes.map((s) => s.score));
  const speed = INITIAL_SPEED - Math.floor(maxScore / 50) * SPEED_INCREMENT;
  return Math.max(speed, MIN_SPEED);
}

// Leaderboard
export interface LeaderboardEntry {
  score: number;
  date: string;
  mode: GameMode;
}

const LEADERBOARD_KEY = "snake_leaderboard";

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
  // Keep top 100
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

// Key mappings for duo mode
export const PLAYER1_KEYS: Record<string, Direction> = {
  ArrowUp: "UP",
  ArrowDown: "DOWN",
  ArrowLeft: "LEFT",
  ArrowRight: "RIGHT",
  w: "UP",
  W: "UP",
  s: "DOWN",
  S: "DOWN",
  a: "LEFT",
  A: "LEFT",
  d: "RIGHT",
  D: "RIGHT",
};

export const PLAYER2_KEYS: Record<string, Direction> = {
  i: "UP",
  I: "UP",
  k: "DOWN",
  K: "DOWN",
  j: "LEFT",
  J: "LEFT",
  l: "RIGHT",
  L: "RIGHT",
};
