import { NextRequest, NextResponse } from "next/server";
import { getNodeEngine } from "@/lib/graphEngine";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const query = body.query || "MATCH (s:Service) RETURN s.name";
  const engine = getNodeEngine();
  return NextResponse.json(engine.runCypher(query));
}
