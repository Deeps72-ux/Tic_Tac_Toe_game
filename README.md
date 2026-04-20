# Tic Tac Toe — Full-Stack Multiplayer Game

Production-ready, server-authoritative multiplayer Tic Tac Toe built on **React/Vite**, **Nakama** (TypeScript runtime), **PostgreSQL**, and **Docker**. Deployable as a single `docker compose` stack.

**GitHub Repository:** https://github.com/Deeps72-ux/Tic_Tac_Toe_game.git

### Live Deployment (Azure Container Apps)

| Service | URL |
|---------|-----|
| Frontend | https://ttt-frontend.jollyisland-5af5d305.eastus.azurecontainerapps.io |
| Nakama API | https://ttt-nakama.jollyisland-5af5d305.eastus.azurecontainerapps.io |
| Nakama Console | https://ttt-nakama.jollyisland-5af5d305.eastus.azurecontainerapps.io/console |

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
├── docker-compose.yaml        # Orchestrates all 3 services (local dev)
├── azure-deploy.sh            # One-command Azure Container Apps deploy
├── .github/
│   └── workflows/
│       └── deploy.yml         # CI/CD — build, test, deploy to Azure
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

## Deployment — Azure Container Apps

The full stack deploys to **Azure Container Apps** as 3 containers in a shared environment with automatic HTTPS, scaling, and internal networking.

```
┌─────────────────────────────────────────────────────────────┐
│                Azure Container Apps Environment             │
│                                                             │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │  Frontend    │    │   Nakama     │    │  PostgreSQL   │  │
│  │  (nginx)     │───►│  (backend)   │───►│  (database)   │  │
│  │  external    │    │  external    │    │  internal     │  │
│  │  port 80     │    │  port 7350   │    │  port 5432    │  │
│  └─────────────┘    └──────────────┘    └───────────────┘  │
│        ▲                   ▲                                │
└────────┼───────────────────┼────────────────────────────────┘
         │                   │
    https://ttt-frontend.jollyisland-5af5d305.eastus.azurecontainerapps.io
    https://ttt-nakama.jollyisland-5af5d305.eastus.azurecontainerapps.io
```

### Prerequisites

- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) installed
- Azure subscription (logged in via `az login`)
- Docker (only if building locally; the script uses ACR cloud builds)

### One-Command Deploy

```bash
chmod +x azure-deploy.sh
./azure-deploy.sh
```

The script automatically:

1. Creates a Resource Group
2. Creates an Azure Container Registry (ACR)
3. Builds & pushes backend and frontend images via ACR cloud build
4. Creates a Container Apps Environment
5. Deploys PostgreSQL (internal, not exposed to internet)
6. Deploys Nakama (external, HTTPS endpoint)
7. Rebuilds the frontend with the actual Nakama URL baked in
8. Deploys the frontend (external, HTTPS endpoint)
9. Prints all URLs and credentials

### What Gets Created

| Azure Resource | Name | Purpose |
|---------------|------|---------|
| Resource Group | `ttt-rg` | Logical container for all resources |
| Container Registry | `tttacr*` | Private Docker image registry |
| Container Apps Environment | `ttt-env` | Shared network + logging |
| Container App | `ttt-postgres` | PostgreSQL 16 (internal only) |
| Container App | `ttt-nakama` | Nakama game server (HTTPS, WebSocket) |
| Container App | `ttt-frontend` | React SPA via nginx (HTTPS) |

### Resource Sizing

| Container | CPU | Memory | Replicas | Ingress |
|-----------|-----|--------|----------|---------|
| PostgreSQL | 0.5 vCPU | 1 GiB | 1 (fixed) | Internal (TCP 5432) |
| Nakama | 1.0 vCPU | 2 GiB | 1 (fixed) | External (HTTPS) |
| Frontend | 0.25 vCPU | 0.5 GiB | 1–3 (auto) | External (HTTPS) |

### Manual Step-by-Step Deploy

If you prefer to deploy manually instead of using the script:

```bash
# 1. Login
az login

# 2. Create resource group
az group create --name ttt-rg --location eastus

# 3. Create container registry
az acr create --resource-group ttt-rg --name <unique-acr-name> --sku Basic --admin-enabled true

# 4. Build images in ACR (no local Docker needed)
az acr build --registry <acr-name> --image ttt-backend:latest --file backend/Dockerfile backend/
az acr build --registry <acr-name> --image ttt-frontend:latest --file frontend/Dockerfile \
  --build-arg VITE_NAKAMA_HOST=<nakama-fqdn> \
  --build-arg VITE_NAKAMA_PORT=443 \
  --build-arg VITE_NAKAMA_KEY=<server-key> \
  --build-arg VITE_NAKAMA_SSL=true \
  frontend/

# 5. Create container apps environment
az containerapp env create --name ttt-env --resource-group ttt-rg --location eastus

# 6. Deploy PostgreSQL (internal)
az containerapp create --name ttt-postgres \
  --resource-group ttt-rg --environment ttt-env \
  --image postgres:16-alpine \
  --target-port 5432 --ingress internal --transport tcp \
  --min-replicas 1 --max-replicas 1 \
  --cpu 0.5 --memory 1.0Gi \
  --env-vars POSTGRES_DB=nakama POSTGRES_USER=postgres POSTGRES_PASSWORD=<password>

# 7. Deploy Nakama (external)
az containerapp create --name ttt-nakama \
  --resource-group ttt-rg --environment ttt-env \
  --image <acr-name>.azurecr.io/ttt-backend:latest \
  --registry-server <acr-name>.azurecr.io \
  --registry-username <acr-name> --registry-password <acr-password> \
  --target-port 7350 --ingress external --transport http \
  --min-replicas 1 --max-replicas 1 \
  --cpu 1.0 --memory 2.0Gi \
  --env-vars NAKAMA_SERVER_KEY=<key> NAKAMA_CONSOLE_USERNAME=admin NAKAMA_CONSOLE_PASSWORD=<pass>

# 8. Deploy Frontend (external)
az containerapp create --name ttt-frontend \
  --resource-group ttt-rg --environment ttt-env \
  --image <acr-name>.azurecr.io/ttt-frontend:latest \
  --registry-server <acr-name>.azurecr.io \
  --registry-username <acr-name> --registry-password <acr-password> \
  --target-port 80 --ingress external --transport http \
  --min-replicas 1 --max-replicas 3 \
  --cpu 0.25 --memory 0.5Gi
```

### Local Development (Docker Compose)

For local development, the same stack runs via Docker Compose:

```bash
cp .env.example .env
# Edit .env with local values (defaults work out of the box)

docker compose up --build -d
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Nakama API | http://localhost:7350 |
| Nakama Console | http://localhost:7351 (admin / password) |

### Updating a Deployed App

```bash
# Rebuild and push updated image
az acr build --registry <acr-name> --image ttt-backend:latest --file backend/Dockerfile backend/

# Restart the container to pull the new image
az containerapp revision restart --name ttt-nakama --resource-group ttt-rg
```

### Tearing Down

```bash
# Delete everything (resource group, containers, ACR, all data)
az group delete --name ttt-rg --yes --no-wait
```

### Cost Estimate

Azure Container Apps uses **consumption-based pricing** (pay per vCPU-second and GiB-second):

| Component | Approximate Monthly Cost |
|-----------|-------------------------|
| PostgreSQL container (always-on, 0.5 vCPU) | ~$15 |
| Nakama container (always-on, 1.0 vCPU) | ~$30 |
| Frontend container (0.25 vCPU, scales to 0) | ~$2–5 |
| Container Registry (Basic) | ~$5 |
| **Total** | **~$50–55/month** |

*Costs vary by region and usage. Set `--min-replicas 0` on the frontend to scale to zero when idle.*

### Production Checklist

- [ ] Generate strong random values for `NAKAMA_SERVER_KEY` and `POSTGRES_PASSWORD`
- [ ] PostgreSQL ingress is set to **internal** (not reachable from internet)
- [ ] Nakama console password is strong and not the default
- [ ] Frontend is rebuilt with correct `VITE_NAKAMA_HOST` pointing to the Nakama FQDN
- [ ] `VITE_NAKAMA_SSL=true` is set for the frontend build
- [ ] Consider [Azure Database for PostgreSQL Flexible Server](https://learn.microsoft.com/en-us/azure/postgresql/) for HA/backups
- [ ] Configure Azure Monitor alerts for container health
- [ ] Enable diagnostic logs on the Container Apps environment
- [ ] Set up scheduled backups for the PostgreSQL container volume
- [ ] Configure GitHub Actions secrets for CI/CD (see below)

---

## CI/CD — GitHub Actions

Automated build, test, and deploy pipeline via `.github/workflows/deploy.yml`.

- **Pull requests** → build + test only (no deploy)
- **Push to `main`** → build + test → deploy all containers to Azure

### How It Works

```
git push main
    │
    ▼
┌─────────────────────┐
│  build-and-test     │  npm ci → build → lint → test
│  (all PRs + pushes) │  Backend + Frontend
└─────────┬───────────┘
          │ ✅ pass
          ▼
┌─────────────────────┐
│  deploy             │  (main branch only)
│  Azure Container    │
│  Apps               │
│                     │  1. az login (service principal)
│                     │  2. Build images in ACR (tagged by commit SHA)
│                     │  3. Deploy ttt-nakama
│                     │  4. Deploy ttt-frontend
│                     │  5. Print URLs to job summary
└─────────────────────┘
```

### Step 1: Create an Azure Service Principal

Run this once from your terminal (requires `az login`):

```bash
az ad sp create-for-rbac \
  --name "github-ttt-deploy" \
  --role contributor \
  --scopes /subscriptions/<YOUR_SUBSCRIPTION_ID>/resourceGroups/ttt-rg \
  --sdk-auth
```

This outputs a JSON block — copy the **entire JSON output**. You'll paste it as a GitHub secret.

> **Tip:** Get your subscription ID with `az account show --query id -o tsv`

### Step 2: Get ACR Credentials

```bash
# ACR admin username (same as the ACR name)
az acr credential show --name <your-acr-name> --query username -o tsv

# ACR admin password
az acr credential show --name <your-acr-name> --query "passwords[0].value" -o tsv
```

### Step 3: Get Container App FQDNs

After the initial deploy (via `azure-deploy.sh`), grab the FQDNs:

```bash
# Nakama FQDN
az containerapp show --name ttt-nakama --resource-group ttt-rg \
  --query "properties.configuration.ingress.fqdn" -o tsv

# PostgreSQL internal FQDN
az containerapp show --name ttt-postgres --resource-group ttt-rg \
  --query "properties.configuration.ingress.fqdn" -o tsv
```

### Step 4: Add GitHub Secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

Add each secret:

| Secret Name | Value | How to Get It |
|-------------|-------|---------------|
| `AZURE_CREDENTIALS` | Full JSON from Step 1 | `az ad sp create-for-rbac --sdk-auth` |
| `ACR_NAME` | Your ACR name (e.g. `tttacr1a2b3c4d`) | From `azure-deploy.sh` output |
| `ACR_USERNAME` | ACR admin username | `az acr credential show` |
| `ACR_PASSWORD` | ACR admin password | `az acr credential show` |
| `AZURE_RESOURCE_GROUP` | `ttt-rg` | Your resource group name |
| `AZURE_ENVIRONMENT` | `ttt-env` | Your Container Apps environment |
| `NAKAMA_SERVER_KEY` | Random server key | From `azure-deploy.sh` output |
| `NAKAMA_CONSOLE_USERNAME` | `admin` | Console login |
| `NAKAMA_CONSOLE_PASSWORD` | Strong password | From `azure-deploy.sh` output |
| `POSTGRES_USER` | `postgres` | DB username |
| `POSTGRES_PASSWORD` | Strong password | From `azure-deploy.sh` output |
| `POSTGRES_DB` | `nakama` | DB name |
| `NAKAMA_FQDN` | `ttt-nakama.jollyisland-5af5d305.eastus.azurecontainerapps.io` | Step 3 |
| `POSTGRES_FQDN` | `ttt-postgres.internal.jollyisland-5af5d305.eastus.azurecontainerapps.io` | Step 3 |

### Quick Setup Script

Run this after the initial `azure-deploy.sh` to set all GitHub secrets at once (requires [GitHub CLI](https://cli.github.com/)):

```bash
# Save values from your azure-deploy.sh output
REPO="your-username/your-repo"

gh secret set AZURE_CREDENTIALS   --repo "$REPO" < azure-sp-credentials.json
gh secret set ACR_NAME            --repo "$REPO" --body "<acr-name>"
gh secret set ACR_USERNAME        --repo "$REPO" --body "<acr-name>"
gh secret set ACR_PASSWORD        --repo "$REPO" --body "<acr-password>"
gh secret set AZURE_RESOURCE_GROUP --repo "$REPO" --body "ttt-rg"
gh secret set AZURE_ENVIRONMENT   --repo "$REPO" --body "ttt-env"
gh secret set NAKAMA_SERVER_KEY   --repo "$REPO" --body "<server-key>"
gh secret set NAKAMA_CONSOLE_USERNAME --repo "$REPO" --body "admin"
gh secret set NAKAMA_CONSOLE_PASSWORD --repo "$REPO" --body "<console-pass>"
gh secret set POSTGRES_USER       --repo "$REPO" --body "postgres"
gh secret set POSTGRES_PASSWORD   --repo "$REPO" --body "<db-password>"
gh secret set POSTGRES_DB         --repo "$REPO" --body "nakama"
gh secret set NAKAMA_FQDN         --repo "$REPO" --body "ttt-nakama.jollyisland-5af5d305.eastus.azurecontainerapps.io"
gh secret set POSTGRES_FQDN       --repo "$REPO" --body "ttt-postgres.internal.jollyisland-5af5d305.eastus.azurecontainerapps.io"
```

### Verify

Push a commit to `main` and check the **Actions** tab in your GitHub repo. The workflow will:

1. Build and test both backend and frontend
2. Build Docker images in ACR (tagged with the commit SHA + `latest`)
3. Deploy updated containers to Azure Container Apps
4. Print the live URLs in the job summary

---

## License

MIT

---

**GitHub:** https://github.com/Deeps72-ux/Tic_Tac_Toe_game.git
