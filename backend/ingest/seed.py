"""
backend/ingest/seed.py
======================
Seed script for Incident Brain.

Run this ONCE to populate FalkorDB with all synthetic data.
Connects to FalkorDB Cloud (no Docker needed) via .env credentials.

Usage:
    cd "Graph Hacks"
    python -m backend.ingest.seed

What it creates (one graph called "incident_brain"):

  NODES
  -----
  Service     – a micro-service in production
  Team        – an engineering team that owns services
  Person      – an individual engineer
  Deploy      – a deployment event (what version, when, who triggered it)
  Commit      – a single code change that is part of a Deploy
  Alert       – a monitoring alarm that fired
  Incident    – an active or past production problem
  Runbook     – a step-by-step fix guide
  Lesson      – a written insight extracted from a past incident
  Agent       – one of our three AI agents (Triage / Investigator / Communicator)
  Task        – a piece of work an Agent is assigned to do
  Decision    – a documented choice made during an incident
  Document    – any technical document (architecture doc, post-mortem, etc.)

  EDGES
  -----
  OWNS              Team      → Service       (this team is responsible for this service)
  MEMBER_OF         Person    → Team          (this person belongs to this team)
  DEPENDS_ON        Service   → Service       (service A calls service B at runtime)
  DEPLOYED_TO       Deploy    → Service       (this deploy pushed a new version to this service)
  PART_OF           Commit    → Deploy        (this commit is included in this deploy)
  AUTHORED          Person    → Commit        (this person wrote this commit)
  COVERS            Runbook   → Service       (this runbook is the fix guide for this service)
  FIRED_ON          Alert     → Service       (this alert fired because this service misbehaved)
  TRIGGERED_BY      Incident  → Alert         (this incident was opened because this alert fired)
  AFFECTED          Incident  → Service       (this service was impacted during this incident)
  CAUSED_BY         Incident  → Deploy        (root cause: this deploy caused the incident)
  RESOLVED_WITH     Incident  → Runbook       (incident was fixed using this runbook)
  RESOLVED          Incident  → Person        (this person resolved the incident)
  SIMILAR_TO        Incident  → Incident      (these two incidents look alike — used for memory)
  LEARNED_FROM      Lesson    → Incident      (this lesson was written after that incident)
  APPLIES_TO        Lesson    → Service       (this lesson is relevant to this service)
  DOCUMENTED_IN     Runbook   → Document      (the runbook detail lives in this doc)
  DECIDED_BY        Decision  → Person        (this person made this decision)
  ASSIGNED_TO       Agent     → Task          (this AI agent is working on this task)
  NEXT              Task      → Task          (after finishing this task, do that one)
  ABOUT             Document  → Service       (this doc is about this service)
"""

import os
import sys
import datetime
from pathlib import Path
from falkordb import FalkorDB

# ── load .env ─────────────────────────────────────────────────────────────────
# We read .env manually so we don't need python-dotenv at this stage.
def load_env():
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                os.environ.setdefault(key.strip(), val.strip())

load_env()

# ── connection ────────────────────────────────────────────────────────────────

GRAPH_NAME = os.environ.get("FALKORDB_GRAPH_NAME", "incident_brain")
HOST       = os.environ.get("FALKORDB_HOST",       "localhost")
PORT       = int(os.environ.get("FALKORDB_PORT",   "6379"))
PASSWORD   = os.environ.get("FALKORDB_PASSWORD",   None) or None

def connect():
    """
    Connect to FalkorDB.
    - If FALKORDB_HOST is set to a cloud address in .env → connects to FalkorDB Cloud.
    - If not set → tries localhost:6379 (local Docker).
    Password is optional (needed for cloud, not for local).
    """
    kwargs = {"host": HOST, "port": PORT}
    if PASSWORD:
        kwargs["password"] = PASSWORD
    db = FalkorDB(**kwargs)
    return db.select_graph(GRAPH_NAME)

# ── helpers ───────────────────────────────────────────────────────────────────

def ts(minutes_ago: int = 0) -> str:
    """Return an ISO-8601 timestamp N minutes in the past."""
    t = datetime.datetime.utcnow() - datetime.timedelta(minutes=minutes_ago)
    return t.strftime("%Y-%m-%dT%H:%M:%SZ")

def q(g, cypher: str, params: dict = None):
    """Run one Cypher statement and print it so you can follow along."""
    print(f"  > {cypher[:80]}{'…' if len(cypher) > 80 else ''}")
    g.query(cypher, params or {})

# ── wipe ─────────────────────────────────────────────────────────────────────

def wipe_graph(g):
    """Delete everything so we can re-seed cleanly."""
    print("\n[wipe] removing all nodes and edges …")
    g.query("MATCH (n) DETACH DELETE n")

# ── Step A: Services ──────────────────────────────────────────────────────────

def seed_services(g):
    """
    Five micro-services.
    payments-api  – the service that is currently alerting (the 'victim')
    auth-service  – the root cause: a recent deploy changed its cache TTL
    notification-service – downstream of payments, not the problem today
    search-service  – RED HERRING: also had a recent deploy but unrelated
    ledger-service  – RED HERRING: had a deploy 3 days ago, long before the alert
    """
    print("\n[A] seeding Services …")
    services = [
        ("payments-api",          "payment processing",     "critical"),
        ("auth-service",          "authentication & tokens","critical"),
        ("notification-service",  "email/SMS notifications","high"),
        ("search-service",        "full-text search",       "medium"),
        ("ledger-service",        "accounting ledger",      "critical"),
    ]
    for name, desc, tier in services:
        q(g,
          "CREATE (:Service {id: $id, name: $name, description: $desc, tier: $tier})",
          {"id": name, "name": name, "description": desc, "tier": tier})

# ── Step B: Teams ─────────────────────────────────────────────────────────────

def seed_teams(g):
    """
    Four teams.  Each team OWNS one or more services.
    """
    print("\n[B] seeding Teams …")
    teams = [
        ("payments-team",  "Payments Engineering"),
        ("auth-team",      "Identity & Auth"),
        ("search-team",    "Search Platform"),
        ("platform-team",  "Platform Engineering"),
    ]
    for tid, name in teams:
        q(g,
          "CREATE (:Team {id: $id, name: $name})",
          {"id": tid, "name": name})

# ── Step C: People ────────────────────────────────────────────────────────────

def seed_people(g):
    """
    Four engineers.
    alice  – auth-team lead, the person who eventually resolves the incident
    bob    – payments-team, first to notice the alert
    charlie – auth-team, the engineer who actually wrote the bad commit
    diana  – platform-team, owns ledger-service (provides context, not the cause)
    """
    print("\n[C] seeding People …")
    people = [
        ("alice",   "Alice Reyes",    "alice@corp.internal",   "auth-team",      "lead"),
        ("bob",     "Bob Tanaka",     "bob@corp.internal",     "payments-team",  "engineer"),
        ("charlie", "Charlie Mwangi", "charlie@corp.internal", "auth-team",      "engineer"),
        ("diana",   "Diana Patel",    "diana@corp.internal",   "platform-team",  "lead"),
    ]
    for pid, name, email, team, role in people:
        q(g,
          "CREATE (:Person {id: $id, name: $name, email: $email, team: $team, role: $role})",
          {"id": pid, "name": name, "email": email, "team": team, "role": role})

# ── Step D: Deploys ────────────────────────────────────────────────────────────

def seed_deploys(g):
    """
    Three deploys.

    deploy-auth-001   ← THE ROOT CAUSE
        Deployed to auth-service 40 minutes ago.
        Change: lowered Redis cache TTL from 300 s → 10 s for auth tokens.
        Effect: auth-service now does 30× more DB calls → slower responses →
                payments-api (which depends on auth-service) starts timing out →
                error rate climbs to 12%.

    deploy-search-001 ← RED HERRING
        Deployed to search-service 2 hours ago.
        Completely unrelated to the payments alert.
        The agent must reason that search-service is NOT in the dependency
        path of payments-api and discard it.

    deploy-ledger-001 ← RED HERRING
        Deployed to ledger-service 3 days ago.
        Too old to explain an alert that started 40 minutes ago.
        The agent must use the timestamp to rule this out.
    """
    print("\n[D] seeding Deploys …")
    deploys = [
        (
            "deploy-auth-001",
            "auth-service",
            ts(40),                        # 40 minutes ago ← suspicious
            "v2.4.1",
            "Tuned cache TTL for auth tokens (300s → 10s) to reduce stale-token complaints",
            "charlie",
            True,                          # is_suspect flag for our UI
        ),
        (
            "deploy-search-001",
            "search-service",
            ts(120),                       # 2 hours ago ← red herring
            "v1.9.3",
            "Added fuzzy-match ranking for product search",
            "bob",
            False,
        ),
        (
            "deploy-ledger-001",
            "ledger-service",
            ts(60 * 24 * 3),              # 3 days ago ← too old, red herring
            "v3.1.0",
            "Monthly compliance patch: audit log format update",
            "diana",
            False,
        ),
    ]
    for did, svc, deployed_at, version, summary, triggered_by, suspect in deploys:
        q(g,
          """CREATE (:Deploy {
               id:           $id,
               service:      $svc,
               deployed_at:  $deployed_at,
               version:      $version,
               summary:      $summary,
               triggered_by: $triggered_by,
               is_suspect:   $suspect
             })""",
          {"id": did, "svc": svc, "deployed_at": deployed_at,
           "version": version, "summary": summary,
           "triggered_by": triggered_by, "suspect": suspect})

# ── Step E: Commits ───────────────────────────────────────────────────────────

def seed_commits(g):
    """
    Two commits, one per deploy (we keep it simple for the demo).
    commit-auth-abc is the specific line of code that lowered the TTL.
    """
    print("\n[E] seeding Commits …")
    commits = [
        (
            "commit-auth-abc",
            "deploy-auth-001",
            "charlie",
            "Lower cache TTL: CACHE_TTL = 10  # was 300",
            "src/cache/config.py",
            "abc1234",
        ),
        (
            "commit-search-xyz",
            "deploy-search-001",
            "bob",
            "Add fuzzy ranking weight to search scorer",
            "src/search/scorer.py",
            "xyz5678",
        ),
    ]
    for cid, deploy_id, author, diff_summary, file_path, sha in commits:
        q(g,
          """CREATE (:Commit {
               id:           $id,
               deploy_id:    $deploy_id,
               author:       $author,
               diff_summary: $diff_summary,
               file_path:    $file_path,
               sha:          $sha
             })""",
          {"id": cid, "deploy_id": deploy_id, "author": author,
           "diff_summary": diff_summary, "file_path": file_path, "sha": sha})

# ── Step F: Alert + Incidents ─────────────────────────────────────────────────

def seed_alerts_and_incidents(g):
    """
    alert-001    – the live alert that kicked off today's investigation.
    INC-current  – the incident we are currently investigating (open).
    INC-012      – a PAST incident from 3 months ago that looks identical.
                   It was also caused by a cache TTL change on auth-service
                   and was resolved by rolling back the deploy.
                   The agent uses this to recommend the same fix.
    """
    print("\n[F] seeding Alerts and Incidents …")

    # ── live alert
    q(g,
      """CREATE (:Alert {
           id:          'alert-001',
           name:        'payments-api error rate high',
           message:     'payments-api HTTP 5xx error rate is 12% (threshold: 5%)',
           severity:    'critical',
           service:     'payments-api',
           fired_at:    $fired_at,
           status:      'firing'
         })""",
      {"fired_at": ts(45)})    # fired 45 minutes ago

    # ── current (open) incident
    q(g,
      """CREATE (:Incident {
           id:          'INC-current',
           title:       'payments-api error rate 12%',
           status:      'open',
           opened_at:   $opened_at,
           severity:    'P1',
           description: 'payments-api is returning HTTP 5xx at 12%. Root cause under investigation.'
         })""",
      {"opened_at": ts(44)})

    # ── past incident (memory anchor)
    q(g,
      """CREATE (:Incident {
           id:          'INC-012',
           title:       'auth-service cache exhaustion caused checkout failures',
           status:      'resolved',
           opened_at:   $opened_at,
           resolved_at: $resolved_at,
           severity:    'P1',
           description: 'Cache TTL was reduced from 300s to 5s during a deploy. '
                      + 'Auth tokens expired instantly, forcing 100% DB reads. '
                      + 'Payments and checkout timed out. Fixed by rolling back auth-service.',
           root_cause:  'deploy-auth-000',
           fix_time_minutes: 22
         })""",
      {"opened_at": ts(60 * 24 * 90),       # 90 days ago
       "resolved_at": ts(60 * 24 * 90 - 22)})

# ── Step G: Runbooks, Lessons, Decisions, Documents ──────────────────────────

def seed_knowledge(g):
    """
    Runbook   – the step-by-step procedure to roll back auth-service.
    Lesson    – the written insight from INC-012: 'Cache TTL changes on
                auth-service cascade to downstream services.'
    Decision  – the documented decision Alice made during INC-012:
                'Roll back deploy-auth-000 immediately rather than hotfix.'
    Document  – the auth-service architecture doc (referenced by the runbook).
    """
    print("\n[G] seeding Knowledge nodes …")

    q(g,
      """CREATE (:Runbook {
           id:    'runbook-rollback-auth',
           title: 'Rollback auth-service deployment',
           steps: '1. Confirm suspect deploy via git log\n'
                + '2. Run: kubectl rollout undo deployment/auth-service\n'
                + '3. Watch error rate drop in Grafana (target < 1% within 5 min)\n'
                + '4. Notify payments-team that auth-service is stable\n'
                + '5. Open post-mortem ticket',
           estimated_minutes: 10,
           last_used_at: $last_used_at
         })""",
      {"last_used_at": ts(60 * 24 * 90 - 18)})  # last used during INC-012

    q(g,
      """CREATE (:Lesson {
           id:      'lesson-001',
           title:   'Cache TTL changes on auth-service cascade to downstream services',
           detail:  'Any reduction in auth token cache TTL causes a DB read spike '
                  + 'that saturates the auth-service connection pool within ~30 minutes. '
                  + 'Downstream callers (payments-api, checkout-api) then see 5xx errors. '
                  + 'Always gate cache TTL changes behind a feature flag and ramp slowly.',
           source:  'INC-012',
           created_at: $created_at
         })""",
      {"created_at": ts(60 * 24 * 89)})   # written the day after INC-012

    q(g,
      """CREATE (:Decision {
           id:          'decision-INC-012-rollback',
           title:       'Roll back auth-service instead of hotfix',
           rationale:   'Hotfix would take 45+ min to test and deploy. '
                      + 'Rollback restores service in < 10 min with known-good state.',
           outcome:     'Rolled back to v2.3.9. Error rate dropped to 0.3% in 4 minutes.',
           decided_at:  $decided_at,
           decided_by:  'alice'
         })""",
      {"decided_at": ts(60 * 24 * 90 - 5)})

    q(g,
      """CREATE (:Document {
           id:    'doc-auth-arch',
           title: 'auth-service Architecture & Caching Design',
           url:   'https://wiki.corp.internal/auth-service/architecture',
           type:  'architecture'
         })""")

# ── Step H: AI Agents and Tasks ───────────────────────────────────────────────

def seed_agents_and_tasks(g):
    """
    Three AI agents, each with a current Task node.
    The Tasks are chained: Triage → Investigator → Communicator
    (the NEXT edge tells the agent loop what to run after the current task).

    These nodes exist in the graph so the agents can read their own task queue
    from FalkorDB — the graph IS the memory and coordination layer.
    """
    print("\n[H] seeding Agents and Tasks …")

    # agents
    for aid, name, role in [
        ("agent-triage",       "Triage Agent",       "triage"),
        ("agent-investigator", "Investigator Agent", "investigator"),
        ("agent-communicator", "Communicator Agent", "communicator"),
    ]:
        q(g,
          "CREATE (:Agent {id: $id, name: $name, role: $role, status: 'idle'})",
          {"id": aid, "name": name, "role": role})

    # tasks
    tasks = [
        (
            "task-triage-001",
            "Triage alert-001",
            "Classify severity, identify affected services, assign investigator",
            "triage",
            "pending",
            ts(44),
        ),
        (
            "task-investigate-001",
            "Investigate INC-current",
            "Find root cause using graph walk: upstream deploys, owners, similar incidents",
            "investigator",
            "pending",
            ts(44),
        ),
        (
            "task-communicate-001",
            "Communicate INC-current findings",
            "Draft incident summary, notify owners, suggest runbook",
            "communicator",
            "pending",
            ts(44),
        ),
    ]
    for tid, title, desc, agent_role, status, created_at in tasks:
        q(g,
          """CREATE (:Task {
               id:         $id,
               title:      $title,
               description: $desc,
               agent_role: $agent_role,
               status:     $status,
               created_at: $created_at,
               incident_id: 'INC-current'
             })""",
          {"id": tid, "title": title, "desc": desc,
           "agent_role": agent_role, "status": status,
           "created_at": created_at})

# ── Step I: Edges ─────────────────────────────────────────────────────────────

def seed_edges(g):
    """
    All relationships between nodes.
    Each block is labelled with the relationship name and what it means.
    """
    print("\n[I] seeding Edges …")

    # ── OWNS: which team is responsible for which service
    print("  OWNS …")
    for team, service in [
        ("payments-team",  "payments-api"),
        ("auth-team",      "auth-service"),
        ("search-team",    "search-service"),
        ("platform-team",  "ledger-service"),
        ("platform-team",  "notification-service"),
    ]:
        q(g,
          "MATCH (t:Team {id:$t}), (s:Service {id:$s}) CREATE (t)-[:OWNS]->(s)",
          {"t": team, "s": service})

    # ── MEMBER_OF: engineers and their teams
    print("  MEMBER_OF …")
    for person, team in [
        ("alice",   "auth-team"),
        ("charlie", "auth-team"),
        ("bob",     "payments-team"),
        ("diana",   "platform-team"),
    ]:
        q(g,
          "MATCH (p:Person {id:$p}), (t:Team {id:$t}) CREATE (p)-[:MEMBER_OF]->(t)",
          {"p": person, "t": team})

    # ── DEPENDS_ON: runtime call graph (who calls whom)
    #    This is the most important subgraph for blast-radius analysis.
    #    payments-api → auth-service: payments calls auth to verify every token
    #    payments-api → notification-service: payments sends receipts via notifs
    #    auth-service → ledger-service: auth checks billing status per login
    print("  DEPENDS_ON …")
    for caller, callee in [
        ("payments-api",         "auth-service"),
        ("payments-api",         "notification-service"),
        ("auth-service",         "ledger-service"),
    ]:
        q(g,
          "MATCH (a:Service {id:$a}), (b:Service {id:$b}) CREATE (a)-[:DEPENDS_ON]->(b)",
          {"a": caller, "b": callee})

    # ── DEPLOYED_TO: which deploy went to which service
    print("  DEPLOYED_TO …")
    for deploy, service in [
        ("deploy-auth-001",   "auth-service"),
        ("deploy-search-001", "search-service"),
        ("deploy-ledger-001", "ledger-service"),
    ]:
        q(g,
          "MATCH (d:Deploy {id:$d}), (s:Service {id:$s}) CREATE (d)-[:DEPLOYED_TO]->(s)",
          {"d": deploy, "s": service})

    # ── PART_OF: commits that make up a deploy
    print("  PART_OF …")
    for commit, deploy in [
        ("commit-auth-abc",  "deploy-auth-001"),
        ("commit-search-xyz","deploy-search-001"),
    ]:
        q(g,
          "MATCH (c:Commit {id:$c}), (d:Deploy {id:$d}) CREATE (c)-[:PART_OF]->(d)",
          {"c": commit, "d": deploy})

    # ── AUTHORED: who wrote which commit
    print("  AUTHORED …")
    for person, commit in [
        ("charlie", "commit-auth-abc"),
        ("bob",     "commit-search-xyz"),
    ]:
        q(g,
          "MATCH (p:Person {id:$p}), (c:Commit {id:$c}) CREATE (p)-[:AUTHORED]->(c)",
          {"p": person, "c": commit})

    # ── COVERS: which runbook fixes which service
    print("  COVERS …")
    q(g,
      "MATCH (r:Runbook {id:'runbook-rollback-auth'}), (s:Service {id:'auth-service'}) "
      "CREATE (r)-[:COVERS]->(s)")

    # ── FIRED_ON: alert → the service that triggered it
    print("  FIRED_ON …")
    q(g,
      "MATCH (a:Alert {id:'alert-001'}), (s:Service {id:'payments-api'}) "
      "CREATE (a)-[:FIRED_ON]->(s)")

    # ── TRIGGERED_BY: incident opened because of this alert
    print("  TRIGGERED_BY …")
    q(g,
      "MATCH (i:Incident {id:'INC-current'}), (a:Alert {id:'alert-001'}) "
      "CREATE (i)-[:TRIGGERED_BY]->(a)")

    # ── AFFECTED: which services are impacted in each incident
    print("  AFFECTED …")
    for inc, svc in [
        ("INC-current", "payments-api"),
        ("INC-current", "auth-service"),
        ("INC-012",     "payments-api"),
        ("INC-012",     "auth-service"),
    ]:
        q(g,
          "MATCH (i:Incident {id:$i}), (s:Service {id:$s}) CREATE (i)-[:AFFECTED]->(s)",
          {"i": inc, "s": svc})

    # ── CAUSED_BY: the deploy that caused the incident
    #    INC-current is CAUSED_BY deploy-auth-001 (the suspicious one from 40 min ago).
    #    INC-012 is CAUSED_BY a now-gone deploy (we record it as a string property,
    #    but also link it to deploy-auth-001 as a stand-in so the graph is traversable).
    print("  CAUSED_BY …")
    q(g,
      "MATCH (i:Incident {id:'INC-current'}), (d:Deploy {id:'deploy-auth-001'}) "
      "CREATE (i)-[:CAUSED_BY]->(d)")
    # For the past incident we record the link so memory queries work:
    q(g,
      "MATCH (i:Incident {id:'INC-012'}), (d:Deploy {id:'deploy-auth-001'}) "
      "CREATE (i)-[:CAUSED_BY {note:'same pattern — different deploy version'}]->(d)")

    # ── RESOLVED_WITH: which runbook was used to fix the incident
    print("  RESOLVED_WITH …")
    q(g,
      "MATCH (i:Incident {id:'INC-012'}), (r:Runbook {id:'runbook-rollback-auth'}) "
      "CREATE (i)-[:RESOLVED_WITH]->(r)")

    # ── RESOLVED: who closed the incident
    print("  RESOLVED …")
    q(g,
      "MATCH (i:Incident {id:'INC-012'}), (p:Person {id:'alice'}) "
      "CREATE (i)-[:RESOLVED]->(p)")

    # ── SIMILAR_TO: the memory link — current incident looks like INC-012
    #    The agent creates this edge after its first analysis.
    #    We pre-seed it so Step 1 is self-contained.
    print("  SIMILAR_TO …")
    q(g,
      "MATCH (a:Incident {id:'INC-current'}), (b:Incident {id:'INC-012'}) "
      "CREATE (a)-[:SIMILAR_TO {similarity_score: 0.91}]->(b)")

    # ── LEARNED_FROM + APPLIES_TO: lessons from past incidents
    print("  LEARNED_FROM / APPLIES_TO …")
    q(g,
      "MATCH (l:Lesson {id:'lesson-001'}), (i:Incident {id:'INC-012'}) "
      "CREATE (l)-[:LEARNED_FROM]->(i)")
    q(g,
      "MATCH (l:Lesson {id:'lesson-001'}), (s:Service {id:'auth-service'}) "
      "CREATE (l)-[:APPLIES_TO]->(s)")

    # ── DOCUMENTED_IN: runbook references an architecture doc
    print("  DOCUMENTED_IN …")
    q(g,
      "MATCH (r:Runbook {id:'runbook-rollback-auth'}), (d:Document {id:'doc-auth-arch'}) "
      "CREATE (r)-[:DOCUMENTED_IN]->(d)")

    # ── ABOUT: document is about a service
    print("  ABOUT …")
    q(g,
      "MATCH (d:Document {id:'doc-auth-arch'}), (s:Service {id:'auth-service'}) "
      "CREATE (d)-[:ABOUT]->(s)")

    # ── DECIDED_BY: decision made by a person during an incident
    print("  DECIDED_BY …")
    q(g,
      "MATCH (d:Decision {id:'decision-INC-012-rollback'}), (p:Person {id:'alice'}) "
      "CREATE (d)-[:DECIDED_BY]->(p)")

    # ── ASSIGNED_TO: agent → task
    print("  ASSIGNED_TO …")
    for agent, task in [
        ("agent-triage",       "task-triage-001"),
        ("agent-investigator", "task-investigate-001"),
        ("agent-communicator", "task-communicate-001"),
    ]:
        q(g,
          "MATCH (a:Agent {id:$a}), (t:Task {id:$t}) CREATE (a)-[:ASSIGNED_TO]->(t)",
          {"a": agent, "t": task})

    # ── NEXT: task handoff chain (Triage → Investigator → Communicator)
    print("  NEXT …")
    for t1, t2 in [
        ("task-triage-001",     "task-investigate-001"),
        ("task-investigate-001","task-communicate-001"),
    ]:
        q(g,
          "MATCH (a:Task {id:$a}), (b:Task {id:$b}) CREATE (a)-[:NEXT]->(b)",
          {"a": t1, "b": t2})

# ── Step J: verify ────────────────────────────────────────────────────────────

def verify(g):
    """Count nodes and edges so we can confirm the seed worked."""
    print("\n[J] verifying …")

    node_count = g.query("MATCH (n) RETURN count(n) AS c").result_set[0][0]
    edge_count  = g.query("MATCH ()-[r]->() RETURN count(r) AS c").result_set[0][0]

    print(f"\n  ✓ Nodes : {node_count}")
    print(f"  ✓ Edges : {edge_count}")

    print("\n  Node breakdown:")
    rows = g.query(
        "MATCH (n) RETURN labels(n)[0] AS label, count(n) AS cnt ORDER BY label"
    ).result_set
    for label, cnt in rows:
        print(f"    {label:<20} {cnt}")

    print("\n  ✓ Seed complete.  FalkorDB graph name: " + GRAPH_NAME)
    print("  Open http://localhost:3000 to browse the graph visually.")

# ── main ──────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("  Incident Brain — Seed Script")
    print("  Connecting to FalkorDB at localhost:6379 …")
    print("=" * 60)

    try:
        g = connect()
    except Exception as e:
        print(f"\n  ERROR: Cannot connect to FalkorDB — {e}")
        print("  Make sure Docker is running: docker compose up -d")
        sys.exit(1)

    wipe_graph(g)

    seed_services(g)
    seed_teams(g)
    seed_people(g)
    seed_deploys(g)
    seed_commits(g)
    seed_alerts_and_incidents(g)
    seed_knowledge(g)
    seed_agents_and_tasks(g)
    seed_edges(g)

    verify(g)

if __name__ == "__main__":
    main()
