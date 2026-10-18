import { NextResponse } from "next/server";
import { getNodeEngine } from "@/lib/graphEngine";

export async function GET() {
  const engine = getNodeEngine();
  return NextResponse.json({ markdown: engine.generatePostMortem() });
}
