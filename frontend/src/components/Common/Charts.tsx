'use client';

import React, { useState } from 'react';

// ==================== MULTI-LINE / FORECAST CHART ====================
export interface ChartSeries {
  name: string;
  color: string;
  data: (number | null)[];
  dash?: boolean;
  strokeWidth?: number;
}

export function MultiLineChart({
  dates,
  series,
  confidenceBounds,
  height = 340,
  title
}: {
  dates: string[];
  series: ChartSeries[];
  confidenceBounds?: { lower: (number | null)[]; upper: (number | null)[]; color?: string };
  height?: number;
  title?: string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!dates || dates.length === 0 || !series || series.length === 0) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>No data to display</div>;
  }

  // Calculate min and max across all series
  let allVals: number[] = [];
  series.forEach(s => {
    s.data.forEach(v => {
      if (v !== null && !isNaN(v)) allVals.push(v);
    });
  });

  if (confidenceBounds) {
    confidenceBounds.lower.forEach(v => { if (v !== null && !isNaN(v)) allVals.push(v); });
    confidenceBounds.upper.forEach(v => { if (v !== null && !isNaN(v)) allVals.push(v); });
  }

  if (allVals.length === 0) allVals = [0, 100];
  const minVal = Math.min(...allVals) * 0.98;
  const maxVal = Math.max(...allVals) * 1.02;
  const range = maxVal - minVal || 1;

  const padLeft = 60;
  const padRight = 25;
  const padTop = 20;
  const padBottom = 35;
  const width = 800; // SVG viewBox coordinate width

  const getY = (v: number) => {
    return padTop + (1 - (v - minVal) / range) * (height - padTop - padBottom);
  };

  const getX = (idx: number) => {
    return padLeft + (idx / Math.max(1, dates.length - 1)) * (width - padLeft - padRight);
  };

  // Build SVG path strings
  const getPath = (data: (number | null)[]) => {
    let path = '';
    let started = false;
    data.forEach((v, i) => {
      if (v === null || isNaN(v)) {
        started = false;
        return;
      }
      const x = getX(i);
      const y = getY(v);
      if (!started) {
        path += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
        started = true;
      } else {
        path += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
    });
    return path;
  };

  // Grid lines
  const gridCount = 5;
  const gridLines = Array.from({ length: gridCount }, (_, i) => {
    const val = minVal + (i / (gridCount - 1)) * range;
    return { y: getY(val), val };
  });

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ fontSize: '1rem', color: '#F8FAFC' }}>{title}</h4>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {series.map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#94A3B8' }}>
                <span style={{ width: 12, height: 3, background: s.color, display: 'inline-block', borderRadius: 2 }} />
                <span>{s.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height, overflow: 'visible', userSelect: 'none' }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="confBandGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00F2FE" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#00F2FE" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* Horizontal Grid lines */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line
              x1={padLeft}
              y1={g.y}
              x2={width - padRight}
              y2={g.y}
              stroke="rgba(255, 255, 255, 0.07)"
              strokeDasharray="3 3"
            />
            <text
              x={padLeft - 10}
              y={g.y + 4}
              textAnchor="end"
              fill="#64748B"
              fontSize="10"
              fontFamily="var(--font-mono)"
            >
              {g.val >= 1000 ? g.val.toFixed(0) : g.val.toFixed(2)}
            </text>
          </g>
        ))}

        {/* Confidence Band Polygon */}
        {confidenceBounds && (
          <polygon
            points={
              confidenceBounds.upper.map((u, i) => u !== null ? `${getX(i).toFixed(1)},${getY(u).toFixed(1)}` : '').filter(Boolean).join(' ') +
              ' ' +
              confidenceBounds.lower.slice().reverse().map((l, i) => {
                const idx = confidenceBounds.lower.length - 1 - i;
                return l !== null ? `${getX(idx).toFixed(1)},${getY(l).toFixed(1)}` : '';
              }).filter(Boolean).join(' ')
            }
            fill="url(#confBandGrad)"
          />
        )}

        {/* Series Paths */}
        {series.map((s, idx) => (
          <path
            key={idx}
            d={getPath(s.data)}
            fill="none"
            stroke={s.color}
            strokeWidth={s.strokeWidth || 2}
            strokeDasharray={s.dash ? '4 4' : 'none'}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {/* Date Labels on X Axis */}
        {[0, Math.floor(dates.length / 4), Math.floor(dates.length / 2), Math.floor(dates.length * 3 / 4), dates.length - 1].map((idx) => {
          if (!dates[idx]) return null;
          return (
            <text
              key={idx}
              x={getX(idx)}
              y={height - 8}
              textAnchor="middle"
              fill="#64748B"
              fontSize="10"
              fontFamily="var(--font-mono)"
            >
              {dates[idx].length > 10 ? dates[idx].slice(0, 10) : dates[idx]}
            </text>
          );
        })}

        {/* Hover Crosshair */}
        {hoverIndex !== null && (
          <g>
            <line
              x1={getX(hoverIndex)}
              y1={padTop}
              x2={getX(hoverIndex)}
              y2={height - padBottom}
              stroke="rgba(0, 242, 254, 0.4)"
              strokeWidth="1"
            />
            {series.map((s, idx) => {
              const val = s.data[hoverIndex];
              if (val === null || isNaN(val)) return null;
              return (
                <circle
                  key={idx}
                  cx={getX(hoverIndex)}
                  cy={getY(val)}
                  r="4"
                  fill={s.color}
                  stroke="#080B11"
                  strokeWidth="2"
                />
              );
            })}
          </g>
        )}

        {/* Invisible Overlay for Mouse Interaction */}
        <rect
          x={padLeft}
          y={padTop}
          width={width - padLeft - padRight}
          height={height - padTop - padBottom}
          fill="transparent"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width;
            const idx = Math.min(dates.length - 1, Math.max(0, Math.round(relX * (dates.length - 1))));
            setHoverIndex(idx);
          }}
        />
      </svg>

      {/* Hover Info Tooltip */}
      {hoverIndex !== null && dates[hoverIndex] && (
        <div style={{
          position: 'absolute',
          top: 10,
          right: 20,
          background: 'rgba(14, 19, 31, 0.95)',
          border: '1px solid rgba(0, 242, 254, 0.3)',
          borderRadius: 8,
          padding: '8px 12px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
          fontSize: '0.8rem',
          zIndex: 10
        }}>
          <div style={{ color: '#94A3B8', fontWeight: 600, marginBottom: 4 }}>{dates[hoverIndex]}</div>
          {series.map(s => {
            const val = s.data[hoverIndex];
            if (val === null || isNaN(val)) return null;
            return (
              <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ color: s.color }}>{s.name}:</span>
                <span style={{ color: '#F8FAFC', fontFamily: 'var(--font-mono)' }}>{val.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==================== CORRELATION HEATMAP ====================
export function CorrelationHeatmap({
  tickers,
  matrix
}: {
  tickers: string[];
  matrix: number[][];
}) {
  const getColor = (val: number) => {
    if (val > 0) {
      const alpha = Math.min(1, Math.max(0.1, val));
      return `rgba(0, 242, 254, ${alpha * 0.8})`;
    } else {
      const alpha = Math.min(1, Math.max(0.1, Math.abs(val)));
      return `rgba(244, 63, 94, ${alpha * 0.8})`;
    }
  };

  return (
    <div style={{ overflowX: 'auto', padding: '8px 0' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 400, textAlign: 'center' }}>
        <thead>
          <tr>
            <th style={{ padding: '8px 12px', color: '#64748B', fontSize: '0.75rem', fontWeight: 600 }}>TICKER</th>
            {tickers.map(t => (
              <th key={t} style={{ padding: '8px 12px', color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600 }}>
                {t.replace('.NS', '')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tickers.map((rowTicker, i) => (
            <tr key={rowTicker}>
              <td style={{ padding: '8px 12px', textAlign: 'left', color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600 }}>
                {rowTicker.replace('.NS', '')}
              </td>
              {tickers.map((colTicker, j) => {
                const val = matrix[i] ? matrix[i][j] : (i === j ? 1.0 : 0.0);
                return (
                  <td
                    key={colTicker}
                    style={{
                      padding: '10px 12px',
                      background: getColor(val),
                      borderRadius: 6,
                      color: Math.abs(val) > 0.4 ? '#080B11' : '#F8FAFC',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      fontFamily: 'var(--font-mono)',
                      border: '2px solid rgba(8, 11, 17, 0.8)'
                    }}
                  >
                    {val.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==================== SEMI-CIRCULAR GAUGE CHART ====================
export function RiskGauge({
  value,
  min = 0,
  max = 100,
  label,
  sublabel
}: {
  value: number;
  min?: number;
  max?: number;
  label: string;
  sublabel?: string;
}) {
  const clamped = Math.min(max, Math.max(min, value));
  const pct = (clamped - min) / (max - min);
  const angle = -180 + pct * 180;

  const color = pct < 0.4 ? '#10B981' : pct < 0.75 ? '#F59E0B' : '#F43F5E';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 0' }}>
      <svg width="220" height="125" viewBox="0 0 220 125">
        <path
          d="M 20 110 A 90 90 0 0 1 200 110"
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <path
          d="M 20 110 A 90 90 0 0 1 200 110"
          fill="none"
          stroke={color}
          strokeWidth="16"
          strokeDasharray="283"
          strokeDashoffset={283 * (1 - pct)}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
        />
        {/* Needle indicator */}
        <g transform={`translate(110, 110) rotate(${angle})`}>
          <line x1="0" y1="0" x2="-75" y2="0" stroke="#F8FAFC" strokeWidth="3" strokeLinecap="round" />
          <circle cx="0" cy="0" r="6" fill="#F8FAFC" />
        </g>
      </svg>
      <div style={{ marginTop: -15, textAlign: 'center' }}>
        <div style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-display)', color }}>
          {clamped.toFixed(1)}%
        </div>
        <div style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 600 }}>{label}</div>
        {sublabel && <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 2 }}>{sublabel}</div>}
      </div>
    </div>
  );
}

// ==================== ALLOCATION DONUT / PROGRESS BARS ====================
export function AllocationBars({
  items
}: {
  items: { label: string; value: number; color?: string }[];
}) {
  const colors = ['#00F2FE', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#3B82F6'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item, idx) => {
        const barColor = item.color || colors[idx % colors.length];
        return (
          <div key={item.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 5 }}>
              <span style={{ color: '#F8FAFC', fontWeight: 500 }}>{item.label}</span>
              <span style={{ color: barColor, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {item.value.toFixed(1)}%
              </span>
            </div>
            <div style={{ width: '100%', height: 8, background: 'rgba(255, 255, 255, 0.07)', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, Math.max(0, item.value))}%`,
                  height: '100%',
                  background: barColor,
                  borderRadius: 4,
                  transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
