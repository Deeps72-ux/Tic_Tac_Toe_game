import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { nakamaClient } from "@/lib/nakamaClient";
import type { Session } from "@heroiclabs/nakama-js";

const SESSION_STORAGE_KEY = "ttt_nakama_session";
const DEVICE_ID_KEY = "ttt_device_id";
const AUTH_MODE_KEY = "ttt_auth_mode";

interface PlayerStatsResponse {
  username?: string | null;
}

interface AuthContextValue {
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  username: string | null;
  isGuest: boolean;
  loginAsGuest: () => Promise<void>;
  loginWithEmail: (email: string, password: string, create?: boolean, username?: string) => Promise<void>;
  setUsername: (username: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Get or create a persistent device ID for anonymous auth */
function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = "device-" + crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function saveSession(session: Session) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
    token: session.token,
    refresh_token: session.refresh_token,
  }));
}

function clearSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

function saveAuthMode(mode: "guest" | "email") {
  localStorage.setItem(AUTH_MODE_KEY, mode);
}

function clearAuthMode() {
  localStorage.removeItem(AUTH_MODE_KEY);
}

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  const refreshUsernameFromBackend = useCallback(async () => {
    try {
      const profile = await nakamaClient.rpc<PlayerStatsResponse>("get_player_stats", {});
      setUsername(profile.username ?? null);
    } catch {
      setUsername(null);
    }
  }, []);

  // Try to restore session on mount
  useEffect(() => {
    const tryRestore = async () => {
      try {
        const raw = localStorage.getItem(SESSION_STORAGE_KEY);
        if (raw) {
          const { token, refresh_token } = JSON.parse(raw);
          if (nakamaClient.restoreSession(token, refresh_token)) {
            // Wait for any pending token refresh to complete
            const refreshed = await nakamaClient.ensureSession();
            if (refreshed && nakamaClient.session) {
              // Save the potentially refreshed session
              saveSession(nakamaClient.session);
              setSession(nakamaClient.session);
            } else {
              clearSession();
              setIsLoading(false);
              return;
            }
            const restoredGuest = localStorage.getItem(AUTH_MODE_KEY) === "guest";
            setIsGuest(restoredGuest);
            if (restoredGuest) {
              setUsername(null);
            } else {
              await refreshUsernameFromBackend();
            }
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // Restore failed, clear stale data
        clearSession();
      }
      setIsLoading(false);
    };
    void tryRestore();
  }, [refreshUsernameFromBackend]);

  const loginAsGuest = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const deviceId = getDeviceId();
      const sess = await nakamaClient.authenticateDevice(deviceId, true);
      saveSession(sess);
      saveAuthMode("guest");
      setSession(sess);
      setIsGuest(true);
      setUsername(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed");
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string, create = true, username?: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const sess = await nakamaClient.authenticateEmail(email, password, create, username);
      saveSession(sess);
      saveAuthMode("email");
      setSession(sess);
      setIsGuest(false);
      if (create && username && username.trim().length > 0) {
        await nakamaClient.rpc("set_username", { username: username.trim() });
      }
      await refreshUsernameFromBackend();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed");
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setUsernameAction = useCallback(async (username: string) => {
    setError(null);
    try {
      await nakamaClient.rpc("set_username", { username });
      setUsername(username);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set username");
      throw e;
    }
  }, []);

  const logout = useCallback(() => {
    nakamaClient.logout();
    clearSession();
    clearAuthMode();
    setSession(null);
    setIsGuest(false);
    setUsername(null);
  }, []);

  const value: AuthContextValue = {
    session,
    isAuthenticated: !!session && nakamaClient.isAuthenticated(),
    isLoading,
    userId: session?.user_id ?? null,
    username,
    isGuest,
    loginAsGuest,
    loginWithEmail,
    setUsername: setUsernameAction,
    logout,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
