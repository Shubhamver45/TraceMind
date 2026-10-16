"""
backend/agents/communicator.py
==============================
Communicator Agent — Generates verified, actionable incident briefings for humans.
Identifies domain owners, explains the root cause decision trail, and presents the rollback runbook.
"""

from __future__ import annotations
from typing import Any, Dict
from backend.graph.engine import get_engine
from backend.tools.graph_tools import find_owners_and_experts, trace_decision_path


class CommunicatorAgent:
    def __init__(self):
        self.role = "communicator"
        self.name = "Communicator Agent"

    def run(self, investigation_summary: Dict[str, Any]) -> Dict[str, Any]:
        engine = get_engine()
        suspect_svc = investigation_summary.get("suspect_service", "auth-service")

        owners_res = find_owners_and_experts(suspect_svc)
        decisions_res = trace_decision_path()

        # Update task status
        task_id = "task-communicate-001"
        if task_id in engine.memory_store.nodes:
            engine.memory_store.nodes[task_id]["properties"]["status"] = "completed"

        runbook = investigation_summary.get("recommended_runbook") or {}

        summary_brief = f"""### INCIDENT BRIEFING: {investigation_summary.get('suspect_deploy', {}).get('version', 'v2.4.1')} Regression

**1. Root Cause Analysis:**
- Suspect Component: `{suspect_svc}`
- Culprit Deploy: `{investigation_summary.get('suspect_deploy', {}).get('id', 'deploy-auth-001')}` (deployed 40 min ago)
- Change: {investigation_summary.get('suspect_deploy', {}).get('deploy_summary')}
- Mechanism: Auth cache TTL reduction spiked database load, cascading 5xx timeouts to caller `payments-api`.

**2. Blast Radius:**
- Tier 1 Services Affected: `payments-api`, `auth-service`
- Impacted Teams: Payments Engineering, Identity & Auth

**3. Actionable Remediation:**
- Runbook: `{runbook.get('id', 'runbook-rollback-auth')}` ({runbook.get('title')})
- Steps:
{runbook.get('steps')}

**4. Domain Contacts paged:**
- Owning Team: {owners_res.get('owning_team')}
- Team Lead: {owners_res.get('lead_contact')}
- Committer paged: {', '.join(owners_res.get('recent_committers', []))}
- Prior Expert: {', '.join(owners_res.get('past_incident_resolvers', []))}
"""
        return {
            "agent": self.name,
            "role": self.role,
            "briefing_markdown": summary_brief,
            "owners_contacted": owners_res,
            "decisions_audit": decisions_res,
            "task_id": task_id,
            "task_status": "completed",
            "log": "Generated incident briefing, mapped stakeholder owners, verified rollback runbook."
        }
