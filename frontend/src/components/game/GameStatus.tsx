import { motion, AnimatePresence } from "framer-motion";

interface GameStatusProps {
  message: string;
  isPlayerTurn: boolean;
  thinking?: boolean;
}

export default function GameStatus({ message, isPlayerTurn, thinking }: GameStatusProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={message}
        className="text-center mb-6"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2
          className={`font-display text-xl sm:text-2xl font-bold tracking-wider ${
            isPlayerTurn ? 'neon-text-cyan' : 'neon-text-magenta'
          }`}
        >
          {message}
        </h2>
        {thinking && (
          <motion.div
            className="flex justify-center gap-1 mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {[0, 1, 2].map(i => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-neon-magenta"
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
              />
            ))}
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
