// =============================================================
// Tic Tac Toe - Nakama Server Module Entry Point
// =============================================================
// This is the main entry point compiled by Nakama's TypeScript runtime.
// It registers all match handlers, matchmaker hooks, and RPC functions.

import {
  matchInit,
  matchJoinAttempt,
  matchJoin,
  matchLeave,
  matchLoop,
  matchTerminate,
  matchSignal,
} from "./match_handler";

import { matchmakerMatched } from "./matchmaker";

import {
  rpcCreateMatch,
  rpcJoinMatch,
  rpcGetLeaderboard,
  rpcGetPlayerStats,
  rpcSetUsername,
  rpcGetMatchHistory,
  rpcRecordAiGame,
} from "./rpc";

import { setupLeaderboard } from "./leaderboard";

function InitModule(
  ctx: nkruntime.Context,
  logger: nkruntime.Logger,
  nk: nkruntime.Nakama,
  initializer: nkruntime.Initializer
) {
  logger.info("=== Tic Tac Toe Server Module Initializing ===");

  // Register the match handler
  initializer.registerMatch("tic_tac_toe", {
    matchInit,
    matchJoinAttempt,
    matchJoin,
    matchLeave,
    matchLoop,
    matchTerminate,
    matchSignal,
  });
  logger.info("Match handler 'tic_tac_toe' registered.");

  // Register matchmaker matched hook
  initializer.registerMatchmakerMatched(matchmakerMatched);
  logger.info("Matchmaker hook registered.");

  // Register RPC functions
  initializer.registerRpc("create_match", rpcCreateMatch);
  initializer.registerRpc("join_match", rpcJoinMatch);
  initializer.registerRpc("get_leaderboard", rpcGetLeaderboard);
  initializer.registerRpc("get_player_stats", rpcGetPlayerStats);
  initializer.registerRpc("set_username", rpcSetUsername);
  initializer.registerRpc("get_match_history", rpcGetMatchHistory);
  initializer.registerRpc("record_ai_game", rpcRecordAiGame);
  logger.info("RPC functions registered: create_match, join_match, get_leaderboard, get_player_stats, set_username, get_match_history, record_ai_game");

  // Initialize leaderboard
  setupLeaderboard(nk, logger);

  logger.info("=== Tic Tac Toe Server Module Initialized ===");
}

// Reference InitModule to avoid it getting removed on build
!InitModule && InitModule.bind(null);
