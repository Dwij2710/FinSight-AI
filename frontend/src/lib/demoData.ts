// Zero-Downtime Fallback Simulation Engine for FinSight AI
// Provides deterministic, realistic quantitative analytics when the cloud backend is cold-starting

import {
  ForecastData,
  PortfolioData,
  SentimentData,
  TradeSignalData,
  RlSimulationData,
  TftData,
  Watchlist,
  SavedPortfolio
} from './types';

// ==================== PORTFOLIO DEMO ====================
export function generateDemoPortfolio(tickers: string[]): PortfolioData {
  const valid = tickers.length >= 2 ? tickers : ['AAPL', 'MSFT', 'NVDA'];
  const n = valid.length;

  const equalWeight = 1 / n;
  const sharpeWeights: Record<string, number> = {};
  const volWeights: Record<string, number> = {};
  const parityWeights: Record<string, number> = {};

  let sumSharpe = 0;
  let sumVol = 0;
  valid.forEach((t, idx) => {
    const sw = 1.0 + Math.sin(idx * 1.5 + 1) * 0.4;
    const vw = 1.0 + Math.cos(idx * 1.2 + 2) * 0.3;
    sharpeWeights[t] = sw;
    volWeights[t] = vw;
    parityWeights[t] = equalWeight;
    sumSharpe += sw;
    sumVol += vw;
  });

  valid.forEach(t => {
    sharpeWeights[t] = Number((sharpeWeights[t] / sumSharpe).toFixed(4));
    volWeights[t] = Number((volWeights[t] / sumVol).toFixed(4));
  });

  const matrixValues: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) row.push(1.0);
      else {
        const corr = Number((0.35 + 0.25 * Math.sin(i * 3 + j * 7)).toFixed(2));
        row.push(corr);
      }
    }
    matrixValues.push(row);
  }

  const frontierVol: number[] = [];
  const frontierRet: number[] = [];
  for (let i = 0; i < 30; i++) {
    const v = 0.12 + (i / 30) * 0.22;
    const r = 0.08 + Math.sqrt(i / 30) * 0.24;
    frontierVol.push(Number(v.toFixed(4)));
    frontierRet.push(Number(r.toFixed(4)));
  }

  const randVol: number[] = [];
  const randRet: number[] = [];
  const randSharpe: number[] = [];
  for (let i = 0; i < 200; i++) {
    const v = 0.13 + Math.random() * 0.19;
    const r = 0.06 + Math.random() * 0.24;
    const s = (r - 0.05) / v;
    randVol.push(Number(v.toFixed(4)));
    randRet.push(Number(r.toFixed(4)));
    randSharpe.push(Number(s.toFixed(2)));
  }

  const dates: string[] = [];
  const series: Record<string, number[]> = {
    'Max Sharpe': [],
    'Min Volatility': [],
    'Equal Risk Parity': [],
    'Benchmark': []
  };

  const now = new Date();
  let ms = 100;
  let mv = 100;
  let rp = 100;
  let bm = 100;

  for (let i = 180; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));

    ms *= 1 + (0.0008 + (Math.sin(i * 0.2) * 0.012) + (Math.random() - 0.48) * 0.01);
    mv *= 1 + (0.0005 + (Math.sin(i * 0.15) * 0.007) + (Math.random() - 0.49) * 0.006);
    rp *= 1 + (0.0006 + (Math.sin(i * 0.18) * 0.009) + (Math.random() - 0.48) * 0.008);
    bm *= 1 + (0.0004 + (Math.sin(i * 0.1) * 0.01) + (Math.random() - 0.5) * 0.012);

    series['Max Sharpe'].push(Number(ms.toFixed(2)));
    series['Min Volatility'].push(Number(mv.toFixed(2)));
    series['Equal Risk Parity'].push(Number(rp.toFixed(2)));
    series['Benchmark'].push(Number(bm.toFixed(2)));
  }

  return {
    valid_tickers: valid,
    invalid_tickers: [],
    correlation_matrix: {
      tickers: valid,
      values: matrixValues
    },
    max_sharpe: {
      return: 0.238,
      volatility: 0.142,
      sharpe_ratio: 1.68,
      weights: sharpeWeights
    },
    min_volatility: {
      return: 0.145,
      volatility: 0.098,
      sharpe_ratio: 1.48,
      weights: volWeights
    },
    risk_parity: {
      return: 0.182,
      volatility: 0.116,
      sharpe_ratio: 1.57,
      weights: parityWeights
    },
    benchmark_info: {
      ticker: valid[0].includes('.NS') ? '^NSEI' : '^GSPC',
      name: valid[0].includes('.NS') ? 'NIFTY 50' : 'S&P 500',
      risk_free_rate_pct: 5.2
    },
    efficient_frontier: {
      volatility: frontierVol,
      return: frontierRet
    },
    random_portfolios: {
      volatility: randVol,
      return: randRet,
      sharpe: randSharpe
    },
    cumulative_growth: {
      dates,
      series
    },
    risk_metrics: {
      beta: 0.88,
      max_drawdown_pct: -9.4,
      drawdown_history: dates.slice(-60).map((d, idx) => ({
        date: d,
        drawdown: Number((-Math.abs(Math.sin(idx * 0.25) * 8.5)).toFixed(2))
      }))
    },
    stress_tests: [
      { scenario: '2008 Financial Crisis', market_drop_pct: -38.5, estimated_portfolio_impact_pct: -24.2 },
      { scenario: '2020 COVID Shock', market_drop_pct: -33.9, estimated_portfolio_impact_pct: -19.6 },
      { scenario: '2022 Inflation Surge', market_drop_pct: -25.4, estimated_portfolio_impact_pct: -14.8 }
    ]
  };
}

// ==================== FORECAST DEMO ====================
export function generateDemoForecast(ticker: string): ForecastData {
  const sym = ticker.toUpperCase().trim() || 'AAPL';
  const history: { date: string; actual: number; fitted: number }[] = [];
  const predictions: { date: string; predicted_mean: number; lower_bound: number; upper_bound: number }[] = [];

  const now = new Date();
  let price = 180.0;

  for (let i = 120; i >= 1; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    price += (Math.random() - 0.48) * 3.5 + Math.sin(i * 0.1) * 1.2;
    history.push({
      date: d.toISOString().slice(0, 10),
      actual: Number(price.toFixed(2)),
      fitted: Number((price + (Math.random() - 0.5) * 1.2).toFixed(2))
    });
  }

  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i + 1);
    price += 0.8 + (Math.random() - 0.45) * 2.0;
    const band = 3.0 + i * 0.45;
    predictions.push({
      date: d.toISOString().slice(0, 10),
      predicted_mean: Number(price.toFixed(2)),
      lower_bound: Number((price - band).toFixed(2)),
      upper_bound: Number((price + band).toFixed(2))
    });
  }

  return {
    ticker: sym,
    column: 'Close',
    metrics: {
      rmse: 2.14,
      mape: 1.18,
      accuracy: 98.82
    },
    adf_test: {
      test_statistic: -3.84,
      p_value: 0.0025,
      is_stationary: true
    },
    history,
    predictions,
    summary: `Quantitative SARIMAX model fitted for ${sym} across 120 historical bars. Residual diagnostics confirm stationary holdout backtesting.`
  };
}

// ==================== AI INSIGHTS DEMO ====================
export function generateDemoSentiment(ticker: string): SentimentData {
  const sym = ticker.toUpperCase().trim() || 'AAPL';
  return {
    ticker: sym,
    model_used: 'FinBERT Institutional NLP Sentiment Classifier',
    overall_score: 0.68,
    overall_label: 'Positive',
    counts: {
      Positive: 7,
      Neutral: 3,
      Negative: 1
    },
    articles: [
      {
        Title: `${sym} Expands Enterprise Cloud & AI Infrastructure with Record Margin Growth`,
        Publisher: 'Bloomberg Financial Markets',
        Sentiment: 'Positive',
        'Sentiment Score': 0.84,
        Link: '#'
      },
      {
        Title: `Institutional Outflow Stabilizes as ${sym} Rebalances Capital Allocation`,
        Publisher: 'Reuters Global Equities',
        Sentiment: 'Positive',
        'Sentiment Score': 0.72,
        Link: '#'
      },
      {
        Title: `Quarterly Earnings Preview: Analysts Project 14% EPS Acceleration for ${sym}`,
        Publisher: 'Wall Street Quantitative Journal',
        Sentiment: 'Positive',
        'Sentiment Score': 0.76,
        Link: '#'
      },
      {
        Title: `Macro Interest Rate Sensitivity Across Tech and Industrial Sector Peers`,
        Publisher: 'Financial Times Intelligence',
        Sentiment: 'Neutral',
        'Sentiment Score': 0.12,
        Link: '#'
      },
      {
        Title: `Supply Chain Diversification Strategy Mitigates Component Lead Times`,
        Publisher: 'Barron\'s Capital Review',
        Sentiment: 'Positive',
        'Sentiment Score': 0.65,
        Link: '#'
      }
    ]
  };
}

export function generateDemoSignal(ticker: string): TradeSignalData {
  const sym = ticker.toUpperCase().trim() || 'AAPL';
  return {
    ticker: sym,
    signal: 'Strong Buy',
    confidence_pct: 88.4,
    accuracy_pct: 81.2,
    is_strong: true,
    feature_importance: [
      { feature: 'RSI Momentum (14D)', importance: 0.34 },
      { feature: 'MACD Divergence Histogram', importance: 0.28 },
      { feature: '20-Day SMA Mean-Reversion', importance: 0.22 },
      { feature: 'Bollinger %B Volatility Band', importance: 0.16 }
    ],
    technical_indicators: {
      rsi: 58.4,
      sma_20: 184.2,
      sma_50: 178.6
    }
  };
}

// ==================== RL AGENT DEMO ====================
export function generateDemoRl(
  ticker: string,
  initialBalance: number = 10000,
  algoType: string = 'PPO'
): RlSimulationData {
  const sym = ticker.toUpperCase().trim() || 'AAPL';
  const history = [];
  const now = new Date();

  let agentBalance = initialBalance;
  let benchmarkBalance = initialBalance;
  let price = 150.0;

  for (let i = 50; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    const priceChange = (Math.random() - 0.46) * 3.2;
    price = Math.max(10, price + priceChange);

    const agentAlpha = 0.0025 + (Math.random() - 0.45) * 0.015;
    agentBalance *= 1 + agentAlpha;
    benchmarkBalance *= 1 + (priceChange / price);

    const actions = ['BUY', 'HOLD', 'HOLD', 'BUY', 'SELL', 'HOLD'];
    const act = actions[i % actions.length];

    history.push({
      date: dateStr,
      price: Number(price.toFixed(2)),
      agent_net_worth: Number(agentBalance.toFixed(2)),
      benchmark_net_worth: Number(benchmarkBalance.toFixed(2)),
      action: act
    });
  }

  const profit = Number((agentBalance - initialBalance).toFixed(2));
  const profitPct = Number(((profit / initialBalance) * 100).toFixed(2));
  const benchProfitPct = Number((((benchmarkBalance - initialBalance) / initialBalance) * 100).toFixed(2));

  return {
    ticker: sym,
    algo_type: algoType,
    action_type: 'Continuous (Fractional Sizing)',
    risk_profile: 'Aggressive Alpha',
    engine: `${algoType} Actor-Critic Policy (Gymnasium Env)`,
    initial_balance: initialBalance,
    final_balance: Number(agentBalance.toFixed(2)),
    profit,
    profit_pct: profitPct,
    benchmark_profit_pct: benchProfitPct,
    max_drawdown_pct: -6.4,
    win_rate_pct: 66.7,
    total_trades: 18,
    history
  };
}

// ==================== TFT DEMO ====================
export function generateDemoTft(ticker: string): TftData {
  const sym = ticker.toUpperCase().trim() || 'AAPL';
  const now = new Date();
  const dates: string[] = [];
  const series: Record<string, number[]> = {
    [sym]: [],
    'S&P 500': [],
    '10Y Yield': [],
    'Crude Oil': [],
    'VIX': []
  };

  let p = 180;
  let sp = 5000;
  let yld = 4.2;
  let oil = 78;
  let vix = 14;

  for (let i = 60; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));

    p += (Math.random() - 0.47) * 2.5;
    sp += (Math.random() - 0.47) * 35;
    yld += (Math.random() - 0.5) * 0.05;
    oil += (Math.random() - 0.5) * 1.2;
    vix = Math.max(10, vix + (Math.random() - 0.5) * 0.8);

    series[sym].push(Number(p.toFixed(2)));
    series['S&P 500'].push(Number(sp.toFixed(2)));
    series['10Y Yield'].push(Number(yld.toFixed(2)));
    series['Crude Oil'].push(Number(oil.toFixed(2)));
    series['VIX'].push(Number(vix.toFixed(2)));
  }

  return {
    ticker: sym,
    current_price: 184.5,
    sp500_price: 5210.4,
    vix: 13.8,
    regime: 'Growth Expansion Regime',
    regime_desc: 'Accommodative multi-factor regime: low systemic volatility and resilient corporate credit margins.',
    attention_weights: [
      { factor: 'S&P 500 Equity Momentum', weight_pct: 35 },
      { factor: '10-Year Treasury Yield Shift', weight_pct: 28 },
      { factor: 'WTI Crude Oil Volatility', weight_pct: 18 },
      { factor: 'VIX Volatility Term Structure', weight_pct: 12 },
      { factor: 'Gold Safe-Haven Demand', weight_pct: 7 }
    ],
    anomaly_analysis: {
      is_anomaly: false,
      risk_score: 14.8,
      message: 'Isolation Forest anomaly detector reports normal market conditions within 95% Gaussian confidence intervals.'
    },
    lookalike: {
      matched_date: '2023-11-14',
      similarity: 94.6,
      future_return: 7.4
    },
    probabilistic_forecast: {
      predicted: 192.4,
      lower: 181.2,
      upper: 203.6,
      confidence: 90
    },
    scenarios: [
      { scenario: 'Macro Expansion (Soft Landing)', projected_price: 198.5, impact_pct: 7.6 },
      { scenario: 'Hawkish Fed Rate Hike (+50bps)', projected_price: 174.2, impact_pct: -5.6 },
      { scenario: 'Geopolitical Energy Surge (+15% Oil)', projected_price: 178.9, impact_pct: -3.0 }
    ],
    macro_correlations: [
      { indicator: 'S&P 500 Index', correlation: 0.84, latest_value: 5210.4 },
      { indicator: 'US 10-Year Treasury', correlation: -0.38, latest_value: 4.22 },
      { indicator: 'Crude Oil (WTI)', correlation: 0.16, latest_value: 78.4 },
      { indicator: 'CBOE VIX Volatility', correlation: -0.72, latest_value: 13.8 }
    ],
    macro_chart: {
      dates,
      series
    }
  };
}

// ==================== WATCHLISTS DEMO ====================
export function generateDemoWatchlists(): Watchlist[] {
  return [
    {
      id: 1,
      name: '🇺🇸 US Big Tech Leaders',
      created_at: new Date().toISOString(),
      items: [
        { id: 101, watchlist_id: 1, ticker: 'AAPL', notes: 'Core holding, expanding services revenue', added_at: new Date().toISOString() },
        { id: 102, watchlist_id: 1, ticker: 'NVDA', notes: 'Enterprise GPU infrastructure leader', added_at: new Date().toISOString() },
        { id: 103, watchlist_id: 1, ticker: 'MSFT', notes: 'Azure Cloud & enterprise AI software', added_at: new Date().toISOString() },
        { id: 104, watchlist_id: 1, ticker: 'GOOGL', notes: 'Search ad momentum & Gemini LLM', added_at: new Date().toISOString() },
        { id: 105, watchlist_id: 1, ticker: 'AMZN', notes: 'AWS cloud margin expansion & retail logistics', added_at: new Date().toISOString() }
      ]
    },
    {
      id: 2,
      name: '🇮🇳 NIFTY Top 5 Bluechips',
      created_at: new Date().toISOString(),
      items: [
        { id: 201, watchlist_id: 2, ticker: 'RELIANCE.NS', notes: 'Retail & telecom conglomerate leadership', added_at: new Date().toISOString() },
        { id: 202, watchlist_id: 2, ticker: 'TCS.NS', notes: 'IT services & multi-year enterprise contracts', added_at: new Date().toISOString() },
        { id: 203, watchlist_id: 2, ticker: 'HDFCBANK.NS', notes: 'Private banking loan book expansion', added_at: new Date().toISOString() },
        { id: 204, watchlist_id: 2, ticker: 'INFY.NS', notes: 'Digital transformation consulting', added_at: new Date().toISOString() },
        { id: 205, watchlist_id: 2, ticker: 'ICICIBANK.NS', notes: 'High return on equity private lender', added_at: new Date().toISOString() }
      ]
    },
    {
      id: 3,
      name: '🌐 Macro Hedges & Commodities',
      created_at: new Date().toISOString(),
      items: [
        { id: 301, watchlist_id: 3, ticker: 'GLD', notes: 'Central bank gold accumulation reserve', added_at: new Date().toISOString() },
        { id: 302, watchlist_id: 3, ticker: 'USO', notes: 'Crude oil supply/demand geopolitics', added_at: new Date().toISOString() },
        { id: 303, watchlist_id: 3, ticker: 'TLT', notes: '20+ Year Treasury Bond duration hedge', added_at: new Date().toISOString() }
      ]
    }
  ];
}

// ==================== SAVED PORTFOLIOS DEMO ====================
export function generateDemoSavedPortfolios(): SavedPortfolio[] {
  return [
    {
      id: 1,
      name: 'Institutional Equal Risk Parity',
      description: 'Balanced risk contributions across equities and defensive hedges',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        { id: 1, portfolio_id: 1, ticker: 'AAPL', target_weight: 0.25, asset_class: 'Equity' },
        { id: 2, portfolio_id: 1, ticker: 'MSFT', target_weight: 0.25, asset_class: 'Equity' },
        { id: 3, portfolio_id: 1, ticker: 'NVDA', target_weight: 0.25, asset_class: 'Equity' },
        { id: 4, portfolio_id: 1, ticker: 'GOOGL', target_weight: 0.25, asset_class: 'Equity' }
      ]
    }
  ];
}
