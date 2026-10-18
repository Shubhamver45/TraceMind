import { NextRequest, NextResponse } from "next/server";
import { getNodeEngine } from "@/lib/graphEngine";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const alertId = body.alert_id || "alert-001";
  const incidentId = body.incident_id || "INC-2024-001";
  const engine = getNodeEngine();
  return NextResponse.json(engine.runInvestigation(alertId, incidentId));
}
