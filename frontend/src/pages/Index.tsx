import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import ModeSelect from "@/components/game/ModeSelect";
import DifficultySelect from "@/components/game/DifficultySelect";
import SymbolSelect from "@/components/game/SymbolSelect";
import LobbyScreen from "@/components/game/LobbyScreen";
import MatchingScreen from "@/components/game/MatchingScreen";
import GameScreen from "@/components/game/GameScreen";
import OnlineGameScreen from "@/components/game/OnlineGameScreen";
import OnlineSymbolSelect from "@/components/game/OnlineSymbolSelect";
import ProfileScreen from "@/components/game/ProfileScreen";
import AuthScreen from "@/components/game/AuthScreen";
import VolumeControl from "@/components/game/VolumeControl";
import { LogIn } from "lucide-react";
import type { Difficulty, CellValue } from "@/lib/gameLogic";
import { audioManager } from "@/lib/audioManager";
import { useAuth } from "@/contexts/AuthContext";
import { useOnlineMatch } from "@/hooks/useOnlineMatch";

type Screen = 'mode' | 'difficulty' | 'symbol' | 'lobby' | 'matching' | 'symbol-negotiate' | 'game' | 'online-game' | 'profile';

export default function Index() {
  const { isAuthenticated, isLoading: authLoading, username, isGuest, logout } = useAuth();
  const [screen, setScreen] = useState<Screen>('mode');
  const [gameMode, setGameMode] = useState<'ai' | 'online'>('ai');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [playerSymbol, setPlayerSymbol] = useState<CellValue>('X');
  const onlineMatch = useOnlineMatch();

  const initAudio = () => {
    audioManager.playClick();
  };

  const selectAI = () => { initAudio(); setGameMode('ai'); setScreen('difficulty'); };
  const selectOnline = () => { initAudio(); setGameMode('online'); setScreen('lobby'); };
  const selectDifficulty = (d: Difficulty) => { setDifficulty(d); setScreen('symbol'); };
  const selectSymbol = (s: CellValue) => { setPlayerSymbol(s); setScreen('game'); };

  const findMatch = async (timed: boolean) => {
    setScreen('matching');
    await onlineMatch.findMatch(timed);
  };

  const createPrivateMatch = async (timed: boolean) => {
    setScreen('matching');
    await onlineMatch.createMatch(timed);
  };

  const joinPrivateMatch = async (matchId: string) => {
    setScreen('matching');
    await onlineMatch.joinMatch(matchId);
  };

  // Transition to online game screen when match starts
  const prevStatus = onlineMatch.status;
  if (screen === 'matching' && prevStatus === 'playing') {
    setTimeout(() => setScreen('online-game'), 0);
  }

  // Transition to symbol negotiation when matched with symbol select mode
  if (screen === 'matching' && prevStatus === 'matched' && onlineMatch.symbolState) {
    setTimeout(() => setScreen('symbol-negotiate'), 0);
  }

  // Transition from symbol negotiation to game when symbols are agreed
  if (screen === 'symbol-negotiate' && prevStatus === 'playing') {
    setTimeout(() => setScreen('online-game'), 0);
  }

  const handleOnlineBack = () => {
    onlineMatch.leaveMatch();
    setScreen('mode');
  };

  // Show auth screen if not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center grid-bg">
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-4 h-4 rounded-full bg-neon-cyan animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background overflow-hidden">
        <div className="fixed top-4 right-4 z-50">
          <VolumeControl />
        </div>
        <AuthScreen />
      </div>
    );
  }

  // Screens where the top-right toolbar should show
  const showToolbar = screen !== 'profile';
  const profileInitial = username?.[0]?.toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* ── Top-right toolbar: Profile + Volume ── */}
      {showToolbar && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          {isGuest && (
            <button
              onClick={() => { audioManager.playClick(); logout(); }}
              className="h-10 px-4 rounded-xl border-2 border-neon-cyan/40 bg-card/80 backdrop-blur-sm flex items-center gap-2 font-display text-xs tracking-wider uppercase text-neon-cyan hover:neon-glow-cyan hover:border-neon-cyan transition-all duration-200"
              title="Sign in with email"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          )}
          {!isGuest && (
            <button
              onClick={() => { audioManager.playClick(); setScreen('profile'); }}
              className="w-10 h-10 rounded-full border-2 border-neon-purple/40 bg-card/80 backdrop-blur-sm flex items-center justify-center font-display font-bold text-sm text-neon-purple hover:neon-glow-magenta hover:border-neon-purple transition-all duration-200"
              title="Profile & Stats"
            >
              {profileInitial}
            </button>
          )}
          <VolumeControl />
        </div>
      )}

      <AnimatePresence mode="wait">
        {screen === 'mode' && (
          <ModeSelect key="mode" onSelectAI={selectAI} onSelectOnline={selectOnline} />
        )}
        {screen === 'difficulty' && (
          <DifficultySelect key="diff" onSelect={selectDifficulty} onBack={() => setScreen('mode')} />
        )}
        {screen === 'symbol' && (
          <SymbolSelect key="symbol" onSelect={selectSymbol} onBack={() => setScreen('difficulty')} />
        )}
        {screen === 'lobby' && (
          <LobbyScreen
            key="lobby"
            onBack={() => setScreen('mode')}
            onFindMatch={findMatch}
            onCreateMatch={createPrivateMatch}
            onJoinMatch={joinPrivateMatch}
            wsStatus={onlineMatch.status}
            wsConnect={onlineMatch.connect}
          />
        )}
        {screen === 'matching' && (
          <MatchingScreen
            key="matching"
            status={onlineMatch.status}
            matchId={onlineMatch.matchId}
            error={onlineMatch.error}
            onCancel={() => { onlineMatch.leaveMatch(); setScreen('lobby'); }}
          />
        )}
        {screen === 'symbol-negotiate' && onlineMatch.symbolState && (
          <OnlineSymbolSelect
            key="symbol-negotiate"
            symbolState={onlineMatch.symbolState}
            onSelect={(symbol) => onlineMatch.sendSymbolSelect(symbol)}
            onConfirm={() => onlineMatch.sendSymbolConfirm()}
            onBack={() => { onlineMatch.leaveMatch(); setScreen('lobby'); }}
          />
        )}
        {screen === 'game' && (
          <GameScreen key="game" mode={gameMode} difficulty={difficulty} playerSymbol={playerSymbol} onBack={() => setScreen('mode')} />
        )}
        {screen === 'online-game' && (
          <OnlineGameScreen
            key="online-game"
            onlineMatch={onlineMatch}
            onBack={handleOnlineBack}
          />
        )}
        {screen === 'profile' && !isGuest && (
          <ProfileScreen key="profile" onBack={() => setScreen('mode')} />
        )}
      </AnimatePresence>
    </div>
  );
}
