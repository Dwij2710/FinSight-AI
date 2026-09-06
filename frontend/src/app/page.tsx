'use client';

import React, { useState } from 'react';
import { TrendingUp, PieChart, Bot, Cpu, Globe, Info, Search, Bookmark, Activity, GitCompare, Building2, Wallet, Wand2, Flame } from 'lucide-react';
import { Header } from '../components/Header';
import { ForecastView } from '../components/ForecastView';
import { StockTerminalView } from '../components/StockTerminal/StockTerminalView';
import { ModelComparisonView } from '../components/ModelComparison/ModelComparisonView';
import { FundamentalView } from '../components/FundamentalView/FundamentalView';
import { PortfolioView } from '../components/PortfolioView';
import { PaperTradingView } from '../components/PaperTrading/PaperTradingView';
import { AiInsightsView } from '../components/AiInsightsView';
import { RlAgentView } from '../components/RlAgentView';
import { TftView } from '../components/TftView';
import { StrategyBuilderView } from '../components/StrategyBuilder/StrategyBuilderView';
import { StressTestingView } from '../components/StressTesting/StressTestingView';
import { WatchlistView } from '../components/WatchlistView';
import { AboutView } from '../components/AboutView';
import { MarketDataProvider } from '../context/MarketDataContext';
import { ThemeProvider } from '../context/ThemeContext';
import { AlertProvider, useAlerts } from '../context/AlertContext';
import { Disclaimer } from '../components/Common/Disclaimer';
import { BellRing, X } from 'lucide-react';

export default function Home() {
  return (
    <ThemeProvider>
      <MarketDataProvider>
        <AlertProvider>
          <DashboardContent />
        </AlertProvider>
      </MarketDataProvider>
    </ThemeProvider>
  );
}

function DashboardContent() {
  const [activeTab, setActiveTab] = useState<'terminal' | 'compare' | 'fundamentals' | 'forecast' | 'portfolio' | 'paper' | 'strategy' | 'stress' | 'watchlists' | 'ai' | 'rl' | 'tft' | 'about'>('terminal');
  const [ticker, setTicker] = useState('AAPL');
  const [searchInput, setSearchInput] = useState('');
  const { activeToast, dismissToast } = useAlerts();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setTicker(searchInput.trim().toUpperCase());
      setSearchInput('');
    }
  };

  return (
    <div className="app-container">
      {/* Top Navigation Header */}
      <Header activeTicker={ticker} onSelectTicker={(t) => setTicker(t)} />

      {/* Main Dashboard Workspace */}
      <main className="main-content">
        {/* Navigation & Search Bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 24
        }}>
          {/* Tabs */}
          <nav className="nav-tab-bar" style={{ margin: 0, flex: 1, minWidth: 320 }}>
            <button
              id="tab-terminal"
              className={`nav-tab-btn ${activeTab === 'terminal' ? 'active' : ''}`}
              onClick={() => setActiveTab('terminal')}
            >
              <Activity size={16} />
              <span>Stock Terminal</span>
            </button>

            <button
              id="tab-compare"
              className={`nav-tab-btn ${activeTab === 'compare' ? 'active' : ''}`}
              onClick={() => setActiveTab('compare')}
            >
              <GitCompare size={16} />
              <span>Model Arena</span>
            </button>

            <button
              id="tab-fundamentals"
              className={`nav-tab-btn ${activeTab === 'fundamentals' ? 'active' : ''}`}
              onClick={() => setActiveTab('fundamentals')}
            >
              <Building2 size={16} />
              <span>Fundamentals</span>
            </button>

            <button
              id="tab-forecast"
              className={`nav-tab-btn ${activeTab === 'forecast' ? 'active' : ''}`}
              onClick={() => setActiveTab('forecast')}
            >
              <TrendingUp size={16} />
              <span>Stock Forecast</span>
            </button>

            <button
              id="tab-portfolio"
              className={`nav-tab-btn ${activeTab === 'portfolio' ? 'active' : ''}`}
              onClick={() => setActiveTab('portfolio')}
            >
              <PieChart size={16} />
              <span>Portfolio Analysis</span>
            </button>

            <button
              id="tab-paper-trading"
              className={`nav-tab-btn ${activeTab === 'paper' ? 'active' : ''}`}
              onClick={() => setActiveTab('paper')}
            >
              <Wallet size={16} />
              <span>Paper Trading</span>
            </button>

            <button
              id="tab-strategy"
              className={`nav-tab-btn ${activeTab === 'strategy' ? 'active' : ''}`}
              onClick={() => setActiveTab('strategy')}
            >
              <Wand2 size={16} />
              <span>Strategy Builder</span>
            </button>

            <button
              id="tab-stress"
              className={`nav-tab-btn ${activeTab === 'stress' ? 'active' : ''}`}
              onClick={() => setActiveTab('stress')}
            >
              <Flame size={16} />
              <span>Stress Testing</span>
            </button>

            <button
              id="tab-watchlists"
              className={`nav-tab-btn ${activeTab === 'watchlists' ? 'active' : ''}`}
              onClick={() => setActiveTab('watchlists')}
            >
              <Bookmark size={16} />
              <span>Watchlists</span>
            </button>

            <button
              id="tab-ai"
              className={`nav-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai')}
            >
              <Bot size={16} />
              <span>Advanced AI</span>
            </button>

            <button
              id="tab-rl"
              className={`nav-tab-btn ${activeTab === 'rl' ? 'active' : ''}`}
              onClick={() => setActiveTab('rl')}
            >
              <Cpu size={16} />
              <span>RL Trading Agent</span>
            </button>

            <button
              id="tab-tft"
              className={`nav-tab-btn ${activeTab === 'tft' ? 'active' : ''}`}
              onClick={() => setActiveTab('tft')}
            >
              <Globe size={16} />
              <span>Multi-Factor Forecaster</span>
            </button>

            <button
              id="tab-about"
              className={`nav-tab-btn ${activeTab === 'about' ? 'active' : ''}`}
              onClick={() => setActiveTab('about')}
            >
              <Info size={16} />
              <span>About</span>
            </button>
          </nav>

          {/* Active Ticker Indicator & Search */}
          {activeTab !== 'portfolio' && activeTab !== 'paper' && activeTab !== 'strategy' && activeTab !== 'stress' && activeTab !== 'watchlists' && activeTab !== 'about' && (
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 10,
                padding: '4px 10px',
                gap: 8
              }}>
                <Search size={14} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder={`Search ticker (Active: ${ticker})`}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none',
                    width: 180,
                    fontFamily: 'var(--font-mono)'
                  }}
                />
              </div>
              <button
                type="submit"
                className="btn-primary"
                style={{ padding: '8px 14px', fontSize: '0.82rem' }}
              >
                Go
              </button>
            </form>
          )}
        </div>

        {/* View Routing */}
        {activeTab === 'terminal' && (
          <StockTerminalView
            ticker={ticker}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}
        {activeTab === 'compare' && <ModelComparisonView ticker={ticker} />}
        {activeTab === 'fundamentals' && <FundamentalView ticker={ticker} />}
        {activeTab === 'forecast' && <ForecastView ticker={ticker} />}
        {activeTab === 'portfolio' && <PortfolioView />}
        {activeTab === 'paper' && <PaperTradingView />}
        {activeTab === 'strategy' && <StrategyBuilderView />}
        {activeTab === 'stress' && <StressTestingView />}
        {activeTab === 'watchlists' && (
          <WatchlistView
            onSelectTicker={(t) => {
              setTicker(t);
              setActiveTab('forecast');
            }}
            onOpenPortfolio={(tickers) => {
              setActiveTab('portfolio');
            }}
          />
        )}
        {activeTab === 'ai' && <AiInsightsView ticker={ticker} />}
        {activeTab === 'rl' && <RlAgentView ticker={ticker} />}
        {activeTab === 'tft' && <TftView ticker={ticker} />}
        {activeTab === 'about' && <AboutView />}
      </main>

      {/* Floating Price Alert Toast */}
      {activeToast && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-active)',
          boxShadow: 'var(--shadow-lg)',
          borderRadius: 12,
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          maxWidth: 380,
          animation: 'toastSlideIn 0.3s ease forwards'
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            color: 'var(--accent-rose)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <BellRing size={16} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
              Alert Triggered: {activeToast.ticker}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              {activeToast.trigger_message ? (
                <span>{activeToast.trigger_message}</span>
              ) : (
                <>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-cyan)' }}>{activeToast.ticker}</span> crossed target ${activeToast.targetPrice ? activeToast.targetPrice.toFixed(2) : ''} (Live: ${activeToast.price ? activeToast.price.toFixed(2) : ''})
                </>
              )}
            </div>
          </div>
          <button
            onClick={dismissToast}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4
            }}
            aria-label="Dismiss alert"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Regulatory & Methodology Financial Disclaimer */}
      <Disclaimer />

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '20px 28px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.82rem'
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            FinSight AI &copy; 2024–2026. Built by <strong style={{ color: 'var(--text-secondary)' }}>Dwij Prajapati</strong>.
          </div>
          <div>
            Deployed with Next.js on <strong style={{ color: 'var(--accent-cyan)' }}>Vercel</strong> & FastAPI on <strong style={{ color: 'var(--accent-emerald)' }}>Render</strong>.
          </div>
        </div>
      </footer>
    </div>
  );
}
