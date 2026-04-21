import { motion } from "framer-motion";
import { ArrowLeft, Check } from "lucide-react";
import type { SymbolStateData } from "@/hooks/useOnlineMatch";
import { nakamaClient } from "@/lib/nakamaClient";

interface Props {
  symbolState: SymbolStateData;
  onSelect: (symbol: "X" | "O") => void;
  onConfirm: () => void;
  onBack: () => void;
}

export default function OnlineSymbolSelect({ symbolState, onSelect, onConfirm, onBack }: Props) {
  const userId = nakamaClient.session?.user_id;
  const isResolved = symbolState.phase === "resolved" && symbolState.resolved;
  const myResolved = isResolved && userId ? symbolState.resolved![userId] : null;
  const mySelection = userId ? symbolState.selections[userId] : null;

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-4 grid-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        onClick={onBack}
        className="absolute top-4 left-4 p-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      <h2 className="font-display text-2xl sm:text-3xl font-bold neon-text-cyan mb-3 tracking-wider">
        {isResolved ? "Symbols Assigned" : "Choose Your Symbol"}
      </h2>

      {!isResolved && (
        <p className="text-muted-foreground text-sm font-body mb-4">
          Pick your preferred symbol. First pick gets priority if both choose the same.
        </p>
      )}

      {!isResolved && mySelection && (
        <motion.p
          className="text-neon-cyan text-sm font-display mb-6 animate-pulse"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          You chose {mySelection}. Waiting for opponent...
        </motion.p>
      )}

      {isResolved && (
        <motion.div
          className="flex flex-col items-center mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-sm font-body text-muted-foreground mb-2">
            You are
          </p>
          <span className={`font-display text-4xl font-black ${myResolved === "X" ? "neon-text-cyan" : "neon-text-magenta"}`}>
            {myResolved}
          </span>
        </motion.div>
      )}

      {!isResolved && (
        <div className="flex gap-6">
          <motion.button
            className={`flex flex-col items-center gap-3 w-36 h-40 rounded-xl border-2 bg-card/50 backdrop-blur-sm transition-all duration-300 justify-center
              ${mySelection === "X"
                ? "border-neon-cyan neon-glow-cyan"
                : "border-neon-cyan/30 hover:neon-border-cyan hover:neon-glow-cyan"
              }`}
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
            className={`flex flex-col items-center gap-3 w-36 h-40 rounded-xl border-2 bg-card/50 backdrop-blur-sm transition-all duration-300 justify-center
              ${mySelection === "O"
                ? "border-neon-magenta neon-glow-magenta"
                : "border-neon-magenta/30 hover:neon-border-magenta hover:neon-glow-magenta"
              }`}
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
      )}

      {isResolved && (
        <motion.div
          className="flex flex-col items-center gap-3 mt-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <motion.button
            className="flex items-center gap-2 px-8 py-3 rounded-xl border-2 border-neon-cyan/50 bg-neon-cyan/10 font-display text-lg font-bold text-neon-cyan hover:neon-glow-cyan hover:border-neon-cyan transition-all duration-300"
            onClick={onConfirm}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Check className="w-5 h-5" />
            Continue
          </motion.button>

          {symbolState.confirmedCount > 0 && (
            <p className="text-muted-foreground text-sm font-body animate-pulse">
              {symbolState.confirmedCount}/2 players ready...
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
