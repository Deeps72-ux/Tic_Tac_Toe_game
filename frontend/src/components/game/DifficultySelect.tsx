import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import type { Difficulty } from "@/lib/gameLogic";

interface Props {
  onSelect: (d: Difficulty) => void;
  onBack: () => void;
}

const difficulties: { key: Difficulty; label: string; desc: string }[] = [
  { key: 'easy', label: 'Easy', desc: 'Casual fun' },
  { key: 'medium', label: 'Medium', desc: 'A fair challenge' },
  { key: 'hard', label: 'Hard', desc: 'Unbeatable AI' },
];

export default function DifficultySelect({ onSelect, onBack }: Props) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-4 grid-bg"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
    >
      <button onClick={onBack} className="absolute top-4 left-4 p-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-6 h-6" />
      </button>

      <h2 className="font-display text-2xl sm:text-3xl font-bold neon-text-cyan mb-8 tracking-wider">
        Select Difficulty
      </h2>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        {difficulties.map((d, i) => (
          <motion.button
            key={d.key}
            className="p-5 rounded-xl border-2 border-border bg-card/50 hover:neon-border-cyan hover:neon-glow-cyan transition-all duration-300"
            onClick={() => onSelect(d.key)}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 + i * 0.1 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="font-display text-lg font-bold text-foreground">{d.label}</span>
            <p className="text-sm text-muted-foreground mt-1">{d.desc}</p>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
