import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Crown } from "lucide-react";
import { nakamaClient } from "@/lib/nakamaClient";
import { useAuth } from "@/contexts/AuthContext";

interface LeaderboardRecord {
  rank: number;
  userId: string;
  username: string;
  wins: number;
  losses: number;
  draws: number;
}

interface LeaderboardData {
  records: LeaderboardRecord[];
  myRank: number | null;
  myWins: number;
}

export default function Leaderboard() {
  const { userId } = useAuth();
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLeaderboard() {
      try {
        setLoading(true);
        const result = await nakamaClient.rpc<LeaderboardData>("get_wins_leaderboard", { limit: 20 });
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load leaderboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLeaderboard();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto mt-8">
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm py-8">
          <div className="w-3 h-3 rounded-full bg-neon-cyan animate-pulse" />
          <span className="font-display">Loading leaderboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-md mx-auto mt-8">
        <p className="text-muted-foreground text-sm text-center font-body">{error}</p>
      </div>
    );
  }

  if (!data || data.records.length === 0) {
    return (
      <motion.div
        className="w-full max-w-md mx-auto mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <h3 className="font-display text-lg font-bold neon-text-magenta tracking-wider text-center mb-4">
          <Trophy className="w-5 h-5 inline-block mr-2" />
          Leaderboard
        </h3>
        <p className="text-muted-foreground text-sm text-center font-body">
          No online games played yet. Be the first!
        </p>
      </motion.div>
    );
  }

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-4 h-4 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-gray-300" />;
    if (rank === 3) return <Medal className="w-4 h-4 text-amber-600" />;
    return <span className="text-xs text-muted-foreground font-display w-4 text-center">{rank}</span>;
  };

  return (
    <motion.div
      className="w-full max-w-md mx-auto mt-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
    >
      <h3 className="font-display text-lg font-bold neon-text-magenta tracking-wider text-center mb-4">
        <Trophy className="w-5 h-5 inline-block mr-2" />
        Global Leaderboard
      </h3>

      {/* Current user's rank banner */}
      <motion.div
        className="mb-4 px-4 py-2.5 rounded-lg border border-neon-cyan/30 bg-neon-cyan/5 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7 }}
      >
        {data.myRank ? (
          <p className="text-sm font-display">
            You stand at <span className="text-neon-cyan font-bold text-base">#{data.myRank}</span> position
            <span className="text-muted-foreground ml-1">({data.myWins} wins)</span>
          </p>
        ) : (
          <p className="text-sm font-display text-muted-foreground">
            Win an online game to get ranked!
          </p>
        )}
      </motion.div>

      {/* Leaderboard table */}
      <div className="rounded-xl border border-border bg-card/30 backdrop-blur-sm overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_60px_60px_60px] gap-1 px-3 py-2 text-xs text-muted-foreground font-display border-b border-border/50 uppercase tracking-wider">
          <span>#</span>
          <span>Player</span>
          <span className="text-center">W</span>
          <span className="text-center">L</span>
          <span className="text-center">D</span>
        </div>

        {data.records.map((record, i) => {
          const isMe = record.userId === userId;
          return (
            <motion.div
              key={record.userId}
              className={`grid grid-cols-[40px_1fr_60px_60px_60px] gap-1 px-3 py-2 text-sm font-body items-center transition-colors
                ${isMe ? "bg-neon-cyan/10 border-l-2 border-neon-cyan" : "hover:bg-card/50"}
                ${i < data.records.length - 1 ? "border-b border-border/20" : ""}
              `}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + i * 0.03 }}
            >
              <div className="flex items-center justify-center">
                {rankIcon(record.rank)}
              </div>
              <span className={`truncate ${isMe ? "text-neon-cyan font-display font-bold" : "text-foreground"}`}>
                {record.username}
                {isMe && <span className="text-xs text-muted-foreground ml-1">(you)</span>}
              </span>
              <span className="text-center text-neon-green font-display">{record.wins}</span>
              <span className="text-center text-destructive/70 font-display">{record.losses}</span>
              <span className="text-center text-muted-foreground font-display">{record.draws}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
