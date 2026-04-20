import { motion } from "framer-motion";
import { ArrowLeft, Globe, Bot, LogOut, Trophy, Target, Flame, BarChart3 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { nakamaClient } from "@/lib/nakamaClient";

interface StatsSection {
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  bestWinStreak: number;
  totalGames: number;
  winRate: number;
  fastestWinTime?: number | null;
}

interface PlayerStats {
  username?: string | null;
  online: StatsSection;
  ai: StatsSection & {
    gamesEasy: number; winsEasy: number;
    gamesMedium: number; winsMedium: number;
    gamesHard: number; winsHard: number;
  };
}

interface Props {
  onBack: () => void;
}

export default function ProfileScreen({ onBack }: Readonly<Props>) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      if (!nakamaClient.isAuthenticated()) return;
      setLoading(true);
      try {
        const data = await nakamaClient.rpc<PlayerStats>("get_player_stats", {});
        setStats(data);
      } catch {
        setStats(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchStats();
  }, []);

  const username = stats?.username || "User";
  const submitLabel = "Sign Out";

  let statsContent: React.ReactNode = null;
  if (loading) {
    statsContent = <p className="text-muted-foreground text-sm font-body">Loading backend stats...</p>;
  } else if (stats) {
    const { online, ai } = stats;
    statsContent = (
      <>
        {/* Online stats */}
        <motion.div
          className="w-full max-w-xl mb-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.05 }}
        >
          <h2 className="font-display text-sm tracking-widest text-neon-cyan mb-3 uppercase flex items-center gap-2">
            <Globe className="w-4 h-4" /> Online Games
          </h2>
        </motion.div>
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-xl mb-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <StatCard icon={<Trophy className="w-5 h-5" />} label="Wins" value={online.wins} color="cyan" />
          <StatCard icon={<Target className="w-5 h-5" />} label="Win Rate" value={`${online.winRate}%`} color="cyan" />
          <StatCard icon={<Flame className="w-5 h-5" />} label="Best Streak" value={online.bestWinStreak} color="magenta" />
          <StatCard icon={<BarChart3 className="w-5 h-5" />} label="Total Games" value={online.totalGames} color="purple" />
        </motion.div>

        <motion.div
          className="w-full max-w-xl rounded-xl border-2 border-neon-cyan/20 bg-card/50 backdrop-blur-sm p-6 mb-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center gap-4 mb-3">
            <span className="text-neon-cyan font-display font-bold text-2xl">{online.wins}W</span>
            <span className="text-muted-foreground font-display">-</span>
            <span className="text-neon-magenta font-display font-bold text-2xl">{online.losses}L</span>
            <span className="text-muted-foreground font-display">-</span>
            <span className="text-neon-purple font-display font-bold text-2xl">{online.draws}D</span>
          </div>

          {online.totalGames > 0 && (
            <div className="w-full h-3 rounded-full overflow-hidden bg-muted flex mb-3">
              <div className="h-full bg-neon-cyan transition-all" style={{ width: `${(online.wins / online.totalGames) * 100}%` }} />
              <div className="h-full bg-neon-magenta transition-all" style={{ width: `${(online.losses / online.totalGames) * 100}%` }} />
              <div className="h-full bg-neon-purple transition-all" style={{ width: `${(online.draws / online.totalGames) * 100}%` }} />
            </div>
          )}

          <div className="flex gap-4 text-xs text-muted-foreground font-body">
            <span>Current Streak: <span className="text-neon-magenta">{online.winStreak}</span></span>
            {online.fastestWinTime !== null && online.fastestWinTime !== undefined && (
              <span>Fastest Win: <span className="text-neon-cyan">{online.fastestWinTime.toFixed(1)}s</span></span>
            )}
          </div>
        </motion.div>

        {/* AI stats */}
        <motion.div
          className="w-full max-w-xl mb-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-display text-sm tracking-widest text-neon-magenta mb-3 uppercase flex items-center gap-2">
            <Bot className="w-4 h-4" /> vs AI
          </h2>
        </motion.div>
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-xl mb-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <StatCard icon={<Trophy className="w-5 h-5" />} label="Wins" value={ai.wins} color="magenta" />
          <StatCard icon={<Target className="w-5 h-5" />} label="Win Rate" value={`${ai.winRate}%`} color="magenta" />
          <StatCard icon={<Flame className="w-5 h-5" />} label="Best Streak" value={ai.bestWinStreak} color="cyan" />
          <StatCard icon={<BarChart3 className="w-5 h-5" />} label="Total Games" value={ai.totalGames} color="purple" />
        </motion.div>

        <motion.div
          className="w-full max-w-xl rounded-xl border-2 border-neon-magenta/20 bg-card/50 backdrop-blur-sm p-6 mb-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-4 mb-3">
            <span className="text-neon-cyan font-display font-bold text-2xl">{ai.wins}W</span>
            <span className="text-muted-foreground font-display">-</span>
            <span className="text-neon-magenta font-display font-bold text-2xl">{ai.losses}L</span>
            <span className="text-muted-foreground font-display">-</span>
            <span className="text-neon-purple font-display font-bold text-2xl">{ai.draws}D</span>
          </div>

          {ai.totalGames > 0 && (
            <div className="w-full h-3 rounded-full overflow-hidden bg-muted flex mb-3">
              <div className="h-full bg-neon-cyan transition-all" style={{ width: `${(ai.wins / ai.totalGames) * 100}%` }} />
              <div className="h-full bg-neon-magenta transition-all" style={{ width: `${(ai.losses / ai.totalGames) * 100}%` }} />
              <div className="h-full bg-neon-purple transition-all" style={{ width: `${(ai.draws / ai.totalGames) * 100}%` }} />
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground font-body">
            <span>Current Streak: <span className="text-neon-magenta">{ai.winStreak}</span></span>
            <span>Easy: <span className="text-neon-cyan">{ai.winsEasy}/{ai.gamesEasy}</span></span>
            <span>Medium: <span className="text-neon-cyan">{ai.winsMedium}/{ai.gamesMedium}</span></span>
            <span>Hard: <span className="text-neon-cyan">{ai.winsHard}/{ai.gamesHard}</span></span>
          </div>
        </motion.div>
      </>
    );
  } else {
    statsContent = <p className="text-muted-foreground text-sm font-body">No profile stats found in backend.</p>;
  }

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-4 grid-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button onClick={onBack} className="absolute top-4 left-4 p-2 text-muted-foreground hover:text-foreground transition-colors z-10">
        <ArrowLeft className="w-6 h-6" />
      </button>

      <motion.h1
        className="font-display text-3xl sm:text-4xl font-black tracking-widest neon-text-cyan mb-2"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        PROFILE
      </motion.h1>

      <motion.p
        className="text-muted-foreground text-sm font-body mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
      >
        <span className="text-neon-cyan font-display">{username}</span>
      </motion.p>

      {statsContent}

      <motion.button
        className="mt-4 flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-destructive/30 bg-card/50 backdrop-blur-sm font-display font-bold text-destructive hover:border-destructive hover:bg-destructive/10 transition-all"
        onClick={logout}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <LogOut className="w-5 h-5" /> {submitLabel}
      </motion.button>
    </motion.div>
  );
}

function StatCard({ icon, label, value, color }: Readonly<{
  icon: ReactNode; label: string; value: string | number; color: "cyan" | "magenta" | "purple";
}>) {
  let colorClass = "text-neon-purple border-neon-purple/30";
  if (color === "cyan") colorClass = "text-neon-cyan border-neon-cyan/30";
  if (color === "magenta") colorClass = "text-neon-magenta border-neon-magenta/30";
  return (
    <div className={`flex flex-col items-center gap-1 p-4 rounded-xl border-2 bg-card/50 backdrop-blur-sm ${colorClass}`}>
      {icon}
      <span className="font-display text-2xl font-bold">{value}</span>
      <span className="text-muted-foreground text-xs font-display uppercase tracking-wider">{label}</span>
    </div>
  );
}
