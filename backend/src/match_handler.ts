// =============================================================
// Tic Tac Toe - Server-Authoritative Match Handler for Nakama
// =============================================================

// Op codes for real-time communication
const OpCode = {
  PLAYER_MOVE: 1,
  STATE_UPDATE: 2,
  GAME_OVER: 3,
  TIMER_UPDATE: 4,
  REMATCH_REQUEST: 5,
  REMATCH_ACCEPT: 6,
} as const;

// Win conditions: rows, columns, diagonals
const WIN_COMBINATIONS: number[][] = [
  [0, 1, 2], // top row
  [3, 4, 5], // middle row
  [6, 7, 8], // bottom row
  [0, 3, 6], // left column
  [1, 4, 7], // middle column
  [2, 5, 8], // right column
  [0, 4, 8], // diagonal top-left to bottom-right
  [2, 4, 6], // diagonal top-right to bottom-left
];

// Turn timer defaults to 30 seconds per turn (can be overridden per match)
const DEFAULT_TURN_TIMEOUT_SEC = 30;
const TICK_RATE = 5; // ticks per second
const TIMER_BROADCAST_INTERVAL = 5; // broadcast timer every N ticks (1 second)

// Score computation constants
const BASE_WIN_SCORE = 100;
const STREAK_BONUS = 10;
const FAST_WIN_BONUS_THRESHOLD = 15; // seconds
const FAST_WIN_BONUS = 50;

// ---- Helper Functions ----

/** Check if a player has won. Returns the winning mark (1 or 2) or 0 if no winner. */
function checkWinner(board: number[]): number {
  for (const combo of WIN_COMBINATIONS) {
    const [a, b, c] = combo;
    if (board[a] !== 0 && board[a] === board[b] && board[b] === board[c]) {
      return board[a];
    }
  }
  return 0;
}

/** Check if the board is a draw (all cells filled, no winner). */
function isDraw(board: number[]): boolean {
  return board.every((cell) => cell !== 0) && checkWinner(board) === 0;
}

/** Compute score for a win. */
function computeScore(winStreak: number, durationSeconds: number): number {
  let score = BASE_WIN_SCORE;
  score += winStreak * STREAK_BONUS;
  if (durationSeconds <= FAST_WIN_BONUS_THRESHOLD) {
    score += FAST_WIN_BONUS;
  }
  return score;
}

// ---- Game State Interface ----
interface GameState {
  board: number[];          // 0 = empty, 1 = player 1 (X), 2 = player 2 (O)
  currentPlayer: number;    // 1 or 2
  players: { [key: number]: string }; // { 1: sessionId, 2: sessionId }
  playerUserIds: { [key: number]: string }; // { 1: userId, 2: userId }
  presences: { [sessionId: string]: nkruntime.Presence };
  winner: number | null;    // 1, 2, or null
  moveCount: number;
  startTime: number;        // Unix timestamp (seconds)
  gameOver: boolean;
  timedMode: boolean;
  turnTimeoutSec: number;
  turnStartTick: number;    // tick when current turn started
  tickCount: number;        // total ticks elapsed
  rematchRequests: string[]; // session IDs that requested rematch
}

function countPlayers(state: GameState): number {
  let count = 0;
  if (state.players[1]) count++;
  if (state.players[2]) count++;
  return count;
}

// ---- Match Handler Functions ----

const matchInit: nkruntime.MatchInitFunction = function (
  _ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  _nk: nkruntime.Nakama,
  params: { [key: string]: string }
): { state: nkruntime.MatchState; tickRate: number; label: string } {
  const timedMode = params["timed"] === "true";
  const requestedTimeout = Number(params["turnTimeoutSec"]);
  const turnTimeoutSec = isFinite(requestedTimeout)
    ? Math.max(5, Math.min(60, Math.floor(requestedTimeout)))
    : DEFAULT_TURN_TIMEOUT_SEC;

  const state: GameState = {
    board: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    currentPlayer: 1,
    players: {},
    playerUserIds: {},
    presences: {},
    winner: null,
    moveCount: 0,
    startTime: 0,
    gameOver: false,
    timedMode,
    turnTimeoutSec,
    turnStartTick: 0,
    tickCount: 0,
    rematchRequests: [],
  };

  const label = JSON.stringify({
    open: true,
    timedMode,
    turnTimeoutSec,
    playerCount: 0,
  });

  logger.info("Match initialized. Timed mode: %s, turn timeout: %d", timedMode.toString(), turnTimeoutSec);
  return { state, tickRate: TICK_RATE, label };
};

const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction = function (
  _ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  _nk: nkruntime.Nakama,
  _dispatcher: nkruntime.MatchDispatcher,
  _tick: number,
  state: nkruntime.MatchState,
  presence: nkruntime.Presence,
  _metadata: { [key: string]: string }
): { state: nkruntime.MatchState; accept: boolean; rejectMessage?: string } {
  const s = state as GameState;

  // Reject if game already started or full
  const playerCount = countPlayers(s);
  if (playerCount >= 2) {
    logger.warn("Rejecting join attempt from %s: match full", presence.userId);
    return { state: s, accept: false, rejectMessage: "Match is full" };
  }

  if (s.gameOver) {
    logger.warn("Rejecting join attempt from %s: game over", presence.userId);
    return { state: s, accept: false, rejectMessage: "Match has ended" };
  }

  // Reject duplicate presence
  if (s.presences[presence.sessionId]) {
    logger.warn("Rejecting duplicate join from %s", presence.userId);
    return { state: s, accept: false, rejectMessage: "Already joined" };
  }

  return { state: s, accept: true };
};

const matchJoin: nkruntime.MatchJoinFunction = function (
  _ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  _nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  presences: nkruntime.Presence[]
): { state: nkruntime.MatchState } | null {
  const s = state as GameState;

  for (const presence of presences) {
    let playerNumber = 0;
    if (!s.players[1]) playerNumber = 1;
    else if (!s.players[2]) playerNumber = 2;

    if (playerNumber === 0) {
      logger.warn("Too many players attempted to join");
      continue;
    }

    s.players[playerNumber] = presence.sessionId;
    s.playerUserIds[playerNumber] = presence.userId;
    s.presences[presence.sessionId] = presence;
    logger.info("Player %d joined: %s", playerNumber, presence.userId);
  }

  const currentPlayerCount = countPlayers(s);

  // Update match label
  const label = JSON.stringify({
    open: currentPlayerCount < 2,
    timedMode: s.timedMode,
    turnTimeoutSec: s.turnTimeoutSec,
    playerCount: currentPlayerCount,
  });
  dispatcher.matchLabelUpdate(label);

  // If both players have joined, start the game
  if (currentPlayerCount === 2) {
    s.startTime = Math.floor(Date.now() / 1000);
    s.turnStartTick = tick;

    logger.info("Both players joined. Starting game.");
    broadcastState(dispatcher, s);
  }

  return { state: s };
};

const matchLeave: nkruntime.MatchLeaveFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  presences: nkruntime.Presence[]
): { state: nkruntime.MatchState } | null {
  const s = state as GameState;

  for (const presence of presences) {
    logger.info("Player left: %s", presence.userId);
    delete s.presences[presence.sessionId];

    const leavingPlayerNum = getPlayerNumber(s, presence.sessionId);
    if (leavingPlayerNum > 0) {
      delete s.players[leavingPlayerNum];
      delete s.playerUserIds[leavingPlayerNum];
    }

    // If game is in progress and a player leaves, opponent wins
    if (!s.gameOver && leavingPlayerNum > 0) {
      const winnerNum = leavingPlayerNum === 1 ? 2 : 1;
      if (s.players[winnerNum]) {
        s.winner = winnerNum;
        s.gameOver = true;

        logger.info("Player %d disconnected. Player %d wins by forfeit.", leavingPlayerNum, winnerNum);

        broadcastGameOver(dispatcher, s, "disconnect");
        finalizeMatch(ctx, nk, logger, s);
      }
    }
  }

  const playerCount = countPlayers(s);
  const label = JSON.stringify({
    open: playerCount < 2,
    timedMode: s.timedMode,
    turnTimeoutSec: s.turnTimeoutSec,
    playerCount,
  });
  dispatcher.matchLabelUpdate(label);

  // If all players left, end match
  if (Object.keys(s.presences).length === 0) {
    logger.info("All players left. Terminating match.");
    return null;
  }

  return { state: s };
};

const matchLoop: nkruntime.MatchLoopFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: nkruntime.MatchState,
  messages: nkruntime.MatchMessage[]
): { state: nkruntime.MatchState } | null {
  const s = state as GameState;
  s.tickCount = tick;

  // Don't process if game hasn't started or is over
  if (Object.keys(s.players).length < 2 || s.gameOver) {
    return { state: s };
  }

  // Process player moves
  for (const message of messages) {
    if (message.opCode === OpCode.PLAYER_MOVE) {
      processMove(ctx, nk, logger, dispatcher, tick, s, message);
    } else if (message.opCode === OpCode.REMATCH_REQUEST) {
      processRematchRequest(logger, dispatcher, tick, s, message);
    }
  }

  // Timer logic for timed mode
  if (s.timedMode && !s.gameOver) {
    const elapsedTicks = tick - s.turnStartTick;
    const elapsedSeconds = elapsedTicks / TICK_RATE;
    const remainingSeconds = Math.max(0, state.turnTimeoutSec - elapsedSeconds);

    // Broadcast timer periodically
    if (tick % TIMER_BROADCAST_INTERVAL === 0) {
      broadcastTimer(dispatcher, s, remainingSeconds);
    }

    // Auto-forfeit if time expired
    if (remainingSeconds <= 0) {
      const winnerNum = s.currentPlayer === 1 ? 2 : 1;
      s.winner = winnerNum;
      s.gameOver = true;

      logger.info("Player %d timed out in %d second turn limit. Player %d wins.", s.currentPlayer, s.turnTimeoutSec, winnerNum);

      broadcastGameOver(dispatcher, s, "timeout");
      finalizeMatch(ctx, nk, logger, s);
    }
  }

  return { state: s };
};

const matchTerminate: nkruntime.MatchTerminateFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  dispatcher: nkruntime.MatchDispatcher,
  _tick: number,
  state: nkruntime.MatchState,
  _graceSeconds: number
): { state: nkruntime.MatchState } | null {
  const s = state as GameState;

  if (!s.gameOver && Object.keys(s.players).length === 2) {
    // Force draw if server is shutting down
    s.gameOver = true;
    broadcastGameOver(dispatcher, s, "terminated");
    finalizeMatch(ctx, nk, logger, s);
  }

  logger.info("Match terminated.");
  return null;
};

const matchSignal: nkruntime.MatchSignalFunction = function (
  _ctx: nkruntime.Context,
  _logger: nkruntime.Logger,
  _nk: nkruntime.Nakama,
  _dispatcher: nkruntime.MatchDispatcher,
  _tick: number,
  state: nkruntime.MatchState,
  _data: string
): { state: nkruntime.MatchState; data?: string } | null {
  return { state, data: "signal_received" };
};

// ---- Move Processing ----

function processMove(
  ctx: nkruntime.Context,
  nk: nkruntime.Nakama,
  logger: nkruntime.Logger,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: GameState,
  message: nkruntime.MatchMessage
): void {
  const senderSessionId = message.sender.sessionId;
  const playerNum = getPlayerNumber(state, senderSessionId);

  // Validate it's a known player
  if (playerNum === 0) {
    logger.warn("Unknown player tried to move: %s", senderSessionId);
    return;
  }

  // Validate turn order
  if (playerNum !== state.currentPlayer) {
    logger.warn("Player %d tried to move out of turn", playerNum);
    sendError(dispatcher, message.sender, "Not your turn");
    return;
  }

  // Parse move data
  let moveData: { position: number };
  try {
    moveData = JSON.parse(new TextDecoder().decode(message.data));
  } catch {
    logger.warn("Invalid move data from player %d", playerNum);
    sendError(dispatcher, message.sender, "Invalid move data");
    return;
  }

  const position = moveData.position;

  // Validate position range
  if (typeof position !== "number" || position < 0 || position > 8 || position % 1 !== 0) {
    logger.warn("Invalid position %d from player %d", position, playerNum);
    sendError(dispatcher, message.sender, "Invalid position");
    return;
  }

  // Validate cell is empty (prevent duplicate moves)
  if (state.board[position] !== 0) {
    logger.warn("Player %d tried to move to occupied cell %d", playerNum, position);
    sendError(dispatcher, message.sender, "Cell already occupied");
    return;
  }

  // Apply the move
  state.board[position] = playerNum;
  state.moveCount++;

  logger.info("Player %d placed at position %d (move #%d)", playerNum, position, state.moveCount);

  // Check for win
  const winner = checkWinner(state.board);
  if (winner > 0) {
    state.winner = winner;
    state.gameOver = true;
    logger.info("Player %d wins!", winner);
    broadcastState(dispatcher, state);
    broadcastGameOver(dispatcher, state, "win");
    finalizeMatch(ctx, nk, logger, state);
    return;
  }

  // Check for draw
  if (isDraw(state.board)) {
    state.gameOver = true;
    logger.info("Game ended in a draw.");
    broadcastState(dispatcher, state);
    broadcastGameOver(dispatcher, state, "draw");
    finalizeMatch(ctx, nk, logger, state);
    return;
  }

  // Switch turns
  state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
  state.turnStartTick = tick;

  // Broadcast updated state
  broadcastState(dispatcher, state);
}

// ---- Rematch Processing ----

function processRematchRequest(
  logger: nkruntime.Logger,
  dispatcher: nkruntime.MatchDispatcher,
  tick: number,
  state: GameState,
  message: nkruntime.MatchMessage
): void {
  if (!state.gameOver) return;

  const senderSessionId = message.sender.sessionId;
  if (state.rematchRequests.indexOf(senderSessionId) >= 0) return;

  state.rematchRequests.push(senderSessionId);
  logger.info("Session %s requested rematch (%d/2)", senderSessionId, state.rematchRequests.length);

  // Notify opponent
  dispatcher.broadcastMessage(
    OpCode.REMATCH_REQUEST,
    JSON.stringify({ sessionId: senderSessionId, count: state.rematchRequests.length })
  );

  // Both players requested: reset the game
  if (state.rematchRequests.length === 2) {
    state.board = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    // Swap who goes first
    const temp = state.players[1];
    state.players[1] = state.players[2];
    state.players[2] = temp;
    const tempUserId = state.playerUserIds[1];
    state.playerUserIds[1] = state.playerUserIds[2];
    state.playerUserIds[2] = tempUserId;
    state.currentPlayer = 1;
    state.winner = null;
    state.moveCount = 0;
    state.startTime = Math.floor(Date.now() / 1000);
    state.gameOver = false;
    state.turnStartTick = tick;
    state.rematchRequests = [];

    logger.info("Rematch started! Player order swapped.");
    broadcastState(dispatcher, state);
  }
}

// ---- Broadcasting ----

function broadcastState(dispatcher: nkruntime.MatchDispatcher, state: GameState): void {
  const data = JSON.stringify({
    board: state.board,
    currentPlayer: state.currentPlayer,
    players: state.playerUserIds,
    moveCount: state.moveCount,
    gameOver: state.gameOver,
    winner: state.winner,
    timedMode: state.timedMode,
  });

  dispatcher.broadcastMessage(OpCode.STATE_UPDATE, data);
}

function broadcastGameOver(
  dispatcher: nkruntime.MatchDispatcher,
  state: GameState,
  reason: string
): void {
  const winnerId = state.winner ? state.playerUserIds[state.winner] : null;
  const duration = state.startTime > 0 ? Math.floor(Date.now() / 1000) - state.startTime : 0;

  const data = JSON.stringify({
    winner: state.winner,
    winnerId,
    reason,
    board: state.board,
    moveCount: state.moveCount,
    duration,
  });

  dispatcher.broadcastMessage(OpCode.GAME_OVER, data);
}

function broadcastTimer(
  dispatcher: nkruntime.MatchDispatcher,
  state: GameState,
  remainingSeconds: number
): void {
  const data = JSON.stringify({
    currentPlayer: state.currentPlayer,
    remainingSeconds: Math.round(remainingSeconds * 10) / 10,
  });

  dispatcher.broadcastMessage(OpCode.TIMER_UPDATE, data);
}

function sendError(
  dispatcher: nkruntime.MatchDispatcher,
  presence: nkruntime.Presence,
  message: string
): void {
  const data = JSON.stringify({ error: message });
  dispatcher.broadcastMessage(
    OpCode.STATE_UPDATE,
    data,
    [presence]
  );
}

// ---- Utilities ----

function getPlayerNumber(state: GameState, sessionId: string): number {
  if (state.players[1] === sessionId) return 1;
  if (state.players[2] === sessionId) return 2;
  return 0;
}

// ---- Post-Match Finalization ----

function finalizeMatch(
  ctx: nkruntime.Context,
  nk: nkruntime.Nakama,
  logger: nkruntime.Logger,
  state: GameState
): void {
  const duration = state.startTime > 0 ? Math.floor(Date.now() / 1000) - state.startTime : 0;
  const player1Id = state.playerUserIds[1];
  const player2Id = state.playerUserIds[2];

  if (!player1Id || !player2Id) {
    logger.warn("Cannot finalize match: missing player IDs");
    return;
  }

  const winnerId = state.winner ? state.playerUserIds[state.winner] : null;
  let loserSlot = 0;
  if (state.winner === 1) loserSlot = 2;
  if (state.winner === 2) loserSlot = 1;
  const loserId = loserSlot > 0 ? state.playerUserIds[loserSlot] : null;

  // Store match history
  try {
    const query = `
      INSERT INTO match_history (player1_id, player2_id, winner_id, moves_count, duration_seconds)
      VALUES ($1, $2, $3, $4, $5)
    `;
    nk.sqlExec(query, [player1Id, player2Id, winnerId, state.moveCount, duration]);
    logger.info("Match history saved.");
  } catch (error) {
    logger.error("Failed to save match history: %s", error);
  }

  // Update game stats for both players
  if (state.winner && winnerId && loserId) {
    updatePlayerStats(nk, logger, winnerId, "win", duration);
    updatePlayerStats(nk, logger, loserId, "loss", duration);

    // Update leaderboard
    try {
      // Get current win streak for score calculation
      const statsRows = nk.sqlQuery(
        "SELECT win_streak FROM game_stats WHERE user_id = $1",
        [winnerId]
      );
      const winStreak = statsRows.length > 0 ? (statsRows[0].win_streak as number) : 1;
      const score = computeScore(winStreak, duration);

      nk.leaderboardRecordWrite(
        "global_leaderboard",
        winnerId,
        undefined,
        score,
        0,
        { wins: winStreak, duration }
      );
      logger.info("Leaderboard updated for winner %s with score %d", winnerId, score);
    } catch (error) {
      logger.error("Failed to update leaderboard: %s", error);
    }
  } else if (state.winner) {
    logger.warn("Cannot update winner/loser stats due to missing player IDs");
  } else {
    // Draw
    updatePlayerStats(nk, logger, player1Id, "draw", duration);
    updatePlayerStats(nk, logger, player2Id, "draw", duration);
  }
}

function updatePlayerStats(
  nk: nkruntime.Nakama,
  logger: nkruntime.Logger,
  userId: string,
  result: "win" | "loss" | "draw",
  duration: number
): void {
  try {
    // Ensure user profile exists
    nk.sqlExec(
      `INSERT INTO users_profile (user_id, username) VALUES ($1, $2)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, userId]
    );

    // Ensure game_stats row exists
    nk.sqlExec(
      `INSERT INTO game_stats (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    if (result === "win") {
      nk.sqlExec(
        `UPDATE game_stats SET
          wins = wins + 1,
          win_streak = win_streak + 1,
          best_win_streak = GREATEST(best_win_streak, win_streak + 1),
          fastest_win_time = CASE
            WHEN fastest_win_time IS NULL THEN $2
            WHEN $2 < fastest_win_time THEN $2
            ELSE fastest_win_time
          END,
          updated_at = NOW()
        WHERE user_id = $1`,
        [userId, duration]
      );
    } else if (result === "loss") {
      nk.sqlExec(
        `UPDATE game_stats SET
          losses = losses + 1,
          win_streak = 0,
          updated_at = NOW()
        WHERE user_id = $1`,
        [userId]
      );
    } else {
      nk.sqlExec(
        `UPDATE game_stats SET
          draws = draws + 1,
          win_streak = 0,
          updated_at = NOW()
        WHERE user_id = $1`,
        [userId]
      );
    }

    logger.info("Stats updated for %s: %s", userId, result);
  } catch (error) {
    logger.error("Failed to update stats for %s: %s", userId, error);
  }
}

// ---- Exports ----
// These are registered in main.ts
export {
  matchInit,
  matchJoinAttempt,
  matchJoin,
  matchLeave,
  matchLoop,
  matchTerminate,
  matchSignal,
  checkWinner,
  isDraw,
  computeScore,
  OpCode,
  GameState,
  DEFAULT_TURN_TIMEOUT_SEC,
};
