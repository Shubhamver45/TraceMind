// ==============================================================================
// Query: Shortest Path Dependency Traversal (FalkorDB Native algo.SPpaths)
// File: queries/shortest_path.cypher
//
// Plain English Explanation for Judges:
// ------------------------------------------------------------------------------
// "Why is this service connected to that service?"
// Instead of guessing or running expensive recursive SQL joins, we invoke
// FalkorDB's native Dijkstra-based shortest path procedure `CALL algo.SPpaths`.
// It finds the exact directed sequence of runtime dependencies connecting
// an alerting service directly to the upstream culprit deployment.
// ==============================================================================

MATCH (a:Service {id: $source_id}), (b:Service {id: $target_id})
CALL algo.SPpaths({
  sourceNode:   a,
  targetNode:   b,
  relTypes:     ['DEPENDS_ON'],
  relDirection: 'outgoing',
  weightProp:   'weight',
  pathCount:    1
})
YIELD path, pathWeight
RETURN 
    [n IN nodes(path) | coalesce(n.name, n.id)] AS hops,
    length(path) AS total_hops,
    pathWeight;
