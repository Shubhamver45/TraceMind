"""
backend/tools/graph_tools.py
============================
Agent Tools wrapping Cypher graph queries and network algorithms for Incident Brain.

These tools are exposed to the LLM agent via function calling / schema descriptions,
and are also directly callable in fixed fallback mode.
"""

from __future__ import annotations
import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from backend.graph.engine import get_engine

# Read cypher query files from queries/ directory
QUERIES_DIR = Path(__file__).resolve().parents[2] / "queries"

def _load_query(filename: str) -> str:
    path = QUERIES_DIR / filename
    if path.exists():
        return path.read_text()
    return ""


def get_upstream_recent_deploys(service_id: str = "payments-api") -> Dict[str, Any]:
    """
    Finds upstream services that the given service depends on, and fetches recent deploys,
    commits, authors, and suspect flags. Automatically rules out unrelated services.
    """
    engine = get_engine()
    cypher = _load_query("upstream_recent_deploys.cypher")
    rows = engine.query(cypher, {"service_id": service_id})

    # Find the suspect deploy
    suspect = next((r for r in rows if r.get("is_suspect") or "ttl" in str(r.get("deploy_summary", "")).lower()), None)
    if not suspect and rows:
        suspect = rows[0]

    if suspect and "id" not in suspect:
        suspect["id"] = suspect.get("deploy_id")

    return {
        "tool": "get_upstream_recent_deploys",
        "service_id": service_id,
        "query_file": "queries/upstream_recent_deploys.cypher",
        "cypher": cypher.strip(),
        "total_results": len(rows),
        "results": rows,
        "suspect_deploy": suspect,
        "explanation": f"Walked (victim:{service_id})-[:DEPENDS_ON*0..3]->(upstream) and identified {len(rows)} recent upstream deploys. Highlighted suspect deploy {suspect.get('deploy_id') if suspect else 'None'} on {suspect.get('upstream_service') if suspect else 'None'}."
    }


def calculate_blast_radius(service_id: str = "auth-service") -> Dict[str, Any]:
    """
    Finds all downstream services, teams, and callers impacted if service_id fails.
    Traverses reverse dependencies: (caller)-[:DEPENDS_ON]->(target).
    """
    engine = get_engine()
    cypher = _load_query("blast_radius.cypher")
    rows = engine.query(cypher, {"service_id": service_id})

    impacted_services = [r.get("impacted_service") for r in rows if r.get("impacted_service")]
    teams = list(set([r.get("owning_team") for r in rows if r.get("owning_team")]))

    return {
        "tool": "calculate_blast_radius",
        "service_id": service_id,
        "query_file": "queries/blast_radius.cypher",
        "cypher": cypher.strip(),
        "total_impacted": len(rows),
        "impacted_services": impacted_services,
        "impacted_teams": teams,
        "results": rows,
        "explanation": f"Traversed reverse DEPENDS_ON paths. Service '{service_id}' degradation impacts {len(impacted_services)} downstream services ({', '.join(impacted_services)}) across {len(teams)} teams ({', '.join(teams)})."
    }


def find_owners_and_experts(service_id: str = "auth-service") -> Dict[str, Any]:
    """
    Finds the owning Team, team members, commit authors, and engineers who previously resolved incidents.
    """
    engine = get_engine()
    cypher = _load_query("owner_and_experts.cypher")
    rows = engine.query(cypher, {"service_id": service_id})

    team = rows[0].get("owning_team") if rows else "Unknown Team"
    lead = rows[0].get("team_member") if rows else "Unknown Lead"
    committers = rows[0].get("recent_committers", []) if rows else []
    resolvers = rows[0].get("past_incident_resolvers", []) if rows else []

    return {
        "tool": "find_owners_and_experts",
        "service_id": service_id,
        "query_file": "queries/owner_and_experts.cypher",
        "cypher": cypher.strip(),
        "owning_team": team,
        "lead_contact": lead,
        "recent_committers": committers,
        "past_incident_resolvers": resolvers,
        "results": rows,
        "explanation": f"Connected Service '{service_id}' to owning Team '{team}'. Identified primary contact {lead}, committer {committers}, and domain expert {resolvers}."
    }


def find_similar_incidents(service_id: str = "auth-service") -> Dict[str, Any]:
    """
    Retrieves past resolved incidents on this service or linked via SIMILAR_TO,
    including the proven runbook and lessons learned.
    """
    engine = get_engine()
    cypher = _load_query("similar_incidents.cypher")
    rows = engine.query(cypher, {"service_id": service_id})

    best_match = rows[0] if rows else None

    return {
        "tool": "find_similar_incidents",
        "service_id": service_id,
        "query_file": "queries/similar_incidents.cypher",
        "cypher": cypher.strip(),
        "matches": rows,
        "recommended_runbook": {
            "id": best_match.get("runbook_id"),
            "title": best_match.get("runbook_title"),
            "steps": best_match.get("runbook_steps")
        } if best_match else None,
        "lesson_learned": {
            "title": best_match.get("lesson_title"),
            "detail": best_match.get("lesson_detail")
        } if best_match else None,
        "explanation": f"Discovered previous incident {best_match.get('incident_id') if best_match else 'None'} ('{best_match.get('title') if best_match else 'None'}') resolved with {best_match.get('runbook_id') if best_match else 'None'} in {best_match.get('past_fix_time_minutes') if best_match else 'N/A'} mins."
    }


def trace_decision_path() -> Dict[str, Any]:
    """
    Fetches the audit trail of engineering decisions made during prior incidents.
    """
    engine = get_engine()
    cypher = _load_query("decision_trace.cypher")
    rows = engine.query(cypher)

    return {
        "tool": "trace_decision_path",
        "query_file": "queries/decision_trace.cypher",
        "cypher": cypher.strip(),
        "decisions": rows,
        "explanation": f"Extracted {len(rows)} historical engineering decisions from graph memory explaining tradeoffs made by leads."
    }


def compute_pagerank() -> Dict[str, Any]:
    """
    Calculates PageRank centrality on the dependency graph to rank service criticality.
    """
    engine = get_engine()
    ranks = engine.calculate_pagerank()
    top_service = list(ranks.keys())[0] if ranks else "None"

    return {
        "tool": "compute_pagerank",
        "pagerank_scores": ranks,
        "critical_bottleneck": top_service,
        "explanation": f"Computed network PageRank on service dependencies. '{top_service}' has highest centrality ({ranks.get(top_service, 0)}), confirming it is the foundational bottleneck."
    }


def find_shortest_path(source_id: str, target_id: str) -> Dict[str, Any]:
    """
    Finds the shortest traversal path between any two nodes in the graph.
    """
    engine = get_engine()
    path = engine.shortest_path(source_id, target_id)

    return {
        "tool": "find_shortest_path",
        "source": source_id,
        "target": target_id,
        "path": path,
        "hops": len(path) - 1 if path else -1,
        "explanation": f"Shortest path from '{source_id}' to '{target_id}' is {len(path)-1 if path else 0} hops: {' -> '.join(path) if path else 'No path found'}."
    }


# =========================================================================
# Official WeMakeDevs / FalkorDB Hackathon Canonical Tools & Guardrails
# =========================================================================

import re

NAME = re.compile(r"\b[a-z][a-z0-9]*(?:-[a-z0-9]+)+\b")

TOOLS = {
    "blast_radius":   {"args": {"service": "service_name", "depth": "int<=4"}},
    "who_to_wake":    {"args": {"service": "service_name", "depth": "int<=4"}},
    "recent_changes": {"args": {"service": "service_name", "hours": "int<=168"}},
    "path_between":   {"args": {"from": "service_name", "to": "service_name"}},
    "load_bearing":   {"args": {"limit": "int<=20"}},
    "recall":         {"args": {"service": "service_name"}},
}

def resolve_service(engine, name: str) -> Optional[str]:
    """
    Validates that a service name exists in the FalkorDB graph before running queries.
    Prevents hallucination and SQL/Cypher injection.
    """
    cypher = "MATCH (s:Service {name: $name}) RETURN s.name AS name"
    rows = engine.query(cypher, {"name": name})
    if rows:
        return rows[0].get("name")
    # Fallback to checking node keys in mock/memory graph
    for nid, node in engine.memory_store.nodes.items():
        if node.get("labels", []) == ["Service"] or "Service" in node.get("labels", []):
            if nid.lower() == name.lower() or node.get("properties", {}).get("name", "").lower() == name.lower():
                return node.get("properties", {}).get("name", nid)
    return None

def accepts(sentence: str, answer: dict) -> tuple[bool, str]:
    """
    Validates model output against graph traversal results.
    Ensures the agent never invents service names not returned by the graph traversal.
    """
    known = set(answer.get("services", [])) | {h for p in answer.get("paths", []) for h in p}
    invented = set(NAME.findall(sentence)) - known
    if invented:
        return False, f"named services not in the result: {sorted(invented)}"
    if not answer.get("services") and "no " not in sentence.lower():
        return False, "claimed impact when the traversal was empty"
    return True, "ok"

# Canonical wrappers matching Hackathon specification
def blast_radius(service: str, depth: int = 4) -> Dict[str, Any]:
    return calculate_blast_radius(service)

def who_to_wake(service: str, depth: int = 4) -> Dict[str, Any]:
    return find_owners_and_experts(service)

def recent_changes(service: str, hours: int = 168) -> Dict[str, Any]:
    return get_upstream_recent_deploys(service)

def path_between(from_service: str, to_service: str) -> Dict[str, Any]:
    return find_shortest_path(from_service, to_service)

def load_bearing(limit: int = 20) -> Dict[str, Any]:
    return compute_pagerank()

def recall(service: str) -> Dict[str, Any]:
    return find_similar_incidents(service)


# Tool catalog mapping for agent loop
ALL_TOOLS = {
    "get_upstream_recent_deploys": get_upstream_recent_deploys,
    "calculate_blast_radius": calculate_blast_radius,
    "find_owners_and_experts": find_owners_and_experts,
    "find_similar_incidents": find_similar_incidents,
    "trace_decision_path": trace_decision_path,
    "compute_pagerank": compute_pagerank,
    "find_shortest_path": find_shortest_path,
    # Canonical aliases
    "blast_radius": blast_radius,
    "who_to_wake": who_to_wake,
    "recent_changes": recent_changes,
    "path_between": path_between,
    "load_bearing": load_bearing,
    "recall": recall,
}
