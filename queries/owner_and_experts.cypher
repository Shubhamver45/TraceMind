// ==============================================================================
// Query: Owners and Domain Experts
// File: queries/owner_and_experts.cypher
//
// Plain English Explanation for Judges:
// ------------------------------------------------------------------------------
// When an alert happens at 3 AM, finding the right person to page shouldn't
// require searching spreadsheets or wiki docs.
//
// The graph connects:
//   (Team)-[:OWNS]->(Service)
//   (Person)-[:MEMBER_OF]->(Team)
//   (Person)-[:AUTHORED]->(Commit)-[:PART_OF]->(Deploy)-[:DEPLOYED_TO]->(Service)
//   (Incident)-[:RESOLVED]->(Person)
//
// This query identifies:
// 1. Team lead & members of the team owning the broken service
// 2. The author of the recent suspect commit (Charlie)
// 3. Domain experts who resolved similar past incidents on this service (Alice)
// ==============================================================================

MATCH (s:Service {id: $service_id})
OPTIONAL MATCH (team:Team)-[:OWNS]->(s)
OPTIONAL MATCH (member:Person)-[:MEMBER_OF]->(team)
OPTIONAL MATCH (author:Person)-[:AUTHORED]->(:Commit)-[:PART_OF]->(d:Deploy)-[:DEPLOYED_TO]->(s)
OPTIONAL MATCH (past_resolver:Person)<-[:RESOLVED]-(:Incident)-[:AFFECTED]->(s)
RETURN 
    s.id AS service,
    team.name AS owning_team,
    member.name AS team_member,
    member.role AS team_role,
    member.email AS member_email,
    collect(DISTINCT author.name) AS recent_committers,
    collect(DISTINCT past_resolver.name) AS past_incident_resolvers;
