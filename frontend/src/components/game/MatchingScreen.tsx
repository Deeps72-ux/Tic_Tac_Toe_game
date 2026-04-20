import { motion } from "framer-motion";
import { X, Copy, Check } from "lucide-react";
import { useState } from "react";

interface Props {
  status: string;
  matchId?: string | null;
  error?: string | null;
  onCancel?: () => void;
}

const statusMessages: Record<string, string> = {
  connecting: "Connecting to server...",
  connected: "Connected! Setting up...",
  matchmaking: "Finding opponent...",
  matched: "Opponent found! Starting game...",
  playing: "Game starting...",
  error: "Connection error",
  disconnected: "Disconnected",
};

export default function MatchingScreen({ status, matchId, error, onCancel }: Props) {
  const [copied, setCopied] = useState(false);
  const message = statusMessages[status] || "Connecting...";
  const isWaiting = status === "matched" && !error;

  const copyMatchId = () => {
    if (matchId) {
      navigator.clipboard.writeText(matchId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-4 grid-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <h2 className="font-display text-2xl font-bold neon-text-magenta mb-8 tracking-wider">
        {error ? "Error" : message}
      </h2>

      {error && (
        <p className="text-destructive text-sm font-body mb-6 text-center max-w-xs">
          {error}
        </p>
      )}

      {!error && (
        <div className="flex gap-2 mb-6">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-4 h-4 rounded-full bg-neon-magenta"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
            />
          ))}
        </div>
      )}

      {/* Show match ID so the other player can join */}
      {matchId && isWaiting && (
        <motion.div
          className="flex flex-col items-center gap-2 mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-muted-foreground text-xs font-body">Share this Match ID:</p>
          <button
            onClick={copyMatchId}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card/50 text-foreground font-mono text-xs hover:neon-border-cyan transition-all"
          >
            <span className="max-w-[200px] truncate">{matchId}</span>
            {copied ? <Check className="w-4 h-4 text-neon-green" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
          </button>
        </motion.div>
      )}

      {onCancel && (
        <motion.button
          className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-border bg-card/50 font-display font-bold text-muted-foreground hover:text-foreground transition-all"
          onClick={onCancel}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <X className="w-4 h-4" />
          Cancel
        </motion.button>
      )}
    </motion.div>
  );
}
