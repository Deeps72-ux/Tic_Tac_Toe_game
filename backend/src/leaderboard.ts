// =============================================================
// Tic Tac Toe - Leaderboard Setup for Nakama
// =============================================================

const LEADERBOARD_ID = "global_leaderboard";

/**
 * Initialize the global leaderboard.
 * Called once during server startup (InitModule).
 */
function setupLeaderboard(nk: nkruntime.Nakama, logger: nkruntime.Logger): void {
  const id = LEADERBOARD_ID;
  const authoritative = false;
  const sortOrder = nkruntime.SortOrder.DESCENDING; // highest score first
  const operator = nkruntime.Operator.BEST; // keep best score
  const resetSchedule = null; // no automatic reset
  const metadata = { title: "Tic Tac Toe Global Leaderboard" };

  try {
    nk.leaderboardCreate(id, authoritative, sortOrder, operator, resetSchedule, metadata);
    logger.info("Leaderboard '%s' created/verified.", id);
  } catch (error) {
    // Leaderboard may already exist, which is fine
    logger.info("Leaderboard '%s' already exists or creation skipped.", id);
  }
}

export { setupLeaderboard, LEADERBOARD_ID };
