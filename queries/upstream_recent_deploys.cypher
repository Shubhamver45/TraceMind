// ==============================================================================
// Query: Upstream Recent Deploys
// File: queries/upstream_recent_deploys.cypher
//
// Plain English Explanation for Judges:
// ------------------------------------------------------------------------------
// When an alert fires on a service (e.g. "payments-api"), the problem is rarely
// inside the service itself; it is almost always caused by an upstream service
// that it depends on.
//
// This query walks 1 to 3 hops outward along (s)-[:DEPENDS_ON*1..3]->(upstream).
// For each dependency, it inspects any (:Deploy) node attached via (:DEPLOYED_TO).
//
// It discards red herrings:
// 1. "search-service" has a recent deploy, but payments-api DOES NOT depend on search!
//    So this query completely ignores search-service.
// 2. "ledger-service" has a deploy from 3 days ago, but its timestamp is too old
//    compared to the alert that fired 45 minutes ago.
//
// Result: Pinpoints "deploy-auth-001" on "auth-service" deployed 40 minutes ago.
// ==============================================================================

MATCH (victim:Service {id: $service_id})
MATCH (victim)-[:DEPENDS_ON*0..3]->(upstream:Service)
MATCH (deploy:Deploy)-[:DEPLOYED_TO]->(upstream)
OPTIONAL MATCH (commit:Commit)-[:PART_OF]->(deploy)
OPTIONAL MATCH (author:Person)-[:AUTHORED]->(commit)
RETURN 
    upstream.id AS upstream_service,
    upstream.tier AS service_tier,
    deploy.id AS deploy_id,
    deploy.version AS version,
    deploy.deployed_at AS deployed_at,
    deploy.summary AS deploy_summary,
    deploy.is_suspect AS is_suspect,
    commit.id AS commit_id,
    commit.diff_summary AS code_change,
    author.name AS author_name,
    author.email AS author_email
ORDER BY deploy.deployed_at DESC;
