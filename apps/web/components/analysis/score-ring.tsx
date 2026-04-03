"use client";

import { cn } from "@/lib/utils";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

function getScoreColor(score: number): string {
  if (score <= 7) return "#dc2626";
  if (score <= 14) return "#ca8a04";
  return "#16a34a";
}

export function ScoreRing({
  score,
  size = 112,
  strokeWidth = 10,
}: ScoreRingProps) {
  const normalizedScore = Math.max(0, Math.min(20, score));
  const progress = normalizedScore / 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const color = getScoreColor(normalizedScore);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center")}
      aria-label={`Puntaje global ${normalizedScore} de 20`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute text-center text-slate-900">
        <p className="text-2xl font-bold tabular-nums">{normalizedScore}</p>
        <p className="text-xs font-medium text-slate-700">/ 20</p>
      </div>
    </div>
  );
}
