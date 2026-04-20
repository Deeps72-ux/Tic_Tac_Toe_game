# Tic Tac Toe — Multiplayer Backend (Nakama)

Production-ready, server-authoritative multiplayer Tic Tac Toe backend built on **Nakama**, **PostgreSQL**, and **Docker**.

---

## Architecture

```
┌──────────────┐      WebSocket / REST       ┌──────────────────┐
│   Clients    │  ◄──────────────────────►    │   Nakama Server  │
│  (Browser)   │        port 7350            │   (TypeScript)   │
└──────────────┘                              │                  │
                                              │  Match Handler   │
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

---

## Project Structure

```
backend/
├── src/
│   ├── main.ts           # Entry point — registers all handlers
│   ├── match_handler.ts  # Server-authoritative match logic
│   ├── matchmaker.ts     # Automatic matchmaking hook
│   ├── rpc.ts            # REST RPC endpoints
│   ├── leaderboard.ts    # Leaderboard initialization
│   └── ai.ts             # AI opponent (Minimax with difficulty levels)
├── init.sql              # Custom PostgreSQL schema
├── local.yml             # Nakama runtime configuration
├── rollup.config.js      # Rollup bundler config
├── babel.config.json     # Babel transpilation config
├── Dockerfile            # Multi-stage build (compile TS → Nakama image)
├── package.json
└── tsconfig.json
docker-compose.yaml       # Orchestrates Nakama + PostgreSQL
```

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- (Optional) [Node.js 20+](https://nodejs.org/) for local TypeScript development

### 1. Start the Server

```bash
docker compose up --build -d
```

This will:
- Build the TypeScript modules
- Start PostgreSQL with custom schema
- Start Nakama with compiled JS modules

### 2. Verify

- **Nakama Console**: http://localhost:7351 (admin/password)
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
| `get_player_stats` | POST | Get player statistics |
| `set_username` | POST | Set display name |
| `get_match_history` | POST | Get recent match history |

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
  "wins": 5,
  "losses": 2,
  "draws": 1,
  "highestScore": 160,
  "winStreak": 3,
  "bestWinStreak": 4,
  "fastestWinTime": 12.5,
  "totalGames": 8,
  "winRate": 62.5
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
- **Timer mode**: 30 seconds per turn, auto-forfeit on expiry
- **Rematch**: Both players must agree; starting player swaps

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

| Level | Strategy | Beatable? |
|-------|----------|-----------|
| **Easy** | Pure random cell selection | Always |
| **Medium** | 50% random, 50% Minimax | Sometimes |
| **Hard** | Full Minimax + α-β pruning | Never |

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

## Deployment

### Frontend → Vercel

The React/Vite frontend deploys to **Vercel** as a static site.

1. Push your repository to GitHub
2. Import the project in [Vercel Dashboard](https://vercel.com/dashboard)
3. Set **Root Directory** → `frontend`
4. Set **Build Command** → `npm run build`
5. Set **Output Directory** → `dist`
6. Add **Environment Variables** in Vercel project settings:

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_NAKAMA_HOST` | `your-nakama-server.com` | Backend server hostname |
| `VITE_NAKAMA_PORT` | `7350` | Nakama API port |
| `VITE_NAKAMA_KEY` | `your_production_server_key` | Server key |
| `VITE_NAKAMA_SSL` | `true` | Enable HTTPS/WSS |

A `vercel.json` is included for SPA routing. Use `frontend/.env.example` as a reference.

### Backend → Docker (Any Cloud Provider)

The Nakama + PostgreSQL backend requires Docker and runs on any cloud VM or container service.

**Recommended providers:** AWS EC2/ECS, GCP Compute Engine/GKE, DigitalOcean Droplet, Fly.io, Railway.

```bash
# 1. SSH into your server
# 2. Clone the repo
git clone <your-repo-url> && cd Tic_Tac_Toe

# 3. Create your production .env
cp .env.example .env
# Edit .env with secure values

# 4. Start
docker compose --env-file .env up --build -d
```

**Important:** Place a reverse proxy (nginx/Caddy) in front of Nakama for TLS termination so the frontend can connect via `wss://`.

### Production Checklist

- [ ] Change `socket.server_key` from default
- [ ] Set strong PostgreSQL password
- [ ] Restrict port 7351 (admin console) access
- [ ] Enable TLS/SSL (reverse proxy: nginx/caddy)
- [ ] Configure log aggregation
- [ ] Set up monitoring and alerting
- [ ] Use managed PostgreSQL (RDS/Cloud SQL)
- [ ] Configure backup strategy for database

---

## Database Schema

### `users_profile`
| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID (PK) | Nakama user ID |
| username | TEXT (UNIQUE) | Display name |
| created_at | TIMESTAMPTZ | Registration time |

### `game_stats`
| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID (PK, FK) | References users_profile |
| wins | INT | Total wins |
| losses | INT | Total losses |
| draws | INT | Total draws |
| highest_score | INT | Best score achieved |
| win_streak | INT | Current win streak |
| best_win_streak | INT | All-time best streak |
| fastest_win_time | FLOAT | Fastest win in seconds |
| updated_at | TIMESTAMPTZ | Last update time |

### `match_history`
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
cd backend
npm install
npm run build  # Compiles TS → build/
```

Copy `build/*.js` into a running Nakama's `data/modules/` directory and restart.

---

## License

MIT
