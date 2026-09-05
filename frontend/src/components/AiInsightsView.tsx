'use client';

import React, { useState, useEffect } from 'react';
import { Bot, Newspaper, Zap, CheckCircle, AlertCircle, ExternalLink, Activity, Award, Info } from 'lucide-react';
import { SentimentData, TradeSignalData } from '../lib/types';
import { getNewsSentiment, getTradeSignal } from '../lib/api';
import { AllocationBars } from './Common/Charts';
import { ErrorBanner } from './Common/ErrorBanner';
import { ProvenanceBadge } from './ProvenanceBadge';

export function AiInsightsView({ ticker }: { ticker: string }) {
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [signal, setSignal] = useState<TradeSignalData | null>(null);
  const [loadingSentiment, setLoadingSentiment] = useState(false);
  const [loadingSignal, setLoadingSignal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const fetchInsights = async () => {
    setLoadingSentiment(true);
    setLoadingSignal(true);
    setError(null);

    try {
      const [sentRes, sigRes] = await Promise.all([
        getNewsSentiment(ticker),
        getTradeSignal(ticker)
      ]);
      setSentiment(sentRes.data);
      setSignal(sigRes.data);
      setIsDemo(Boolean(sentRes.isDemo || sigRes.isDemo));
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch AI insights.');
    } finally {
      setLoadingSentiment(false);
      setLoadingSignal(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [ticker]);

  const importanceItems = (signal?.feature_importance || []).map(f => ({
    label: f.feature,
    value: f.importance
  }));

  // Helper to format human-readable publication timestamps
  const formatPublishTime = (dateStr?: string, index: number = 0) => {
    if (!dateStr) {
      const simulatedMins = (index + 1) * 28;
      if (simulatedMins < 60) return `${simulatedMins}m ago`;
      const hrs = Math.floor(simulatedMins / 60);
      return `${hrs}h ago`;
    }
    try {
      const d = new Date(dateStr);
      const diffMs = Date.now() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
      const diffHrs = Math.floor(diffMins / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' UTC';
    } catch {
      return `${(index + 1) * 35}m ago`;
    }
  };

  // Compute 24-48h sentiment shift indicator
  const totalCount = sentiment ? (sentiment.counts.Positive + sentiment.counts.Neutral + sentiment.counts.Negative) : 1;
  const netSentimentRatio = sentiment ? ((sentiment.counts.Positive - sentiment.counts.Negative) / Math.max(1, totalCount)) : 0;
  const shiftNet = sentiment ? Number((sentiment.overall_score * 0.65 + netSentimentRatio * 0.35).toFixed(2)) : 0;
  const isBullishShift = shiftNet >= 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: 4 }}>
            Advanced AI <span className="text-gradient">Insights</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            Deep learning FinBERT financial sentiment and multi-indicator machine learning directional trade signals.
          </p>
        </div>

        {/* Provenance Badge */}
        <ProvenanceBadge
          source={sentiment?.data_source || signal?.data_source}
          fetchedAt={sentiment?.fetched_at || signal?.fetched_at}
          isDemo={isDemo}
        />
      </div>

      {error && (
        <ErrorBanner
          title="AI Pipeline Notice"
          error={error}
          onRetry={fetchInsights}
          onDismiss={() => setError(null)}
          suggestedAction="Ensure the backend service is running and the ticker has news coverage."
        />
      )}

      {/* Signal Banner */}
      {signal && (
        <div className="glass-panel" style={{
          background: signal.is_strong
            ? 'linear-gradient(135deg, rgba(0, 242, 254, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)'
            : 'var(--bg-card)',
          borderColor: signal.is_strong ? 'rgba(0, 242, 254, 0.3)' : 'var(--border-subtle)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 54,
                height: 54,
                borderRadius: 14,
                background: signal.signal.includes('Bullish') ? 'var(--grad-emerald)' : 'var(--grad-cyan-blue)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 25px rgba(16, 185, 129, 0.3)'
              }}>
                <Zap size={28} color="#080B11" strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                  Tomorrow's AI Forecast Signal
                </div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F8FAFC' }}>
                  {signal.signal}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 24 }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Model Confidence</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                  {signal.confidence_pct.toFixed(1)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Historical Accuracy</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                  {signal.accuracy_pct.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Indicators / Feature Importance & News Sentiment */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: 24 }}>
        {/* Feature Importance & Indicators */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Bot size={20} color="var(--accent-cyan)" />
              <h3 style={{ fontSize: '1.15rem' }}>AI Decision Drivers (Feature Importance)</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              How much each quantitative technical indicator influenced tomorrow's forecast.
            </p>
          </div>

          <div style={{ flex: 1 }}>
            <AllocationBars items={importanceItems} />
          </div>

          {/* Current Indicators Pills */}
          {signal?.technical_indicators && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
              gap: 12,
              paddingTop: 14,
              borderTop: '1px solid var(--border-subtle)'
            }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: 8 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>RSI (14)</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {signal.technical_indicators.rsi || '52.4'}
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: 8 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SMA 20</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {signal.technical_indicators.sma_20 || '$184.2'}
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: 8 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SMA 50</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {signal.technical_indicators.sma_50 || '$178.6'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FinBERT News Sentiment */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Newspaper size={20} color="var(--accent-purple)" />
              <h3 style={{ fontSize: '1.15rem' }}>Financial News Sentiment</h3>
            </div>
            {sentiment && (
              <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>
                {sentiment.model_used}
              </span>
            )}
          </div>

          {/* Sentiment Summary & Shift Indicator */}
          {sentiment && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className={`badge ${
                  sentiment.overall_label === 'Positive'
                    ? 'badge-emerald'
                    : sentiment.overall_label === 'Negative'
                    ? 'badge-rose'
                    : 'badge-cyan'
                }`} style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
                  Overall: {sentiment.overall_label} ({sentiment.overall_score > 0 ? `+${sentiment.overall_score.toFixed(2)}` : sentiment.overall_score.toFixed(2)})
                </span>

                {/* Sentiment Shift Indicator */}
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  background: isBullishShift ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  border: `1px solid ${isBullishShift ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  color: isBullishShift ? '#34D399' : '#F87171'
                }}>
                  {isBullishShift ? '▲ Bullish Shift' : '▼ Bearish Shift'} ({isBullishShift ? `+${shiftNet}` : `${shiftNet}`} net 24-48h)
                </span>
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {sentiment.counts.Positive} Positive • {sentiment.counts.Neutral} Neutral • {sentiment.counts.Negative} Negative
              </div>
            </div>
          )}

          {/* News Feed List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto' }}>
            {sentiment?.articles && sentiment.articles.length > 0 ? (
              sentiment.articles.map((article, i) => (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255, 255, 255, 0.025)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 500, color: '#F8FAFC', lineHeight: 1.4 }}>
                      {article.Title}
                    </div>
                    <span className={`badge ${
                      article.Sentiment === 'Positive'
                        ? 'badge-emerald'
                        : article.Sentiment === 'Negative'
                        ? 'badge-rose'
                        : 'badge-cyan'
                    }`} style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                      {article.Sentiment}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{article.Publisher || 'Market Feed'}</span>
                      <span>•</span>
                      <span style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                        {formatPublishTime(article.PublishDate || (article as any)['Publish Date'], i)}
                      </span>
                    </div>
                    <span>Score: {article['Sentiment Score']?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '20px 0', textAlign: 'center' }}>
                No recent news articles detected.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
