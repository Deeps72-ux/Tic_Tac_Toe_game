-- =============================================================
-- Tic Tac Toe - Custom PostgreSQL Schema Extension for Nakama
-- =============================================================

-- User profile extension table
CREATE TABLE IF NOT EXISTS users_profile (
    user_id UUID PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Game statistics per user
CREATE TABLE IF NOT EXISTS game_stats (
    user_id UUID PRIMARY KEY REFERENCES users_profile(user_id) ON DELETE CASCADE,
    wins INT NOT NULL DEFAULT 0,
    losses INT NOT NULL DEFAULT 0,
    draws INT NOT NULL DEFAULT 0,
    highest_score INT NOT NULL DEFAULT 0,
    win_streak INT NOT NULL DEFAULT 0,
    best_win_streak INT NOT NULL DEFAULT 0,
    fastest_win_time DOUBLE PRECISION DEFAULT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Match history log
CREATE TABLE IF NOT EXISTS match_history (
    match_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player1_id UUID NOT NULL REFERENCES users_profile(user_id) ON DELETE CASCADE,
    player2_id UUID NOT NULL REFERENCES users_profile(user_id) ON DELETE CASCADE,
    winner_id UUID REFERENCES users_profile(user_id) ON DELETE SET NULL,
    moves_count INT NOT NULL DEFAULT 0,
    duration_seconds DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI game statistics per user (games against AI)
CREATE TABLE IF NOT EXISTS ai_game_stats (
    user_id UUID PRIMARY KEY REFERENCES users_profile(user_id) ON DELETE CASCADE,
    wins INT NOT NULL DEFAULT 0,
    losses INT NOT NULL DEFAULT 0,
    draws INT NOT NULL DEFAULT 0,
    win_streak INT NOT NULL DEFAULT 0,
    best_win_streak INT NOT NULL DEFAULT 0,
    games_easy INT NOT NULL DEFAULT 0,
    wins_easy INT NOT NULL DEFAULT 0,
    games_medium INT NOT NULL DEFAULT 0,
    wins_medium INT NOT NULL DEFAULT 0,
    games_hard INT NOT NULL DEFAULT 0,
    wins_hard INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_match_history_player1 ON match_history(player1_id);
CREATE INDEX IF NOT EXISTS idx_match_history_player2 ON match_history(player2_id);
CREATE INDEX IF NOT EXISTS idx_match_history_winner ON match_history(winner_id);
CREATE INDEX IF NOT EXISTS idx_match_history_created ON match_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_stats_wins ON game_stats(wins DESC);
CREATE INDEX IF NOT EXISTS idx_game_stats_highest_score ON game_stats(highest_score DESC);
CREATE INDEX IF NOT EXISTS idx_ai_game_stats_wins ON ai_game_stats(wins DESC);
