"use client";

import React, { useEffect, useRef } from "react";
import * as d3 from "d3";
import { SecurityNode } from "../lib/api";

interface Props {
  nodes: SecurityNode[];
  edges: Array<{ source: string; target: string; type: string; label?: string }>;
  attackPath: string[];
  activeStepIndex: number;
  severedEdge: { source: string; target: string } | null;
  onNodeClick: (node: SecurityNode) => void;
  selectedNodeId: string | null;
  height?: string | number;
}

export default function SecurityGraph({
  nodes,
  edges,
  attackPath,
  activeStepIndex,
  severedEdge,
  onNodeClick,
  selectedNodeId,
  height = "100%",
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !nodes.length) return;

    const width = containerRef.current.clientWidth || 700;
    const h = containerRef.current.clientHeight || 520;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // 1. Defs & Markers
    const defs = svg.append("defs");

    // Grid Pattern for aesthetic background
    const pattern = defs
      .append("pattern")
      .attr("id", "dot-grid")
      .attr("width", 24)
      .attr("height", 24)
      .attr("patternUnits", "userSpaceOnUse");

    pattern
      .append("circle")
      .attr("cx", 2)
      .attr("cy", 2)
      .attr("r", 1)
      .attr("fill", "#cbd5e1");

    // Normal Dependency Arrow
    defs
      .append("marker")
      .attr("id", "sec-arrow-normal")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 28)
      .attr("refY", 5)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto-start-reverse")
      .append("path")
      .attr("d", "M 0 0 L 10 5 L 0 10 z")
      .attr("fill", "#94a3b8");

    // Active Attack Arrow (Bold Crimson)
    defs
      .append("marker")
      .attr("id", "sec-arrow-attack")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 30)
      .attr("refY", 5)
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .attr("orient", "auto-start-reverse")
      .append("path")
      .attr("d", "M 0 0 L 10 5 L 0 10 z")
      .attr("fill", "#dc2626");

    // Severed Cut Arrow (Neutralized Green)
    defs
      .append("marker")
      .attr("id", "sec-arrow-severed")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 30)
      .attr("refY", 5)
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .attr("orient", "auto-start-reverse")
      .append("path")
      .attr("d", "M 0 0 L 10 5 L 0 10 z")
      .attr("fill", "#16a34a");

    // Background rect with dot grid
    svg
      .append("rect")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("fill", "url(#dot-grid)");

    const container = svg.append("g");

    // Zoom & Pan
    const zoom = d3.zoom<SVGSVGElement, unknown>().on("zoom", (event) => {
      container.attr("transform", event.transform);
    });
    svg.call(zoom as any);

    // Deep copy data for simulation
    const simNodes = nodes.map((d) => ({ ...d }));
    const simLinks = edges.map((d) => ({ ...d }));

    // Simulation with generous spacing and collision prevention
    const simulation = d3
      .forceSimulation(simNodes as any)
      .force(
        "link",
        d3
          .forceLink(simLinks)
          .id((d: any) => d.id)
          .distance(135)
      )
      .force("charge", d3.forceManyBody().strength(-480))
      .force("center", d3.forceCenter(width / 2, h / 2))
      .force("collision", d3.forceCollide().radius(55));

    // Attack path edge helpers
    const currentActivePath = attackPath.slice(0, activeStepIndex + 1);

    const isLinkOnActiveAttack = (d: any) => {
      const sId = typeof d.source === "object" ? d.source.id : d.source;
      const tId = typeof d.target === "object" ? d.target.id : d.target;
      const sIdx = currentActivePath.indexOf(sId);
      const tIdx = currentActivePath.indexOf(tId);
      return sIdx !== -1 && tIdx !== -1 && tIdx === sIdx + 1;
    };

    const isLinkSevered = (d: any) => {
      if (!severedEdge) return false;
      const sId = typeof d.source === "object" ? d.source.id : d.source;
      const tId = typeof d.target === "object" ? d.target.id : d.target;
      return (
        (severedEdge.source === sId && severedEdge.target === tId) ||
        (severedEdge.source === tId && severedEdge.target === sId)
      );
    };

    // Draw Links
    const link = container
      .append("g")
      .selectAll("line")
      .data(simLinks)
      .join("line")
      .attr("stroke", (d: any) => {
        if (isLinkSevered(d)) return "#16a34a";
        if (isLinkOnActiveAttack(d)) return "#dc2626";
        return "#e2e8f0";
      })
      .attr("stroke-width", (d: any) => {
        if (isLinkSevered(d) || isLinkOnActiveAttack(d)) return 3;
        return 1.5;
      })
      .attr("stroke-dasharray", (d: any) => {
        if (isLinkSevered(d)) return "4,4";
        if (isLinkOnActiveAttack(d)) return "6,3";
        return "none";
      })
      .attr("marker-end", (d: any) => {
        if (isLinkSevered(d)) return "url(#sec-arrow-severed)";
        if (isLinkOnActiveAttack(d)) return "url(#sec-arrow-attack)";
        return "url(#sec-arrow-normal)";
      });

    // Draw Link Labels (Pill Badges)
    const linkLabelGroup = container
      .append("g")
      .selectAll("g")
      .data(simLinks)
      .join("g");

    linkLabelGroup
      .append("rect")
      .attr("rx", 3)
      .attr("ry", 3)
      .attr("fill", (d: any) => {
        if (isLinkSevered(d)) return "#f0fdf4";
        if (isLinkOnActiveAttack(d)) return "#fef2f2";
        return "#ffffff";
      })
      .attr("stroke", (d: any) => {
        if (isLinkSevered(d)) return "#bbf7d0";
        if (isLinkOnActiveAttack(d)) return "#fecaca";
        return "#e2e8f0";
      })
      .attr("stroke-width", 1)
      .attr("height", 14)
      .attr("width", (d: any) => {
        const text = isLinkSevered(d) ? "✂ SEVERED MIN-CUT" : d.label || d.type;
        return text.length * 6.5 + 8;
      })
      .attr("y", -7);

    linkLabelGroup
      .append("text")
      .text((d: any) => {
        if (isLinkSevered(d)) return "✂ SEVERED MIN-CUT";
        return d.label || d.type;
      })
      .attr("font-size", "8.5px")
      .attr("font-family", "var(--font-mono)")
      .attr("font-weight", (d: any) => (isLinkSevered(d) || isLinkOnActiveAttack(d) ? "700" : "500"))
      .attr("fill", (d: any) => {
        if (isLinkSevered(d)) return "#16a34a";
        if (isLinkOnActiveAttack(d)) return "#dc2626";
        return "#64748b";
      })
      .attr("text-anchor", "middle")
      .attr("dy", 3.5);

    // Entity Color Resolver
    const getEntityTheme = (d: any) => {
      const isOnAttack = currentActivePath.includes(d.id);
      if (d.type === "CrownJewel") {
        return {
          bg: isOnAttack ? "#fef2f2" : "#ffffff",
          border: isOnAttack ? "#dc2626" : "#b91c1c",
          text: "#991b1b",
          tagBg: "#fee2e2",
          iconBg: "#dc2626",
        };
      }
      if (d.type === "IAMRole" || d.type === "IAMPolicy") {
        return {
          bg: isOnAttack ? "#faf5ff" : "#ffffff",
          border: isOnAttack ? "#dc2626" : "#7c3aed",
          text: "#6b21a8",
          tagBg: "#f3e8ff",
          iconBg: "#7c3aed",
        };
      }
      if (d.type === "Entrypoint") {
        return {
          bg: isOnAttack ? "#fff7ed" : "#ffffff",
          border: isOnAttack ? "#dc2626" : "#ea580c",
          text: "#9a3412",
          tagBg: "#ffedd5",
          iconBg: "#ea580c",
        };
      }
      // Compute / Storage / Serverless
      return {
        bg: isOnAttack ? "#f0f9ff" : "#ffffff",
        border: isOnAttack ? "#dc2626" : "#0284c7",
        text: "#0369a1",
        tagBg: "#e0f2fe",
        iconBg: "#0284c7",
      };
    };

    // Draw Nodes
    const node = container
      .append("g")
      .selectAll("g")
      .data(simNodes)
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
      );

    // Node Box (Width: 146px, Height: 44px - Clean, Spacious, Un-truncated!)
    node
      .append("rect")
      .attr("x", -73)
      .attr("y", -22)
      .attr("width", 146)
      .attr("height", 44)
      .attr("rx", 6)
      .attr("fill", (d: any) => getEntityTheme(d).bg)
      .attr("stroke", (d: any) => {
        if (d.id === selectedNodeId) return "#0f172a";
        return getEntityTheme(d).border;
      })
      .attr("stroke-width", (d: any) => (currentActivePath.includes(d.id) || d.id === selectedNodeId ? 2.5 : 1.5))
      .attr("filter", "drop-shadow(0 1px 2px rgba(0,0,0,0.05))")
      .style("cursor", "pointer")
      .on("click", (_event, d: any) => onNodeClick(d));

    // Left Icon Badge Circle
    node
      .append("circle")
      .attr("cx", -53)
      .attr("cy", 0)
      .attr("r", 12)
      .attr("fill", (d: any) => getEntityTheme(d).iconBg);

    // Icon Initial inside badge
    node
      .append("text")
      .text((d: any) => {
        if (d.type === "CrownJewel") return "💎";
        if (d.type === "IAMRole" || d.type === "IAMPolicy") return "🔑";
        if (d.type === "Entrypoint") return "🌐";
        if (d.type === "CloudStorage") return "📦";
        if (d.type === "Serverless") return "⚡";
        return "⚙️";
      })
      .attr("x", -53)
      .attr("y", 4)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .style("pointer-events", "none");

    // Title Text (Full un-truncated readable name)
    node
      .append("text")
      .text((d: any) => {
        // Human-friendly short labels
        const titles: Record<string, string> = {
          PublicWebhook: "Public Webhook",
          StorefrontIngress: "Storefront Ingress",
          SlackSupportBot: "Support SlackBot",
          StagingS3Bucket: "Staging S3 Bucket",
          LambdaEventTrigger: "Lambda Processor",
          GithubRunnerPod: "GitHub Runner Pod",
          StorefrontPod: "Storefront API Pod",
          EC2MetadataV1: "EC2 IMDSv1 Metadata",
          InternalRedis: "Internal Redis DB",
          NodeInstanceRole: "Worker Node Role",
          DeployerIAMRole: "Prod Deployer Role",
          AWSAdminAccess: "AdminAccess Policy",
          CustomerPIIVaultDB: "Customer PII Vault",
          ProductionMasterKMS: "Master KMS Key",
          GlobalJWTKeyStore: "JWT Key Vault",
        };
        return titles[d.id] || d.name || d.id;
      })
      .attr("x", -36)
      .attr("y", -6)
      .attr("font-size", "10px")
      .attr("font-weight", "700")
      .attr("fill", "#0f172a")
      .style("pointer-events", "none");

    // Subtitle Category Text
    node
      .append("text")
      .text((d: any) => d.category || d.type)
      .attr("x", -36)
      .attr("y", 8)
      .attr("font-size", "8.5px")
      .attr("font-weight", "500")
      .attr("font-family", "var(--font-mono)")
      .attr("fill", "#64748b")
      .style("pointer-events", "none");

    // Attack Step Badge (if on active attack path)
    node
      .filter((d: any) => currentActivePath.includes(d.id))
      .append("circle")
      .attr("cx", 64)
      .attr("cy", -16)
      .attr("r", 9)
      .attr("fill", "#dc2626")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 1.5);

    node
      .filter((d: any) => currentActivePath.includes(d.id))
      .append("text")
      .text((d: any) => {
        const stepNum = attackPath.indexOf(d.id) + 1;
        return `${stepNum}`;
      })
      .attr("x", 64)
      .attr("y", -13)
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("font-weight", "800")
      .attr("fill", "#ffffff")
      .style("pointer-events", "none");

    // Simulation Tick with Canvas Boundary Clamping
    simulation.on("tick", () => {
      // Clamp node positions inside the canvas with padding
      simNodes.forEach((d: any) => {
        d.x = Math.max(80, Math.min(width - 80, d.x));
        d.y = Math.max(35, Math.min(h - 35, d.y));
      });

      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      linkLabelGroup.attr("transform", (d: any) => {
        const x = (d.source.x + d.target.x) / 2;
        const y = (d.source.y + d.target.y) / 2;
        const textWidth = isLinkSevered(d) ? 110 : (d.label || d.type).length * 6.5 + 8;
        return `translate(${x - textWidth / 2}, ${y - 4})`;
      });

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, edges, attackPath, activeStepIndex, severedEdge, selectedNodeId]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: typeof height === "number" ? `${height}px` : height,
        backgroundColor: "#f8fafc",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <svg ref={svgRef} width="100%" height="100%" style={{ width: "100%", height: "100%" }} />
      <div
        style={{
          position: "absolute",
          bottom: "10px",
          left: "14px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "11px",
          color: "#64748b",
          pointerEvents: "none",
          backgroundColor: "rgba(255,255,255,0.85)",
          padding: "3px 8px",
          borderRadius: "4px",
          border: "1px solid #e2e8f0",
        }}
      >
        <span>Drag nodes • Scroll to zoom</span>
        <span>•</span>
        <span style={{ color: "#dc2626", fontWeight: 600 }}>Red Line: Attack Vector</span>
        <span>•</span>
        <span style={{ color: "#16a34a", fontWeight: 600 }}>Green Dashed: Min-Cut</span>
      </div>
    </div>
  );
}
