'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Award,
  RefreshCw,
  PieChart,
  BarChart2,
  Building2,
  Scale,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { FundamentalData } from '../../lib/types';
import { getFundamentals } from '../../lib/api';
import { ErrorBanner } from '../Common/ErrorBanner';

interface FundamentalViewProps {
  ticker: string;
}

export function FundamentalView({ ticker }: FundamentalViewProps) {
  const [data, setData] = useState<FundamentalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    const currentTicker = ticker.trim().toUpperCase();

    // Reset previous stock data immediately to prevent showing stale results
    setData(null);
    setError(null);
    setLoading(true);

    const executeFetch = async () => {
      try {
        const res = await getFundamentals(currentTicker);
        if (!isCurrent) return;

        // Discard response if user already switched to another ticker
        if (res.data?.ticker && res.data.ticker.toUpperCase() !== currentTicker) {
          return;
        }

        setData(res.data);
      } catch (err: any) {
        if (isCurrent) {
          setError(err?.message || `Failed to fetch fundamental metrics for ${currentTicker}`);
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
  }, [ticker]);

  const fetchFundamentals = async () => {
    setLoading(true);
    setError(null);
    const currentTicker = ticker.trim().toUpperCase();
    try {
      const res = await getFundamentals(currentTicker);
      if (res.data?.ticker && res.data.ticker.toUpperCase() !== currentTicker) {
        return;
      }
      setData(res.data);
    } catch (err: any) {
      setError(err?.message || `Failed to fetch fundamental metrics for ${currentTicker}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Panel */}
      <div
        className="glass-panel"
        style={{
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              padding: 10,
              borderRadius: 10,
              background: 'rgba(16, 185, 129, 0.15)',
              color: 'var(--accent-emerald)'
            }}
          >
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>
                {data ? data.company_name : ticker} ({ticker})
              </h2>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: 'var(--accent-emerald)',
                  fontWeight: 600
                }}
              >
                FUND-01
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {data ? `${data.sector} • ${data.industry}` : 'Fundamental health, valuation multiples, and capital structure'}
            </p>
          </div>
        </div>

        <button
          onClick={fetchFundamentals}
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            borderRadius: 8,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Financials</span>
        </button>
      </div>

      {error && (
        <ErrorBanner
          error={error}
          onRetry={fetchFundamentals}
        />
      )}

      {loading && !data && (
        <div className="glass-panel" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <RefreshCw size={32} className="animate-spin" color="var(--accent-emerald)" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>
            Analyzing Corporate Balance Sheet for {ticker}...
          </h3>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Extracting SEC/Yahoo 10-K & 10-Q filing ratios, profitability metrics, and solvency profiles.
          </p>
        </div>
      )}

      {data && (
        <>
          {/* Health Score & Institutional Synthesis Card */}
          <div
            className="glass-panel"
            style={{
              padding: '22px 26px',
              borderLeft: `4px solid ${data.health_color}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 14
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    background: `${data.health_color}18`,
                    border: `1px solid ${data.health_color}44`,
                    color: data.health_color,
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: data.health_color }} />
                  Fundamental Health: {data.health_score}/100 ({data.health_rating})
                </span>

                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Sector Benchmark: <strong>{data.sector}</strong>
                </span>
              </div>

              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Filing As-of Date: {data.as_of_date}
              </div>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              {data.synthesis}
            </div>
          </div>

          {/* 4 Core Pillars Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
              gap: 20
            }}
          >
            {/* Pillar 1: Valuation Multiples */}
            <div className="glass-panel" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <DollarSign size={18} color="var(--accent-cyan)" />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    Valuation Multiples
                  </h3>
                </div>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: data.valuation.pe_status === 'Undervalued' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    color: data.valuation.pe_status === 'Undervalued' ? 'var(--accent-emerald)' : 'var(--text-secondary)'
                  }}
                >
                  {data.valuation.pe_status}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Trailing P/E:</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {data.valuation.trailing_pe !== null ? `${data.valuation.trailing_pe.toFixed(1)}x` : 'N/A (Loss)'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Forward P/E:</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {data.valuation.forward_pe !== null ? `${data.valuation.forward_pe.toFixed(1)}x` : 'N/A'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>PEG Ratio:</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {data.valuation.peg_ratio !== null ? `${data.valuation.peg_ratio.toFixed(2)}` : 'N/A'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Price / Sales (P/S):</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {data.valuation.price_to_sales !== null ? `${data.valuation.price_to_sales.toFixed(1)}x` : 'N/A'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Price / Book (P/B):</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {data.valuation.price_to_book !== null ? `${data.valuation.price_to_book.toFixed(1)}x` : 'N/A'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>EV / EBITDA:</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {data.valuation.ev_to_ebitda !== null ? `${data.valuation.ev_to_ebitda.toFixed(1)}x` : 'N/A'}
                  </strong>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Market Capitalization:</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>
                    {data.valuation.market_cap_billions !== null ? `$${data.valuation.market_cap_billions}B` : 'N/A'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Pillar 2: Profitability & Margins */}
            <div className="glass-panel" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={18} color="var(--accent-emerald)" />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    Profitability & Margins
                  </h3>
                </div>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: data.profitability.roe_quality === 'High' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    color: data.profitability.roe_quality === 'High' ? 'var(--accent-emerald)' : 'var(--text-secondary)'
                  }}
                >
                  {data.profitability.roe_quality} Return
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Return on Equity (ROE):</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--accent-emerald)' }}>
                    {data.profitability.return_on_equity_pct !== null ? `${data.profitability.return_on_equity_pct.toFixed(1)}%` : 'N/A'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Return on Assets (ROA):</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {data.profitability.return_on_assets_pct !== null ? `${data.profitability.return_on_assets_pct.toFixed(1)}%` : 'N/A'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Operating Margin:</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {data.profitability.operating_margin_pct !== null ? `${data.profitability.operating_margin_pct.toFixed(1)}%` : 'N/A'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Net Profit Margin:</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {data.profitability.net_profit_margin_pct !== null ? `${data.profitability.net_profit_margin_pct.toFixed(1)}%` : 'N/A'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Gross Margin:</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {data.profitability.gross_margin_pct !== null ? `${data.profitability.gross_margin_pct.toFixed(1)}%` : 'N/A'}
                  </strong>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Sector Benchmark ROE:</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                    {data.profitability.benchmark_roe_pct}%
                  </strong>
                </div>
              </div>
            </div>

            {/* Pillar 3: Solvency & Balance Sheet */}
            <div className="glass-panel" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Scale size={18} color="#A855F7" />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    Solvency & Balance Sheet
                  </h3>
                </div>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: data.solvency.balance_sheet_strength === 'Fortress' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    color: data.solvency.balance_sheet_strength === 'Fortress' ? '#A855F7' : 'var(--text-secondary)'
                  }}
                >
                  {data.solvency.balance_sheet_strength}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Cash Reserves:</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--accent-emerald)' }}>
                    {data.solvency.total_cash_billions !== null ? `$${data.solvency.total_cash_billions}B` : 'N/A'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Total Debt:</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--accent-rose)' }}>
                    {data.solvency.total_debt_billions !== null ? `$${data.solvency.total_debt_billions}B` : 'N/A'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Debt to Equity:</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {data.solvency.debt_to_equity !== null ? `${data.solvency.debt_to_equity.toFixed(2)}x` : 'N/A'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Current Ratio:</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {data.solvency.current_ratio !== null ? `${data.solvency.current_ratio.toFixed(2)}` : 'N/A'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Quick Ratio:</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {data.solvency.quick_ratio !== null ? `${data.solvency.quick_ratio.toFixed(2)}` : 'N/A'}
                  </strong>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Free Cash Flow (TTM):</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>
                    {data.solvency.free_cash_flow_billions !== null ? `$${data.solvency.free_cash_flow_billions}B` : 'N/A'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Pillar 4: Growth & Dividends */}
            <div className="glass-panel" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={18} color="#F59E0B" />
                  <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    Growth & Dividends
                  </h3>
                </div>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#F59E0B'
                  }}
                >
                  {data.growth_and_dividends.dividend_yield_pct > 0 ? `${data.growth_and_dividends.dividend_yield_pct}% Yield` : 'Growth Focus'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Quarterly Revenue YoY:</span>
                  <strong
                    style={{
                      fontFamily: 'monospace',
                      color: (data.growth_and_dividends.quarterly_revenue_growth_yoy_pct || 0) >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                    }}
                  >
                    {data.growth_and_dividends.quarterly_revenue_growth_yoy_pct !== null ? `${data.growth_and_dividends.quarterly_revenue_growth_yoy_pct > 0 ? '+' : ''}${data.growth_and_dividends.quarterly_revenue_growth_yoy_pct.toFixed(1)}%` : 'N/A'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Quarterly Earnings YoY:</span>
                  <strong
                    style={{
                      fontFamily: 'monospace',
                      color: (data.growth_and_dividends.quarterly_earnings_growth_yoy_pct || 0) >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'
                    }}
                  >
                    {data.growth_and_dividends.quarterly_earnings_growth_yoy_pct !== null ? `${data.growth_and_dividends.quarterly_earnings_growth_yoy_pct > 0 ? '+' : ''}${data.growth_and_dividends.quarterly_earnings_growth_yoy_pct.toFixed(1)}%` : 'N/A'}
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Dividend Yield:</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {data.growth_and_dividends.dividend_yield_pct.toFixed(2)}%
                  </strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Dividend Payout Ratio:</span>
                  <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {data.growth_and_dividends.payout_ratio_pct !== null ? `${data.growth_and_dividends.payout_ratio_pct.toFixed(1)}%` : 'N/A'}
                  </strong>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Capital Return Profile:</span>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    {data.growth_and_dividends.dividend_yield_pct > 0 ? 'Cash Dividends + Reinvestment' : 'Organic R&D Reinvestment'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
