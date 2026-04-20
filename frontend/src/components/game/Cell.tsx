import { motion } from "framer-motion";
import type { CellValue } from "@/lib/gameLogic";

interface CellProps {
  value: CellValue;
  index: number;
  onClick: () => void;
  isWinning: boolean;
  isLastMove: boolean;
  disabled: boolean;
}

export default function Cell({ value, index, onClick, isWinning, isLastMove, disabled }: CellProps) {
  return (
    <motion.button
      className={`
        relative w-full aspect-square rounded-lg border-2 font-display text-4xl sm:text-5xl md:text-6xl font-bold
        flex items-center justify-center transition-colors duration-200
        ${!value && !disabled ? 'hover:bg-muted/50 cursor-pointer' : 'cursor-default'}
        ${isWinning ? 'neon-border-cyan neon-glow-cyan' : 'border-border'}
        ${isLastMove && !isWinning ? 'neon-border-magenta' : ''}
        ${!value && !disabled ? 'group' : ''}
      `}
      onClick={onClick}
      disabled={disabled || !!value}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.05, type: "spring", stiffness: 300 }}
      whileHover={!value && !disabled ? { scale: 1.05 } : {}}
      whileTap={!value && !disabled ? { scale: 0.95 } : {}}
    >
      {/* Hover glow */}
      {!value && !disabled && (
        <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-neon-cyan/5" />
      )}
      {value && (
        <motion.span
          className={value === 'X' ? 'neon-text-cyan' : 'neon-text-magenta'}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
        >
          {value}
        </motion.span>
      )}
    </motion.button>
  );
}
