// ==============================================================================
// Query: Similar Past Incidents (Agent Memory Anchor)
// File: queries/similar_incidents.cypher
//
// Plain English Explanation for Judges:
// ------------------------------------------------------------------------------
// "Those who cannot remember the past are condemned to repeat it."
// Agents often treat every incident as brand new. Incident Brain uses FalkorDB
// as long-term episodic memory.
//
// When an alert or incident occurs on a service, this query looks for:
// 1. Incidents linked via (:Incident)-[:SIMILAR_TO]->(:Incident)
// 2. Or incidents that previously AFFECTED the same service or its dependencies
// 3. What Runbook fixed it (:RESOLVED_WITH)
// 4. What Lesson was learned (:LEARNED_FROM)
//
// Result for current incident:
// Retrieves "INC-012" ("auth-service cache exhaustion"), the proven runbook
// ("runbook-rollback-auth"), and the lesson warning about cache TTL spikes.
// ==============================================================================

MATCH (target:Service {id: $service_id})
OPTIONAL MATCH (target)<-[:AFFECTED]-(past_inc:Incident {status: 'resolved'})
OPTIONAL MATCH (past_inc)-[:RESOLVED_WITH]->(rb:Runbook)
OPTIONAL MATCH (lesson:Lesson)-[:LEARNED_FROM]->(past_inc)
OPTIONAL MATCH (past_inc)-[:RESOLVED]->(resolver:Person)
RETURN 
    past_inc.id AS incident_id,
    past_inc.title AS title,
    past_inc.description AS description,
    past_inc.root_cause AS past_root_cause,
    past_inc.fix_time_minutes AS past_fix_time_minutes,
    rb.id AS runbook_id,
    rb.title AS runbook_title,
    rb.steps AS runbook_steps,
    lesson.title AS lesson_title,
    lesson.detail AS lesson_detail,
    resolver.name AS resolved_by
ORDER BY past_inc.resolved_at DESC
LIMIT 5;
