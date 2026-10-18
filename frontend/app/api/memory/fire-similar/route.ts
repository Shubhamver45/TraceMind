import { NextResponse } from "next/server";
import { getNodeEngine } from "@/lib/graphEngine";

export async function POST() {
  const engine = getNodeEngine();
  return NextResponse.json(engine.fireSimilarIncident());
}
