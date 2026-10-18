import { NextRequest, NextResponse } from "next/server";
import { getNodeEngine } from "@/lib/graphEngine";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const scenId = body.scenario_id || "SCENARIO_1_AUTH_CACHE";
  const engine = getNodeEngine();
  engine.seedScenario(scenId);
  return NextResponse.json({
    status: "success",
    active_scenario: scenId,
    topology: engine.getTopology(),
  });
}
