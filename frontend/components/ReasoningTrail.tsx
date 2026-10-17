"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, Copy } from "lucide-react";

interface Props {
  trail: any[];
  runbook: any;
  onApplyRollback: () => void;
  isRollingBack?: boolean;
}

export default function ReasoningTrail({
  trail,
  runbook,
  onApplyRollback,
  isRollingBack = false,
}: Props) {
  if (!trail || !trail.length) {
    return (
      <div className="text-center py-12 px-4 text-slate-500">
        <div className="text-3xl mb-2">🔍</div>
        <p className="font-semibold text-slate-700">Ready for Autonomous Investigation</p>
        <p className="text-xs text-slate-500 mt-1">
          Click <strong>&quot;Run Multi-Agent Investigation&quot;</strong> to trace root cause causality through FalkorDB runtime dependencies.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {trail.map((step, idx) => (
        <div
          key={idx}
          className={`p-3 rounded-lg border bg-white shadow-sm transition-all ${
            step.agent.includes("Triage")
              ? "border-l-4 border-l-indigo-500"
              : step.agent.includes("Investigator")
              ? "border-l-4 border-l-amber-500"
              : "border-l-4 border-l-emerald-500"
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-bold text-xs uppercase tracking-wide text-slate-800">
              {step.phase}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              {step.agent}
            </span>
          </div>

          <p className="text-xs text-slate-700 mb-2 leading-relaxed">{step.action}</p>

          {/* Graph hops */}
          {step.graph_hops && (
            <div className="flex flex-wrap gap-1 mt-1">
              {step.graph_hops.map((hop: string, hIdx: number) => (
                <span
                  key={hIdx}
                  className="font-mono text-[10.5px] bg-slate-100 border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded"
                >
                  {hop}
                </span>
              ))}
            </div>
          )}

          {/* Red herrings */}
          {step.data?.investigation_steps?.[0]?.ruled_out && (
            <div className="mt-2.5 p-2 bg-amber-50 border border-amber-200 rounded text-[11.5px] text-amber-800">
              <strong>Red Herrings Discarded (Graph Topo Filter):</strong>
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                {step.data.investigation_steps[0].ruled_out.map((r: string, rIdx: number) => (
                  <li key={rIdx}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Code diff */}
          {step.agent.includes("Investigator") && (
            <div className="mt-2.5 p-2 bg-slate-900 text-slate-100 rounded font-mono text-[11px] overflow-x-auto leading-relaxed">
              <span className="text-slate-400">// File: auth/cache/token_store.go</span>
              <div className="text-red-400">- const TOKEN_CACHE_TTL = 300 * time.Second</div>
              <div className="text-emerald-400">+ const TOKEN_CACHE_TTL = 10 * time.Second // 30x query spike</div>
            </div>
          )}

          {/* Mitigation */}
          {step.agent.includes("Communicator") && runbook && (
            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-emerald-900">Actionable Mitigation Plan</span>
                <span className="text-[10px] font-bold bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded">4 MIN FIX</span>
              </div>
              <div className="bg-emerald-950 text-emerald-200 font-mono text-[11px] p-2 rounded flex justify-between items-center my-1.5">
                <span>{runbook.command || "kubectl rollout undo deployment/auth-service -n prod"}</span>
                <button
                  className="p-1 hover:bg-emerald-900 rounded text-emerald-300"
                  onClick={() => navigator.clipboard.writeText(runbook.command || "kubectl rollout undo deployment/auth-service -n prod")}
                  title="Copy command"
                >
                  <Copy size={13} />
                </button>
              </div>
              <button
                disabled={isRollingBack}
                onClick={onApplyRollback}
                className="w-full mt-2 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded transition-all shadow-sm"
              >
                {isRollingBack ? "Applying Rollback & Writing Memory..." : "✓ Apply Rollback & Write Memory to FalkorDB"}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
