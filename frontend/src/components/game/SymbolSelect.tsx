import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import type { CellValue } from "@/lib/gameLogic";

interface Props {
  onSelect: (symbol: CellValue) => void;
  onBack: () => void;
}

export default function SymbolSelect({ onSelect, onBack }: Props) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-4 grid-bg"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <button
        onClick={onBack}
        className="absolute top-4 left-4 p-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      <h2 className="font-display text-2xl sm:text-3xl font-bold neon-text-cyan mb-3 tracking-wider">
        Choose Your Side
      </h2>
      <p className="text-muted-foreground text-sm font-body mb-10">
        X always goes first
      </p>

      <div className="flex gap-6">
        <motion.button
          className="flex flex-col items-center gap-3 w-36 h-40 rounded-xl border-2 border-neon-cyan/30 bg-card/50 backdrop-blur-sm hover:neon-border-cyan hover:neon-glow-cyan transition-all duration-300 justify-center"
          onClick={() => onSelect("X")}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          whileHover={{ scale: 1.05, y: -4 }}
          whileTap={{ scale: 0.97 }}
        >
          <span className="font-display text-5xl font-black neon-text-cyan">X</span>
          <span className="text-muted-foreground text-xs font-display tracking-wider uppercase">
            Go First
          </span>
        </motion.button>

        <motion.button
          className="flex flex-col items-center gap-3 w-36 h-40 rounded-xl border-2 border-neon-magenta/30 bg-card/50 backdrop-blur-sm hover:neon-border-magenta hover:neon-glow-magenta transition-all duration-300 justify-center"
          onClick={() => onSelect("O")}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          whileHover={{ scale: 1.05, y: -4 }}
          whileTap={{ scale: 0.97 }}
        >
          <span className="font-display text-5xl font-black neon-text-magenta">O</span>
          <span className="text-muted-foreground text-xs font-display tracking-wider uppercase">
            Go Second
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}
