# Step 1 — FalkorDB Cloud + Seed Script (No Docker needed)

## What this step does

Signs you up for a free FalkorDB Cloud database, creates a `.env` file with
your credentials, and seeds the entire graph (24 nodes, 41 edges) with one
Python command.

---

## 1. Create a free FalkorDB Cloud database (5 minutes)

1. Go to **https://app.falkordb.cloud** and click **Sign Up** (free, no credit card).
2. After you log in, click **Create Database**.
3. Choose the **Free** tier. Name it anything, e.g. `incident-brain`.
4. Wait ~30 seconds for it to provision.
5. On the database detail page you will see three values — copy them:
   - **Host** — looks like `redis-xxxxx.falkordb.io` or similar
   - **Port** — usually `6379`
   - **Password** — a long random string

---

## 2. Create your `.env` file

In the `Graph Hacks` folder, copy the example file:

```bash
cp .env.example .env
```

Open `.env` and fill in the three values you copied:

```
FALKORDB_HOST=your-instance.falkordb.cloud
FALKORDB_PORT=6379
FALKORDB_PASSWORD=your_password_here
FALKORDB_GRAPH_NAME=incident_brain
```

> **Note:** Leave `GOOGLE_API_KEY` blank for now — the agent works in fallback
> mode without it. You can add it later.

---

## 3. Install Python packages

```bash
cd "Graph Hacks"
source .venv/bin/activate
pip install -r backend/requirements.txt
```

---

## 4. Run the seed script

```bash
python -m backend.ingest.seed
```

Expected output:

```
============================================================
  Incident Brain — Seed Script
  Connecting to FalkorDB at your-instance.falkordb.cloud:6379 …
============================================================

[wipe] removing all nodes and edges …
[A] seeding Services …
[B] seeding Teams …
[C] seeding People …
[D] seeding Deploys …
[E] seeding Commits …
[F] seeding Alerts and Incidents …
[G] seeding Knowledge nodes …
[H] seeding Agents and Tasks …
[I] seeding Edges …

[J] verifying …

  ✓ Nodes : 24
  ✓ Edges : 41

  Node breakdown:
    Agent                3
    Alert                1
    Commit               2
    Decision             1
    Deploy               3
    Document             1
    Incident             2
    Lesson               1
    Person               4
    Runbook              1
    Service              5
    Task                 3
    Team                 4

  ✓ Seed complete.  FalkorDB graph name: incident_brain
```

---

## 5. Browse the graph in FalkorDB Cloud (optional)

Back in your browser on **https://app.falkordb.cloud**, click your database
and open the **Graph Explorer**. Run:

```cypher
MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 50
```

You will see the full graph laid out visually — great to show judges.

---

## The demo story in the graph

| Node | Role |
|---|---|
| `payments-api` | The service alerting right now (12 % error rate) |
| `auth-service` | Root cause — deploy 40 min ago lowered cache TTL |
| `deploy-auth-001` | The suspect deploy (`is_suspect: true`) |
| `deploy-search-001` | Red herring — unrelated service |
| `deploy-ledger-001` | Red herring — 3 days old, too stale |
| `INC-012` | Past incident with the same pattern (memory anchor) |
| `runbook-rollback-auth` | The fix: roll back auth-service |
| `lesson-001` | Insight: cache TTL changes on auth cascade downstream |

---

## Ready for Step 2?

Once you see `✓ Nodes : 24` and `✓ Edges : 41`, tell me and I will build
**Step 2: five `.cypher` query files** — one question per file, each with a
plain-English explanation you can read out to judges.
