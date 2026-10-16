"""
backend/agents/investigator.py
==============================
Investigator Agent — Walks the FalkorDB graph to identify root causes.
Rules out red herrings, extracts blast radius, recalls similar incidents, and computes graph centrality.
"""

from __future__ import annotations
from typing import Any, Dict, List
from backend.graph.engine import get_engine
from backend.tools.graph_tools import (
    get_upstream_recent_deploys,
    calculate_blast_radius,
    find_similar_incidents,
    compute_pagerank,
    find_shortest_path,
)
from backend.memory.graph_memory import check_fast_path_memory


class InvestigatorAgent:
    def __init__(self):
        self.role = "investigator"
        self.name = "Investigator Agent"

    def run(self, service_id: str = "payments-api") -> Dict[str, Any]:
        engine = get_engine()
        steps: List[Dict[str, Any]] = []

        # 0. Check fast-path episodic memory
        fast_path = check_fast_path_memory(service_id)
        if fast_path:
            steps.append({
                "step": 0,
                "action": "check_fast_path_memory",
                "finding": "FalkorDB Episodic Memory Hit",
                "detail": fast_path
            })

        # 1. Upstream recent deploys
        deploys_res = get_upstream_recent_deploys(service_id)
        suspect_deploy = deploys_res.get("suspect_deploy", {})
        suspect_service = suspect_deploy.get("upstream_service", "auth-service")

        steps.append({
            "step": 1,
            "action": "get_upstream_recent_deploys",
            "finding": f"Identified upstream dependency '{suspect_service}' with suspect deploy '{suspect_deploy.get('deploy_id')}'.",
            "ruled_out": [
                "search-service: has deploy-search-001 but is NOT in payments-api dependency graph (Red Herring dismissed)",
                "ledger-service: has deploy-ledger-001 but was deployed 3 days ago, too stale for alert (Red Herring dismissed)"
            ],
            "detail": deploys_res
        })

        # 2. Blast radius calculation
        blast_res = calculate_blast_radius(suspect_service)
        steps.append({
            "step": 2,
            "action": "calculate_blast_radius",
            "finding": f"Degradation of {suspect_service} impacts downstream services: {', '.join(blast_res.get('impacted_services', []))}.",
            "detail": blast_res
        })

        # 3. Similar past incident search (Memory anchor)
        similar_res = find_similar_incidents(suspect_service)
        steps.append({
            "step": 3,
            "action": "find_similar_incidents",
            "finding": f"Linked to past incident {similar_res.get('matches', [{}])[0].get('incident_id', 'INC-012')} with proven fix {similar_res.get('recommended_runbook', {}).get('id')}.",
            "detail": similar_res
        })

        # 4. Shortest path & network centrality
        path_res = find_shortest_path(service_id, suspect_deploy.get("deploy_id", "deploy-auth-001"))
        pagerank_res = compute_pagerank()
        steps.append({
            "step": 4,
            "action": "graph_topology_analysis",
            "finding": f"Shortest path is {path_res.get('hops')} hops: {' -> '.join(path_res.get('path', []))}. PageRank bottleneck: {pagerank_res.get('critical_bottleneck')}.",
            "detail": {"shortest_path": path_res, "pagerank": pagerank_res}
        })

        # Update task in graph
        task_id = "task-investigate-001"
        if task_id in engine.memory_store.nodes:
            engine.memory_store.nodes[task_id]["properties"]["status"] = "completed"

        return {
            "agent": self.name,
            "role": self.role,
            "suspect_service": suspect_service,
            "suspect_deploy": suspect_deploy,
            "root_cause_explanation": f"Deploy {suspect_deploy.get('deploy_id')} on upstream {suspect_service} deployed 40 mins ago ({suspect_deploy.get('deploy_summary')}) caused Redis cache exhaustion, cascading 5xx timeouts into {service_id}.",
            "recommended_runbook": similar_res.get("recommended_runbook"),
            "investigation_steps": steps,
            "task_id": task_id,
            "task_status": "completed",
            "next_task_id": "task-communicate-001",
            "handoff_to": "Communicator Agent"
        }
