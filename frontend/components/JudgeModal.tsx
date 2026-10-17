"use client";

import React from "react";
import { X, Trophy, CheckCircle, Zap } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function JudgeModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <Trophy className="text-amber-500" size={18} />
            <h2 className="font-bold text-slate-800 text-sm">Judge Pitch & Demo Guide (2-Minute Walkthrough)</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded text-slate-500">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r text-blue-900 font-medium">
            <strong>The 30-Second Elevator Pitch:</strong><br />
            &quot;When a microservice outage strikes, monitoring alarms only tell you the symptom, not the cause. Vector DBs fail because they match text similarity, but cannot trace runtime causality across microservice dependencies. <strong>Incident Brain uses FalkorDB as the context layer for on-call AI agents</strong>. By walking graph relationships across services, deploys, git commits, teams, and past post-mortems in sub-milliseconds, it isolates the true culprit, dismisses red herrings, and executes verified runbooks.&quot;
          </div>

          <div>
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-1.5">
              1. Three Hackathon Challenge Tracks Addressed:
            </h3>
            <ul className="space-y-1.5 pl-4 list-disc text-slate-600">
              <li>
                <strong>Track 01 (Connected Data)</strong>: Multi-hop Cypher traversal connecting payments-api to upstream auth-service deploys.
              </li>
              <li>
                <strong>Track 02 (Agent Memory & Coordination)</strong>: Three specialized agents (Triage, Investigator, Communicator) handing off via <code>(:Task)-[:NEXT]</code> + episodic memory linking past incident <code>INC-012</code>.
              </li>
              <li>
                <strong>Track 03 (Company Brain)</strong>: Blends Git code commits, Docker microservices, Slack on-call contacts, and Kubernetes runbooks into a single queryable graph.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-1.5">
              2. Click-by-Click Demo Path to Win:
            </h3>
            <ol className="space-y-1.5 pl-4 list-decimal text-slate-600">
              <li>Point out the active P1 alert: <strong>payments-api 5xx rate at 12.8%</strong>.</li>
              <li>Click <strong>&quot;Run Multi-Agent Investigation&quot;</strong> and show the 3 agent handoff phases.</li>
              <li>Highlight the <strong>Red Herrings Discarded</strong> box: explain how search-service was ruled out by graph topology.</li>
              <li>Show the exact line of code diff in <code>token_store.go</code> that lowered the cache TTL.</li>
              <li>Click <strong>&quot;Apply Rollback & Write Memory&quot;</strong>: show the telemetry chart drop to 0.09% and confirm the memory feedback loop.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
