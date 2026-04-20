// =============================================================
// Tic Tac Toe - Matchmaking System for Nakama
// =============================================================

const MATCHMAKER_TICKET_PROPS = {
  minCount: 2,
  maxCount: 2,
};

/**
 * Called when the matchmaker finds a suitable group of players.
 * Creates a new match and returns the match ID for all paired players.
 */
const matchmakerMatched: nkruntime.MatchmakerMatchedFunction = function (
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  matches: nkruntime.MatchmakerResult[]
): string | void {
  // Determine if any player requested timed mode
  let timedMode = false;
  for (const match of matches) {
    if (match.properties && match.properties["timed"] === "true") {
      timedMode = true;
      break;
    }
  }

  // Create a new server-authoritative match
  const matchId = nk.matchCreate("tic_tac_toe", {
    timed: timedMode ? "true" : "false",
  });

  logger.info(
    "Matchmaker paired %d players into match %s (timed: %s)",
    matches.length,
    matchId,
    timedMode.toString()
  );

  return matchId;
};

export { matchmakerMatched, MATCHMAKER_TICKET_PROPS };
