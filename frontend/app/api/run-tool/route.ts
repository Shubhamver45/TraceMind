import { NextRequest, NextResponse } from "next/server";
import { getNodeEngine } from "@/lib/graphEngine";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const toolName = body.tool_name || "compute_pagerank";
  const engine = getNodeEngine();

  if (toolName === "ask_assistant") {
    return NextResponse.json(engine.askAssistant(body.prompt || ""));
  } else if (toolName === "compute_pagerank" || toolName === "load_bearing") {
    return NextResponse.json(engine.computePageRank());
  } else if (toolName === "calculate_blast_radius" || toolName === "blast_radius") {
    return NextResponse.json(engine.calculateBlastRadius(body.service_id || "auth-service"));
  } else if (toolName === "who_to_wake") {
    return NextResponse.json(engine.whoToWake(body.service_id || "checkout"));
  } else if (toolName === "recent_changes") {
    return NextResponse.json(engine.recentChanges(body.service_id || "checkout", body.hours || 24));
  } else if (toolName === "path_between") {
    return NextResponse.json(engine.findPathBetween(body.from || "checkout-service", body.to || "redis-auth-cache"));
  } else if (toolName === "recall") {
    return NextResponse.json(engine.checkMemory(body.service_id || "checkout"));
  }

  return NextResponse.json({ status: "ok", tool: toolName });
}
