# Tic Tac Toe — Full-Stack Multiplayer Game

Production-ready, server-authoritative multiplayer Tic Tac Toe built on **React/Vite**, **Nakama** (TypeScript runtime), **PostgreSQL**, and **Docker**. Deployable as a single `docker compose` stack.

---

## Architecture

```
┌──────────────┐      WebSocket / REST       ┌──────────────────┐
│   Frontend   │  ◄──────────────────────►    │   Nakama Server  │
│  React/Vite  │        port 7350            │   (TypeScript)   │
│  port 3000   │                              │                  │
└──────────────┘                              │  Match Handler   │
                                              │  Matchmaker      │
                                              │  RPC Functions   │
                                              │  Leaderboard     │
                                              └────────┬─────────┘
                                                       │
                                              ┌────────▼─────────┐
                                              │   PostgreSQL     │
                                              │   port 5432      │
                                              └──────────────────┘
```

All three services — **frontend**, **Nakama backend**, and **PostgreSQL** — are orchestrated via a single `docker-compose.yaml`.

---

## Project Structure

```
├── docker-compose.yaml        # Orchestrates all 3 services
├── README.md
│
├── frontend/                  # React/Vite SPA
│   ├── Dockerfile             # Multi-stage build → nginx
│   ├── nginx.conf             # SPA routing & reverse proxy
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/game/   # Game screens, board, AI, online
│   │   ├── contexts/          # Auth context (guest/email)
│   │   ├── hooks/             # useOnlineMatch, etc.
│   │   ├── lib/               # gameLogic, nakamaClient, audio, stats
│   │   └── pages/             # Index, NotFound
│   └── ...
│
├── backend/                   # Nakama TypeScript runtime
│   ├── Dockerfile             # Multi-stage build (TS → JS → Nakama image)
│   ├── init.sql               # Custom PostgreSQL schema
│   ├── local.yml              # Nakama runtime config
│   ├── src/
│   │   ├── main.ts            # Entry point — registers all handlers & RPCs
│   │   ├── match_handler.ts   # Server-authoritative match logic
│   │   ├── matchmaker.ts      # Automatic matchmaking hook
│   │   ├── rpc.ts             # REST RPC endpoints
│   │   ├── leaderboard.ts     # Leaderboard initialization
│   │   └── ai.ts              # AI opponent (Minimax with difficulty levels)
│   └── ...
```

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- (Optional) [Node.js 20+](https://nodejs.org/) for local development without Docker

### 1. Start the Full Stack

```bash
docker compose up --build -d
```

This spins up **three containers**:

| Service | Container | Port | Description |
|---------|-----------|------|-------------|
| PostgreSQL | `ttt_postgres` | 5432 | Database with custom schema |
| Nakama | `ttt_nakama` | 7350 (API), 7351 (Console) | Game server |
| Frontend | `ttt_frontend` | 3000 | React SPA served via nginx |

### 2. Verify

- **Game UI**: http://localhost:3000
- **Nakama Console**: http://localhost:7351 (admin / password)
- **API Endpoint**: http://localhost:7350
- **Health Check**: http://localhost:7350/healthcheck

### 3. Stop

```bash
docker compose down
```

To also wipe the database:
```bash
docker compose down -v
```

---

## API Reference

### Authentication

Nakama supports multiple auth methods. For quick testing use **device authentication**:

```bash
curl -X POST "http://localhost:7350/v2/account/authenticate/device" \
  -H "Content-Type: application/json" \
  -u "tictactoe_server_key:" \
  -d '{"id": "device-id-123"}'
```

This returns a session token used in subsequent requests.

### RPC Endpoints

All RPC calls require a valid session token in the `Authorization: Bearer <token>` header.

| RPC ID | Method | Description |
|--------|--------|-------------|
| `create_match` | POST | Create a new match room |
| `join_match` | POST | Find/join an open match |
| `get_leaderboard` | POST | Get global leaderboard |
| `get_player_stats` | POST | Get player statistics (online + AI) |
| `set_username` | POST | Set display name |
| `get_match_history` | POST | Get recent match history |
| `record_ai_game` | POST | Record an AI game result |

#### Create Match

```bash
curl -X POST "http://localhost:7350/v2/rpc/create_match" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"timed": true}'
```

Response:
```json
{ "matchId": "abc123..." }
```

#### Join Match

```bash
# Join a specific match
curl -X POST "http://localhost:7350/v2/rpc/join_match" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"matchId": "abc123..."}'

# Auto-find open match
curl -X POST "http://localhost:7350/v2/rpc/join_match" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

#### Get Player Stats

```bash
curl -X POST "http://localhost:7350/v2/rpc/get_player_stats" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Response:
```json
{
  "userId": "...",
  "username": "ProGamer42",
  "online": {
    "wins": 5,
    "losses": 2,
    "draws": 1,
    "highestScore": 160,
    "winStreak": 3,
    "bestWinStreak": 4,
    "fastestWinTime": 12.5,
    "totalGames": 8,
    "winRate": 62.5
  },
  "ai": {
    "wins": 12,
    "losses": 3,
    "draws": 2,
    "winStreak": 4,
    "bestWinStreak": 6,
    "totalGames": 17,
    "winRate": 70.6,
    "gamesEasy": 5,
    "winsEasy": 5,
    "gamesMedium": 7,
    "winsMedium": 5,
    "gamesHard": 5,
    "winsHard": 2
  }
}
```

#### Set Username

```bash
curl -X POST "http://localhost:7350/v2/rpc/set_username" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"username": "ProGamer42"}'
```

#### Get Leaderboard

```bash
curl -X POST "http://localhost:7350/v2/rpc/get_leaderboard" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'
```

#### Get Match History

```bash
curl -X POST "http://localhost:7350/v2/rpc/get_match_history" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"limit": 20}'
```

#### Record AI Game

```bash
curl -X POST "http://localhost:7350/v2/rpc/record_ai_game" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"result": "win", "difficulty": "hard"}'
```

Accepted values: `result` = `"win"` | `"lose"` | `"draw"`, `difficulty` = `"easy"` | `"medium"` | `"hard"`

---

## WebSocket Connection Guide

### Connect

```javascript
const socket = new WebSocket("ws://localhost:7350/ws?token=<session_token>&format=json");
```

Or using the [Nakama JS Client](https://github.com/heroiclabs/nakama-js):

```javascript
import { Client } from "@heroiclabs/nakama-js";

const client = new Client("tictactoe_server_key", "localhost", "7350");
client.ssl = false;

// Authenticate
const session = await client.authenticateDevice("unique-device-id");

// Create socket
const socket = client.createSocket();
await socket.connect(session, true);
```

### Matchmaking (Auto-pair)

```javascript
const ticket = await socket.addMatchmaker(
  "*",     // query — match anyone
  2,       // min count
  2,       // max count
  { timed: "true" },     // string properties
  {}                      // numeric properties
);

socket.onmatchmakermatched = (matched) => {
  // Join the match
  socket.joinMatch(matched.matchId);
};
```

### Join a Match Directly

```javascript
const match = await socket.joinMatch(matchId);
```

### Send a Move

```javascript
// OpCode 1 = PLAYER_MOVE
const data = JSON.stringify({ position: 4 }); // center cell
socket.sendMatchState(matchId, 1, data);
```

### Receive Updates

```javascript
socket.onmatchdata = (result) => {
  const data = JSON.parse(new TextDecoder().decode(result.data));

  switch (result.opCode) {
    case 2: // STATE_UPDATE
      console.log("Board:", data.board);
      console.log("Current turn:", data.currentPlayer);
      break;
    case 3: // GAME_OVER
      console.log("Winner:", data.winner, "Reason:", data.reason);
      break;
    case 4: // TIMER_UPDATE
      console.log("Time remaining:", data.remainingSeconds);
      break;
  }
};
```

---

## OpCodes

| Code | Name | Direction | Description |
|------|------|-----------|-------------|
| 1 | `PLAYER_MOVE` | Client → Server | `{ position: 0-8 }` |
| 2 | `STATE_UPDATE` | Server → Client | Full board state broadcast |
| 3 | `GAME_OVER` | Server → Client | Winner, reason, final state |
| 4 | `TIMER_UPDATE` | Server → Client | Remaining turn time |
| 5 | `REMATCH_REQUEST` | Bidirectional | Request/accept rematch |

---

## Game Rules (Server-Enforced)

- **Turn order**: Player 1 (X) always goes first
- **Move validation**: Only empty cells accepted
- **Turn enforcement**: Only current player can move
- **Win detection**: Checks all 8 combinations (3 rows, 3 columns, 2 diagonals)
- **Draw detection**: All 9 cells filled with no winner
- **Disconnect**: Opponent wins by forfeit
- **Turn timers** (difficulty-based):

| Difficulty | Time per Move |
|------------|---------------|
| Easy       | 30 seconds    |
| Medium     | 22 seconds    |
| Hard       | 15 seconds    |

  Auto-forfeit on expiry.
- **Rematch**: Both players must agree; starting player swaps
- **Guest mode**: Play without account — stats are not tracked
- **Stats separation**: AI game stats and online game stats are stored in separate database tables

---

## Testing Multiplayer (Two Browser Tabs)

1. Start the server: `docker compose up --build -d`
2. Open two browser tabs (or use two terminal sessions)
3. Authenticate as two different device IDs
4. Both call `join_match` RPC with `{}` — they'll auto-pair
5. Connect WebSockets and play!

Example with curl for two players:

```bash
# Terminal 1: Authenticate Player 1
TOKEN1=$(curl -s -X POST "http://localhost:7350/v2/account/authenticate/device" \
  -H "Content-Type: application/json" \
  -u "tictactoe_server_key:" \
  -d '{"id": "player-1"}' | jq -r '.token')

# Terminal 2: Authenticate Player 2
TOKEN2=$(curl -s -X POST "http://localhost:7350/v2/account/authenticate/device" \
  -H "Content-Type: application/json" \
  -u "tictactoe_server_key:" \
  -d '{"id": "player-2"}' | jq -r '.token')

# Player 1 creates match
MATCH=$(curl -s -X POST "http://localhost:7350/v2/rpc/create_match" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{}' | jq -r '.payload' | jq -r '.matchId')

echo "Match ID: $MATCH"

# Both connect via WebSocket and join the match
```

---

## Data Structures & Algorithms

> _The heart of an unbeatable game lies in elegant mathematics._

### Board Representation

```
Data Structure : Fixed-length Array (size 9)
Mapping        : 1-D array → 3×3 grid

  board[0] │ board[1] │ board[2]
  ─────────┼──────────┼─────────
  board[3] │ board[4] │ board[5]
  ─────────┼──────────┼─────────
  board[6] │ board[7] │ board[8]

Frontend : CellValue[]  →  'X' | 'O' | null
Backend  : number[]     →   1  |  2  |  0
```

A flat array is chosen over a 2-D matrix for constant-time `O(1)` cell access, minimal memory footprint, and trivial serialization across the WebSocket protocol.

---

### Win Detection — Exhaustive Line Scan

```
Algorithm   : Linear scan over 8 pre-computed winning lines
Complexity  : O(1)  — always exactly 8 checks, regardless of board state
```

```
Winning Lines (indices):
  Rows       →  [0,1,2]  [3,4,5]  [6,7,8]
  Columns    →  [0,3,6]  [1,4,7]  [2,5,8]
  Diagonals  →  [0,4,8]  [2,4,6]
```

The eight winning combinations are stored as a constant lookup table. For each line `[a, b, c]`, win is detected when:

$$
\text{board}[a] = \text{board}[b] = \text{board}[c] \neq \emptyset
$$

---

### Minimax Algorithm — The Core AI Engine

```
Algorithm   : Minimax with Alpha-Beta Pruning
Type        : Adversarial Search (two-player, zero-sum)
Optimality  : Guaranteed — the AI is mathematically unbeatable on Hard
Files       : frontend/src/lib/gameLogic.ts , backend/src/ai.ts
```

Minimax models the game as a decision tree where two players alternate optimally:

```
                        ┌─────────┐
                        │  ROOT   │  AI's turn (Maximizer)
                        │ board[] │
                        └────┬────┘
               ┌─────────────┼─────────────┐
               ▼             ▼             ▼
          ┌─────────┐   ┌─────────┐   ┌─────────┐
          │ Move 0  │   │ Move 1  │   │ Move 4  │  Human's turn (Minimizer)
          └────┬────┘   └────┬────┘   └────┬────┘
             ╱   ╲         ╱   ╲         ╱   ╲
            ▼     ▼       ▼     ▼       ▼     ▼    ... deeper recursion
          +7    -3       +9    0       +5    +2

     Maximizer picks: max(+7, -3) = +7
     Minimizer picks: min(+7, +9, +5) = +5
```

#### Scoring Function

Each terminal state (leaf node) receives a score:

| Outcome | Score | Reasoning |
|---------|-------|-----------|
| AI Wins | $10 - d$ | Faster wins score higher |
| Human Wins | $d - 10$ | Slower losses are less negative |
| Draw | $0$ | Perfectly neutral |

Where $d$ = depth of the node in the recursion tree. This ensures the AI **wins as fast as possible** and **delays losses as long as possible**.

#### Alpha-Beta Pruning

A critical optimization that eliminates branches of the game tree that cannot influence the final decision:

```
α (alpha)  =  best score the Maximizer can guarantee    (starts at -∞)
β (beta)   =  best score the Minimizer can guarantee    (starts at +∞)

Pruning Rule:  if α ≥ β → cut off remaining children
```

```
Unpruned search :  O(b^d)      ≈  O(9!) = 362,880 nodes
With pruning    :  O(b^(d/2))  ≈  O(√(9!)) ≈ 600 nodes
```

This reduces the search space by **orders of magnitude**, making the AI respond instantaneously.

#### Difficulty Levels

| Level | Strategy | Beatable? | Turn Timer |
|-------|----------|-----------|------------|
| **Easy** | Pure random cell selection | Always | 30s |
| **Medium** | 50% random, 50% Minimax | Sometimes | 22s |
| **Hard** | Full Minimax + α-β pruning | Never | 15s |

#### Pseudocode

```
function minimax(board, depth, isMaximizing, α, β):

    if terminal(board):
        return score(board, depth)

    if isMaximizing:                          ── AI's turn
        maxEval ← -∞
        for each empty cell:
            place AI mark
            eval ← minimax(board, depth+1, false, α, β)
            undo move
            maxEval ← max(maxEval, eval)
            α ← max(α, eval)
            if β ≤ α: break                  ── prune
        return maxEval

    else:                                     ── Human's turn
        minEval ← +∞
        for each empty cell:
            place human mark
            eval ← minimax(board, depth+1, true, α, β)
            undo move
            minEval ← min(minEval, eval)
            β ← min(β, eval)
            if β ≤ α: break                  ── prune
        return minEval
```

---

### State Synchronization — Real-Time Protocol

```
Protocol    : WebSocket (persistent, bidirectional)
Encoding    : JSON over binary frames
Authority   : Server-authoritative (all moves validated server-side)
Tick Rate   : 5 Hz (5 game loop iterations per second)
```

| OpCode | Name | Direction | Payload |
|--------|------|-----------|---------|
| `1` | `PLAYER_MOVE` | Client → Server | `{ position: 0-8 }` |
| `2` | `STATE_UPDATE` | Server → Client | Full board state |
| `3` | `GAME_OVER` | Server → Client | Winner, reason, final board |
| `4` | `TIMER_UPDATE` | Server → Client | Remaining turn time |
| `5` | `REMATCH_REQUEST` | Bidirectional | Rematch agreement |

The server validates every move against these rules before broadcasting state updates — **no client can cheat**.

---

### Matchmaking — Queue & Pairing

```
Algorithm   : Criteria-based queue matching
Complexity  : O(n) scan over waiting players
Provider    : Nakama built-in matchmaker
```

Players submit a matchmaking ticket with optional properties (e.g. `timed: true`). The matchmaker pairs players when the query criteria align and the player count reaches the required threshold (2 for Tic Tac Toe).

---

### Score Computation

```
base_score       = 100
streak_bonus     = current_win_streak × 10
fast_win_bonus   = 50  (if game duration ≤ 15 seconds)
────────────────────────────────────────────────────
total_score      = base_score + streak_bonus + fast_win_bonus
```

Scores feed into a **descending leaderboard** using Nakama's built-in leaderboard system with `BEST` operator (only the player's highest score is retained).

---

## Database Schema

### `users_profile`
| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID (PK) | Nakama user ID |
| username | TEXT (UNIQUE) | Display name |
| created_at | TIMESTAMPTZ | Registration time |

### `game_stats` (Online Games)
| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID (PK, FK) | References users_profile |
| wins | INT | Total online wins |
| losses | INT | Total online losses |
| draws | INT | Total online draws |
| highest_score | INT | Best score achieved |
| win_streak | INT | Current win streak |
| best_win_streak | INT | All-time best streak |
| fastest_win_time | FLOAT | Fastest win in seconds |
| updated_at | TIMESTAMPTZ | Last update time |

### `ai_game_stats` (AI Games)
| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID (PK, FK) | References users_profile |
| wins | INT | Total AI wins |
| losses | INT | Total AI losses |
| draws | INT | Total AI draws |
| win_streak | INT | Current win streak |
| best_win_streak | INT | All-time best streak |
| games_easy | INT | Games played on Easy |
| wins_easy | INT | Wins on Easy |
| games_medium | INT | Games played on Medium |
| wins_medium | INT | Wins on Medium |
| games_hard | INT | Games played on Hard |
| wins_hard | INT | Wins on Hard |
| updated_at | TIMESTAMPTZ | Last update time |

### `match_history` (Online Games)
| Column | Type | Description |
|--------|------|-------------|
| match_id | UUID (PK) | Auto-generated |
| player1_id | UUID (FK) | Player 1 |
| player2_id | UUID (FK) | Player 2 |
| winner_id | UUID (FK, nullable) | NULL for draws |
| moves_count | INT | Total moves made |
| duration_seconds | FLOAT | Match duration |
| created_at | TIMESTAMPTZ | When match ended |

---

## Local Development (Without Docker)

```bash
# Backend
cd backend
npm install
npm run build  # Compiles TS → build/

# Frontend
cd frontend
npm install
npm run dev    # Vite dev server on port 5173
```

Copy `build/*.js` into a running Nakama's `data/modules/` directory and restart.

---

## Deployment

The entire application (frontend, backend, database) is deployed as a single **Docker Compose** stack.

### Environment Variables

Create a `.env` file in the project root (copy from `.env.example`):

```env
# PostgreSQL
POSTGRES_DB=nakama
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-password>

# Nakama
NAKAMA_SERVER_KEY=<your-production-server-key>
NAKAMA_CONSOLE_USERNAME=admin
NAKAMA_CONSOLE_PASSWORD=<strong-console-password>

# Frontend build-time variables
VITE_NAKAMA_HOST=your-domain.com
VITE_NAKAMA_PORT=7350
VITE_NAKAMA_KEY=<your-production-server-key>
VITE_NAKAMA_SSL=true
```

### Container Overview

| Service | Image | Exposed Port | Role |
|---------|-------|-------------|------|
| `ttt_postgres` | `postgres:16-alpine` | 5432 | Database — runs `init.sql` on first start |
| `ttt_nakama` | Custom (Dockerfile) | 7350, 7351 | Game server — HTTP/WebSocket API + admin console |
| `ttt_frontend` | Custom (Dockerfile) | 3000 → 80 | React SPA served by nginx |

### Deploy to a Cloud VM (Recommended)

**Works on:** AWS EC2, GCP Compute Engine, DigitalOcean Droplet, Azure VM, Hetzner, any VPS with Docker.

```bash
# 1. SSH into your server
ssh user@your-server

# 2. Clone the repository
git clone <your-repo-url> && cd Tic_Tac_Toe

# 3. Create production environment file
cp .env.example .env
# Edit .env with secure values (see above)

# 4. Build and start all services
docker compose --env-file .env up --build -d

# 5. Verify
curl http://localhost:7350/healthcheck   # Nakama API
curl http://localhost:3000               # Frontend
```

### TLS / HTTPS Setup

Place a reverse proxy (nginx or Caddy) in front of the stack to terminate TLS:

```
Internet ──► nginx/Caddy (443) ──► ttt_frontend (3000)
                                ──► ttt_nakama   (7350)  ← WebSocket upgrade
```

Example with Caddy (automatic HTTPS):

```
your-domain.com {
    reverse_proxy localhost:3000
}

api.your-domain.com {
    reverse_proxy localhost:7350
}
```

Then set `VITE_NAKAMA_HOST=api.your-domain.com` and `VITE_NAKAMA_SSL=true` in `.env` and rebuild the frontend container.

### Deploy to Container Services

The `docker-compose.yaml` also works with container orchestration platforms:

| Platform | Command |
|----------|---------|
| **Docker Compose** (VM) | `docker compose up --build -d` |
| **AWS ECS** | Use `docker compose` → ECS via `docker context` |
| **Fly.io** | `fly launch` per service or use `fly machines` |
| **Railway** | Import repo, configure each service |
| **Render** | Docker deploy per service |

### Updating

```bash
git pull
docker compose up --build -d
```

PostgreSQL data persists in the `pgdata` Docker volume across rebuilds.

### Tearing Down

```bash
# Stop services (keep data)
docker compose down

# Stop and delete all data
docker compose down -v
```

### Production Checklist

- [ ] Change `NAKAMA_SERVER_KEY` from default
- [ ] Set strong `POSTGRES_PASSWORD`
- [ ] Restrict port 7351 (admin console) — firewall or VPN only
- [ ] Enable TLS/SSL via reverse proxy (nginx / Caddy)
- [ ] Set `VITE_NAKAMA_SSL=true` for frontend
- [ ] Configure log aggregation (stdout → CloudWatch / Loki / etc.)
- [ ] Set up monitoring and alerting
- [ ] Consider managed PostgreSQL (RDS, Cloud SQL) for HA
- [ ] Configure database backup strategy
- [ ] Use a firewall to expose only ports 80/443

---

## License

MIT
