import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TraceMind — Microservice Incident & Dependency Navigator (Powered by FalkorDB)",
  description: "An explainable incident investigation tool that navigates microservice dependencies, recent deployments, and episodic memory using FalkorDB. Built for Graph Hacks.",
  keywords: ["FalkorDB", "Graph Hacks", "TraceMind", "Incident Investigation", "Root Cause Analysis", "Episodic Memory", "Microservices"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>" />
      </head>
      <body>{children}</body>
    </html>
  );
}
