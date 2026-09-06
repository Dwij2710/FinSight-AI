'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Layers,
  Compass,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  SlidersHorizontal,
  BookmarkPlus
} from 'lucide-react';
import { TickerHistoryData, LiveTickerQuote, FinSightScoreData, ForecastData } from '../../lib/types';
import { getTickerHistory, getSingleQuote, getFinSightScore, getForecast } from '../../lib/api';
import { CandlestickChart } from '../Common/CandlestickChart';
import { ScoreGauge } from '../ScoreView/ScoreGauge';
import { ProvenanceBadge } from '../ProvenanceBadge';
import { ErrorBanner } from '../Common/ErrorBanner';
import { useMarketData } from '../../context/MarketDataContext';
import { useAlerts } from '../../context/AlertContext';

interface StockTerminalViewProps {
  ticker: string;
  onNavigateTab?: (tab: 'compare' | 'fundamentals' | 'forecast' | 'portfolio' | 'paper' | 'watchlists' | 'ai' | 'rl' | 'tft') => void;
}

export function StockTerminalView({ ticker, onNavigateTab }: StockTerminalViewProps) {
  const { isDemoMode, setDemoMode } = useMarketData();
  const [data, setData] = useState<TickerHistoryData | null>(null);
  const [liveQuote, setLiveQuote] = useState<LiveTickerQuote | null>(null);
  const [scoreData, setScoreData] = useState<FinSightScoreData | null>(null);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y'>('1Y');

  // Chart Overlay State
  const [showVolume, setShowVolume] = useState(true);
  const [showSma20, setShowSma20] = useState(true);
  const [showSma50, setShowSma50] = useState(true);
  const [showSma200, setShowSma200] = useState(false);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showForecastCone, setShowForecastCone] = useState(true);
  const [indicatorPane, setIndicatorPane] = useState<'none' | 'rsi' | 'macd'>('rsi');

  useEffect(() => {
    let isCurrent = true;
    const currentTicker = ticker.trim().toUpperCase();

    // Reset data when switching tickers to prevent showing previous stock's data
    setLoading(true);
    setError(null);
    setData(null);
    setLiveQuote(null);
    setScoreData(null);
    setForecastData(null);

    const executeFetch = async () => {
      try {
        const [histRes, quoteRes, scoreRes, forecastRes] = await Promise.allSettled([
          getTickerHistory(currentTicker, period),
          getSingleQuote(currentTicker),
          getFinSightScore(currentTicker),
          getForecast({ ticker: currentTicker, forecast_period: 30 })
        ]);

        if (!isCurrent) return;

        if (histRes.status === 'fulfilled') {
          if (histRes.value?.data?.ticker?.toUpperCase() === currentTicker) {
            setData(histRes.value.data);
          }
        } else {
          throw histRes.reason;
        }

        if (quoteRes.status === 'fulfilled' && quoteRes.value) {
          if (quoteRes.value.ticker?.toUpperCase() === currentTicker) {
            setLiveQuote(quoteRes.value);
          }
        }

        if (scoreRes.status === 'fulfilled' && scoreRes.value?.data) {
          if (scoreRes.value.data.ticker?.toUpperCase() === currentTicker) {
            setScoreData(scoreRes.value.data);
          }
        }

        if (forecastRes.status === 'fulfilled' && forecastRes.value?.data) {
          if (forecastRes.value.data.ticker?.toUpperCase() === currentTicker) {
            setForecastData(forecastRes.value.data);
          }
        }
      } catch (err: any) {
        if (isCurrent) {
          setError(err?.message || `Failed to fetch technical terminal data for ${currentTicker}`);
          setData(null);
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    };

    executeFetch();

    return () => {
      isCurrent = false;
    };
  }, [ticker, period, isDemoMode]);

  const fetchTerminalData = async () => {
    const currentTicker = ticker.trim().toUpperCase();
    setLoading(true);
    setError(null);
    try {
      const [histRes, quoteRes, scoreRes, forecastRes] = await Promise.allSettled([
        getTickerHistory(currentTicker, period),
        getSingleQuote(currentTicker),
        getFinSightScore(currentTicker),
        getForecast({ ticker: currentTicker, forecast_period: 30 })
      ]);

      if (histRes.status === 'fulfilled') {
        if (histRes.value?.data?.ticker?.toUpperCase() === currentTicker) {
          setData(histRes.value.data);
        }
      } else {
        throw histRes.reason;
      }

      if (quoteRes.status === 'fulfilled' && quoteRes.value) {
        if (quoteRes.value.ticker?.toUpperCase() === currentTicker) {
          setLiveQuote(quoteRes.value);
        }
      }

      if (scoreRes.status === 'fulfilled' && scoreRes.value?.data) {
        if (scoreRes.value.data.ticker?.toUpperCase() === currentTicker) {
          setScoreData(scoreRes.value.data);
        }
      }

      if (forecastRes.status === 'fulfilled' && forecastRes.value?.data) {
        if (forecastRes.value.data.ticker?.toUpperCase() === currentTicker) {
          setForecastData(forecastRes.value.data);
        }
      }
    } catch (err: any) {
      setError(err?.message || `Failed to fetch technical terminal data for ${currentTicker}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const summary = data?.summary;
  const price = liveQuote?.price || summary?.latest_price || 0;
  const change = liveQuote?.change || 0;
  const changePct = liveQuote?.change_pct || 0;
  const isPositive = change >= 0;

  // 52W Range calculation
  const high52 = summary?.high_52w || liveQuote?.year_high || price * 1.2;
  const low52 = summary?.low_52w || liveQuote?.year_low || price * 0.8;
  const rangePct = Math.min(100, Math.max(0, ((price - low52) / (high52 - low52 || 1)) * 100));

  // Forecast Trajectory Summary
  const latestPred = forecastData?.predictions && forecastData.predictions.length > 0
    ? forecastData.predictions[forecastData.predictions.length - 1]
    : null;
  const forecastDeltaPct = (latestPred && price > 0)
    ? ((latestPred.predicted_mean - price) / price) * 100
    : 0;
  const forecastL80 = latestPred
    ? (latestPred.lower_80 ?? (latestPred.predicted_mean - (latestPred.predicted_mean - (latestPred.lower_95 ?? latestPred.lower_bound)) * 0.65))
    : null;
  const forecastU80 = latestPred
    ? (latestPred.upper_80 ?? (latestPred.predicted_mean + ((latestPred.upper_95 ?? latestPred.upper_bound) - latestPred.predicted_mean) * 0.65))
    : null;

  if (loading && !data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', border: '3px solid rgba(0, 242, 254, 0.2)', borderTopColor: 'var(--accent-cyan)', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.90rem', fontFamily: 'var(--font-mono)' }}>
          Loading live quantitative intelligence for <strong style={{ color: 'var(--accent-cyan)' }}>{ticker}</strong>...
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Overview & Live Header Card */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'var(--grad-cyan-blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 24px rgba(0, 242, 254, 0.35)',
              fontWeight: 900,
              fontSize: '1.25rem',
              color: '#080B11'
            }}
          >
            {ticker.slice(0, 2)}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.85rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                {ticker}
              </h2>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: liveQuote?.market_state === 'OPEN' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                  color: liveQuote?.market_state === 'OPEN' ? 'var(--accent-emerald)' : 'var(--text-muted)',
                  border: `1px solid ${liveQuote?.market_state === 'OPEN' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(148, 163, 184, 0.2)'}`
                }}
              >
                {liveQuote?.market_state === 'OPEN' ? '● MARKET OPEN' : '○ MARKET CLOSED'}
              </span>
              <ProvenanceBadge
                source={data?.data_source || (isDemoMode ? 'simulated' : 'live')}
                fetchedAt={data?.fetched_at}
              />
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
              Institutional Equity Research & Candlestick Technical Intelligence Terminal
            </p>
          </div>
        </div>

        {/* Live Price & Delta */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
              ${price.toFixed(2)}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 6,
                fontSize: '0.95rem',
                fontWeight: 700,
                color: isPositive ? 'var(--accent-emerald)' : 'var(--accent-rose)'
              }}
            >
              {isPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              <span>
                {isPositive ? '+' : ''}${change.toFixed(2)} ({isPositive ? '+' : ''}
                {changePct.toFixed(2)}%)
              </span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.78rem' }}>Today</span>
            </div>
          </div>

          {/* 52-Week Range Slider */}
          <div style={{ minWidth: 200 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
              <span>52W Low: ${low52.toFixed(2)}</span>
              <span>52W High: ${high52.toFixed(2)}</span>
            </div>
            <div
              style={{
                width: '100%',
                height: 6,
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.08)',
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${rangePct}%`,
                  background: 'var(--grad-cyan-blue)',
                  borderRadius: 3
                }}
              />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'right', marginTop: 3 }}>
              Range Position: {rangePct.toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <ErrorBanner
          title="Terminal Data Provider Notice"
          error={error}
          onRetry={fetchTerminalData}
          onDismiss={() => setError(null)}
          suggestedAction="Verify that the ticker symbol is valid or activate offline Sandbox Mode."
          onSwitchToSandbox={() => setDemoMode(true)}
        />
      )}

      {/* Technical Summary Metrics Row */}
      {summary && (
        <div className="metric-grid">
          <div className="metric-card cyan">
            <div className="metric-label">
              <span>Trend Regime</span>
              <Activity size={16} color="var(--accent-cyan)" />
            </div>
            <div className="metric-value" style={{ fontSize: '1.25rem' }}>
              {summary.trend.replace('_', ' ')}
            </div>
            <div className="metric-subtext">
              {summary.above_sma50 ? 'Trading above 50-day SMA ✅' : 'Below 50-day moving average ⚠️'}
            </div>
          </div>

          <div className="metric-card purple">
            <div className="metric-label">
              <span>Momentum (RSI 14)</span>
              <BarChart3 size={16} color="var(--accent-purple)" />
            </div>
            <div className="metric-value">{summary.rsi.toFixed(1)}</div>
            <div className="metric-subtext">
              Status: <strong style={{ color: summary.rsi <= 30 ? 'var(--accent-emerald)' : summary.rsi >= 70 ? 'var(--accent-rose)' : 'var(--accent-cyan)' }}>{summary.rsi_condition}</strong>
            </div>
          </div>

          <div className="metric-card emerald">
            <div className="metric-label">
              <span>MACD Signal</span>
              <Sparkles size={16} color="var(--accent-emerald)" />
            </div>
            <div className="metric-value" style={{ fontSize: '1.25rem' }}>
              {summary.macd_condition.replace('_', ' ')}
            </div>
            <div className="metric-subtext">
              MACD: {summary.macd.toFixed(2)} | Signal: {summary.macd_signal.toFixed(2)}
            </div>
          </div>

          <div className="metric-card rose">
            <div className="metric-label">
              <span>30-Day Avg Volume</span>
              <Layers size={16} color="var(--accent-rose)" />
            </div>
            <div className="metric-value">
              {(summary.avg_volume_30d / 1000000).toFixed(1)}M
            </div>
            <div className="metric-subtext">Institutional liquid depth</div>
          </div>

          {latestPred && (
            <div className="metric-card cyan" style={{ gridColumn: 'span 1' }}>
              <div className="metric-label">
                <span>30D SARIMAX Trajectory</span>
                <TrendingUp size={16} color="var(--accent-cyan)" />
              </div>
              <div className="metric-value" style={{ fontSize: '1.25rem', color: forecastDeltaPct >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)' }}>
                ${latestPred.predicted_mean.toFixed(2)} ({forecastDeltaPct >= 0 ? '+' : ''}{forecastDeltaPct.toFixed(1)}%)
              </div>
              <div className="metric-subtext" style={{ fontFamily: 'var(--font-mono)' }}>
                80% CI: [${forecastL80?.toFixed(2)}, ${forecastU80?.toFixed(2)}]
              </div>
            </div>
          )}
        </div>
      )}

      {/* FinSight AI Composite Score Card (SCORE-01) */}
      {scoreData && (
        <ScoreGauge scoreData={scoreData} />
      )}

      {/* Candlestick Studio & Controls Panel */}
      <div className="glass-panel" style={{ padding: '24px 28px' }}>
        {/* Top Control Bar: Timeframe & Indicators */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            flexWrap: 'wrap',
            gap: 16,
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: 16
          }}
        >
          {/* Timeframe Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: 4 }}>
              Horizon:
            </span>
            {(['1M', '3M', '6M', '1Y', '2Y', '5Y'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  background: period === p ? 'rgba(0, 242, 254, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                  border: period === p ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  color: period === p ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  borderRadius: 8,
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Technical Overlay Toggles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowForecastCone(!showForecastCone)}
              style={{
                background: showForecastCone ? 'rgba(0, 242, 254, 0.18)' : 'transparent',
                border: `1px solid ${showForecastCone ? '#00F2FE' : 'var(--border-subtle)'}`,
                color: showForecastCone ? '#00F2FE' : 'var(--text-muted)',
                borderRadius: 6,
                padding: '4px 9px',
                fontSize: '0.74rem',
                cursor: 'pointer',
                fontWeight: 600,
                boxShadow: showForecastCone ? '0 0 10px rgba(0, 242, 254, 0.25)' : 'none'
              }}
              title="Toggle Dual 80% & 95% SARIMAX Out-of-Sample Forecast Cones"
            >
              Forecast Cones (80%/95%)
            </button>

            <button
              onClick={() => setShowSma20(!showSma20)}
              style={{
                background: showSma20 ? 'rgba(0, 242, 254, 0.15)' : 'transparent',
                border: `1px solid ${showSma20 ? '#00F2FE' : 'var(--border-subtle)'}`,
                color: showSma20 ? '#00F2FE' : 'var(--text-muted)',
                borderRadius: 6,
                padding: '4px 9px',
                fontSize: '0.74rem',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              SMA 20
            </button>

            <button
              onClick={() => setShowSma50(!showSma50)}
              style={{
                background: showSma50 ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
                border: `1px solid ${showSma50 ? '#A855F7' : 'var(--border-subtle)'}`,
                color: showSma50 ? '#A855F7' : 'var(--text-muted)',
                borderRadius: 6,
                padding: '4px 9px',
                fontSize: '0.74rem',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              SMA 50
            </button>

            <button
              onClick={() => setShowSma200(!showSma200)}
              style={{
                background: showSma200 ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                border: `1px solid ${showSma200 ? '#F59E0B' : 'var(--border-subtle)'}`,
                color: showSma200 ? '#F59E0B' : 'var(--text-muted)',
                borderRadius: 6,
                padding: '4px 9px',
                fontSize: '0.74rem',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              SMA 200
            </button>

            <button
              onClick={() => setShowBollinger(!showBollinger)}
              style={{
                background: showBollinger ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                border: `1px solid ${showBollinger ? '#38BDF8' : 'var(--border-subtle)'}`,
                color: showBollinger ? '#38BDF8' : 'var(--text-muted)',
                borderRadius: 6,
                padding: '4px 9px',
                fontSize: '0.74rem',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Bollinger Bands
            </button>

            {/* Sub-Pane Indicator Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 6 }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Sub-Pane:</span>
              <select
                value={indicatorPane}
                onChange={e => setIndicatorPane(e.target.value as any)}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  borderRadius: 6,
                  padding: '4px 8px',
                  fontSize: '0.74rem',
                  cursor: 'pointer'
                }}
              >
                <option value="none">None</option>
                <option value="rsi">RSI (14)</option>
                <option value="macd">MACD (12,26,9)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Candlestick Interactive Chart Canvas */}
        {loading ? (
          <div
            style={{
              height: 440,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              color: 'var(--text-muted)'
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                border: '3px solid rgba(0, 242, 254, 0.2)',
                borderTopColor: 'var(--accent-cyan)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }}
            />
            <span style={{ fontSize: '0.88rem' }}>Loading institutional candlestick feed for {ticker}...</span>
          </div>
        ) : data && data.bars && data.bars.length > 0 ? (
          <CandlestickChart
            bars={data.bars}
            forecastPoints={forecastData?.predictions}
            showForecastCone={showForecastCone}
            title={`${ticker} Technical Candlestick Studio (${period})`}
            height={460}
            showVolume={showVolume}
            showSma20={showSma20}
            showSma50={showSma50}
            showSma200={showSma200}
            showBollinger={showBollinger}
            indicatorPane={indicatorPane}
            exportable={true}
          />
        ) : (
          <div style={{ height: 440, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            No chart bars available for {ticker} in timeframe {period}.
          </div>
        )}
      </div>

      {/* Quick Launchpad to Analytical Engines */}
      <div
        className="glass-panel"
        style={{
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              padding: 8,
              borderRadius: 8,
              background: 'rgba(0, 242, 254, 0.15)',
              color: 'var(--accent-cyan)'
            }}
          >
            <Compass size={18} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              Quantitative Engine Launchpad
            </h4>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Evaluate {ticker} with advanced probabilistic forecasting and reinforcement learning
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {onNavigateTab && (
            <>
              <button
                onClick={() => onNavigateTab('compare')}
                className="btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.82rem',
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.25), rgba(168, 85, 247, 0.25))',
                  borderColor: 'var(--accent-cyan)'
                }}
              >
                <span>Model Arena</span>
                <ArrowRight size={14} />
              </button>

              <button
                onClick={() => onNavigateTab('fundamentals')}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.82rem',
                  padding: '8px 16px'
                }}
              >
                <span>Fundamentals</span>
                <ArrowRight size={14} />
              </button>

              <button
                onClick={() => onNavigateTab('forecast')}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.82rem',
                  padding: '8px 16px'
                }}
              >
                <span>SARIMAX Forecast</span>
                <ArrowRight size={14} />
              </button>

              <button
                onClick={() => onNavigateTab('rl')}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.82rem',
                  padding: '8px 16px'
                }}
              >
                <span>RL Trading Agent</span>
                <ArrowRight size={14} />
              </button>

              <button
                onClick={() => onNavigateTab('tft')}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.82rem',
                  padding: '8px 16px'
                }}
              >
                <span>Multi-Factor Model</span>
                <ArrowRight size={14} />
              </button>

              <button
                onClick={() => onNavigateTab('paper')}
                className="btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.82rem',
                  padding: '8px 16px'
                }}
              >
                <span>Paper Trade</span>
                <ArrowRight size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
