import { NextRequest, NextResponse } from "next/server";
import { getNodeEngine } from "@/lib/graphEngine";

export async function GET(req: NextRequest) {
  const serviceId = req.nextUrl.searchParams.get("service_id") || "payments-api";
  const engine = getNodeEngine();
  return NextResponse.json(engine.checkMemory(serviceId));
}
