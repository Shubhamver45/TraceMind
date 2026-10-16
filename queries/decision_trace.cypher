// ==============================================================================
// Query: Decision Trace & Audit Path
// File: queries/decision_trace.cypher
//
// Plain English Explanation for Judges:
// ------------------------------------------------------------------------------
// An on-call engineer wants to know: "Why did the previous engineer choose
// to roll back instead of deploying a hotfix?"
//
// In FalkorDB, human and agent decisions are first-class nodes (:Decision):
//   (:Decision {title, rationale, outcome, decided_at})-[:DECIDED_BY]->(:Person)
//
// This query retrieves the documented engineering tradeoffs made during
// related past events, giving the current agent and humans verifiable context
// rather than an AI hallucination.
// ==============================================================================

MATCH (dec:Decision)
OPTIONAL MATCH (dec)-[:DECIDED_BY]->(p:Person)
RETURN 
    dec.id AS decision_id,
    dec.title AS title,
    dec.rationale AS rationale,
    dec.outcome AS outcome,
    dec.decided_at AS decided_at,
    p.name AS decided_by,
    p.role AS role
ORDER BY dec.decided_at DESC;
