import { useState, useEffect, useCallback, useRef } from "react";
import { nakamaClient } from "@/lib/nakamaClient";
import type { MatchData, Socket } from "@heroiclabs/nakama-js";

// OpCodes matching the backend
const OpCode = {
  PLAYER_MOVE: 1,
  STATE_UPDATE: 2,
  GAME_OVER: 3,
  TIMER_UPDATE: 4,
  REMATCH_REQUEST: 5,
  REMATCH_ACCEPT: 6,
  SYMBOL_SELECT: 7,
  SYMBOL_STATE: 8,
} as const;

export interface OnlineGameState {
  board: number[];
  currentPlayer: number;
  players: Record<number, string>;
  moveCount: number;
  gameOver: boolean;
  winner: number | null;
  timedMode: boolean;
}

export interface GameOverData {
  winner: number | null;
  winnerId: string | null;
  reason: string;
  board: number[];
  moveCount: number;
  duration: number;
}

export interface TimerData {
  currentPlayer: number;
  remainingSeconds: number;
}

export interface SymbolStateData {
  phase: "selecting";
  selections: Record<string, string | null>;
  players: Record<number, string>;
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "matchmaking" | "matched" | "playing" | "error";

export function useOnlineMatch() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<OnlineGameState | null>(null);
  const [gameOverData, setGameOverData] = useState<GameOverData | null>(null);
  const [timerData, setTimerData] = useState<TimerData | null>(null);
  const [symbolState, setSymbolState] = useState<SymbolStateData | null>(null);
  const [playerNumber, setPlayerNumber] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [rematchCount, setRematchCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const matchIdRef = useRef<string | null>(null);

  // Keep ref in sync
  useEffect(() => {
    matchIdRef.current = matchId;
  }, [matchId]);

  const setupSocketHandlers = useCallback((socket: Socket) => {
    socket.onmatchdata = (result: MatchData) => {
      if (matchIdRef.current && result.match_id !== matchIdRef.current) {
        return;
      }

      const data = JSON.parse(
        new TextDecoder().decode(result.data)
      );

      switch (result.op_code) {
        case OpCode.STATE_UPDATE:
          if (data.error) {
            setError(data.error);
            return;
          }
          setGameState(data as OnlineGameState);
          {
            const userId = nakamaClient.session?.user_id;
            if (userId && data.players) {
              if (data.players[1] === userId) setPlayerNumber(1);
              else if (data.players[2] === userId) setPlayerNumber(2);
            }
          }
          setGameOverData(null); // Clear previous game over if it's a rematch
          setSymbolState(null); // Clear symbol selection phase
          setStatus("playing");
          break;

        case OpCode.GAME_OVER:
          setGameOverData(data as GameOverData);
          break;

        case OpCode.TIMER_UPDATE:
          setTimerData(data as TimerData);
          break;

        case OpCode.REMATCH_REQUEST:
          setRematchCount(data.count || 0);
          break;

        case OpCode.SYMBOL_STATE:
          setSymbolState(data as SymbolStateData);
          setStatus("matched");
          break;
      }
    };

    socket.ondisconnect = () => {
      setStatus("disconnected");
      setMatchId(null);
    };
  }, []);

  /** Connect the WebSocket */
  const connect = useCallback(async () => {
    if (socketRef.current) return;
    setStatus("connecting");
    setError(null);
    try {
      const socket = await nakamaClient.connectSocket();
      socketRef.current = socket;
      setupSocketHandlers(socket);
      setStatus("connected");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
      setStatus("error");
    }
  }, [setupSocketHandlers]);

  /** Find a match via matchmaker */
  const findMatch = useCallback(async (timed = false) => {
    const socket = socketRef.current;
    if (!socket) {
      await connect();
    }
    const s = socketRef.current;
    if (!s) return;

    setStatus("matchmaking");
    setError(null);
    setGameState(null);
    setGameOverData(null);
    setTimerData(null);
    setSymbolState(null);
    setRematchCount(0);

    try {
      // Use matchmaker for auto-pairing
      // Query ensures classic and timed players are only matched with their own kind
      const query = timed
        ? "+properties.timed:true"
        : "-properties.timed:true";
      await s.addMatchmaker(
        query,
        2,         // min count
        2,         // max count
        timed ? { timed: "true" } : { timed: "false" },
        {}
      );

      // Matchmaker matched callback
      s.onmatchmakermatched = (matched) => {
        setStatus("matched");
        void (async () => {
          try {
            const match = await s.joinMatch(matched.match_id);
            setMatchId(match.match_id);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to join match");
            setStatus("error");
          }
        })();
      };
    } catch (e) {
      setError(e instanceof Error ? e.message : "Matchmaking failed");
      setStatus("error");
    }
  }, [connect]);

  /** Join a match directly via RPC (creates or finds open match) */
  const joinMatch = useCallback(async (specificMatchId?: string) => {
    const socket = socketRef.current;
    if (!socket) {
      await connect();
    }
    const s = socketRef.current;
    if (!s) return;

    setStatus("matchmaking");
    setError(null);
    setGameState(null);
    setGameOverData(null);
    setTimerData(null);
    setSymbolState(null);
    setRematchCount(0);

    try {
      const result = await nakamaClient.rpc<{ matchId: string }>(
        "join_match",
        specificMatchId ? { matchId: specificMatchId } : {}
      );

      const match = await s.joinMatch(result.matchId);
      setMatchId(match.match_id);
      setStatus("matched");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join match");
      setStatus("error");
    }
  }, [connect]);

  /** Create a private match */
  const createMatch = useCallback(async (timed = false) => {
    const socket = socketRef.current;
    if (!socket) {
      await connect();
    }
    const s = socketRef.current;
    if (!s) return;

    setStatus("matchmaking");
    setError(null);
    setSymbolState(null);

    try {
      const result = await nakamaClient.rpc<{ matchId: string }>(
        "create_match",
        { timed }
      );

      const match = await s.joinMatch(result.matchId);
      setMatchId(match.match_id);
      setPlayerNumber(1);
      setStatus("matched");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create match");
      setStatus("error");
    }
  }, [connect]);

  /** Send a move */
  const sendMove = useCallback((position: number) => {
    const socket = socketRef.current;
    const mid = matchIdRef.current;
    if (!socket || !mid) return;

    socket.sendMatchState(mid, OpCode.PLAYER_MOVE, JSON.stringify({ position }));
  }, []);

  /** Send symbol selection */
  const sendSymbolSelect = useCallback((symbol: "X" | "O") => {
    const socket = socketRef.current;
    const mid = matchIdRef.current;
    if (!socket || !mid) return;

    socket.sendMatchState(mid, OpCode.SYMBOL_SELECT, JSON.stringify({ symbol }));
  }, []);

  /** Request rematch */
  const requestRematch = useCallback(() => {
    const socket = socketRef.current;
    const mid = matchIdRef.current;
    if (!socket || !mid) return;

    socket.sendMatchState(mid, OpCode.REMATCH_REQUEST, "{}");
  }, []);

  /** Leave current match */
  const leaveMatch = useCallback(() => {
    const socket = socketRef.current;
    const mid = matchIdRef.current;
    if (socket && mid) {
      socket.leaveMatch(mid);
    }
    setMatchId(null);
    setGameState(null);
    setGameOverData(null);
    setTimerData(null);
    setSymbolState(null);
    setPlayerNumber(0);
    setRematchCount(0);
    setStatus("connected");
  }, []);

  /** Full disconnect */
  const disconnect = useCallback(() => {
    leaveMatch();
    if (socketRef.current) {
      nakamaClient.disconnectSocket();
      socketRef.current = null;
    }
    setStatus("disconnected");
  }, [leaveMatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        const mid = matchIdRef.current;
        if (mid) {
          socketRef.current.leaveMatch(mid);
        }
        nakamaClient.disconnectSocket();
        socketRef.current = null;
      }
    };
  }, []);

  return {
    status,
    matchId,
    gameState,
    gameOverData,
    timerData,
    symbolState,
    playerNumber,
    error,
    rematchCount,
    connect,
    findMatch,
    joinMatch,
    createMatch,
    sendMove,
    sendSymbolSelect,
    requestRematch,
    leaveMatch,
    disconnect,
  };
}
