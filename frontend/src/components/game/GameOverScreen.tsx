import { motion } from "framer-motion";
import type { GameResult } from "@/lib/gameLogic";

interface Props {
  result: GameResult;
  onRematch: () => void;
  onBack: () => void;
  vsLabel: string;
  rematchInfo?: string;
  variant?: "overlay" | "side";
}

const messages: Record<string, { text: string; class: string }> = {
  win: { text: '🎉 You Win!', class: 'neon-text-cyan' },
  lose: { text: '💀 You Lose', class: 'neon-text-magenta' },
  draw: { text: '🤝 Draw', class: 'neon-text-purple' },
};

export default function GameOverScreen({ result, onRematch, onBack, vsLabel, rematchInfo, variant = "overlay" }: Props) {
  const msg = messages[result || 'draw'];
  const isSide = variant === "side";

  return (
    <motion.div
      className={isSide
        ? "w-full max-w-xs rounded-2xl border-2 border-border bg-card/70 backdrop-blur-md p-6"
        : "absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/90 backdrop-blur-md"
      }
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.h1
        className={`font-display ${isSide ? "text-3xl" : "text-4xl sm:text-5xl"} font-black tracking-wider mb-4 text-center ${msg.class}`}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        {msg.text}
      </motion.h1>

      <p className="text-muted-foreground text-sm mb-4 text-center">{vsLabel}</p>

      {rematchInfo && (
        <p className="text-neon-cyan text-xs font-body mb-4 animate-pulse text-center">{rematchInfo}</p>
      )}

      <div className={`flex ${isSide ? "flex-col" : ""} gap-4 w-full`}>
        <motion.button
          className="px-8 py-3 rounded-xl border-2 border-neon-cyan/50 bg-card/50 font-display font-bold text-foreground hover:neon-border-cyan hover:neon-glow-cyan transition-all"
          onClick={onRematch}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Rematch
        </motion.button>
        <motion.button
          className="px-8 py-3 rounded-xl border-2 border-border bg-card/50 font-display font-bold text-muted-foreground hover:text-foreground transition-all"
          onClick={onBack}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Menu
        </motion.button>
      </div>
    </motion.div>
  );
}
