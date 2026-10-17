/**
 * TraceMind AI — API Client
 * An Explainable Investigation Agent Powered by FalkorDB
 * Primary: Track 01 — Agents That Act on Connected Data
 * Secondary: Track 02 — Agent Memory and Coordination
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export interface IncidentSummary {
  id: string;
  title: string;
  severity: string;
  status: string;
  focal_service: string;
  timestamp: number;
}

export interface ServiceNode {
  name: string;
  tier: string;
  owner: string;
  tech: string;
  x?: number;
  y?: number;
}

export interface AlertRecord {
  id: string;
  service: string;
  metric: string;
  threshold: string;
  current_val: string;
  severity: string;
}

export interface DeploymentRecord {
  id: string;
  service: string;
  version: string;
  mins_ago: number;
  author: string;
  commit_hash: string;
  changes: string;
}

export interface EvidenceRecord {
  id: string;
  source: string;
  excerpt: string;
}

export interface Hypothesis {
  rank: number;
  confidence: number;
  title: string;
  severity: string;
  root_cause_service: string;
  triggering_deployment: string;
  cascade_path: string;
  evidence_chain: string[];
  recommended_action: string;
  runbook_details: {
    title: string;
    cli: string;
    runbook_id?: string;
    success_rate?: number;
  };
  cypher_query_used: string;
}

export interface BlastRadiusHop {
  service: string;
  hop_distance: number;
  tier: string;
  owner: string;
  status: string;
  impacted_users_estimate: number;
}

export interface HistoricalPrecedent {
  incident_id: string;
  title: string;
  severity: string;
  affected_service: string;
  root_cause: string;
  similarity_score: number;
  matching_factors: string[];
  differing_factors: string[];
  verified_runbook: {
    id: string;
    action: string;
    cli: string;
    outcome: string;
    verification_duration: string;
  };
}

export interface InvestigationReport {
  incident: {
    id: string;
    title: string;
    severity: string;
    status: string;
    focal_service: string;
    description: string;
    active_alerts: AlertRecord[];
    recent_deployments: DeploymentRecord[];
    evidence_records: EvidenceRecord[];
    root_cause_service: string;
    triggering_deployment: string;
    remediation_runbook: {
      title: string;
      cli: string;
      runbook_id: string;
      success_rate: number;
    };
  };
  focal_service: string;
  root_cause_service: string;
  dependency_path: string[];
  blast_radius: BlastRadiusHop[];
  total_impacted_services: number;
  hypotheses: Hypothesis[];
  active_alerts: AlertRecord[];
  recent_deployments: DeploymentRecord[];
  evidence_chain: EvidenceRecord[];
  historical_precedents: HistoricalPrecedent[];
  falkordb_removal_test: string;
}

export interface InvestigationResponse {
  agent: string;
  incident_id: string;
  report: InvestigationReport;
}

export interface TopologyData {
  nodes: Array<{
    id: string;
    name: string;
    tier: string;
    owner: string;
    tech: string;
    x: number;
    y: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: string;
  }>;
}

export interface CypherResponse {
  status: "SUCCESS" | "ERROR";
  engine?: string;
  latency_ms: number;
  query: string;
  row_count?: number;
  rows?: any[][];
  error?: string;
}

export async function checkBackendHealth(): Promise<{
  status: string;
  app: string;
  version: string;
  database: string;
  graph_nodes: number;
  active_incidents: number;
  timestamp: number;
}> {
  const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchIncidents(): Promise<{ incidents: IncidentSummary[] }> {
  const res = await fetch(`${API_BASE}/api/incidents`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch incidents: ${res.statusText}`);
  return res.json();
}

export async function fetchServices(): Promise<{ services: ServiceNode[] }> {
  const res = await fetch(`${API_BASE}/api/services`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch services: ${res.statusText}`);
  return res.json();
}

export async function fetchTopology(): Promise<TopologyData> {
  const res = await fetch(`${API_BASE}/api/graph/topology`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch topology: ${res.statusText}`);
  return res.json();
}

export async function runInvestigation(incidentId: string = "INC-4091"): Promise<InvestigationResponse> {
  const res = await fetch(`${API_BASE}/api/investigate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ incident_id: incidentId }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Investigation failed: ${res.statusText}`);
  return res.json();
}

export async function triggerCustomAlert(service: string, metric: string, value: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/alerts/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ service, metric, value }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to trigger alert: ${res.statusText}`);
  return res.json();
}

export async function saveEpisodicMemory(
  incidentId: string,
  title: string,
  rootCause: string,
  runbook: string
): Promise<{ status: string; precedent: any; message: string }> {
  const res = await fetch(`${API_BASE}/api/memory/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ incident_id: incidentId, title, root_cause: rootCause, runbook }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to save memory: ${res.statusText}`);
  return res.json();
}

export interface ChatAnswer {
  query: string;
  synthesized_cypher: string;
  answer: string;
  evidence: string[];
  traversed_path: string[];
  timestamp: number;
}

export async function askInvestigatorChat(query: string): Promise<ChatAnswer> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Chat query failed: ${res.statusText}`);
  return res.json();
}

export async function executeCypherQuery(cypher: string): Promise<CypherResponse> {
  const res = await fetch(`${API_BASE}/api/graph/cypher`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cypher }),
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

// ==========================================
// ShadowAgent — Security Interfaces & Client
// ==========================================

export interface SecurityNode {
  id: string;
  name: string;
  type: string;
  category: string;
  risk_score: number;
  vulnerability: string;
}

export interface SecurityScenario {
  id: string;
  name: string;
  entry_node: string;
  target_node: string;
  severity: string;
  cve: string;
  hop_count: number;
}

export interface InfiltrationResult {
  scenario: any;
  status: string;
  entry_point: string;
  crown_jewel: string;
  attack_path: string[];
  path_nodes: SecurityNode[];
  hops: number;
  cypher_query: string;
  exploit_details: string;
  mitre_technique: string;
}

export interface DefenseResult {
  scenario_id: string;
  status: string;
  severed_edge: { source: string; target: string; relation: string };
  defense_name: string;
  explanation: string;
  operational_impact: string;
  terraform_hcl: string;
  opencypher_cut: string;
  verified_path_severed: boolean;
}

export async function fetchSecurityTopology(): Promise<{ nodes: SecurityNode[]; edges: any[] }> {
  const res = await fetch(`${API_BASE}/api/security/topology`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch security topology: ${res.statusText}`);
  return res.json();
}

export async function fetchSecurityScenarios(): Promise<{ scenarios: SecurityScenario[] }> {
  const res = await fetch(`${API_BASE}/api/security/scenarios`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch security scenarios: ${res.statusText}`);
  return res.json();
}

export async function runSecurityInfiltration(scenarioId: string = "SCEN-01"): Promise<InfiltrationResult> {
  const res = await fetch(`${API_BASE}/api/security/infiltrate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario_id: scenarioId }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Infiltration failed: ${res.statusText}`);
  return res.json();
}

export async function runSecurityDefense(scenarioId: string = "SCEN-01"): Promise<DefenseResult> {
  const res = await fetch(`${API_BASE}/api/security/defend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario_id: scenarioId }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Defense failed: ${res.statusText}`);
  return res.json();
}

export async function askSecurityChat(query: string, scenarioId: string = "SCEN-01"): Promise<{
  query: string;
  answer: string;
  synthesized_cypher: string;
  evidence: string[];
  scenario_id: string;
}> {
  const res = await fetch(`${API_BASE}/api/security/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, scenario_id: scenarioId }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Security chat failed: ${res.statusText}`);
  return res.json();
}


