"use client";

import React, { useState } from "react";
import { Play } from "lucide-react";

export default function CypherConsole() {
  const [query, setQuery] = useState(
    `MATCH (s:Service)-[:DEPENDS_ON]->(upstream:Service)\nMATCH (d:Deploy)-[:DEPLOYED_TO]->(upstream)\nRETURN upstream.name, d.version, d.summary LIMIT 5`
  );
  const [latency, setLatency] = useState("0.84ms");
  const [result, setResult] = useState<string>("Query ready to execute");
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cypher-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setLatency(`${data.latency_ms}ms`);
      setResult(JSON.stringify(data.rows, null, 2));
    } catch (e) {
      console.error(e);
      setResult("Error executing query");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-1.5">
      <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500">
        <span>FalkorDB Cypher Playground</span>
        <span className="text-emerald-600 font-mono font-semibold">{latency} (sub-millisecond)</span>
      </div>

      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        rows={3}
        className="w-full bg-slate-900 text-sky-400 font-mono text-[11px] p-2 rounded border border-slate-800 outline-none resize-none leading-relaxed"
      />

      <div className="flex justify-between items-center">
        <button
          onClick={handleRun}
          disabled={loading}
          className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] rounded transition-all shadow-sm"
        >
          <Play size={11} />
          {loading ? "Running..." : "Run Cypher Query"}
        </button>
        <span className="text-[10px] text-slate-400">Powered by FalkorDB</span>
      </div>

      <div className="bg-slate-100 rounded p-1.5 font-mono text-[10px] text-slate-700 max-h-16 overflow-y-auto">
        <pre>{result}</pre>
      </div>
    </div>
  );
}
