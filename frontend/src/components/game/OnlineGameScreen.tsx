import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock, Wifi, WifiOff } from "lucide-react";
import GameBoard from "./GameBoard";
import GameStatus from "./GameStatus";
import GameOverScreen from "./GameOverScreen";
import StatsSidebar from "./StatsSidebar";
import { audioManager } from "@/lib/audioManager";
import { nakamaClient } from "@/lib/nakamaClient";
import { useAuth } from "@/contexts/AuthContext";
import type { Board, CellValue, GameResult } from "@/lib/gameLogic";
import type { useOnlineMatch } from "@/hooks/useOnlineMatch";

interface Props {
  onlineMatch: ReturnType<typeof useOnlineMatch>;
  onBack: () => void;
}

/** Convert backend board (0/1/2) to frontend board ('X'/'O'/null) */
function toDisplayBoard(board: number[]): Board {
  return board.map((cell) => {
    if (cell === 1) return "X";
    if (cell === 2) return "O";
    return null;
  });
}

/** Get the symbol for a player number */
function playerSymbol(num: number): CellValue {
  if (num === 1) return "X";
  if (num === 2) return "O";
  return null;
}

export default function OnlineGameScreen({ onlineMatch, onBack }: Props) {
  const { isGuest } = useAuth();
  const {
    gameState,
    gameOverData,
    timerData,
    playerNumber,
    sendMove,
    requestRematch,
    leaveMatch,
    rematchCount,
    status,
  } = onlineMatch;

  const userId = nakamaClient.session?.user_id;

  // Board in display format
  const displayBoard = useMemo<Board>(
    () => (gameState ? toDisplayBoard(gameState.board) : new Array(9).fill(null)),
    [gameState]
  );

  // Is it my turn?
  const isMyTurn = gameState
    ? gameState.currentPlayer === playerNumber
    : false;

  // My symbol
  const mySymbol = playerSymbol(playerNumber);

  // Winning line detection (local, for highlighting)
  const winningLine = useMemo<number[] | null>(() => {
    if (!gameOverData || !gameOverData.winner) return null;
    const board = gameOverData.board;
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    for (const line of lines) {
      const [a, b, c] = line;
      if (board[a] !== 0 && board[a] === board[b] && board[b] === board[c]) {
        return line;
      }
    }
    return null;
  }, [gameOverData]);

  // Last move detection
  const lastMove = useMemo<number | null>(() => {
    if (!gameState || gameState.moveCount === 0) return null;
    // We don't track individual moves, but we can find the most recent move
    // by comparing board state. For simplicity, return null.
    return null;
  }, [gameState]);

  // Game result for display
  const gameResult = useMemo<GameResult>(() => {
    if (!gameOverData) return null;
    if (!gameOverData.winner) return "draw";
    return gameOverData.winnerId === userId ? "win" : "lose";
  }, [gameOverData, userId]);

  const isGameOver = !!gameOverData;

  // Sound effects
  useEffect(() => {
    audioManager.startBGM();
    return () => audioManager.stopBGM();
  }, []);

  useEffect(() => {
    if (!gameResult) return;
    if (gameResult === "win") audioManager.playWin();
    else if (gameResult === "lose") audioManager.playLose();
    else audioManager.playDraw();
  }, [gameResult]);

  // Play sound on board updates (opponent moved)
  const moveCount = gameState?.moveCount ?? 0;
  useEffect(() => {
    if (moveCount > 0) {
      if (isMyTurn) {
        // Opponent just moved
        audioManager.playOpponentMove();
      }
    }
  }, [moveCount, isMyTurn]);

  const handleCellClick = (index: number) => {
    if (!isMyTurn || displayBoard[index] || isGameOver) return;
    audioManager.playClick();
    audioManager.playYourMove();
    sendMove(index);
  };

  const handleRematch = () => {
    requestRematch();
  };

  const handleBack = () => {
    leaveMatch();
    onBack();
  };

  // Status message
  let statusMessage = "Waiting for opponent...";
  if (isGameOver) {
    if (gameResult === "win") statusMessage = "You Win!";
    else if (gameResult === "lose") statusMessage = "You Lose!";
    else statusMessage = "Draw!";
  } else if (gameState) {
    const turnSymbol = playerSymbol(gameState.currentPlayer);
    if (turnSymbol) {
      statusMessage = `${turnSymbol} Turn${isMyTurn ? " (You)" : " (Opponent)"}`;
    } else {
      statusMessage = "Waiting for turn...";
    }
  }

  // Timer display
  const timerSeconds = timerData && gameState?.timedMode
    ? Math.ceil(timerData.remainingSeconds)
    : null;

  const vsLabel = `You (${mySymbol}) vs Opponent (${mySymbol === "X" ? "O" : "X"})`;

  // Rematch display text
  const rematchText = rematchCount === 1
    ? "Rematch requested (1/2)..."
    : null;

  return (
    <motion.div
      className="relative flex flex-col items-center justify-center min-h-screen px-4 grid-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Back button */}
      <button
        onClick={handleBack}
        className="absolute top-4 left-4 p-2 text-muted-foreground hover:text-foreground transition-colors z-10"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      {/* Connection indicator */}
      <div className="absolute top-4 right-14 z-10">
        {status === "playing" ? (
          <Wifi className="w-5 h-5 text-neon-green" />
        ) : (
          <WifiOff className="w-5 h-5 text-muted-foreground" />
        )}
      </div>

      {/* Match info */}
      <p className="text-muted-foreground text-xs tracking-widest font-display mb-2 uppercase">
        {vsLabel}
      </p>

      {/* Timer */}
      {timerSeconds !== null && !isGameOver && (
        <motion.div
          className={`flex items-center gap-2 mb-4 font-display text-lg font-bold ${
            timerSeconds <= 10 ? "text-destructive" : "text-neon-cyan"
          }`}
          animate={timerSeconds <= 5 ? { scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: Infinity, duration: 0.5 }}
        >
          <Clock className="w-5 h-5" />
          {timerSeconds}s
        </motion.div>
      )}

      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8">
        <div className="flex flex-col items-center">
          <GameStatus
            message={statusMessage}
            isPlayerTurn={isMyTurn}
            thinking={!isMyTurn && !isGameOver && !!gameState}
          />

          <GameBoard
            board={displayBoard}
            onCellClick={handleCellClick}
            winningLine={winningLine}
            lastMove={lastMove}
            disabled={!isMyTurn || isGameOver}
          />

          {/* Rematch status */}
          {rematchText && !isGameOver && (
            <p className="text-muted-foreground text-sm mt-4 font-body animate-pulse">
              {rematchText}
            </p>
          )}
        </div>

        {/* Game over actions shown beside the board */}
        <AnimatePresence>
          {isGameOver && gameResult && (
            <GameOverScreen
              result={gameResult}
              onRematch={handleRematch}
              onBack={handleBack}
              vsLabel={vsLabel}
              rematchInfo={
                rematchCount > 0
                  ? `Rematch: ${rematchCount}/2 agreed`
                  : undefined
              }
              variant="side"
            />
          )}
        </AnimatePresence>
      </div>

      {!isGuest && (
        <StatsSidebar refreshKey={gameOverData?.moveCount ?? gameState?.moveCount ?? 0} />
      )}
    </motion.div>
  );
}
