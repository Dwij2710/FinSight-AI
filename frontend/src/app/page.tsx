'use client';

import React, { useState } from 'react';
import { TrendingUp, PieChart, Bot, Cpu, Globe, Info, Search, Bookmark } from 'lucide-react';
import { Header } from '../components/Header';
import { ForecastView } from '../components/ForecastView';
import { PortfolioView } from '../components/PortfolioView';
import { AiInsightsView } from '../components/AiInsightsView';
import { RlAgentView } from '../components/RlAgentView';
import { TftView } from '../components/TftView';
import { WatchlistView } from '../components/WatchlistView';
import { AboutView } from '../components/AboutView';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'forecast' | 'portfolio' | 'watchlists' | 'ai' | 'rl' | 'tft' | 'about'>('forecast');
  const [ticker, setTicker] = useState('AAPL');
  const [searchInput, setSearchInput] = useState('');

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
              <span>Multi-Variate TFT</span>
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
          {activeTab !== 'portfolio' && activeTab !== 'watchlists' && activeTab !== 'about' && (
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(14, 19, 31, 0.9)',
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
                    color: '#F8FAFC',
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
        {activeTab === 'forecast' && <ForecastView ticker={ticker} />}
        {activeTab === 'portfolio' && <PortfolioView />}
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
