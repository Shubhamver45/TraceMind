// ==============================================================================
// Query: Episodic Incident Memory Recall
// File: queries/episodic_memory_recall.cypher
//
// Plain English Explanation for Judges:
// ------------------------------------------------------------------------------
// "Has this service failed like this before, and what fixed it?"
// Before running deep traversals, the agent queries FalkorDB's episodic memory layer
// for past post-mortem findings and resolution runbooks attached to the service.
// This allows the agent to recall solutions learned in past sessions across tenants.
// ==============================================================================

MATCH (s:Service {id: $service_id})
OPTIONAL MATCH (f:Finding)-[:ABOUT]->(s)
OPTIONAL MATCH (past_inc:Incident)-[:AFFECTED]->(s)
OPTIONAL MATCH (past_inc)-[:RESOLVED_WITH]->(rb:Runbook)
RETURN 
    s.id AS service,
    f.text AS past_finding,
    f.at AS learned_at,
    past_inc.id AS historical_incident,
    rb.id AS verified_runbook,
    rb.steps AS mitigation_steps
ORDER BY learned_at DESC
LIMIT 5;
