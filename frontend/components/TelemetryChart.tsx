"use client";

import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

interface Props {
  isRecovered?: boolean;
}

export default function TelemetryChart({ isRecovered = false }: Props) {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const labels = ["-40m", "-35m", "-30m", "-25m", "-20m", "-15m", "-10m", "-5m", "Now"];
    const errorData = [0.1, 0.2, 1.8, 6.4, 11.2, 12.8, 12.7, 12.9, 12.8];
    const latencyData = [42, 48, 110, 340, 680, 890, 885, 910, 895];

    if (isRecovered) {
      labels.push("+3m (Rollback)");
      errorData.push(0.09);
      latencyData.push(43);
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "5xx Error Rate (%)",
            data: errorData,
            borderColor: isRecovered ? "#10b981" : "#ef4444",
            backgroundColor: isRecovered ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            yAxisID: "y",
          },
          {
            label: "P99 Latency (ms)",
            data: latencyData,
            borderColor: "#3b82f6",
            borderWidth: 1.5,
            borderDash: [4, 4],
            tension: 0.3,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, labels: { boxWidth: 10, font: { size: 10 } } },
        },
        scales: {
          x: { ticks: { font: { size: 9 } }, grid: { display: false } },
          y: { position: "left", max: 15, ticks: { font: { size: 9 }, callback: (v) => v + "%" } },
          y1: { position: "right", max: 1000, grid: { display: false }, ticks: { font: { size: 9 }, callback: (v) => v + "ms" } },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [isRecovered]);

  return (
    <div className="w-full h-full min-h-[160px]">
      <canvas ref={chartRef} />
    </div>
  );
}
