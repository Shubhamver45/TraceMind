"use client";

import React, { useState } from "react";
import { Send, Terminal, Cpu, Database, CheckCircle2, ArrowRight } from "lucide-react";
import { askInvestigatorChat, ChatAnswer } from "../lib/api";

interface Props {
  onPathHighlight?: (path: string[]) => void;
}

const PRESET_QUERIES = [
  "Why is CheckoutService failing?",
  "Which deployment changed PaymentGateway recently?",
  "What is the downstream blast radius if PaymentGateway fails?",
  "What is the recommended runbook fix?",
];

export default function InvestigationChat({ onPathHighlight }: Props) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "agent"; content: any }>>([
    {
      role: "agent",
      content: {
        answer:
          "Hello, I am TraceMind. I investigate production outages by traversing your microservice dependency graph in FalkorDB. Ask me anything about the active outage.",
        synthesized_cypher:
          "MATCH (i:Incident {status: 'INVESTIGATING'})-[:AFFECTS]->(s:Service) RETURN i, s",
        evidence: [
          "Active Incident INC-4091: CheckoutService 504 Timeouts (14.8%)",
          "FalkorDB Graph Engine initialized with 9 microservices & 9 dependency edges",
        ],
      },
    },
  ]);

  const handleSend = async (textToSend: string) => {
    const q = textToSend.trim();
    if (!q || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setQuery("");
    setIsLoading(true);

    try {
      const res: ChatAnswer = await askInvestigatorChat(q);
      setMessages((prev) => [...prev, { role: "agent", content: res }]);
      if (res.traversed_path && onPathHighlight) {
        onPathHighlight(res.traversed_path);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: {
            answer: `Investigation error: ${err.message || "Failed to query graph"}`,
            synthesized_cypher: "",
            evidence: [],
          },
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid var(--border-subtle)",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 18px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#f8fafc",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Terminal size={15} color="#0284c7" />
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)" }}>
            Investigation Terminal (Text-to-Cypher Graph Reasoning)
          </span>
        </div>
        <span
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            fontFamily: "var(--font-mono)",
            backgroundColor: "#f1f5f9",
            padding: "2px 8px",
            borderRadius: "4px",
            border: "1px solid var(--border-subtle)",
          }}
        >
          FalkorDB OpenCypher
        </span>
      </div>

      {/* Preset Query Chips */}
      <div
        style={{
          padding: "10px 18px",
          backgroundColor: "#ffffff",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>Suggested:</span>
        {PRESET_QUERIES.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(preset)}
            disabled={isLoading}
            style={{
              padding: "4px 10px",
              fontSize: "11px",
              backgroundColor: "#f1f5f9",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Messages Stream */}
      <div
        style={{
          padding: "18px",
          maxHeight: "380px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          backgroundColor: "#f8fafc",
        }}
      >
        {messages.map((msg, index) => {
          if (msg.role === "user") {
            return (
              <div key={index} style={{ alignSelf: "flex-end", maxWidth: "80%" }}>
                <div
                  style={{
                    backgroundColor: "#0284c7",
                    color: "#ffffff",
                    padding: "8px 14px",
                    borderRadius: "14px 14px 2px 14px",
                    fontSize: "13px",
                    fontWeight: 500,
                  }}
                >
                  {msg.content}
                </div>
              </div>
            );
          }

          const ans = msg.content;
          return (
            <div key={index} style={{ alignSelf: "flex-start", maxWidth: "90%" }}>
              <div
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid var(--border-subtle)",
                  padding: "14px",
                  borderRadius: "2px 14px 14px 14px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    color: "var(--text-primary)",
                    lineHeight: 1.5,
                    marginBottom: "10px",
                  }}
                >
                  {ans.answer}
                </div>

                {/* OpenCypher Block */}
                {ans.synthesized_cypher && (
                  <div
                    style={{
                      backgroundColor: "#f8fafc",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "4px",
                      padding: "8px 12px",
                      marginBottom: "10px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#0284c7",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        marginBottom: "4px",
                      }}
                    >
                      Synthesized OpenCypher Traversal:
                    </div>
                    <code
                      style={{
                        fontSize: "11px",
                        color: "#0f172a",
                        fontFamily: "var(--font-mono)",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {ans.synthesized_cypher}
                    </code>
                  </div>
                )}

                {/* Evidence Points */}
                {ans.evidence && ans.evidence.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        fontWeight: 700,
                      }}
                    >
                      Graph Evidence Citations:
                    </div>
                    {ans.evidence.map((ev: string, evIdx: number) => (
                      <div
                        key={evIdx}
                        style={{
                          fontSize: "12px",
                          color: "var(--text-secondary)",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "6px",
                        }}
                      >
                        <span style={{ color: "#16a34a", fontWeight: 700 }}>✓</span>
                        <span>{ev}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div
            style={{
              alignSelf: "flex-start",
              color: "#0284c7",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Cpu size={14} />
            <span>TraceMind is traversing the microservice graph in FalkorDB...</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div
        style={{
          padding: "12px 18px",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          gap: "10px",
          backgroundColor: "#ffffff",
        }}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend(query)}
          placeholder="Ask TraceMind anything (e.g. 'Why is CheckoutService timing out?' or 'What caused the latency?')"
          style={{
            flex: 1,
            backgroundColor: "#f8fafc",
            border: "1px solid var(--border-focus)",
            color: "var(--text-primary)",
            padding: "8px 14px",
            borderRadius: "6px",
            fontSize: "12px",
            outline: "none",
          }}
        />
        <button
          onClick={() => handleSend(query)}
          disabled={isLoading || !query.trim()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            backgroundColor: "#0284c7",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Send size={13} />
          Investigate
        </button>
      </div>
    </div>
  );
}
