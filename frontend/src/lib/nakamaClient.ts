import { Client, Session, Socket } from "@heroiclabs/nakama-js";

// Nakama connection config — uses env vars or defaults for Docker setup
// In production (SSL), env vars are empty → auto-detect from current page URL (same-origin proxy)
const NAKAMA_HOST = import.meta.env.VITE_NAKAMA_HOST || window.location.hostname;
const NAKAMA_PORT = import.meta.env.VITE_NAKAMA_PORT || (window.location.protocol === 'https:' ? '443' : '80');
const NAKAMA_KEY = import.meta.env.VITE_NAKAMA_KEY || "tictactoe_server_key";
const NAKAMA_SSL = import.meta.env.VITE_NAKAMA_SSL
  ? import.meta.env.VITE_NAKAMA_SSL === "true"
  : window.location.protocol === 'https:';

class NakamaClient {
  private client: Client;
  private _session: Session | null = null;
  private _socket: Socket | null = null;

  constructor() {
    this.client = new Client(NAKAMA_KEY, NAKAMA_HOST, NAKAMA_PORT, NAKAMA_SSL);
  }

  get session(): Session | null {
    return this._session;
  }

  get socket(): Socket | null {
    return this._socket;
  }

  get apiClient(): Client {
    return this.client;
  }

  /** Check if user has a valid (non-expired) session */
  isAuthenticated(): boolean {
    if (!this._session) return false;
    // Session has expired if token expiry is in the past
    const now = Math.floor(Date.now() / 1000);
    return !this._session.isexpired(now);
  }

  /** Authenticate with device ID (anonymous / one-click) */
  async authenticateDevice(deviceId: string, create = true, username?: string): Promise<Session> {
    this._session = await this.client.authenticateDevice(deviceId, create, username);
    return this._session;
  }

  /** Authenticate with email + password */
  async authenticateEmail(email: string, password: string, create = true, username?: string): Promise<Session> {
    this._session = await this.client.authenticateEmail(email, password, create, username);
    return this._session;
  }

  /** Restore session from saved token, refreshing if the access token is expired */
  restoreSession(token: string, refreshToken: string): boolean {
    try {
      const session = Session.restore(token, refreshToken);
      const now = Math.floor(Date.now() / 1000);
      if (session.isexpired(now)) {
        // Access token expired — try async refresh via refresh token
        this._pendingRefresh = this.client
          .sessionRefresh(session)
          .then((refreshed) => {
            this._session = refreshed;
            this._pendingRefresh = null;
            return true;
          })
          .catch(() => {
            this._pendingRefresh = null;
            return false;
          });
        // Temporarily set the old session so callers see isAuthenticated()
        this._session = session;
        return true;
      }
      this._session = session;
      return true;
    } catch {
      return false;
    }
  }

  /** Wait for any pending session refresh to complete */
  async ensureSession(): Promise<boolean> {
    if (this._pendingRefresh !== null) {
      return this._pendingRefresh;
    }
    return this.isAuthenticated();
  }

  private _pendingRefresh: Promise<boolean> | null = null;

  /** Connect WebSocket for real-time communication */
  async connectSocket(): Promise<Socket> {
    if (!this._session) throw new Error("Not authenticated");
    this._socket = this.client.createSocket(NAKAMA_SSL, false);
    await this._socket.connect(this._session, true);
    return this._socket;
  }

  /** Disconnect socket */
  disconnectSocket(): void {
    if (this._socket) {
      this._socket.disconnect(false);
      this._socket = null;
    }
  }

  /** Call an RPC function */
  async rpc<T = unknown>(id: string, payload?: object): Promise<T> {
    if (!this._session) throw new Error("Not authenticated");
    const response = await this.client.rpc(this._session, id, payload || {});
    return (typeof response.payload === "string"
      ? JSON.parse(response.payload)
      : response.payload) as T;
  }

  /** Log out — clear session and disconnect socket */
  logout(): void {
    this.disconnectSocket();
    this._session = null;
  }
}

// Singleton instance
export const nakamaClient = new NakamaClient();
