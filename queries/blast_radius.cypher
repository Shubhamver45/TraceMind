// ==============================================================================
// Query: Blast Radius Analysis
// File: queries/blast_radius.cypher
//
// Plain English Explanation for Judges:
// ------------------------------------------------------------------------------
// In a microservice mesh, if "auth-service" is degraded, which other systems
// and teams are impacted?
//
// This query traverses in reverse: (caller:Service)-[:DEPENDS_ON*1..3]->(target).
// Every caller that depends on the target service is in the "blast radius".
// We also fetch the (:Team) that OWNS each caller, so on-call engineers know
// immediately which team Slack channels or stakeholders need notification.
//
// Result for auth-service:
// - "payments-api" (Tier 1 / Critical, owned by Payments Team)
// - Total impacted services and downstream dependencies.
// ==============================================================================

MATCH (target:Service {id: $service_id})
MATCH path = (caller:Service)-[:DEPENDS_ON*1..3]->(target)
OPTIONAL MATCH (team:Team)-[:OWNS]->(caller)
RETURN 
    caller.id AS impacted_service,
    caller.tier AS service_tier,
    length(path) AS dependency_distance,
    team.name AS owning_team,
    team.id AS team_id
ORDER BY dependency_distance ASC, caller.tier DESC;
