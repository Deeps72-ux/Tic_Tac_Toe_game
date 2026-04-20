// =============================================================
// Tic Tac Toe — Server-Side AI Opponent (Nakama Runtime)
// =============================================================
//
// This module provides an AI opponent for the server-side match
// handler. It is used as a fallback when only one human player
// is available, allowing single-player games against the server.
//
// The AI uses the **Minimax algorithm with alpha-beta pruning**
// to compute optimal moves. Three difficulty levels are supported:
//
//   - Easy:   Random moves only (trivially beatable)
//   - Medium: 50% optimal, 50% random (occasionally beatable)
//   - Hard:   Full Minimax — mathematically unbeatable
//
// Unlike the frontend gameLogic.ts (which uses 'X'/'O'/null),
// the backend represents the board with numbers:
//   0 = empty, 1 = player 1 (X), 2 = player 2 (O)
//
// The AI always plays as a specific mark (1 or 2) and the
// opponent is inferred as the other.
// =============================================================

import { checkWinner, isDraw } from "./match_handler";

/**
 * Difficulty levels for the AI.
 *   - "easy"   → purely random moves
 *   - "medium" → coin flip between random and optimal
 *   - "hard"   → full Minimax with alpha-beta pruning
 */
type Difficulty = "easy" | "medium" | "hard";

// =============================================================
// Public API
// =============================================================

/**
 * Compute the AI's next move given the current board state.
 *
 * @param board      - Array of 9 numbers (0=empty, 1=player1, 2=player2).
 *                     The array is NOT mutated; a copy is used for simulation.
 * @param aiMark     - Which mark the AI plays as (1 or 2).
 * @param difficulty - Controls how optimally the AI plays (default: "hard").
 * @returns The index (0–8) of the chosen cell, or -1 if no move is possible.
 */
function getAiMove(board: number[], aiMark: number, difficulty: Difficulty = "hard"): number {
  // Find all cells that are still empty (value === 0)
  const availableMoves = getAvailableMoves(board);

  // If no moves remain, return -1 (board is full)
  if (availableMoves.length === 0) return -1;

  // ---- Easy: pick a random empty cell ----
  // This provides no strategic thinking at all.
  if (difficulty === "easy") {
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  }

  // ---- Medium: 50% chance of random, 50% chance of optimal ----
  // This creates an AI that makes occasional mistakes,
  // giving the human a realistic chance of winning.
  if (difficulty === "medium" && Math.random() < 0.5) {
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
  }

  // ---- Hard (and medium's optimal path): Full Minimax ----
  // The AI evaluates ALL possible future game states to find
  // the move that guarantees the best possible outcome.

  // Determine the opponent's mark (if AI is 1, human is 2, and vice versa)
  const humanMark = aiMark === 1 ? 2 : 1;

  // Track the best score and corresponding move found so far
  let bestScore = -Infinity;
  let bestMove = availableMoves[0]; // Default to first available

  // Try each available move and evaluate it via Minimax
  for (const move of availableMoves) {
    // Create a copy of the board to avoid mutating the original
    const newBoard = [...board];

    // Simulate placing the AI's mark at this position
    newBoard[move] = aiMark;

    // Run Minimax from the opponent's perspective (minimizing next)
    // depth=0 because this is the first level of the search tree
    // alpha=-Infinity, beta=+Infinity: initial pruning bounds
    const score = minimax(newBoard, 0, false, aiMark, humanMark, -Infinity, Infinity);

    // If this move produces a better score, remember it
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

// =============================================================
// Minimax Algorithm with Alpha-Beta Pruning
// =============================================================
//
// HOW MINIMAX WORKS:
//
//   Minimax models the game as a tree where each node is a board
//   state and each edge is a possible move. The algorithm
//   alternates between two players:
//
//     Maximizer (AI):  Picks the child with the HIGHEST score.
//     Minimizer (Human): Picks the child with the LOWEST score.
//
//   At the leaves (terminal states), scores are assigned:
//     AI wins   →  10 - depth  (positive; prefer faster wins)
//     Human wins → depth - 10  (negative; prefer slower losses)
//     Draw      →  0           (neutral)
//
//   The "depth" adjustment ensures the AI:
//     - Wins as quickly as possible (fewer moves = higher score)
//     - Loses as slowly as possible (more moves = less negative)
//
// ALPHA-BETA PRUNING:
//
//   Without pruning, Minimax explores every possible game tree
//   node (up to 9! = 362,880 for an empty board). Alpha-beta
//   pruning dramatically reduces this by skipping branches that
//   provably cannot influence the final decision.
//
//   - alpha: the BEST (highest) score the Maximizer can guarantee
//     from any choice made so far. Starts at -Infinity.
//   - beta: the BEST (lowest) score the Minimizer can guarantee
//     from any choice made so far. Starts at +Infinity.
//
//   PRUNING RULE: if alpha >= beta at any node, stop exploring
//   that node's remaining children — the current player's parent
//   would never allow this branch to be reached.
//
//   In practice, this can reduce the search from O(b^d) to
//   O(b^(d/2)), where b=branching factor and d=depth.
//
// =============================================================

/**
 * Recursive Minimax evaluation with alpha-beta pruning.
 *
 * @param board        - The simulated board state (a copy; safe to read).
 * @param depth        - Current depth in the recursion tree (0 = AI's move level).
 * @param isMaximizing - true when it's the AI's turn (wants highest score),
 *                       false when it's the human's turn (wants lowest score).
 * @param aiMark       - The AI's board mark (1 or 2).
 * @param humanMark    - The human's board mark (the opposite of aiMark).
 * @param alpha        - The best guaranteed score for the Maximizer so far.
 * @param beta         - The best guaranteed score for the Minimizer so far.
 * @returns A numeric evaluation score for this board state.
 */
function minimax(
  board: number[],
  depth: number,
  isMaximizing: boolean,
  aiMark: number,
  humanMark: number,
  alpha: number,
  beta: number
): number {
  // ──────────────────────────────────────────────
  // BASE CASES — Check terminal states first
  // ──────────────────────────────────────────────

  const winner = checkWinner(board);

  // AI has won: return a positive score.
  // Subtracting depth rewards faster wins (depth 1 → score 9 > depth 3 → score 7).
  if (winner === aiMark) return 10 - depth;

  // Human has won: return a negative score.
  // Adding depth makes later losses less negative (delays the inevitable).
  if (winner === humanMark) return depth - 10;

  // No winner and no empty cells: it's a draw (score 0, perfectly neutral).
  if (isDraw(board)) return 0;

  // ──────────────────────────────────────────────
  // RECURSIVE CASE — Explore all possible moves
  // ──────────────────────────────────────────────

  // Get all positions where a move can be made
  const availableMoves = getAvailableMoves(board);

  if (isMaximizing) {
    // ======== MAXIMIZER'S TURN (AI) ========
    // The AI wants to MAXIMIZE the evaluation score.
    let maxScore = -Infinity;

    for (const move of availableMoves) {
      // Simulate the AI's move on a fresh copy
      const newBoard = [...board];
      newBoard[move] = aiMark;

      // Recurse: it's now the minimizer's (human's) turn
      const score = minimax(newBoard, depth + 1, false, aiMark, humanMark, alpha, beta);

      // Update the best score found for the maximizer
      maxScore = Math.max(maxScore, score);

      // Update alpha (the maximizer's guaranteed minimum)
      alpha = Math.max(alpha, score);

      // PRUNE: if alpha >= beta, the minimizer's parent would never
      // allow reaching this node, so stop exploring siblings.
      if (beta <= alpha) break;
    }

    return maxScore;
  } else {
    // ======== MINIMIZER'S TURN (Human) ========
    // The human wants to MINIMIZE the evaluation score.
    let minScore = Infinity;

    for (const move of availableMoves) {
      // Simulate the human's move on a fresh copy
      const newBoard = [...board];
      newBoard[move] = humanMark;

      // Recurse: it's now the maximizer's (AI's) turn
      const score = minimax(newBoard, depth + 1, true, aiMark, humanMark, alpha, beta);

      // Update the best score found for the minimizer
      minScore = Math.min(minScore, score);

      // Update beta (the minimizer's guaranteed maximum)
      beta = Math.min(beta, score);

      // PRUNE: if beta <= alpha, the maximizer's parent would never
      // allow reaching this node, so stop exploring siblings.
      if (beta <= alpha) break;
    }

    return minScore;
  }
}

// =============================================================
// Utility
// =============================================================

/**
 * Get all empty cell indices from the board.
 *
 * Scans the board array and collects indices where the value is 0 (empty).
 *
 * @param board - The board array (9 elements, values 0/1/2).
 * @returns An array of indices where the cell is empty.
 */
function getAvailableMoves(board: number[]): number[] {
  const moves: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === 0) moves.push(i);
  }
  return moves;
}

export { getAiMove, Difficulty };
