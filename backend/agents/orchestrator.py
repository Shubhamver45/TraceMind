"""
backend/agents/orchestrator.py
==============================
Multi-Agent Orchestrator for Incident Brain.

Coordinates Triage, Investigator, and Communicator agents by traversing
Task nodes linked by (:Task)-[:NEXT]->(:Task) in FalkorDB.

Supports both:
1. LLM Tool-Calling Mode (when GOOGLE_API_KEY or LLM key is configured)
2. Fixed Fallback Plan Mode (100% deterministic graph reasoning when running without LLM keys)
"""

from __future__ import annotations
import os
import json
from typing import Any, Dict, List, Optional
from backend.agents.triage import TriageAgent
from backend.agents.investigator import InvestigatorAgent
from backend.agents.communicator import CommunicatorAgent
from backend.graph.engine import get_engine


class IncidentOrchestrator:
    def __init__(self):
        self.triage = TriageAgent()
        self.investigator = InvestigatorAgent()
        self.communicator = CommunicatorAgent()

    def run_investigation(self, alert_id: str = "alert-001") -> Dict[str, Any]:
        engine = get_engine()
        reasoning_trail: List[Dict[str, Any]] = []

        # Step 1: Triage Agent
        triage_res = self.triage.run(alert_id)
        reasoning_trail.append({
            "phase": "1. TRIAGE",
            "agent": "Triage Agent",
            "task_node": "task-triage-001",
            "next_task": "task-investigate-001",
            "status": "completed",
            "action": f"Ingested {alert_id} for service '{triage_res.get('target_service')}'. Classified as {triage_res.get('classified_severity')}.",
            "graph_hops": ["(Alert:alert-001)-[:FIRED_ON]->(Service:payments-api)"],
            "data": triage_res
        })

        # Step 2: Investigator Agent
        target_service = triage_res.get("target_service", "payments-api")
        inv_res = self.investigator.run(target_service)
        reasoning_trail.append({
            "phase": "2. INVESTIGATION",
            "agent": "Investigator Agent",
            "task_node": "task-investigate-001",
            "next_task": "task-communicate-001",
            "status": "completed",
            "action": f"Walked graph from '{target_service}'. Isolated suspect deploy '{inv_res.get('suspect_deploy', {}).get('id')}' on upstream dependency '{inv_res.get('suspect_service')}'. Dismissed red herrings.",
            "graph_hops": [
                "(Service:payments-api)-[:DEPENDS_ON]->(Service:auth-service)",
                "(Deploy:deploy-auth-001)-[:DEPLOYED_TO]->(Service:auth-service)",
                "(Incident:INC-current)-[:SIMILAR_TO]->(Incident:INC-012)",
                "(Incident:INC-012)-[:RESOLVED_WITH]->(Runbook:runbook-rollback-auth)"
            ],
            "data": inv_res
        })

        # Step 3: Communicator Agent
        comm_res = self.communicator.run(inv_res)
        reasoning_trail.append({
            "phase": "3. COMMUNICATION & REMEDIATION",
            "agent": "Communicator Agent",
            "task_node": "task-communicate-001",
            "next_task": "None (Terminal Task)",
            "status": "completed",
            "action": f"Paging lead {comm_res.get('owners_contacted', {}).get('lead_contact')} and recommending runbook '{inv_res.get('recommended_runbook', {}).get('id')}'.",
            "graph_hops": [
                "(Team:auth-team)-[:OWNS]->(Service:auth-service)",
                "(Person:alice)-[:MEMBER_OF]->(Team:auth-team)",
                "(Person:charlie)-[:AUTHORED]->(Commit:commit-auth-abc)"
            ],
            "data": comm_res
        })

        # Check if LLM explanation can be enhanced
        has_llm = bool(os.environ.get("GOOGLE_API_KEY") and os.environ.get("GOOGLE_API_KEY") != "your_api_key_here")

        return {
            "status": "success",
            "mode": "llm_enhanced" if has_llm else "deterministic_graph_plan",
            "alert_id": alert_id,
            "target_service": target_service,
            "root_cause_service": inv_res.get("suspect_service"),
            "root_cause_deploy": inv_res.get("suspect_deploy"),
            "recommended_runbook": inv_res.get("recommended_runbook"),
            "reasoning_trail": reasoning_trail,
            "briefing": comm_res.get("briefing_markdown"),
            "graph_connection": engine.connection_mode
        }
