import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, ChevronLeft, ChevronRight, Trophy, Target, Flame, Activity, Bot, Globe } from "lucide-react";
import { nakamaClient } from "@/lib/nakamaClient";
import { useAuth } from "@/contexts/AuthContext";

interface StatsSection {
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  bestWinStreak: number;
  totalGames: number;
  winRate: number;
}

interface CombinedStats {
  username?: string | null;
  online: StatsSection;
  ai: StatsSection & {
    gamesEasy: number; winsEasy: number;
    gamesMedium: number; winsMedium: number;
    gamesHard: number; winsHard: number;
  };
}

interface Props {
  refreshKey?: string | number;
}

export default function StatsSidebar({ refreshKey }: Readonly<Props>) {
  const { isGuest } = useAuth();
  const [collapsed, setCollapsed] = useState(true);
  const [stats, setStats] = useState<CombinedStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isGuest || !nakamaClient.isAuthenticated()) {
      setStats(null);
      return;
    }

    let active = true;
    const loadStats = async () => {
      setLoading(true);
      try {
        const data = await nakamaClient.rpc<CombinedStats>("get_player_stats", {});
        if (active) {
          setStats(data);
        }
      } catch {
        if (active) {
          setStats(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadStats();

    return () => {
      active = false;
    };
  }, [isGuest, refreshKey]);

  if (isGuest) {
    return null;
  }

  let summaryContent: ReactNode;
  if (loading) {
    summaryContent = <p className="text-xs text-muted-foreground font-body">Loading stats...</p>;
  } else if (stats) {
    const { online, ai } = stats;
    summaryContent = (
      <>
        <div className="mb-3">
          <p className="text-[10px] tracking-wider uppercase font-display text-neon-cyan mb-1 flex items-center gap-1">
            <Globe className="w-3 h-3" /> Online
          </p>
          <StatRow icon={<Activity className="w-4 h-4" />} label="Total" value={online.totalGames} />
          <StatRow icon={<Trophy className="w-4 h-4" />} label="Wins" value={online.wins} />
          <StatRow icon={<Target className="w-4 h-4" />} label="Win Rate" value={`${online.winRate}%`} />
          <StatRow icon={<Flame className="w-4 h-4" />} label="Best Streak" value={online.bestWinStreak} />
          <div className="text-xs text-muted-foreground font-body">
            W/L/D:{" "}
            <span className="text-neon-cyan">{online.wins}</span>
            {" / "}
            <span className="text-neon-magenta">{online.losses}</span>
            {" / "}
            <span className="text-neon-purple">{online.draws}</span>
          </div>
        </div>
        <div>
          <p className="text-[10px] tracking-wider uppercase font-display text-neon-magenta mb-1 flex items-center gap-1">
            <Bot className="w-3 h-3" /> vs AI
          </p>
          <StatRow icon={<Activity className="w-4 h-4" />} label="Total" value={ai.totalGames} />
          <StatRow icon={<Trophy className="w-4 h-4" />} label="Wins" value={ai.wins} />
          <StatRow icon={<Target className="w-4 h-4" />} label="Win Rate" value={`${ai.winRate}%`} />
          <StatRow icon={<Flame className="w-4 h-4" />} label="Best Streak" value={ai.bestWinStreak} />
          <div className="text-xs text-muted-foreground font-body">
            W/L/D:{" "}
            <span className="text-neon-cyan">{ai.wins}</span>
            {" / "}
            <span className="text-neon-magenta">{ai.losses}</span>
            {" / "}
            <span className="text-neon-purple">{ai.draws}</span>
          </div>
        </div>
      </>
    );
  } else {
    summaryContent = <p className="text-xs text-muted-foreground font-body">No stats found in backend.</p>;
  }

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center">
      <button
        onClick={() => setCollapsed((prev) => !prev)}
        className="h-14 w-10 rounded-l-xl border-y-2 border-l-2 border-neon-cyan/40 bg-card/80 backdrop-blur-sm text-neon-cyan hover:neon-glow-cyan transition-all flex items-center justify-center"
        title={collapsed ? "Show game stats" : "Hide game stats"}
      >
        {collapsed ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="h-[420px] w-[300px] border-2 border-neon-cyan/30 bg-card/80 backdrop-blur-md rounded-l-2xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-neon-cyan" />
                <h3 className="font-display text-sm tracking-widest text-neon-cyan uppercase">Game Stats</h3>
              </div>

              <div className="space-y-3 mb-5">
                {summaryContent}
              </div>

              <div className="pt-3 border-t border-border/70">
                <p className="text-[10px] tracking-wider uppercase font-display text-muted-foreground mb-2">
                  Backend Profile
                </p>
                {stats ? (
                  <div className="space-y-2 text-sm font-body">
                    <div className="text-muted-foreground">
                      Username: <span className="text-neon-cyan">{stats.username || "Not set"}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Online Streak: <span className="text-neon-magenta">{stats.online.winStreak}</span>
                    </div>
                    <div className="text-muted-foreground">
                      AI Streak: <span className="text-neon-magenta">{stats.ai.winStreak}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground font-body">No backend profile data.</p>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatRow({ icon, label, value }: Readonly<{ icon: ReactNode; label: string; value: string | number }>) {
  return (
    <div className="flex items-center justify-between text-sm font-body">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-neon-cyan">{icon}</span>
        <span>{label}</span>
      </div>
      <span className="font-display text-foreground">{value}</span>
    </div>
  );
}
