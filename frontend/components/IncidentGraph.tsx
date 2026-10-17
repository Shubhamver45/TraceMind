"use client";

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { GraphNode, GraphEdge } from "@/lib/graphEngine";

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: GraphNode | null;
  onSelectNode: (node: GraphNode) => void;
  highlightedNodes?: string[];
}

export default function IncidentGraph({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
  highlightedNodes = [],
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !nodes.length) return;

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 520;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Zoom container
    const g = svg.append("g");
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);

    // Arrow markers
    svg.append("defs").selectAll("marker")
      .data(["arrow", "arrow-highlight"])
      .enter().append("marker")
      .attr("id", (d) => d)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 22)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", (d) => (d === "arrow-highlight" ? "#ef4444" : "#94a3b8"));

    // Simulation
    const links = edges.map((d) => ({ ...d }));
    const simNodes = nodes.map((d) => ({ ...d }));

    const simulation = d3.forceSimulation(simNodes as any)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(85))
      .force("charge", d3.forceManyBody().strength(-240))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(26));

    // Draw Links
    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", (d: any) => {
        const isHighlight = highlightedNodes.includes(d.source?.id) && highlightedNodes.includes(d.target?.id);
        return isHighlight ? "#ef4444" : (d.type === "DEPENDS_ON" ? "#94a3b8" : "#cbd5e1");
      })
      .attr("stroke-width", (d: any) => {
        const isHighlight = highlightedNodes.includes(d.source?.id) && highlightedNodes.includes(d.target?.id);
        return isHighlight ? 2.5 : 1.2;
      })
      .attr("marker-end", (d: any) => {
        const isHighlight = highlightedNodes.includes(d.source?.id) && highlightedNodes.includes(d.target?.id);
        return isHighlight ? "url(#arrow-highlight)" : "url(#arrow)";
      });

    // Draw Link Labels
    const linkText = g.append("g")
      .selectAll("text")
      .data(links)
      .enter().append("text")
      .attr("font-size", "8.5px")
      .attr("font-family", "monospace")
      .attr("fill", "#64748b")
      .attr("text-anchor", "middle")
      .text((d: any) => d.type);

    // Draw Nodes
    const nodeColors: Record<string, string> = {
      Service: "#2563eb",
      Deploy: "#ea580c",
      Alert: "#dc2626",
      Incident: "#9333ea",
      Person: "#10b981",
      Runbook: "#7c3aed",
      Team: "#475569",
      Task: "#64748b",
      Commit: "#d97706",
      Lesson: "#059669",
    };

    const node = g.append("g")
      .selectAll("g")
      .data(simNodes)
      .enter().append("g")
      .style("cursor", "pointer")
      .call(
        d3.drag<any, any>()
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
      .on("click", (_, d: any) => {
        const original = nodes.find((n) => n.id === d.id);
        if (original) onSelectNode(original);
      });

    // Node circles / boxes
    node.each(function (d: any) {
      const el = d3.select(this);
      const isDb = d.kind === "database" || d.kind === "queue";
      const isSelected = selectedNode?.id === d.id;
      const isHighlighted = highlightedNodes.includes(d.id);
      const baseColor = nodeColors[d.label] || "#64748b";

      if (isDb) {
        el.append("rect")
          .attr("x", -18)
          .attr("y", -12)
          .attr("width", 36)
          .attr("height", 24)
          .attr("rx", 4)
          .attr("fill", "#cffafe")
          .attr("stroke", isSelected ? "#000" : (isHighlighted ? "#ef4444" : "#0891b2"))
          .attr("stroke-width", isSelected || isHighlighted ? 3 : 1.5);
      } else {
        el.append("circle")
          .attr("r", d.label === "Service" ? 14 : 11)
          .attr("fill", isHighlighted ? "#fee2e2" : "#ffffff")
          .attr("stroke", isSelected ? "#000" : (isHighlighted ? "#ef4444" : baseColor))
          .attr("stroke-width", isSelected || isHighlighted ? 3 : 2);
      }
    });

    // Node labels
    node.append("text")
      .attr("y", 22)
      .attr("font-size", "10px")
      .attr("font-weight", "600")
      .attr("font-family", "-apple-system, sans-serif")
      .attr("fill", "#1e293b")
      .attr("text-anchor", "middle")
      .text((d: any) => d.name || d.id);

    // Ticks
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      linkText
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, edges, selectedNode, highlightedNodes, onSelectNode]);

  return (
    <div className="relative w-full h-full min-h-[500px] bg-white overflow-hidden">
      <svg ref={svgRef} className="w-full h-full block" />
    </div>
  );
}
