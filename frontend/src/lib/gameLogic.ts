// =============================================================
// Tic Tac Toe — Game Logic with Minimax AI
// =============================================================
//
// This module contains all client-side game logic:
//   1. Board types and constants
//   2. Win/draw detection
//   3. AI move selection with three difficulty levels
//   4. Full Minimax algorithm with alpha-beta pruning (hard mode)
//
// The board is represented as a flat 9-element array mapping to:
//   [0][1][2]
//   [3][4][5]
//   [6][7][8]
//
// Cell values: 'X' (human), 'O' (AI), or null (empty).
// =============================================================

/** A single cell on the board: 'X', 'O', or null (empty). */
export type CellValue = 'X' | 'O' | null;

/** The board is a flat array of 9 cells. */
export type Board = CellValue[];

/** Possible outcomes when a game ends. null = game still in progress. */
export type GameResult = 'win' | 'lose' | 'draw' | null;

/** AI difficulty levels. */
export type Difficulty = 'easy' | 'medium' | 'hard';

/**
 * All 8 possible winning lines (indices into the flat board array):
 *   - 3 rows:      [0,1,2], [3,4,5], [6,7,8]
 *   - 3 columns:   [0,3,6], [1,4,7], [2,5,8]
 *   - 2 diagonals: [0,4,8], [2,4,6]
 */
export const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],   // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8],   // columns
  [0, 4, 8], [2, 4, 6],               // diagonals
];

/**
 * Check if any player has won.
 *
 * Iterates over all 8 winning lines and checks if all 3 cells
 * in a line are non-null and identical (same player).
 *
 * @param board - The current board state.
 * @returns An object with `winner` ('X' or 'O') and `line` (the winning indices),
 *          or `{ winner: null, line: null }` if no winner yet.
 */
export function checkWinner(board: Board): { winner: CellValue; line: number[] | null } {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    // All three cells must be non-null and equal
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return { winner: null, line: null };
}

/**
 * Check if the board is completely filled (no null cells remain).
 * Combined with checkWinner(), this determines a draw.
 *
 * @param board - The current board state.
 * @returns true if every cell is occupied.
 */
export function isBoardFull(board: Board): boolean {
  return board.every(cell => cell !== null);
}

/**
 * Get the indices of all empty (null) cells on the board.
 *
 * @param board - The current board state.
 * @returns Array of indices where board[i] === null.
 */
function getEmptyCells(board: Board): number[] {
  const empty: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) empty.push(i);
  }
  return empty;
}

// =============================================================
// AI Move Selection
// =============================================================

/**
 * Select an AI move based on difficulty level.
 *
 * Difficulty behavior:
 *   - **Easy**:   Picks a completely random empty cell. Beatable.
 *   - **Medium**: 50% chance of playing optimally (Minimax),
 *                 50% chance of a random move. Sometimes beatable.
 *   - **Hard**:   Full Minimax with alpha-beta pruning.
 *                 Mathematically unbeatable — will always win or draw.
 *
 * @param board      - The current board state (will NOT be mutated).
 * @param difficulty - 'easy', 'medium', or 'hard'.
 * @param aiSymbol   - The symbol the AI plays as ('X' or 'O'). Defaults to 'O'.
 * @returns The index (0-8) of the chosen cell, or -1 if no move is possible.
 */
export function getAIMove(board: Board, difficulty: Difficulty, aiSymbol: CellValue = 'O'): number {
  const empty = getEmptyCells(board);

  // No moves possible
  if (empty.length === 0) return -1;

  // ---- Easy: pure random ----
  if (difficulty === 'easy') {
    return empty[Math.floor(Math.random() * empty.length)];
  }

  // ---- Medium: 50/50 random vs optimal ----
  if (difficulty === 'medium') {
    if (Math.random() < 0.5) {
      // Random move (the "mistake" half)
      return empty[Math.floor(Math.random() * empty.length)];
    }
    // Fall through to optimal
  }

  // ---- Hard (and medium's optimal path): Minimax ----
  return getBestMove(board, aiSymbol);
}

// =============================================================
// Minimax Algorithm — Core AI Engine
// =============================================================
//
// Minimax is a recursive decision-making algorithm for two-player
// zero-sum games (where one player's gain is the other's loss).
//
// Key concepts:
//   - The AI is the **maximizing** player (wants the highest score).
//   - The human is the **minimizing** player (wants the lowest score).
//   - At each recursion, we simulate ALL possible future moves,
//     alternating between max and min until a terminal state.
//   - Terminal states are scored:
//       AI wins  →  positive score (10 - depth)
//       Human wins → negative score (depth - 10)
//       Draw     →  0
//   - The "- depth" factor prefers faster wins and delays losses,
//     making the AI play aggressively rather than passively.
//
// Alpha-Beta Pruning:
//   An optimization that skips subtrees which can't influence
//   the final decision. It maintains two values:
//     - alpha: best score the maximizer can guarantee (starts at -∞)
//     - beta:  best score the minimizer can guarantee (starts at +∞)
//   When alpha >= beta, the current branch is pruned (cut off)
//   because the opponent would never allow this path.
//   This can reduce the search space from O(9!) to O(√(9!)).
//
// =============================================================

/**
 * Find the best move for the AI ('O') using Minimax with alpha-beta pruning.
 *
 * This function is the top-level caller: it tries every empty cell,
 * runs Minimax on each resulting board, and picks the move with
 * the highest score.
 *
 * @param board - The current board state (will be temporarily mutated
 *                during search but restored via backtracking).
 * @param aiSymbol - The symbol the AI plays as ('X' or 'O').
 * @returns The index (0-8) of the optimal move.
 */
function getBestMove(board: Board, aiSymbol: CellValue = 'O'): number {
  const humanSymbol: CellValue = aiSymbol === 'O' ? 'X' : 'O';
  let bestScore = -Infinity;  // Track the highest Minimax score found
  let bestMove = -1;           // Track which move produced that score

  for (let i = 0; i < 9; i++) {
    // Skip occupied cells
    if (board[i] !== null) continue;

    // --- Simulate: place AI's mark ---
    board[i] = aiSymbol;

    // --- Evaluate: run Minimax from the opponent's perspective ---
    // isMaximizing = false because after AI moves, it's the human's turn
    // depth = 0 because this is the first level of recursion
    // alpha = -Infinity, beta = +Infinity (initial bounds)
    const score = minimax(board, 0, false, -Infinity, Infinity, aiSymbol, humanSymbol);

    // --- Undo: backtrack the simulated move ---
    board[i] = null;

    // --- Update best if this move scores higher ---
    if (score > bestScore) {
      bestScore = score;
      bestMove = i;
    }
  }

  return bestMove;
}

/**
 * Minimax recursive evaluation with alpha-beta pruning.
 *
 * This function recursively explores all possible game continuations
 * from the current board state, alternating between the maximizing
 * player (AI = 'O') and the minimizing player (Human = 'X').
 *
 * @param board        - The board state (mutated in-place, then restored).
 * @param depth        - How many moves deep we are in the recursion.
 *                       Used to prefer faster wins (lower depth = higher score).
 * @param isMaximizing - true if it's the AI's turn (wants highest score),
 *                       false if it's the human's turn (wants lowest score).
 * @param alpha        - The best score the maximizer can guarantee so far.
 *                       Any node scoring below alpha is irrelevant to the maximizer.
 * @param beta         - The best score the minimizer can guarantee so far.
 *                       Any node scoring above beta is irrelevant to the minimizer.
 * @param aiSymbol     - The symbol the AI plays as.
 * @param humanSymbol  - The symbol the human plays as.
 * @returns A numeric score: positive favors AI, negative favors human, 0 = draw.
 */
function minimax(
  board: Board,
  depth: number,
  isMaximizing: boolean,
  alpha: number,
  beta: number,
  aiSymbol: CellValue = 'O',
  humanSymbol: CellValue = 'X'
): number {
  // ──────────────────────────────────────────────
  // BASE CASES (terminal states — stop recursion)
  // ──────────────────────────────────────────────

  const { winner } = checkWinner(board);

  // AI won: return positive score. Subtract depth so faster wins score higher.
  // Example: winning in 1 move = 10-1 = 9, winning in 3 moves = 10-3 = 7.
  if (winner === aiSymbol) return 10 - depth;

  // Human won: return negative score. Add depth so slower losses score higher
  // (AI delays losing as long as possible).
  // Example: losing in 2 moves = 2-10 = -8, losing in 4 moves = 4-10 = -6.
  if (winner === humanSymbol) return depth - 10;

  // Board full with no winner: it's a draw, scored as 0 (neutral).
  if (isBoardFull(board)) return 0;

  // ──────────────────────────────────────────────
  // RECURSIVE CASES
  // ──────────────────────────────────────────────

  if (isMaximizing) {
    // ---- MAXIMIZER'S TURN (AI) ----
    // The AI wants the HIGHEST possible score.
    let maxEval = -Infinity;

    for (let i = 0; i < 9; i++) {
      if (board[i] !== null) continue;

      // Simulate AI placing its mark at position i
      board[i] = aiSymbol;

      // Recurse: now it's the minimizer's turn (human plays next)
      const evalScore = minimax(board, depth + 1, false, alpha, beta, aiSymbol, humanSymbol);

      // Undo the move (backtrack)
      board[i] = null;

      // Keep track of the best (highest) score
      maxEval = Math.max(maxEval, evalScore);

      // ---- Alpha update ----
      // Alpha = the best score the maximizer can guarantee.
      // If this branch is better than our current alpha, update it.
      alpha = Math.max(alpha, evalScore);

      // ---- Beta cutoff (pruning) ----
      // If alpha >= beta, the minimizer (parent node) would never
      // choose this branch, so we can skip remaining children.
      // This is the key optimization: we avoid exploring subtrees
      // that can't affect the final decision.
      if (beta <= alpha) break;
    }

    return maxEval;
  } else {
    // ---- MINIMIZER'S TURN (Human) ----
    // The human wants the LOWEST possible score.
    let minEval = Infinity;

    for (let i = 0; i < 9; i++) {
      if (board[i] !== null) continue;

      // Simulate human placing their mark at position i
      board[i] = humanSymbol;

      // Recurse: now it's the maximizer's turn (AI plays next)
      const evalScore = minimax(board, depth + 1, true, alpha, beta, aiSymbol, humanSymbol);

      // Undo the move (backtrack)
      board[i] = null;

      // Keep track of the best (lowest) score for the minimizer
      minEval = Math.min(minEval, evalScore);

      // ---- Beta update ----
      // Beta = the best score the minimizer can guarantee.
      // If this branch is worse (lower) than current beta, update it.
      beta = Math.min(beta, evalScore);

      // ---- Alpha cutoff (pruning) ----
      // If beta <= alpha, the maximizer (parent node) would never
      // choose this branch, so we skip remaining children.
      if (beta <= alpha) break;
    }

    return minEval;
  }
}
