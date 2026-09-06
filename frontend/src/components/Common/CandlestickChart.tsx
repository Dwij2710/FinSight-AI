'use client';

import React, { useState, useRef } from 'react';
import { Download, Camera, FileSpreadsheet, Layers, Eye } from 'lucide-react';
import { TickerHistoryBar, PredictionPoint } from '../../lib/types';
import { exportChartSvgToPng, exportSeriesToCsv } from '../../lib/chartExport';
import { useTheme } from '../../context/ThemeContext';

export interface CandlestickChartProps {
  bars: TickerHistoryBar[];
  forecastPoints?: PredictionPoint[];
  showForecastCone?: boolean;
  title?: string;
  height?: number;
  showVolume?: boolean;
  showSma20?: boolean;
  showSma50?: boolean;
  showSma200?: boolean;
  showBollinger?: boolean;
  indicatorPane?: 'none' | 'rsi' | 'macd';
  exportable?: boolean;
}

export function CandlestickChart({
  bars,
  forecastPoints,
  showForecastCone = false,
  title,
  height = 440,
  showVolume = true,
  showSma20 = true,
  showSma50 = true,
  showSma200 = false,
  showBollinger = false,
  indicatorPane = 'none',
  exportable = true
}: CandlestickChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { isDark } = useTheme();

  if (!bars || bars.length === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)'
        }}
      >
        No candlestick market data available
      </div>
    );
  }

  // Dimension layouts
  const width = 900;
  const padLeft = 65;
  const padRight = 30;
  const padTop = 24;

  const hasSubPane = indicatorPane !== 'none';
  const subPaneHeight = hasSubPane ? 100 : 0;
  const subPaneGap = hasSubPane ? 24 : 0;
  const padBottom = hasSubPane ? 26 : 28;

  const mainHeight = height - padTop - padBottom - subPaneHeight - subPaneGap;
  const subPaneTop = padTop + mainHeight + subPaneGap;

  // Forecast state calculation
  const hasForecast = Boolean(showForecastCone && forecastPoints && forecastPoints.length > 0);
  const forecastCount = hasForecast && forecastPoints ? forecastPoints.length : 0;
  const totalSteps = bars.length + forecastCount;

  // Compute price bounds
  const prices: number[] = [];
  bars.forEach(b => {
    prices.push(b.high, b.low);
    if (showSma20 && b.sma_20) prices.push(b.sma_20);
    if (showSma50 && b.sma_50) prices.push(b.sma_50);
    if (showSma200 && b.sma_200) prices.push(b.sma_200);
    if (showBollinger && b.bb_upper) prices.push(b.bb_upper);
    if (showBollinger && b.bb_lower) prices.push(b.bb_lower);
  });

  if (hasForecast && forecastPoints) {
    forecastPoints.forEach(fp => {
      prices.push(fp.predicted_mean);
      const u95 = fp.upper_95 ?? fp.upper_bound;
      const l95 = fp.lower_95 ?? fp.lower_bound;
      if (u95 !== undefined) prices.push(u95);
      if (l95 !== undefined) prices.push(l95);
      const u80 = fp.upper_80 ?? (u95 !== undefined ? fp.predicted_mean + (u95 - fp.predicted_mean) * 0.65 : fp.predicted_mean * 1.05);
      const l80 = fp.lower_80 ?? (l95 !== undefined ? fp.predicted_mean - (fp.predicted_mean - l95) * 0.65 : fp.predicted_mean * 0.95);
      prices.push(u80, l80);
    });
  }

  const rawMin = Math.min(...prices);
  const rawMax = Math.max(...prices);
  const priceMargin = (rawMax - rawMin) * 0.04 || 1;
  const minPrice = rawMin - priceMargin;
  const maxPrice = rawMax + priceMargin;
  const priceRange = maxPrice - minPrice || 1;

  // Max volume for bottom overlay
  const maxVolume = Math.max(...bars.map(b => b.volume), 1);
  const volumeOverlayHeight = mainHeight * 0.22;

  // Coordinate projection functions
  const getX = (i: number) => {
    const step = (width - padLeft - padRight) / Math.max(1, totalSteps);
    return padLeft + i * step + step / 2;
  };

  const getPriceY = (p: number) => {
    return padTop + (1 - (p - minPrice) / priceRange) * mainHeight;
  };

  const candleWidth = Math.max(2, Math.min(14, ((width - padLeft - padRight) / totalSteps) * 0.72));

  // Build path strings for line overlays (bars only)
  const buildLinePath = (getter: (b: TickerHistoryBar) => number | null | undefined) => {
    let path = '';
    let active = false;
    bars.forEach((b, i) => {
      const val = getter(b);
      if (val === null || val === undefined || isNaN(val)) {
        active = false;
        return;
      }
      const x = getX(i);
      const y = getPriceY(val);
      if (!active) {
        path += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
        active = true;
      } else {
        path += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
    });
    return path;
  };

  // Price grid lines
  const gridCount = 6;
  const priceGrid = Array.from({ length: gridCount }, (_, i) => {
    const p = minPrice + (i / (gridCount - 1)) * priceRange;
    return { y: getPriceY(p), val: p };
  });

  // Export handlers
  const handleExportPng = () => {
    if (!svgRef.current) return;
    exportChartSvgToPng(svgRef.current, `${title || 'candlestick-chart'}.png`);
  };

  const handleExportCsv = () => {
    const headers = ['Date', 'Open', 'High', 'Low', 'Close', 'Volume', 'SMA_20', 'SMA_50', 'SMA_200'];
    const rows = bars.map(b => [
      b.date,
      b.open,
      b.high,
      b.low,
      b.close,
      b.volume,
      b.sma_20 ?? '',
      b.sma_50 ?? '',
      b.sma_200 ?? ''
    ]);
    exportSeriesToCsv(`${title || 'candlestick-data'}.csv`, headers, rows);
  };

  const isForecastHover = hoverIndex !== null && hoverIndex >= bars.length;
  const activeBar = hoverIndex !== null && hoverIndex < bars.length ? bars[hoverIndex] : null;
  const activeForecast = isForecastHover && forecastPoints ? forecastPoints[hoverIndex - bars.length] : null;

  // Last historical candle for forecast anchoring
  const lastBar = bars[bars.length - 1];
  const lastBarX = getX(bars.length - 1);
  const lastBarCloseY = getPriceY(lastBar.close);
  const boundaryX = (getX(bars.length - 1) + getX(Math.min(totalSteps - 1, bars.length))) / 2;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Header and Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {title && (
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              {title}
            </h3>
          )}
          {activeBar && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: '0.78rem',
                fontFamily: 'var(--font-mono)'
              }}
            >
              <span>
                O: <strong style={{ color: 'var(--text-primary)' }}>${activeBar.open.toFixed(2)}</strong>
              </span>
              <span>
                H: <strong style={{ color: 'var(--accent-emerald)' }}>${activeBar.high.toFixed(2)}</strong>
              </span>
              <span>
                L: <strong style={{ color: 'var(--accent-rose)' }}>${activeBar.low.toFixed(2)}</strong>
              </span>
              <span>
                C: <strong style={{ color: activeBar.close >= activeBar.open ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                  ${activeBar.close.toFixed(2)}
                </strong>
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                Vol: {(activeBar.volume / 1000000).toFixed(2)}M
              </span>
            </div>
          )}
          {activeForecast && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: '0.78rem',
                fontFamily: 'var(--font-mono)',
                background: 'rgba(0, 242, 254, 0.1)',
                border: '1px solid rgba(0, 242, 254, 0.3)',
                padding: '2px 8px',
                borderRadius: 6
              }}
            >
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                {activeForecast.date} Target: ${activeForecast.predicted_mean.toFixed(2)}
              </span>
              <span style={{ color: 'rgba(0, 242, 254, 0.85)' }}>
                80% CI: [${(activeForecast.lower_80 ?? (activeForecast.predicted_mean - (activeForecast.predicted_mean - (activeForecast.lower_95 ?? activeForecast.lower_bound)) * 0.65)).toFixed(2)}, ${(activeForecast.upper_80 ?? (activeForecast.predicted_mean + ((activeForecast.upper_95 ?? activeForecast.upper_bound) - activeForecast.predicted_mean) * 0.65)).toFixed(2)}]
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                95% CI: [${(activeForecast.lower_95 ?? activeForecast.lower_bound).toFixed(2)}, ${(activeForecast.upper_95 ?? activeForecast.upper_bound).toFixed(2)}]
              </span>
            </div>
          )}
        </div>

        {exportable && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={handleExportPng}
              className="btn-secondary"
              style={{
                padding: '4px 10px',
                fontSize: '0.74rem',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}
              title="Export Candlestick Chart as PNG"
            >
              <Camera size={13} />
              <span>PNG</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="btn-secondary"
              style={{
                padding: '4px 10px',
                fontSize: '0.74rem',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 5
              }}
              title="Export OHLCV Data as CSV"
            >
              <FileSpreadsheet size={13} />
              <span>CSV</span>
            </button>
          </div>
        )}
      </div>

      {/* SVG Chart Canvas */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="bullishVol" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.10" />
          </linearGradient>
          <linearGradient id="bearishVol" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.10" />
          </linearGradient>
          <linearGradient id="bollingerFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00F2FE" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="cone95Grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(0, 242, 254, 0.12)" />
            <stop offset="100%" stopColor="rgba(0, 242, 254, 0.04)" />
          </linearGradient>
          <linearGradient id="cone80Grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(0, 242, 254, 0.22)" />
            <stop offset="100%" stopColor="rgba(0, 242, 254, 0.08)" />
          </linearGradient>
        </defs>

        {/* Background panel */}
        <rect
          x={padLeft}
          y={padTop}
          width={width - padLeft - padRight}
          height={mainHeight}
          fill={isDark ? 'rgba(10, 14, 23, 0.45)' : 'rgba(248, 250, 252, 0.6)'}
          rx={6}
        />

        {/* Price Horizontal Grid Lines */}
        {priceGrid.map((g, i) => (
          <g key={`pgrid-${i}`}>
            <line
              x1={padLeft}
              y1={g.y}
              x2={width - padRight}
              y2={g.y}
              stroke={isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.08)'}
              strokeDasharray="3 3"
            />
            <text
              x={padLeft - 8}
              y={g.y + 4}
              textAnchor="end"
              fill={isDark ? '#64748B' : '#475569'}
              fontSize="10"
              fontFamily="var(--font-mono)"
            >
              ${g.val >= 1000 ? g.val.toFixed(0) : g.val.toFixed(2)}
            </text>
          </g>
        ))}

        {/* Volume Bars (Subtle bottom background overlay) */}
        {showVolume &&
          bars.map((b, i) => {
            const x = getX(i);
            const barH = (b.volume / maxVolume) * volumeOverlayHeight;
            const y = padTop + mainHeight - barH;
            const isBull = b.close >= b.open;
            return (
              <rect
                key={`vol-${i}`}
                x={x - candleWidth / 2}
                y={y}
                width={candleWidth}
                height={barH}
                fill={isBull ? 'url(#bullishVol)' : 'url(#bearishVol)'}
                rx={1}
              />
            );
          })}

        {/* Bollinger Bands Fill and Lines */}
        {showBollinger && (
          <>
            <polygon
              points={
                bars
                  .map((b, i) => (b.bb_upper ? `${getX(i).toFixed(1)},${getPriceY(b.bb_upper).toFixed(1)}` : ''))
                  .filter(Boolean)
                  .join(' ') +
                ' ' +
                bars
                  .slice()
                  .reverse()
                  .map((b, i) => {
                    const idx = bars.length - 1 - i;
                    return b.bb_lower ? `${getX(idx).toFixed(1)},${getPriceY(b.bb_lower).toFixed(1)}` : '';
                  })
                  .filter(Boolean)
                  .join(' ')
              }
              fill="url(#bollingerFill)"
            />
            <path
              d={buildLinePath(b => b.bb_upper)}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="1.2"
              strokeDasharray="4 3"
              opacity="0.8"
            />
            <path
              d={buildLinePath(b => b.bb_middle)}
              fill="none"
              stroke="#8B5CF6"
              strokeWidth="1.2"
              opacity="0.7"
            />
            <path
              d={buildLinePath(b => b.bb_lower)}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="1.2"
              strokeDasharray="4 3"
              opacity="0.8"
            />
          </>
        )}

        {/* Dual SARIMAX Forecast Cones (80% and 95% Confidence Intervals) */}
        {hasForecast && forecastPoints && forecastPoints.length > 0 && (
          <g key="forecast-cones">
            {/* Forecast Boundary Vertical Divider */}
            <line
              x1={boundaryX}
              y1={padTop}
              x2={boundaryX}
              y2={padTop + mainHeight}
              stroke="rgba(0, 242, 254, 0.45)"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
            <text
              x={boundaryX + 6}
              y={padTop + 14}
              fill="var(--accent-cyan)"
              fontSize="9"
              fontWeight="700"
              fontFamily="var(--font-mono)"
            >
              OUT-OF-SAMPLE FORECAST →
            </text>

            {/* 95% Prediction Interval Shaded Polygon */}
            {(() => {
              const upper95 = forecastPoints.map((fp, j) => {
                const u = fp.upper_95 ?? fp.upper_bound;
                return `${getX(bars.length + j).toFixed(1)},${getPriceY(u).toFixed(1)}`;
              });
              const lower95 = forecastPoints.slice().reverse().map((fp, j) => {
                const idx = forecastPoints.length - 1 - j;
                const l = fp.lower_95 ?? fp.lower_bound;
                return `${getX(bars.length + idx).toFixed(1)},${getPriceY(l).toFixed(1)}`;
              });
              const poly95 = `${lastBarX.toFixed(1)},${lastBarCloseY.toFixed(1)} ${upper95.join(' ')} ${lower95.join(' ')}`;
              return (
                <polygon
                  points={poly95}
                  fill="url(#cone95Grad)"
                  stroke="rgba(0, 242, 254, 0.3)"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                />
              );
            })()}

            {/* 80% Prediction Interval Shaded Polygon */}
            {(() => {
              const upper80 = forecastPoints.map((fp, j) => {
                const u95 = fp.upper_95 ?? fp.upper_bound;
                const u80 = fp.upper_80 ?? (u95 !== undefined ? fp.predicted_mean + (u95 - fp.predicted_mean) * 0.65 : fp.predicted_mean * 1.05);
                return `${getX(bars.length + j).toFixed(1)},${getPriceY(u80).toFixed(1)}`;
              });
              const lower80 = forecastPoints.slice().reverse().map((fp, j) => {
                const idx = forecastPoints.length - 1 - j;
                const item = forecastPoints[idx];
                const l95 = item.lower_95 ?? item.lower_bound;
                const l80 = item.lower_80 ?? (l95 !== undefined ? item.predicted_mean - (item.predicted_mean - l95) * 0.65 : item.predicted_mean * 0.95);
                return `${getX(bars.length + idx).toFixed(1)},${getPriceY(l80).toFixed(1)}`;
              });
              const poly80 = `${lastBarX.toFixed(1)},${lastBarCloseY.toFixed(1)} ${upper80.join(' ')} ${lower80.join(' ')}`;
              return (
                <polygon
                  points={poly80}
                  fill="url(#cone80Grad)"
                  stroke="rgba(0, 242, 254, 0.6)"
                  strokeWidth="1"
                  strokeDasharray="3 2"
                />
              );
            })()}

            {/* Predicted Mean Trajectory Path */}
            {(() => {
              let pathStr = `M ${lastBarX.toFixed(1)} ${lastBarCloseY.toFixed(1)}`;
              forecastPoints.forEach((fp, j) => {
                pathStr += ` L ${getX(bars.length + j).toFixed(1)} ${getPriceY(fp.predicted_mean).toFixed(1)}`;
              });
              return (
                <path
                  d={pathStr}
                  fill="none"
                  stroke="#00F2FE"
                  strokeWidth="2.2"
                  strokeDasharray="5 3"
                  strokeLinecap="round"
                />
              );
            })()}

            {/* Node markers on predicted trajectory */}
            {forecastPoints.map((fp, j) => {
              const x = getX(bars.length + j);
              const y = getPriceY(fp.predicted_mean);
              return (
                <circle
                  key={`pred-dot-${j}`}
                  cx={x}
                  cy={y}
                  r={j === forecastPoints.length - 1 ? 4 : 2}
                  fill="#00F2FE"
                  stroke="#080B11"
                  strokeWidth="1"
                />
              );
            })}
          </g>
        )}

        {/* Candlestick Wicks & Bodies */}
        {bars.map((b, i) => {
          const x = getX(i);
          const isBull = b.close >= b.open;
          const color = isBull ? '#10B981' : '#F43F5E';

          const yHigh = getPriceY(b.high);
          const yLow = getPriceY(b.low);
          const yOpen = getPriceY(b.open);
          const yClose = getPriceY(b.close);

          const bodyTop = Math.min(yOpen, yClose);
          const bodyHeight = Math.max(2, Math.abs(yClose - yOpen));

          return (
            <g key={`candle-${i}`}>
              {/* High-Low Wick Line */}
              <line
                x1={x}
                y1={yHigh}
                x2={x}
                y2={yLow}
                stroke={color}
                strokeWidth="1.2"
                strokeLinecap="round"
              />

              {/* Candle Body */}
              <rect
                x={x - candleWidth / 2}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                fill={isBull ? '#10B981' : '#F43F5E'}
                stroke={color}
                strokeWidth="0.8"
                rx={1}
              />
            </g>
          );
        })}

        {/* Moving Average Overlays */}
        {showSma20 && (
          <path
            d={buildLinePath(b => b.sma_20)}
            fill="none"
            stroke="#00F2FE"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        )}

        {showSma50 && (
          <path
            d={buildLinePath(b => b.sma_50)}
            fill="none"
            stroke="#A855F7"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        )}

        {showSma200 && (
          <path
            d={buildLinePath(b => b.sma_200)}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2.0"
            strokeLinecap="round"
          />
        )}

        {/* Secondary Indicator Sub-Pane (RSI or MACD) */}
        {hasSubPane && (
          <g>
            {/* Sub-pane background */}
            <rect
              x={padLeft}
              y={subPaneTop}
              width={width - padLeft - padRight}
              height={subPaneHeight}
              fill={isDark ? 'rgba(10, 14, 23, 0.55)' : 'rgba(241, 245, 249, 0.7)'}
              rx={6}
            />

            {indicatorPane === 'rsi' && (
              <>
                {/* 70 Overbought & 30 Oversold references */}
                <line
                  x1={padLeft}
                  y1={subPaneTop + subPaneHeight * 0.3}
                  x2={width - padRight}
                  y2={subPaneTop + subPaneHeight * 0.3}
                  stroke="rgba(244, 63, 94, 0.35)"
                  strokeDasharray="4 3"
                />
                <text
                  x={padLeft - 8}
                  y={subPaneTop + subPaneHeight * 0.3 + 4}
                  textAnchor="end"
                  fill="#F43F5E"
                  fontSize="9"
                  fontFamily="var(--font-mono)"
                >
                  70
                </text>

                <line
                  x1={padLeft}
                  y1={subPaneTop + subPaneHeight * 0.7}
                  x2={width - padRight}
                  y2={subPaneTop + subPaneHeight * 0.7}
                  stroke="rgba(16, 185, 129, 0.35)"
                  strokeDasharray="4 3"
                />
                <text
                  x={padLeft - 8}
                  y={subPaneTop + subPaneHeight * 0.7 + 4}
                  textAnchor="end"
                  fill="#10B981"
                  fontSize="9"
                  fontFamily="var(--font-mono)"
                >
                  30
                </text>

                {/* RSI Line */}
                <path
                  d={bars
                    .map((b, i) => {
                      if (!b.rsi_14) return '';
                      const x = getX(i);
                      const y = subPaneTop + (1 - b.rsi_14 / 100) * subPaneHeight;
                      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#00F2FE"
                  strokeWidth="1.8"
                />
                <text
                  x={padLeft + 10}
                  y={subPaneTop + 14}
                  fill="#00F2FE"
                  fontSize="10"
                  fontWeight="600"
                >
                  RSI (14): {activeBar?.rsi_14 ? activeBar.rsi_14.toFixed(1) : (bars[bars.length - 1].rsi_14?.toFixed(1) || '—')}
                </text>
              </>
            )}

            {indicatorPane === 'macd' && (
              <>
                {/* Zero center line */}
                <line
                  x1={padLeft}
                  y1={subPaneTop + subPaneHeight / 2}
                  x2={width - padRight}
                  y2={subPaneTop + subPaneHeight / 2}
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeDasharray="2 2"
                />

                {/* MACD Histograms */}
                {bars.map((b, i) => {
                  if (b.macd_hist === null || b.macd_hist === undefined) return null;
                  const x = getX(i);
                  const centerY = subPaneTop + subPaneHeight / 2;
                  const h = Math.min(subPaneHeight / 2 - 4, Math.abs(b.macd_hist) * 12);
                  const y = b.macd_hist >= 0 ? centerY - h : centerY;
                  return (
                    <rect
                      key={`hist-${i}`}
                      x={x - candleWidth / 2}
                      y={y}
                      width={candleWidth}
                      height={Math.max(1, h)}
                      fill={b.macd_hist >= 0 ? '#10B981' : '#F43F5E'}
                      opacity="0.85"
                    />
                  );
                })}

                {/* MACD Line */}
                <path
                  d={bars
                    .map((b, i) => {
                      if (b.macd === null || b.macd === undefined) return '';
                      const x = getX(i);
                      const y = subPaneTop + subPaneHeight / 2 - b.macd * 12;
                      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#00F2FE"
                  strokeWidth="1.6"
                />

                {/* Signal Line */}
                <path
                  d={bars
                    .map((b, i) => {
                      if (b.macd_signal === null || b.macd_signal === undefined) return '';
                      const x = getX(i);
                      const y = subPaneTop + subPaneHeight / 2 - b.macd_signal * 12;
                      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="1.4"
                  strokeDasharray="3 2"
                />

                <text
                  x={padLeft + 10}
                  y={subPaneTop + 14}
                  fill="#00F2FE"
                  fontSize="10"
                  fontWeight="600"
                >
                  MACD (12,26,9)
                </text>
              </>
            )}
          </g>
        )}

        {/* Date Labels on X Axis */}
        {[
          0,
          Math.floor(bars.length / 3),
          Math.floor((bars.length * 2) / 3),
          bars.length - 1,
          ...(hasForecast && forecastPoints && forecastPoints.length > 0 ? [totalSteps - 1] : [])
        ].map(idx => {
          if (idx < bars.length) {
            const b = bars[idx];
            if (!b) return null;
            return (
              <text
                key={`xlabel-${idx}`}
                x={getX(idx)}
                y={height - 6}
                textAnchor="middle"
                fill="#64748B"
                fontSize="10"
                fontFamily="var(--font-mono)"
              >
                {b.date}
              </text>
            );
          } else if (hasForecast && forecastPoints) {
            const fp = forecastPoints[idx - bars.length];
            if (!fp) return null;
            return (
              <text
                key={`xlabel-fc-${idx}`}
                x={getX(idx)}
                y={height - 6}
                textAnchor="middle"
                fill="var(--accent-cyan)"
                fontSize="10"
                fontWeight="600"
                fontFamily="var(--font-mono)"
              >
                {fp.date}
              </text>
            );
          }
          return null;
        })}

        {/* Hover Crosshair */}
        {hoverIndex !== null && (
          <g>
            {/* Vertical crosshair line */}
            <line
              x1={getX(hoverIndex)}
              y1={padTop}
              x2={getX(hoverIndex)}
              y2={hasSubPane ? subPaneTop + subPaneHeight : padTop + mainHeight}
              stroke="rgba(0, 242, 254, 0.45)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />

            {/* Horizontal price crosshair */}
            {activeBar && (
              <line
                x1={padLeft}
                y1={getPriceY(activeBar.close)}
                x2={width - padRight}
                y2={getPriceY(activeBar.close)}
                stroke="rgba(0, 242, 254, 0.35)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            )}
            {activeForecast && (
              <line
                x1={padLeft}
                y1={getPriceY(activeForecast.predicted_mean)}
                x2={width - padRight}
                y2={getPriceY(activeForecast.predicted_mean)}
                stroke="rgba(0, 242, 254, 0.6)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            )}
          </g>
        )}

        {/* Interactive Mouse Capture Overlay */}
        <rect
          x={padLeft}
          y={padTop}
          width={width - padLeft - padRight}
          height={height - padTop - padBottom}
          fill="transparent"
          onMouseMove={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width;
            const idx = Math.min(totalSteps - 1, Math.max(0, Math.round(relX * (totalSteps - 1))));
            setHoverIndex(idx);
          }}
          onMouseLeave={() => setHoverIndex(null)}
        />
      </svg>

      {/* Legend & Indicator Pills */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginTop: 10,
          fontSize: '0.75rem',
          flexWrap: 'wrap',
          color: 'var(--text-secondary)'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: '#10B981' }} />
          Bullish Candle
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: '#F43F5E' }} />
          Bearish Candle
        </span>
        {showSma20 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#00F2FE' }}>
            <span style={{ width: 14, height: 2, background: '#00F2FE' }} />
            SMA 20
          </span>
        )}
        {showSma50 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#A855F7' }}>
            <span style={{ width: 14, height: 2, background: '#A855F7' }} />
            SMA 50
          </span>
        )}
        {showSma200 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#F59E0B' }}>
            <span style={{ width: 14, height: 2, background: '#F59E0B' }} />
            SMA 200
          </span>
        )}
        {showBollinger && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#38BDF8' }}>
            <span style={{ width: 14, height: 2, borderTop: '2px dashed #38BDF8' }} />
            Bollinger Bands (20, 2)
          </span>
        )}
        {hasForecast && (
          <>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--accent-cyan)' }}>
              <span style={{ width: 14, height: 2, borderTop: '2px dashed #00F2FE' }} />
              Forecast Mean
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(0, 242, 254, 0.8)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(0, 242, 254, 0.25)', border: '1px solid rgba(0, 242, 254, 0.6)' }} />
              80% CI Cone
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(0, 242, 254, 0.6)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(0, 242, 254, 0.1)', border: '1px dashed rgba(0, 242, 254, 0.3)' }} />
              95% CI Cone
            </span>
          </>
        )}
        {showVolume && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-muted)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(255, 255, 255, 0.2)' }} />
            Volume Bars
          </span>
        )}
      </div>
    </div>
  );
}
