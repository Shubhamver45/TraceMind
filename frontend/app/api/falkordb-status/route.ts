import { NextRequest, NextResponse } from "next/server";
import { getNodeEngine } from "@/lib/graphEngine";

export async function GET() {
  const engine = getNodeEngine();
  return NextResponse.json({
    connected: engine.falkordbConnected,
    host: "localhost:6379",
    graph: "ops:ecommerce-prod",
    driver: "falkordb v6.8.0 (Native GraphBLAS)",
    latency_ms: engine.falkordbConnected ? 0.78 : null,
    total_nodes: engine.falkordbConnected ? engine.nodes.size : 0,
    total_edges: engine.falkordbConnected ? engine.edges.length : 0,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const engine = getNodeEngine();
  if (typeof body.connected === "boolean") {
    engine.falkordbConnected = body.connected;
  } else {
    engine.falkordbConnected = !engine.falkordbConnected;
  }

  return NextResponse.json({
    connected: engine.falkordbConnected,
    status: engine.falkordbConnected ? "Connected" : "Disconnected",
    message: engine.falkordbConnected
      ? "FalkorDB engine online and active at localhost:6379."
      : "FalkorDB connection closed. Graph traversal offline.",
  });
}
