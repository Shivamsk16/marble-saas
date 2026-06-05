import { cn } from "@/lib/utils";

export function Sparkline({
  data,
  width = 80,
  height = 28,
  className,
  color = "var(--accent)",
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  color?: string;
}) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1 || 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function BarChart({
  data,
  labels,
  width = 280,
  height = 120,
  className,
}: {
  data: number[];
  labels?: string[];
  width?: number;
  height?: number;
  className?: string;
}) {
  const max = Math.max(...data, 1);
  const barWidth = (width - (data.length - 1) * 4) / data.length;

  return (
    <svg width={width} height={height} className={className} role="img" aria-label="Bar chart">
      {data.map((v, i) => {
        const barH = (v / max) * (height - 24);
        const x = i * (barWidth + 4);
        const y = height - barH - 16;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={3}
              fill="var(--accent)"
              opacity={0.85}
            />
            {labels?.[i] && (
              <text
                x={x + barWidth / 2}
                y={height - 2}
                textAnchor="middle"
                className="fill-[var(--text-subtle)]"
                fontSize="10"
              >
                {labels[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function DonutChart({
  segments,
  size = 80,
  strokeWidth = 10,
  className,
}: {
  segments: { value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg width={size} height={size} className={className} aria-hidden>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--surface-3)"
        strokeWidth={strokeWidth}
      />
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circumference;
        const el = (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
}
