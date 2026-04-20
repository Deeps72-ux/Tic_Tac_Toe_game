import { motion } from "framer-motion";
import Cell from "./Cell";
import type { Board } from "@/lib/gameLogic";

interface GameBoardProps {
  board: Board;
  onCellClick: (index: number) => void;
  winningLine: number[] | null;
  lastMove: number | null;
  disabled: boolean;
}

export default function GameBoard({ board, onCellClick, winningLine, lastMove, disabled }: GameBoardProps) {
  return (
    <motion.div
      className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-[340px] sm:max-w-[400px] mx-auto"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200 }}
    >
      {board.map((cell, i) => (
        <Cell
          key={i}
          value={cell}
          index={i}
          onClick={() => onCellClick(i)}
          isWinning={winningLine?.includes(i) ?? false}
          isLastMove={lastMove === i}
          disabled={disabled}
        />
      ))}
    </motion.div>
  );
}
