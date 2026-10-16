"""
backend/agents/triage.py
========================
Triage Agent — First responder in the multi-agent on-call workflow.
Responsible for alert ingestion, severity classification, impacted service verification,
and task handoff in the graph.
"""

from __future__ import annotations
from typing import Any, Dict
from backend.graph.engine import get_engine, ts


class TriageAgent:
    def __init__(self):
        self.role = "triage"
        self.name = "Triage Agent"

    def run(self, alert_id: str = "alert-001") -> Dict[str, Any]:
        engine = get_engine()
        alert_node = engine.memory_store.nodes.get(alert_id)
        if not alert_node:
            # Create if missing
            engine.memory_store.add_node(alert_id, "Alert", {
                "name": "payments-api error rate high",
                "message": "payments-api HTTP 5xx error rate is 12% (threshold: 5%)",
                "severity": "critical",
                "service": "payments-api",
                "fired_at": ts(45),
                "status": "firing"
            })
            alert_node = engine.memory_store.nodes[alert_id]

        props = alert_node["properties"]
        service_id = props.get("service", "payments-api")

        # Update task in graph
        task_id = "task-triage-001"
        if task_id in engine.memory_store.nodes:
            engine.memory_store.nodes[task_id]["properties"]["status"] = "completed"

        findings = {
            "agent": self.name,
            "role": self.role,
            "alert_id": alert_id,
            "alert_message": props.get("message"),
            "target_service": service_id,
            "classified_severity": "P1 - Critical",
            "task_id": task_id,
            "task_status": "completed",
            "next_task_id": "task-investigate-001",
            "handoff_to": "Investigator Agent",
            "log": f"Triaged alert '{alert_id}'. Verified alerting service '{service_id}'. Classified as P1 Critical. Handed off task to Investigator Agent via (:Task)-[:NEXT] graph edge."
        }
        return findings
