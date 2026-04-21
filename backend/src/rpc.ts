// =============================================================
// Tic Tac Toe - RPC Functions for Nakama
// =============================================================

/**
 * RPC: create_match
 * Creates a new match that can be joined by another player.
 * Payload (optional): { "timed": true, "turnTimeoutSec": 30 }
 */
const rpcCreateMatch: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  let timedMode = false;
  let turnTimeoutSec = 30;
  if (payload) {
    try {
      const data = JSON.parse(payload);
      timedMode = data.timed === true;
      if (typeof data.turnTimeoutSec === "number" && isFinite(data.turnTimeoutSec)) {
        turnTimeoutSec = Math.max(5, Math.min(60, Math.floor(data.turnTimeoutSec)));
      }
    } catch {
      throw Error("Invalid JSON payload");
    }
  }

  const matchId = nk.matchCreate("tic_tac_toe", {
    timed: timedMode ? "true" : "false",
    turnTimeoutSec: turnTimeoutSec.toString(),
    symbolSelect: "true",
  });

  logger.info("Match created via RPC by %s: %s", ctx.userId, matchId);

  return JSON.stringify({ matchId });
};

/**
 * RPC: join_match
 * Finds an open match or returns an error.
 * Payload: { "matchId": "...", "timed": true } or {} for auto-find
 */
const rpcJoinMatch: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  if (!ctx.userId) {
    throw Error("Authentication required");
  }

  let matchId: string | null = null;
  let timedMode = false;

  if (payload) {
    try {
      const data = JSON.parse(payload);
      if (data.matchId && typeof data.matchId === "string") {
        matchId = data.matchId;
      }
      if (typeof data.timed === "boolean") {
        timedMode = data.timed;
      }
    } catch {
      throw Error("Invalid JSON payload");
    }
  }

  // If no specific match requested, try to find an open one
  if (!matchId) {
    const limit = 10;
    const isAuthoritative = true;
    const label = "";
    const minSize = 1; // at least 1 player already
    const maxSize = 1; // but not full yet
    const query = timedMode
      ? "+label.open:true +label.timedMode:true"
      : "+label.open:true +label.timedMode:false";
    const matches = nk.matchList(limit, isAuthoritative, label, minSize, maxSize, query);

    if (matches.length > 0) {
      matchId = matches[0].matchId;
      logger.info("Found open match for %s: %s", ctx.userId, matchId);
    } else {
      // No open match found, create a new one
      matchId = nk.matchCreate("tic_tac_toe", {
        timed: timedMode ? "true" : "false",
        turnTimeoutSec: "30",
      });
      logger.info("No open match found. Created new match for %s: %s", ctx.userId, matchId);
    }
  }

  return JSON.stringify({ matchId });
};

/**
 * RPC: get_leaderboard
 * Returns the global leaderboard entries.
 * Payload (optional): { "limit": 20, "cursor": "..." }
 */
const rpcGetLeaderboard: nkruntime.RpcFunction = function (
  _ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  let limit = 20;
  let cursor: string | undefined;

  if (payload) {
    try {
      const data = JSON.parse(payload);
      if (typeof data.limit === "number" && data.limit > 0 && data.limit <= 100) {
        limit = data.limit;
      }
      if (typeof data.cursor === "string") {
        cursor = data.cursor;
      }
    } catch {
      throw Error("Invalid JSON payload");
    }
  }

  const leaderboardId = "global_leaderboard";
  const ownerIds: string[] = [];
  const overrideExpiry = 0;

  const result = nk.leaderboardRecordsList(
    leaderboardId,
    ownerIds,
    limit,
    cursor,
    overrideExpiry
  );

  const records = (result.records || []).map((r) => ({
    ownerId: r.ownerId,
    username: r.username,
    score: r.score,
    subscore: r.subscore,
    metadata: r.metadata,
    rank: r.rank,
    updateTime: r.updateTime,
  }));

  logger.info("Leaderboard fetched: %d records", records.length);

  return JSON.stringify({
    records,
    nextCursor: result.nextCursor || null,
    prevCursor: result.prevCursor || null,
  });
};

/**
 * RPC: get_player_stats
 * Returns game stats for the authenticated user or a specified user.
 * Payload (optional): { "userId": "..." }
 */
const rpcGetPlayerStats: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  if (!ctx.userId) {
    throw Error("Authentication required");
  }

  let targetUserId = ctx.userId;

  if (payload) {
    try {
      const data = JSON.parse(payload);
      if (typeof data.userId === "string" && data.userId.length > 0) {
        // Validate UUID format
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.userId)) {
          targetUserId = data.userId;
        } else {
          throw Error("Invalid userId format");
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message === "Invalid userId format") throw e;
      throw Error("Invalid JSON payload");
    }
  }

  // Query game stats
  const profileRows = nk.sqlQuery(
    "SELECT username FROM users_profile WHERE user_id = $1",
    [targetUserId]
  );
  const profileUsername = profileRows.length > 0
    ? (profileRows[0].username as string)
    : null;

  const statsRows = nk.sqlQuery(
    `SELECT wins, losses, draws, highest_score, win_streak, best_win_streak,
            fastest_win_time, updated_at
     FROM game_stats WHERE user_id = $1`,
    [targetUserId]
  );

  let onlineWins = 0, onlineLosses = 0, onlineDraws = 0;
  let onlineHighestScore = 0, onlineWinStreak = 0, onlineBestWinStreak = 0;
  let onlineFastestWinTime: number | null = null;

  if (statsRows.length > 0) {
    const s = statsRows[0];
    onlineWins = s.wins as number;
    onlineLosses = s.losses as number;
    onlineDraws = s.draws as number;
    onlineHighestScore = s.highest_score as number;
    onlineWinStreak = s.win_streak as number;
    onlineBestWinStreak = s.best_win_streak as number;
    onlineFastestWinTime = s.fastest_win_time as number | null;
  }

  const onlineTotal = onlineWins + onlineLosses + onlineDraws;
  const onlineWinRate = onlineTotal > 0 ? Math.round((onlineWins / onlineTotal) * 1000) / 10 : 0;

  // Fetch AI stats
  const aiRows = nk.sqlQuery(
    `SELECT wins, losses, draws, win_streak, best_win_streak,
            games_easy, wins_easy, games_medium, wins_medium, games_hard, wins_hard
     FROM ai_game_stats WHERE user_id = $1`,
    [targetUserId]
  );

  let aiStats: {
    wins: number; losses: number; draws: number;
    winStreak: number; bestWinStreak: number; totalGames: number; winRate: number;
    gamesEasy: number; winsEasy: number;
    gamesMedium: number; winsMedium: number;
    gamesHard: number; winsHard: number;
  };

  if (aiRows.length > 0) {
    const ai = aiRows[0];
    const aiWins = ai.wins as number;
    const aiLosses = ai.losses as number;
    const aiDraws = ai.draws as number;
    const aiTotal = aiWins + aiLosses + aiDraws;
    aiStats = {
      wins: aiWins, losses: aiLosses, draws: aiDraws,
      winStreak: ai.win_streak as number,
      bestWinStreak: ai.best_win_streak as number,
      totalGames: aiTotal,
      winRate: aiTotal > 0 ? Math.round((aiWins / aiTotal) * 1000) / 10 : 0,
      gamesEasy: ai.games_easy as number, winsEasy: ai.wins_easy as number,
      gamesMedium: ai.games_medium as number, winsMedium: ai.wins_medium as number,
      gamesHard: ai.games_hard as number, winsHard: ai.wins_hard as number,
    };
  } else {
    aiStats = { wins: 0, losses: 0, draws: 0, winStreak: 0, bestWinStreak: 0, totalGames: 0, winRate: 0, gamesEasy: 0, winsEasy: 0, gamesMedium: 0, winsMedium: 0, gamesHard: 0, winsHard: 0 };
  }

  logger.info("Stats fetched for user %s", targetUserId);

  return JSON.stringify({
    userId: targetUserId,
    username: profileUsername,
    online: {
      wins: onlineWins, losses: onlineLosses, draws: onlineDraws,
      highestScore: onlineHighestScore,
      winStreak: onlineWinStreak,
      bestWinStreak: onlineBestWinStreak,
      fastestWinTime: onlineFastestWinTime,
      totalGames: onlineTotal, winRate: onlineWinRate,
    },
    ai: aiStats,
  });
};

/**
 * RPC: set_username
 * Sets or updates the user's display name.
 * Payload: { "username": "..." }
 */
const rpcSetUsername: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  if (!ctx.userId) {
    throw Error("Authentication required");
  }

  if (!payload) {
    throw Error("Payload required");
  }

  let username: string;
  try {
    const data = JSON.parse(payload);
    if (typeof data.username !== "string" || data.username.trim().length === 0) {
      throw Error("Username is required");
    }
    username = data.username.trim();
  } catch (e) {
    if (e instanceof Error && e.message === "Username is required") throw e;
    throw Error("Invalid JSON payload");
  }

  // Validate username: alphanumeric, underscores, 3-20 chars
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    throw Error("Username must be 3-20 characters, alphanumeric and underscores only");
  }

  // Upsert into users_profile
  try {
    nk.sqlExec(
      `INSERT INTO users_profile (user_id, username)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET username = $2`,
      [ctx.userId, username]
    );
  } catch (error) {
    // Check for unique constraint violation
    const errStr = String(error);
    if (errStr.indexOf("unique") >= 0 || errStr.indexOf("duplicate") >= 0) {
      throw Error("Username already taken");
    }
    throw error;
  }

  // Also update Nakama's built-in username
  try {
    nk.accountUpdateId(ctx.userId, undefined, username);
  } catch (error) {
    logger.warn("Failed to update Nakama account username: %s", error);
  }

  logger.info("Username set for %s: %s", ctx.userId, username);

  return JSON.stringify({ success: true, username });
};

/**
 * RPC: get_match_history
 * Returns recent match history for the authenticated user.
 * Payload (optional): { "limit": 20and }
 */
const rpcGetMatchHistory: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  if (!ctx.userId) {
    throw Error("Authentication required");
  }

  let limit = 20;
  if (payload) {
    try {
      const data = JSON.parse(payload);
      if (typeof data.limit === "number" && data.limit > 0 && data.limit <= 100) {
        limit = data.limit;
      }
    } catch {
      throw Error("Invalid JSON payload");
    }
  }

  const rows = nk.sqlQuery(
    `SELECT match_id, player1_id, player2_id, winner_id, moves_count,
            duration_seconds, created_at
     FROM match_history
     WHERE player1_id = $1 OR player2_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [ctx.userId, limit]
  );

  const matches = rows.map((row) => ({
    matchId: row.match_id,
    player1Id: row.player1_id,
    player2Id: row.player2_id,
    winnerId: row.winner_id,
    movesCount: row.moves_count,
    durationSeconds: row.duration_seconds,
    createdAt: row.created_at,
    result:
      row.winner_id === ctx.userId
        ? "win"
        : row.winner_id === null
        ? "draw"
        : "loss",
  }));

  logger.info("Match history fetched for %s: %d records", ctx.userId, matches.length);

  return JSON.stringify({ matches });
};

/**
 * RPC: record_ai_game
 * Records an AI game result into ai_game_stats.
 * Payload: { "result": "win"|"lose"|"draw", "difficulty": "easy"|"medium"|"hard" }
 */
const rpcRecordAiGame: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  if (!ctx.userId) {
    throw new Error("Authentication required");
  }

  if (!payload) {
    throw new Error("Payload required");
  }

  let result: string;
  let difficulty: string;
  try {
    const data = JSON.parse(payload);
    result = data.result;
    difficulty = data.difficulty;
  } catch {
    throw new Error("Invalid JSON payload");
  }

  if (result !== "win" && result !== "lose" && result !== "draw") {
    throw new Error("Invalid result. Must be win, lose, or draw");
  }
  if (difficulty !== "easy" && difficulty !== "medium" && difficulty !== "hard") {
    throw new Error("Invalid difficulty. Must be easy, medium, or hard");
  }

  // Ensure user profile exists
  nk.sqlExec(
    `INSERT INTO users_profile (user_id, username) VALUES ($1, $2)
     ON CONFLICT (user_id) DO NOTHING`,
    [ctx.userId, ctx.userId]
  );

  // Ensure ai_game_stats row exists
  nk.sqlExec(
    `INSERT INTO ai_game_stats (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [ctx.userId]
  );

  const diffGamesCol = "games_" + difficulty;
  const diffWinsCol = "wins_" + difficulty;

  if (result === "win") {
    nk.sqlExec(
      `UPDATE ai_game_stats SET
        wins = wins + 1,
        win_streak = win_streak + 1,
        best_win_streak = GREATEST(best_win_streak, win_streak + 1),
        ${diffGamesCol} = ${diffGamesCol} + 1,
        ${diffWinsCol} = ${diffWinsCol} + 1,
        updated_at = NOW()
      WHERE user_id = $1`,
      [ctx.userId]
    );
  } else if (result === "lose") {
    nk.sqlExec(
      `UPDATE ai_game_stats SET
        losses = losses + 1,
        win_streak = 0,
        ${diffGamesCol} = ${diffGamesCol} + 1,
        updated_at = NOW()
      WHERE user_id = $1`,
      [ctx.userId]
    );
  } else {
    nk.sqlExec(
      `UPDATE ai_game_stats SET
        draws = draws + 1,
        win_streak = 0,
        ${diffGamesCol} = ${diffGamesCol} + 1,
        updated_at = NOW()
      WHERE user_id = $1`,
      [ctx.userId]
    );
  }

  logger.info("AI game recorded for %s: %s on %s", ctx.userId, result, difficulty);

  return JSON.stringify({ success: true });
};

/**
 * RPC: get_wins_leaderboard
 * Returns a global leaderboard ranked by online wins (excluding AI games).
 * Also returns the current user's rank.
 * Payload (optional): { "limit": 20 }
 */
const rpcGetWinsLeaderboard: nkruntime.RpcFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  payload: string
): string {
  if (!ctx.userId) {
    throw Error("Authentication required");
  }

  let limit = 20;
  if (payload) {
    try {
      const data = JSON.parse(payload);
      if (typeof data.limit === "number" && data.limit > 0 && data.limit <= 100) {
        limit = data.limit;
      }
    } catch {
      throw Error("Invalid JSON payload");
    }
  }

  // Get top players ranked by online wins
  const rows = nk.sqlQuery(
    `SELECT gs.user_id, up.username, gs.wins, gs.losses, gs.draws
     FROM game_stats gs
     JOIN users_profile up ON gs.user_id = up.user_id
     WHERE gs.wins > 0
     ORDER BY gs.wins DESC, gs.losses ASC
     LIMIT $1`,
    [limit]
  );

  const records = rows.map((row, index) => ({
    rank: index + 1,
    userId: row.user_id as string,
    username: row.username as string,
    wins: row.wins as number,
    losses: row.losses as number,
    draws: row.draws as number,
  }));

  // Get current user's rank
  let myRank: number | null = null;
  let myWins = 0;
  const myStatsRows = nk.sqlQuery(
    "SELECT wins FROM game_stats WHERE user_id = $1",
    [ctx.userId]
  );
  if (myStatsRows.length > 0) {
    myWins = myStatsRows[0].wins as number;
    if (myWins > 0) {
      const rankRows = nk.sqlQuery(
        `SELECT COUNT(*) + 1 as rank FROM game_stats WHERE wins > $1`,
        [myWins]
      );
      myRank = rankRows.length > 0 ? (rankRows[0].rank as number) : null;
    }
  }

  logger.info("Wins leaderboard fetched: %d records, user rank: %s", records.length, myRank ? myRank.toString() : "unranked");

  return JSON.stringify({
    records,
    myRank,
    myWins,
  });
};

export {
  rpcCreateMatch,
  rpcJoinMatch,
  rpcGetLeaderboard,
  rpcGetPlayerStats,
  rpcSetUsername,
  rpcGetMatchHistory,
  rpcRecordAiGame,
  rpcGetWinsLeaderboard,
};
