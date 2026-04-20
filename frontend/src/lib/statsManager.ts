export interface PlayerStats {
  totalGames: number;
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  bestStreak: number;
  winsByDifficulty: Record<string, number>;
  gamesByDifficulty: Record<string, number>;
  lastPlayed: string | null;
}

const STORAGE_KEY = 'ttt_player_stats';

const defaultStats: PlayerStats = {
  totalGames: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  currentStreak: 0,
  bestStreak: 0,
  winsByDifficulty: { easy: 0, medium: 0, hard: 0 },
  gamesByDifficulty: { easy: 0, medium: 0, hard: 0 },
  lastPlayed: null,
};

export function getStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultStats };
    return { ...defaultStats, ...JSON.parse(raw) };
  } catch {
    return { ...defaultStats };
  }
}

export function recordGame(result: 'win' | 'lose' | 'draw', difficulty: string) {
  const stats = getStats();
  stats.totalGames++;
  stats.gamesByDifficulty[difficulty] = (stats.gamesByDifficulty[difficulty] || 0) + 1;
  stats.lastPlayed = new Date().toISOString();

  if (result === 'win') {
    stats.wins++;
    stats.currentStreak++;
    stats.winsByDifficulty[difficulty] = (stats.winsByDifficulty[difficulty] || 0) + 1;
    if (stats.currentStreak > stats.bestStreak) stats.bestStreak = stats.currentStreak;
  } else if (result === 'lose') {
    stats.losses++;
    stats.currentStreak = 0;
  } else {
    stats.draws++;
    stats.currentStreak = 0;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  return stats;
}

export function getWinRate(stats: PlayerStats): number {
  if (stats.totalGames === 0) return 0;
  return Math.round((stats.wins / stats.totalGames) * 100);
}

export function resetStats() {
  localStorage.removeItem(STORAGE_KEY);
}
