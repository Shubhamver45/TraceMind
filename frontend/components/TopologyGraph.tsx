"use client";

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { TopologyData } from "../lib/api";

interface Props {
  topology: TopologyData;
  activePath: string[];
  rootCauseService: string;
  focalService: string;
  onNodeClick: (nodeId: string) => void;
  selectedNodeId: string | null;
  height?: string | number;
}

export default function TopologyGraph({
  topology,
  activePath,
  rootCauseService,
  focalService,
  onNodeClick,
  selectedNodeId,
  height = "100%",
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !topology.nodes.length) return;

    const width = 960;
    const height = 400;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Definitions for arrow heads
    const defs = svg.append("defs");

    // Normal dependency arrow (subtle slate)
    defs
      .append("marker")
      .attr("id", "arrow-normal")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 26)
      .attr("refY", 5)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto-start-reverse")
      .append("path")
      .attr("d", "M 0 0 L 10 5 L 0 10 z")
      .attr("fill", "#94a3b8");

    // Active path arrow (clean blue)
    defs
      .append("marker")
      .attr("id", "arrow-highlight")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 28)
      .attr("refY", 5)
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "auto-start-reverse")
      .append("path")
      .attr("d", "M 0 0 L 10 5 L 0 10 z")
      .attr("fill", "#0284c7");

    const container = svg.append("g");

    // Zoom & pan support
    const zoom = d3.zoom<SVGSVGElement, unknown>().on("zoom", (event) => {
      container.attr("transform", event.transform);
    });
    svg.call(zoom as any);

    // Deep copy data for D3 simulation
    const nodes = topology.nodes.map((d) => ({ ...d }));
    const links = topology.edges.map((d) => ({ ...d }));

    // Force simulation
    const simulation = d3
      .forceSimulation(nodes as any)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(110)
      )
      .force("charge", d3.forceManyBody().strength(-360))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(42));

    // Draw Links
    const link = container
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d: any) => {
        const srcId = typeof d.source === "object" ? d.source.id : d.source;
        const tgtId = typeof d.target === "object" ? d.target.id : d.target;
        const isOnPath = activePath.includes(srcId) && activePath.includes(tgtId);
        return isOnPath ? "#0284c7" : "#cbd5e1";
      })
      .attr("stroke-width", (d: any) => {
        const srcId = typeof d.source === "object" ? d.source.id : d.source;
        const tgtId = typeof d.target === "object" ? d.target.id : d.target;
        return activePath.includes(srcId) && activePath.includes(tgtId) ? 2.5 : 1.5;
      })
      .attr("stroke-dasharray", (d: any) => {
        const srcId = typeof d.source === "object" ? d.source.id : d.source;
        const tgtId = typeof d.target === "object" ? d.target.id : d.target;
        return activePath.includes(srcId) && activePath.includes(tgtId) ? "5,3" : "none";
      })
      .attr("marker-end", (d: any) => {
        const srcId = typeof d.source === "object" ? d.source.id : d.source;
        const tgtId = typeof d.target === "object" ? d.target.id : d.target;
        return activePath.includes(srcId) && activePath.includes(tgtId)
          ? "url(#arrow-highlight)"
          : "url(#arrow-normal)";
      });

    // Draw Nodes Group
    const node = container
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(
        d3
          .drag<any, any>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      )
      .on("click", (event, d: any) => {
        onNodeClick(d.id);
      })
      .style("cursor", "pointer");

    // Outer subtle ring for Selected or Root node
    node
      .append("circle")
      .attr("r", 25)
      .attr("fill", (d: any) => {
        if (d.id === rootCauseService) return "rgba(220, 38, 38, 0.08)";
        if (d.id === selectedNodeId) return "rgba(2, 132, 199, 0.08)";
        return "none";
      })
      .attr("stroke", (d: any) => {
        if (d.id === rootCauseService) return "#fca5a5";
        if (d.id === selectedNodeId) return "#bae6fd";
        return "none";
      })
      .attr("stroke-width", 1.5);

    // Inner Circle (Clean white card background)
    node
      .append("circle")
      .attr("r", 18)
      .attr("fill", "#ffffff")
      .attr("stroke", (d: any) => {
        if (d.id === rootCauseService) return "#dc2626";
        if (d.id === focalService) return "#ea580c";
        if (activePath.includes(d.id)) return "#0284c7";
        return "#16a34a";
      })
      .attr("stroke-width", 2.5);

    // Tier text inside circle
    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 4)
      .attr("fill", (d: any) => {
        if (d.id === rootCauseService) return "#dc2626";
        if (d.id === focalService) return "#ea580c";
        if (activePath.includes(d.id)) return "#0284c7";
        return "#16a34a";
      })
      .attr("font-size", "10px")
      .attr("font-weight", "700")
      .attr("font-family", "var(--font-mono)")
      .text((d: any) => (d.tier === "Tier 1" ? "T1" : "T2"));

    // Label above node (crisp dark slate)
    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", -24)
      .attr("fill", (d: any) => {
        if (d.id === rootCauseService) return "#dc2626";
        if (activePath.includes(d.id)) return "#0284c7";
        return "#0f172a";
      })
      .attr("font-size", "11px")
      .attr("font-family", "var(--font-mono)")
      .attr("font-weight", (d: any) =>
        d.id === rootCauseService || activePath.includes(d.id) ? "700" : "600"
      )
      .text((d: any) => d.name);

    // Owner label below node
    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", 32)
      .attr("fill", "#64748b")
      .attr("font-size", "9px")
      .text((d: any) => d.owner);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [topology, activePath, rootCauseService, focalService, selectedNodeId]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: typeof height === "number" ? `${height}px` : height,
        backgroundColor: "#ffffff",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <svg ref={svgRef} width="100%" height="100%" style={{ width: "100%", height: "100%" }} />
      <div
        style={{
          position: "absolute",
          bottom: "10px",
          right: "12px",
          fontSize: "11px",
          color: "var(--text-muted)",
          pointerEvents: "none",
        }}
      >
        Drag nodes to inspect • Scroll to zoom • Click node for telemetry
      </div>
    </div>
  );
}
