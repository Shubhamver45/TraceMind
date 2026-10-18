import { NextRequest, NextResponse } from "next/server";
import { getNodeEngine } from "@/lib/graphEngine";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const engine = getNodeEngine();
  const res = engine.createIncident(
    body.id || `INC-2024-00${Date.now() % 1000}`,
    body.title || "Untitled Incident",
    body.severity || "High",
    body.affected || "checkout"
  );
  return NextResponse.json(res);
}
