import { motion } from "framer-motion";
import { ArrowLeft, Search, UserPlus, Plus, Wifi, WifiOff, Loader2, Clock, Gamepad2 } from "lucide-react";
import { useState, useEffect } from "react";

interface Props {
  onBack: () => void;
  onFindMatch: (timed: boolean) => void;
  onCreateMatch?: (timed: boolean) => void;
  onJoinMatch?: (matchId: string) => void;
  wsStatus?: string;
  wsConnect?: () => Promise<void>;
}

export default function LobbyScreen({ onBack, onFindMatch, onCreateMatch, onJoinMatch, wsStatus, wsConnect }: Props) {
  const [roomCode, setRoomCode] = useState('');
  const [timedMode, setTimedMode] = useState(false);

  // Pre-connect WebSocket when entering lobby
  useEffect(() => {
    if (wsConnect && (!wsStatus || wsStatus === 'disconnected')) {
      wsConnect();
    }
  }, [wsConnect, wsStatus]);

  const isConnected = wsStatus === 'connected' || wsStatus === 'playing' || wsStatus === 'matchmaking' || wsStatus === 'matched';
  const isConnecting = wsStatus === 'connecting';

  const handleJoinRoom = () => {
    if (roomCode.trim() && onJoinMatch) {
      onJoinMatch(roomCode.trim());
    }
  };

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

      {/* WebSocket connection indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-2 text-xs font-display">
        {isConnecting ? (
          <>
            <Loader2 className="w-4 h-4 text-neon-yellow animate-spin" />
            <span className="text-neon-yellow">Connecting...</span>
          </>
        ) : isConnected ? (
          <>
            <Wifi className="w-4 h-4 text-neon-green" />
            <span className="text-neon-green">Connected</span>
          </>
        ) : wsStatus === 'error' ? (
          <>
            <WifiOff className="w-4 h-4 text-destructive" />
            <span className="text-destructive">Failed</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Offline</span>
          </>
        )}
      </div>

      <h2 className="font-display text-2xl sm:text-3xl font-bold neon-text-magenta mb-6 tracking-wider">
        Play Online
      </h2>

      {/* Classic vs Timed mode toggle */}
      <div className="flex gap-2 mb-8 p-1 rounded-xl border-2 border-border bg-card/30">
        <button
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-display text-sm font-bold transition-all duration-200 ${
            !timedMode
              ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50 shadow-[0_0_10px_rgba(0,255,255,0.15)]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setTimedMode(false)}
        >
          <Gamepad2 className="w-4 h-4" />
          Classic
        </button>
        <button
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-display text-sm font-bold transition-all duration-200 ${
            timedMode
              ? 'bg-neon-magenta/20 text-neon-magenta border border-neon-magenta/50 shadow-[0_0_10px_rgba(255,0,255,0.15)]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setTimedMode(true)}
        >
          <Clock className="w-4 h-4" />
          Timed (30s)
        </button>
      </div>

      <div className="flex flex-col gap-6 w-full max-w-xs">
        {/* Quick match via matchmaker */}
        <motion.button
          className="flex items-center justify-center gap-3 p-5 rounded-xl border-2 border-neon-magenta/30 bg-card/50 hover:neon-border-magenta hover:neon-glow-magenta transition-all duration-300 font-display text-lg font-bold text-foreground"
          onClick={() => onFindMatch(timedMode)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <Search className="w-5 h-5 text-neon-magenta" />
          Find Match
        </motion.button>

        {/* Create private match */}
        {onCreateMatch && (
          <motion.button
            className="flex items-center justify-center gap-3 p-5 rounded-xl border-2 border-neon-cyan/30 bg-card/50 hover:neon-border-cyan hover:neon-glow-cyan transition-all duration-300 font-display text-lg font-bold text-foreground"
            onClick={() => onCreateMatch(timedMode)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Plus className="w-5 h-5 text-neon-cyan" />
            Create Room
          </motion.button>
        )}

        <div className="text-center text-muted-foreground text-sm">or join a room</div>

        {/* Join by match ID */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Match ID"
            value={roomCode}
            onChange={e => setRoomCode(e.target.value)}
            className="flex-1 px-4 py-3 rounded-lg border-2 border-border bg-card/50 text-foreground font-body text-center tracking-wider focus:neon-border-magenta focus:outline-none transition-all text-sm"
          />
          <motion.button
            className="p-3 rounded-lg border-2 border-neon-magenta/30 bg-card/50 hover:neon-border-magenta transition-all disabled:opacity-50"
            onClick={handleJoinRoom}
            disabled={!roomCode.trim()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <UserPlus className="w-5 h-5 text-neon-magenta" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
