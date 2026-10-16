// ==============================================================================
// Query: Foundational Bottleneck Analysis (FalkorDB Native algo.pageRank)
// File: queries/pagerank_bottleneck.cypher
//
// Plain English Explanation for Judges:
// ------------------------------------------------------------------------------
// "Where is the most load-bearing service in the estate?"
// An on-call engineer doesn't just want a lookup; they need to know which service
// has the highest structural blast impact across the entire company.
// We invoke FalkorDB's built-in PageRank algorithm over all Service nodes and
// DEPENDS_ON edges to identify foundational architectural single points of failure.
// ==============================================================================

CALL algo.pageRank('Service', 'DEPENDS_ON')
YIELD node, score
RETURN 
    coalesce(node.name, node.id) AS service,
    round(score * 1000) / 1000 AS pagerank_centrality
ORDER BY score DESC
LIMIT $limit;
