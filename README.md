# ◈ Project Sybil

**Production-grade internal intelligence platform that maps organizational dependencies as a living mathematical graph.**

Sybil ingests metadata from the tools companies already use (GitHub, Slack, Jira, Notion), builds a weighted directed graph of real collaboration patterns, and runs production-grade graph algorithms to mathematically identify fragility before it becomes catastrophe.

No LLMs. No inference. No black boxes. Every risk flag is derived from a formula that can be written on a whiteboard and defended in a boardroom.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ◈ SYBIL DASHBOARD                        │
│              React + Vite + Sigma.js + Zustand              │
│                    http://localhost:3000                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API
┌──────────────────────────▼──────────────────────────────────┐
│                   INGESTION SERVICE                         │
│           TypeScript + Express + node-cron                  │
│                   http://localhost:3001                      │
│                                                             │
│  ┌─────────┐ ┌───────┐ ┌──────┐ ┌────────┐ ┌──────┐       │
│  │ GitHub  │ │ Slack │ │ Jira │ │ Notion │ │ Mock │       │
│  │Connector│ │Connec.│ │Conn. │ │ Conn.  │ │ Gen. │       │
│  └────┬────┘ └───┬───┘ └──┬───┘ └───┬────┘ └──┬───┘       │
│       └──────────┴────────┴─────────┴─────────┘             │
└──────────────────────────┬──────────────────────────────────┘
                           │ Bolt Protocol
┌──────────────────────────▼──────────────────────────────────┐
│                     NEO4J GRAPH DB                           │
│               Enterprise 5.18 + GDS + APOC                  │
│                   http://localhost:7474                      │
└──────────────────────────▲──────────────────────────────────┘
                           │ Bolt Protocol
┌──────────────────────────┴──────────────────────────────────┐
│                   ANALYSIS ENGINE                           │
│          Python + FastAPI + NetworkX + GDS                   │
│                   http://localhost:8000                      │
│                                                             │
│  ┌────────────┐ ┌───────────┐ ┌────────────┐ ┌──────────┐  │
│  │ Centrality │ │ Community │ │ Redundancy │ │ What-If  │  │
│  │ (Betw+PR)  │ │ (Louvain) │ │ (Paths)    │ │ (Sim)    │  │
│  └────────────┘ └───────────┘ └────────────┘ └──────────┘  │
│                                                             │
│  ┌────────────┐ ┌───────────┐ ┌────────────────────────┐   │
│  │ Fragility  │ │ Temporal  │ │ Reports (WeasyPrint)   │   │
│  │ (Composite)│ │ (Trends)  │ │                        │   │
│  └────────────┘ └───────────┘ └────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- npm 9+

### 5-Command Demo

```bash
# 1. Clone and setup
git clone <repo-url> && cd project-sybil
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Start Neo4j + Analysis engine
docker-compose up -d neo4j analysis

# 4. Start ingestion + dashboard (in separate terminal)
npm run dev --workspaces

# 5. Seed demo data and run analysis
make demo
```

Open **http://localhost:3000** — you'll see the organizational graph with Marcus Webb glowing red in the center. Right-click him and select "Simulate Removal" to watch 89 engineers lose their code reviewer.

---

## Connector Setup

### GitHub
1. Create a Personal Access Token: https://github.com/settings/tokens
2. Required scopes: `read:org`, `repo`, `read:user`
3. Set `GITHUB_TOKEN` and `GITHUB_ORG` in `.env`

### Slack
1. Create a Slack App: https://api.slack.com/apps
2. Add Bot Token Scopes: `channels:history`, `channels:read`, `users:read`, `reactions:read`
3. Install to workspace, copy Bot User OAuth Token
4. Set `SLACK_BOT_TOKEN` in `.env`

### Jira
1. Generate API token: https://id.atlassian.com/manage-profile/security/api-tokens
2. Set `JIRA_HOST`, `JIRA_EMAIL`, `JIRA_TOKEN` in `.env`

### Notion
1. Create integration: https://www.notion.so/my-integrations
2. Share relevant pages with the integration
3. Set `NOTION_TOKEN` in `.env`

---

## Graph Algorithms (Plain English)

### Betweenness Centrality
"How many shortest paths between other people go through this person?"  
If removing someone breaks the fastest communication paths between many teams, they're a bottleneck.

### PageRank
"Who is depended on by other important people?"  
Not just who has the most connections — who is connected to other highly-connected people. Recursive importance.

### Louvain Community Detection
"Who actually works together, regardless of the org chart?"  
Finds natural clusters of collaboration. Often reveals that the real teams don't match HR's structure.

### Redundancy Score
"If this person disappears, do alternative paths still exist?"  
Measures how many communication paths survive if a node is removed. Low redundancy = single point of failure.

### Fragility Score (Composite)
The main metric. Weighted combination of:
- 30% Betweenness Centrality
- 20% PageRank
- 20% (1 - Redundancy)
- 15% Degree Centrality
- 10% Structural Hole Score
- 5% Inverse Bus Factor

Score 0-100. Tiers: **Critical** (85-100), **High** (65-84), **Medium** (40-64), **Low** (0-39).

---

## Demo Script

> Use this when presenting to judges or stakeholders.

1. **Open the dashboard** — pause. Let the graph load. The first impression is Marcus Webb, glowing red, enormous, in the center. Say: *"This is your company. Every dot is a person. Every line is a real interaction — commits, code reviews, messages, tickets. The red glow means danger."*

2. **Hover over Marcus** — his connections light up. Say: *"Marcus Webb reviews pull requests from 89 engineers. He's the sole code owner of 7 repositories. No one assigned this role. It evolved invisibly."*

3. **Right-click Marcus → Simulate Removal** — watch 89 nodes grey out. Say: *"If Marcus is unavailable Monday, 89 engineers can't merge code. 4 repositories have no owner. 7 projects lose their technical decision-maker. This is a $2M/week risk hiding in your org chart."*

4. **Click Restore** — the graph heals. Navigate to Communities. Say: *"These are your real teams. Not HR's org chart — the actual tribes."*

5. **Navigate to Timeline** — drag the slider back 6 months. Say: *"Marcus wasn't always critical. Watch his node grow. The fragility was gradual. Sybil would have caught it 3 months ago."*

6. **Close with**: *"No AI. No guessing. Every flag is a formula you can write on a whiteboard. That's the promise."*

---

## API Reference

### Ingestion Service (port 3001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ingest/mock` | Seed mock data scenario |
| POST | `/api/ingest/sync/:connector` | Trigger connector sync |
| GET | `/api/graph/full` | Get full graph data |
| GET | `/api/graph/node/:id` | Get node details |
| POST | `/api/analysis/run` | Trigger full analysis |
| GET | `/api/analysis/snapshots` | List analysis snapshots |
| GET | `/api/analysis/whatif/:nodeId` | What-if simulation |
| GET | `/api/analysis/temporal/:nodeId` | Temporal trends |
| GET | `/api/health` | Health check |

### Analysis Service (port 8000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/run` | Execute full analysis pipeline |
| GET | `/whatif/{node_id}` | Node removal simulation |
| GET | `/temporal/{node_id}` | Temporal fragility data |
| POST | `/reports/generate` | Generate PDF report |
| GET | `/health` | Health check |

---

## License

Proprietary — Internal Use Only
