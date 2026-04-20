import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock } from "lucide-react";
import GameBoard from "./GameBoard";
import GameStatus from "./GameStatus";
import GameOverScreen from "./GameOverScreen";
import StatsSidebar from "./StatsSidebar";
import { audioManager } from "@/lib/audioManager";
import { useAuth } from "@/contexts/AuthContext";
import { nakamaClient } from "@/lib/nakamaClient";
import {
  type Board, type CellValue, type Difficulty, type GameResult,
  checkWinner, isBoardFull, getAIMove
} from "@/lib/gameLogic";

interface Props {
  mode: 'ai' | 'online';
  difficulty?: Difficulty;
  playerSymbol?: CellValue;
  onBack: () => void;
}

const emptyBoard = (): Board => new Array(9).fill(null);
const MOVE_TIME_BY_DIFFICULTY: Record<Difficulty, number> = {
  easy: 30,
  medium: 22,
  hard: 15,
};

export default function GameScreen({ mode, difficulty = 'medium', playerSymbol: chosenSymbol = 'X', onBack }: Props) {
  const { isGuest } = useAuth();
  const [board, setBoard] = useState<Board>(emptyBoard);
  const playerSymbol = chosenSymbol;
  const aiSymbol: CellValue = playerSymbol === 'X' ? 'O' : 'X';
  const [currentTurn, setCurrentTurn] = useState<CellValue>('X');
  const [gameResult, setGameResult] = useState<GameResult>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [lastMove, setLastMove] = useState<number | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(MOVE_TIME_BY_DIFFICULTY[difficulty]);

  const isPlayerTurn = currentTurn === playerSymbol;
  const turnLimitSec = MOVE_TIME_BY_DIFFICULTY[difficulty];
  const vsLabel = mode === 'ai'
    ? `You (${playerSymbol}) vs AI (${aiSymbol}) — ${difficulty} • ${turnLimitSec}s/turn`
    : 'You vs Player';

  useEffect(() => {
    audioManager.startBGM();
    return () => audioManager.stopBGM();
  }, []);

  const recordAiResult = useCallback((result: 'win' | 'lose' | 'draw', diff: string) => {
    if (isGuest || !nakamaClient.isAuthenticated()) return;
    void nakamaClient.rpc("record_ai_game", { result, difficulty: diff });
  }, [isGuest]);

  const handleResult = useCallback((b: Board, move: number) => {
    const { winner, line } = checkWinner(b);
    if (winner) {
      setWinningLine(line);
      const result: GameResult = winner === playerSymbol ? 'win' : 'lose';
      setGameResult(result);
      setGameOver(true);
      recordAiResult(result, difficulty);
      if (result === 'win') audioManager.playWin();
      else audioManager.playLose();
      return true;
    }
    if (isBoardFull(b)) {
      setGameResult('draw');
      setGameOver(true);
      recordAiResult('draw', difficulty);
      audioManager.playDraw();
      return true;
    }
    return false;
  }, [playerSymbol, difficulty, recordAiResult]);

  // Reset per-turn timer when turn changes.
  useEffect(() => {
    if (gameOver) return;
    setRemainingSeconds(turnLimitSec);
  }, [currentTurn, gameOver, turnLimitSec]);

  // Enforce turn timeout.
  useEffect(() => {
    if (gameOver) return;

    const timer = globalThis.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev > 1) {
          return prev - 1;
        }

        const timedOutPlayer = currentTurn;
        const result: GameResult = timedOutPlayer === playerSymbol ? 'lose' : 'win';

        setGameResult(result);
        setGameOver(true);
        setAiThinking(false);

        recordAiResult(result, difficulty);

        if (result === 'win') audioManager.playWin();
        else audioManager.playLose();

        return 0;
      });
    }, 1000);

    return () => globalThis.clearInterval(timer);
  }, [gameOver, currentTurn, playerSymbol, difficulty, recordAiResult]);

  // AI move
  useEffect(() => {
    if (mode !== 'ai' || isPlayerTurn || gameOver) return;

    setAiThinking(true);
    audioManager.playAIThinking();

    const delay = 300 + Math.random() * 400;
    const timer = setTimeout(() => {
      setBoard(prev => {
        const newBoard = [...prev];
        const move = getAIMove(newBoard, difficulty, aiSymbol);
        if (move >= 0) {
          newBoard[move] = aiSymbol;
          setLastMove(move);
          audioManager.playOpponentMove();

          // Check result after setState
          setTimeout(() => {
            if (!handleResult(newBoard, move)) {
              setCurrentTurn(playerSymbol);
            }
          }, 0);
        }
        setAiThinking(false);
        return newBoard;
      });
    }, delay);

    return () => clearTimeout(timer);
  }, [currentTurn, mode, isPlayerTurn, gameOver, difficulty, handleResult]);

  const onCellClick = (index: number) => {
    if (!isPlayerTurn || board[index] || gameOver || aiThinking) return;

    audioManager.playClick();
    audioManager.playYourMove();

    const newBoard = [...board];
    newBoard[index] = playerSymbol;
    setBoard(newBoard);
    setLastMove(index);

    if (!handleResult(newBoard, index)) {
      if (mode === 'ai') {
        setCurrentTurn(aiSymbol);
      } else {
        setCurrentTurn(currentTurn === 'X' ? 'O' : 'X');
      }
    }
  };

  const rematch = () => {
    setBoard(emptyBoard());
    setCurrentTurn('X');
    setGameResult(null);
    setWinningLine(null);
    setLastMove(null);
    setGameOver(false);
    setAiThinking(false);
    setRemainingSeconds(turnLimitSec);
  };

  let statusMessage = 'Game Over';
  if (!gameOver) {
    if (mode === 'ai') {
      statusMessage = `${currentTurn} Turn ${isPlayerTurn ? '(You)' : '(AI)'}`;
    } else {
      statusMessage = `${currentTurn} Turn`;
    }
  }

  return (
    <motion.div
      className="relative flex flex-col items-center justify-center min-h-screen px-4 grid-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button onClick={onBack} className="absolute top-4 left-4 p-2 text-muted-foreground hover:text-foreground transition-colors z-10">
        <ArrowLeft className="w-6 h-6" />
      </button>

      <p className="text-muted-foreground text-xs tracking-widest font-display mb-6 uppercase">{vsLabel}</p>

      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8">
        <div className="flex flex-col items-center">
          {!gameOver && (
            <motion.div
              className={`flex items-center gap-2 mb-4 font-display text-lg font-bold ${
                remainingSeconds <= 8 ? 'text-destructive' : 'text-neon-cyan'
              }`}
              animate={remainingSeconds <= 5 ? { scale: [1, 1.08, 1] } : {}}
              transition={{ repeat: Infinity, duration: 0.6 }}
            >
              <Clock className="w-5 h-5" />
              {remainingSeconds}s
            </motion.div>
          )}

          <GameStatus message={statusMessage} isPlayerTurn={isPlayerTurn} thinking={aiThinking && !gameOver} />
          <GameBoard
            board={board}
            onCellClick={onCellClick}
            winningLine={winningLine}
            lastMove={lastMove}
            disabled={!isPlayerTurn || gameOver || aiThinking}
          />
        </div>

        <AnimatePresence>
          {gameOver && gameResult && (
            <GameOverScreen
              result={gameResult}
              onRematch={rematch}
              onBack={onBack}
              vsLabel={vsLabel}
              variant="side"
            />
          )}
        </AnimatePresence>
      </div>

      {!isGuest && (
        <StatsSidebar refreshKey={`${gameOver}-${gameResult ?? "none"}`} />
      )}
    </motion.div>
  );
}
