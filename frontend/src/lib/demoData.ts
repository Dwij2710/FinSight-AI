// Ticker-Aware Deterministic Simulation Engine for FinSight AI
// Provides realistic, mathematically consistent quantitative analytics for offline Sandbox Mode.
// Isolated completely behind isExplicitDemoMode() toggle.

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

// ==================== DETERMINISTIC PRNG UTILITIES ====================
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function createRng(seed: number) {
  let s = seed;
  return function () {
    s |= 0;
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CANONICAL_BASE_PRICES: Record<string, number> = {
  'AAPL': 224.50,
  'NVDA': 118.20,
  'MSFT': 428.50,
  'TSLA': 215.30,
  'RELIANCE.NS': 2950.00,
  'TCS.NS': 4220.00,
  'SPY': 545.00,
  'QQQ': 468.00,
  'GOOGL': 168.00,
  'AMZN': 178.00,
  'META': 505.00
};

export function getDemoTickerBasePrice(ticker: string): number {
  const sym = ticker.toUpperCase().trim();
  if (CANONICAL_BASE_PRICES[sym]) return CANONICAL_BASE_PRICES[sym];
  const h = hashString(sym);
  return Number((45 + (h % 350) + (h % 100) * 0.01).toFixed(2));
}

// ==================== FORECAST DEMO ====================
export function generateDemoForecast(ticker: string): ForecastData {
  const sym = ticker.toUpperCase().trim() || 'AAPL';
  const seed = hashString(sym + '_forecast');
  const rand = createRng(seed);

  const basePrice = getDemoTickerBasePrice(sym);
  const history: { date: string; actual: number; fitted: number }[] = [];
  const predictions: { date: string; predicted_mean: number; lower_bound: number; upper_bound: number }[] = [];

  const now = new Date();
  let price = basePrice * (0.85 + rand() * 0.1);
  const pricesList: number[] = [];

  for (let i = 120; i >= 1; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const stepDrift = (rand() - 0.48) * (basePrice * 0.018) + Math.sin(i * 0.08) * (basePrice * 0.006);
    price = Math.max(5.0, price + stepDrift);
    pricesList.push(price);

    history.push({
      date: d.toISOString().slice(0, 10),
      actual: Number(price.toFixed(2)),
      fitted: Number((price + (rand() - 0.5) * (basePrice * 0.005)).toFixed(2))
    });
  }

  // Generate 14-day future predictions
  let lastPrice = price;
  const driftDirection = (rand() > 0.4 ? 1 : -1) * (basePrice * 0.004);

  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i + 1);
    lastPrice += driftDirection + (rand() - 0.48) * (basePrice * 0.01);
    const band = (basePrice * 0.02) + i * (basePrice * 0.003);
    predictions.push({
      date: d.toISOString().slice(0, 10),
      predicted_mean: Number(lastPrice.toFixed(2)),
      lower_bound: Number((lastPrice - band).toFixed(2)),
      upper_bound: Number((lastPrice + band).toFixed(2))
    });
  }

  // Synthetic Seasonal Decomposition
  const dates = history.map(h => h.date);
  const trend: (number | null)[] = [];
  const seasonal: (number | null)[] = [];
  const resid: (number | null)[] = [];

  const windowSize = 12;
  for (let i = 0; i < pricesList.length; i++) {
    if (i < windowSize / 2 || i >= pricesList.length - windowSize / 2) {
      trend.push(null);
    } else {
      let sum = 0;
      for (let j = i - Math.floor(windowSize / 2); j <= i + Math.floor(windowSize / 2); j++) {
        sum += pricesList[j];
      }
      trend.push(Number((sum / (windowSize + 1)).toFixed(2)));
    }

    const seasonVal = Math.sin((i % windowSize) * ((2 * Math.PI) / windowSize)) * (basePrice * 0.015);
    seasonal.push(Number(seasonVal.toFixed(2)));

    const t = trend[i];
    if (t !== null) {
      resid.push(Number((pricesList[i] - t - seasonVal).toFixed(2)));
    } else {
      resid.push(null);
    }
  }

  // Synthetic Hold-Out Backtest
  const holdoutLen = 20;
  const backtestDates = dates.slice(-holdoutLen);
  const actualHoldout = pricesList.slice(-holdoutLen).map(p => Number(p.toFixed(2)));
  const predictedHoldout = actualHoldout.map(p => Number((p + (rand() - 0.49) * (basePrice * 0.012)).toFixed(2)));

  const rmse = Number((basePrice * (0.008 + rand() * 0.008)).toFixed(2));
  const mape = Number((0.85 + rand() * 0.9).toFixed(2));
  const accuracy = Number((100 - mape).toFixed(2));

  return {
    ticker: sym,
    column: 'Close',
    data_source: 'simulated',
    fetched_at: new Date().toISOString(),
    metrics: {
      rmse,
      mape,
      accuracy
    },
    adf_test: {
      test_statistic: Number((-2.8 - rand() * 2.2).toFixed(2)),
      p_value: Number((0.001 + rand() * 0.02).toFixed(4)),
      is_stationary: true
    },
    history,
    predictions,
    decomposition: {
      dates,
      trend,
      seasonal,
      resid
    },
    backtest: {
      dates: backtestDates,
      actual: actualHoldout,
      predicted: predictedHoldout,
      rmse,
      mape,
      accuracy
    },
    summary: `Sandbox Simulation for ${sym}: Deterministic SARIMAX(2,1,2) with ADF stationarity validation and holdout backtest.`
  };
}

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
    const seed = hashString(t);
    const sw = 1.0 + Math.sin(idx * 1.5 + (seed % 10) * 0.2) * 0.4;
    const vw = 1.0 + Math.cos(idx * 1.2 + (seed % 10) * 0.3) * 0.3;
    sharpeWeights[t] = sw;
    volWeights[t] = vw;
    parityWeights[t] = equalWeight * 100;
    sumSharpe += sw;
    sumVol += vw;
  });

  valid.forEach(t => {
    // Return weights as scaled percentages [0.0 - 100.0] matching live backend
    sharpeWeights[t] = Number(((sharpeWeights[t] / sumSharpe) * 100).toFixed(1));
    volWeights[t] = Number(((volWeights[t] / sumVol) * 100).toFixed(1));
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
    const v = (0.12 + (i / 30) * 0.22) * 100;
    const r = (0.08 + Math.sqrt(i / 30) * 0.24) * 100;
    frontierVol.push(Number(v.toFixed(2)));
    frontierRet.push(Number(r.toFixed(2)));
  }

  const randVol: number[] = [];
  const randRet: number[] = [];
  const randSharpe: number[] = [];
  const rand = createRng(hashString(valid.join('_')));
  for (let i = 0; i < 200; i++) {
    const v = (0.13 + rand() * 0.19) * 100;
    const r = (0.06 + rand() * 0.24) * 100;
    const s = (r - 5.0) / v;
    randVol.push(Number(v.toFixed(2)));
    randRet.push(Number(r.toFixed(2)));
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

    ms *= 1 + (0.0008 + (Math.sin(i * 0.2) * 0.012) + (rand() - 0.48) * 0.01);
    mv *= 1 + (0.0005 + (Math.sin(i * 0.15) * 0.007) + (rand() - 0.49) * 0.006);
    rp *= 1 + (0.0006 + (Math.sin(i * 0.18) * 0.009) + (rand() - 0.48) * 0.008);
    bm *= 1 + (0.0004 + (Math.sin(i * 0.1) * 0.01) + (rand() - 0.5) * 0.012);

    series['Max Sharpe'].push(Number(ms.toFixed(2)));
    series['Min Volatility'].push(Number(mv.toFixed(2)));
    series['Equal Risk Parity'].push(Number(rp.toFixed(2)));
    series['Benchmark'].push(Number(bm.toFixed(2)));
  }

  const calculatedBeta = Number((0.75 + (hashString(valid.join('')) % 50) / 100).toFixed(2));

  return {
    valid_tickers: valid,
    invalid_tickers: [],
    data_source: 'simulated',
    fetched_at: new Date().toISOString(),
    correlation_matrix: {
      tickers: valid,
      values: matrixValues
    },
    max_sharpe: {
      return: 23.8,
      volatility: 14.2,
      sharpe_ratio: 1.68,
      weights: sharpeWeights
    },
    min_volatility: {
      return: 16.4,
      volatility: 11.1,
      sharpe_ratio: 1.48,
      weights: volWeights
    },
    risk_parity: {
      return: 19.2,
      volatility: 12.2,
      sharpe_ratio: 1.57,
      weights: parityWeights
    },
    benchmark_info: {
      ticker: '^GSPC',
      name: 'S&P 500 Benchmark',
      risk_free_rate_pct: 4.5
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
      beta: calculatedBeta,
      max_drawdown_pct: -9.4,
      drawdown_history: dates.slice(-60).map((d, idx) => ({
        date: d,
        drawdown: Number((-Math.abs(Math.sin(idx * 0.25) * 8.5)).toFixed(2))
      }))
    },
    stress_tests: [
      { scenario: '2008 Financial Crisis', market_drop_pct: -38.5, estimated_portfolio_impact_pct: Number((-38.5 * calculatedBeta).toFixed(1)) },
      { scenario: '2020 COVID Shock', market_drop_pct: -33.9, estimated_portfolio_impact_pct: Number((-33.9 * calculatedBeta).toFixed(1)) },
      { scenario: '2022 Inflation Surge', market_drop_pct: -25.4, estimated_portfolio_impact_pct: Number((-25.4 * calculatedBeta).toFixed(1)) }
    ]
  };
}

// ==================== AI INSIGHTS DEMO ====================
export function generateDemoSentiment(ticker: string): SentimentData {
  const sym = ticker.toUpperCase().trim() || 'AAPL';
  const seed = hashString(sym + '_sentiment');
  const rand = createRng(seed);

  const mode = seed % 3; // 0: Bullish, 1: Moderate/Neutral, 2: Bearish
  let overallScore = 0;
  let overallLabel: 'Positive' | 'Neutral' | 'Negative' = 'Positive';
  let posCount = 6;
  let neuCount = 3;
  let negCount = 1;

  if (mode === 0) {
    overallScore = Number((0.62 + rand() * 0.25).toFixed(2));
    overallLabel = 'Positive';
    posCount = 7 + Math.floor(rand() * 3);
    neuCount = 2;
    negCount = 1;
  } else if (mode === 1) {
    overallScore = Number((0.05 + (rand() - 0.5) * 0.2).toFixed(2));
    overallLabel = 'Neutral';
    posCount = 3;
    neuCount = 6;
    negCount = 2;
  } else {
    overallScore = Number((-0.35 - rand() * 0.35).toFixed(2));
    overallLabel = 'Negative';
    posCount = 1;
    neuCount = 3;
    negCount = 6;
  }

  const newsPool: { title: string; publisher: string; sentiment: 'Positive' | 'Negative' | 'Neutral'; score: number }[] = [
    { title: `${sym} Expands Enterprise Cloud & AI Infrastructure with Record Margin Growth`, publisher: 'Bloomberg Financial', sentiment: 'Positive', score: 0.82 },
    { title: `Institutional Outflows Stabilize as ${sym} Rebalances Capital Allocation`, publisher: 'Reuters Markets', sentiment: 'Neutral', score: 0.15 },
    { title: `Analyst Consensus Upgrades Fiscal Year Growth Outlook for ${sym}`, publisher: 'Wall Street Journal', sentiment: 'Positive', score: 0.76 },
    { title: `Supply Chain Diversification Strategy Mitigates Component Lead Times for ${sym}`, publisher: 'Financial Times', sentiment: 'Positive', score: 0.65 },
    { title: `Macro Inflation & Currency Exposure Prompts Hedging Program at ${sym}`, publisher: 'Barron\'s Capital', sentiment: 'Negative', score: -0.45 },
    { title: `Options Volume Implies Range-Bound Volatility Ahead of Quarterly Release`, publisher: 'MarketWatch Quant', sentiment: 'Neutral', score: 0.05 }
  ];

  const articles = newsPool.slice(0, 4).map(item => ({
    Title: item.title,
    Publisher: item.publisher,
    Sentiment: item.sentiment,
    'Sentiment Score': item.score,
    Link: `https://finance.yahoo.com/quote/${sym}/news`
  }));

  return {
    ticker: sym,
    model_used: 'FinBERT Institutional NLP Sentiment Classifier (Sandbox Seeded)',
    data_source: 'simulated',
    fetched_at: new Date().toISOString(),
    overall_score: overallScore,
    overall_label: overallLabel,
    counts: {
      Positive: posCount,
      Neutral: neuCount,
      Negative: negCount
    },
    articles
  };
}

export function generateDemoSignal(ticker: string): TradeSignalData {
  const sym = ticker.toUpperCase().trim() || 'AAPL';
  const seed = hashString(sym + '_signal');
  const rand = createRng(seed);

  const signalType = seed % 4;
  let signal = 'Strong Buy';
  let conf = 85.0;
  let rsi = 62.0;

  if (signalType === 0) {
    signal = 'Strong Buy';
    conf = Number((82 + rand() * 12).toFixed(1));
    rsi = Number((60 + rand() * 10).toFixed(1));
  } else if (signalType === 1) {
    signal = 'Moderate Buy';
    conf = Number((68 + rand() * 10).toFixed(1));
    rsi = Number((54 + rand() * 8).toFixed(1));
  } else if (signalType === 2) {
    signal = 'Neutral / Hold';
    conf = Number((52 + rand() * 10).toFixed(1));
    rsi = Number((46 + rand() * 8).toFixed(1));
  } else {
    signal = 'Risk Off / Trim';
    conf = Number((65 + rand() * 15).toFixed(1));
    rsi = Number((34 + rand() * 10).toFixed(1));
  }

  const basePrice = getDemoTickerBasePrice(sym);

  return {
    ticker: sym,
    signal,
    confidence_pct: conf,
    accuracy_pct: Number((78.0 + rand() * 10).toFixed(1)),
    is_strong: conf > 75,
    data_source: 'simulated',
    fetched_at: new Date().toISOString(),
    feature_importance: [
      { feature: 'RSI Momentum (14D)', importance: Number((30 + rand() * 10).toFixed(1)) },
      { feature: 'MACD Divergence Histogram', importance: Number((24 + rand() * 8).toFixed(1)) },
      { feature: '20-Day SMA Mean-Reversion', importance: Number((20 + rand() * 6).toFixed(1)) },
      { feature: 'Bollinger %B Volatility Band', importance: Number((14 + rand() * 6).toFixed(1)) }
    ],
    technical_indicators: {
      rsi,
      sma_20: Number((basePrice * 0.99).toFixed(2)),
      sma_50: Number((basePrice * 0.96).toFixed(2))
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
  const seed = hashString(sym + '_rl_' + algoType);
  const rand = createRng(seed);

  const basePrice = getDemoTickerBasePrice(sym);
  const history = [];
  const now = new Date();

  let agentBalance = initialBalance;
  let benchmarkBalance = initialBalance;
  let price = basePrice;

  for (let i = 50; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    const priceChange = (rand() - 0.47) * (basePrice * 0.025);
    price = Math.max(5, price + priceChange);

    const agentAlpha = 0.0025 + (rand() - 0.44) * 0.015;
    agentBalance *= 1 + agentAlpha;
    benchmarkBalance *= 1 + (priceChange / price);

    const actions = ['BUY', 'HOLD', 'HOLD', 'BUY', 'SELL', 'HOLD'];
    const act = actions[(i + (seed % 5)) % actions.length];

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
  const winRate = Number((58 + (seed % 25) + rand() * 8).toFixed(1));

  return {
    ticker: sym,
    algo_type: algoType,
    action_type: 'Continuous (Fractional Sizing)',
    risk_profile: 'Aggressive Alpha',
    engine: `${algoType} Actor-Critic Policy (Deterministic Sandbox)`,
    initial_balance: initialBalance,
    final_balance: Number(agentBalance.toFixed(2)),
    profit,
    profit_pct: profitPct,
    benchmark_profit_pct: benchProfitPct,
    max_drawdown_pct: Number((-5.2 - (seed % 6)).toFixed(1)),
    win_rate_pct: winRate,
    total_trades: 16 + (seed % 10),
    data_source: 'simulated',
    fetched_at: new Date().toISOString(),
    history
  };
}

// ==================== TFT DEMO ====================
export function generateDemoTft(ticker: string): TftData {
  const sym = ticker.toUpperCase().trim() || 'AAPL';
  const seed = hashString(sym + '_tft');
  const rand = createRng(seed);

  const basePrice = getDemoTickerBasePrice(sym);
  const now = new Date();
  const dates: string[] = [];
  const series: Record<string, number[]> = {
    [sym]: [],
    'S&P 500': [],
    '10Y Yield': [],
    'Crude Oil': [],
    'VIX': []
  };

  let p = basePrice;
  let sp = 5420;
  let yld = 4.18;
  let oil = 76.5;
  let vix = 13.5;

  for (let i = 60; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));

    p += (rand() - 0.47) * (basePrice * 0.015);
    sp += (rand() - 0.47) * 32;
    yld += (rand() - 0.5) * 0.04;
    oil += (rand() - 0.5) * 1.1;
    vix = Math.max(9, vix + (rand() - 0.5) * 0.7);

    series[sym].push(Number(p.toFixed(2)));
    series['S&P 500'].push(Number(sp.toFixed(2)));
    series['10Y Yield'].push(Number(yld.toFixed(2)));
    series['Crude Oil'].push(Number(oil.toFixed(2)));
    series['VIX'].push(Number(vix.toFixed(2)));
  }

  return {
    ticker: sym,
    current_price: basePrice,
    sp500_price: 5420.5,
    vix: 13.8,
    regime: 'Growth Expansion Regime',
    regime_desc: 'Accommodative multi-factor regime: low systemic volatility and resilient corporate credit margins.',
    data_source: 'simulated',
    fetched_at: new Date().toISOString(),
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
      predicted: Number((basePrice * 1.05).toFixed(2)),
      lower: Number((basePrice * 0.98).toFixed(2)),
      upper: Number((basePrice * 1.12).toFixed(2)),
      confidence: 90
    },
    scenarios: [
      { scenario: 'Macro Expansion (Soft Landing)', projected_price: Number((basePrice * 1.076).toFixed(2)), impact_pct: 7.6 },
      { scenario: 'Hawkish Fed Rate Hike (+50bps)', projected_price: Number((basePrice * 0.944).toFixed(2)), impact_pct: -5.6 },
      { scenario: 'Geopolitical Energy Surge (+15% Oil)', projected_price: Number((basePrice * 0.97).toFixed(2)), impact_pct: -3.0 }
    ],
    macro_correlations: [
      { indicator: 'S&P 500 Index', correlation: 0.84, latest_value: 5420.5 },
      { indicator: 'US 10-Year Treasury', correlation: -0.38, latest_value: 4.18 },
      { indicator: 'Crude Oil (WTI)', correlation: 0.16, latest_value: 76.5 },
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
        { id: 101, watchlist_id: 1, ticker: 'AAPL', notes: 'Core holding, services margin expansion', added_at: new Date().toISOString() },
        { id: 102, watchlist_id: 1, ticker: 'NVDA', notes: 'Data center GPU enterprise leadership', added_at: new Date().toISOString() },
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
      name: 'All-Weather Balanced',
      description: 'Diversified multi-asset portfolio with equities, bonds, and gold hedges.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        { id: 1, portfolio_id: 1, ticker: 'SPY', target_weight: 0.35, asset_class: 'Equity' },
        { id: 2, portfolio_id: 1, ticker: 'QQQ', target_weight: 0.25, asset_class: 'Equity' },
        { id: 3, portfolio_id: 1, ticker: 'TLT', target_weight: 0.25, asset_class: 'Fixed Income' },
        { id: 4, portfolio_id: 1, ticker: 'GLD', target_weight: 0.15, asset_class: 'Commodity' }
      ]
    },
    {
      id: 2,
      name: 'Tech Growth Titans',
      description: 'High-conviction AI & mega-cap technology balance.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        { id: 5, portfolio_id: 2, ticker: 'AAPL', target_weight: 0.25, asset_class: 'Equity' },
        { id: 6, portfolio_id: 2, ticker: 'NVDA', target_weight: 0.30, asset_class: 'Equity' },
        { id: 7, portfolio_id: 2, ticker: 'MSFT', target_weight: 0.25, asset_class: 'Equity' },
        { id: 8, portfolio_id: 2, ticker: 'GOOGL', target_weight: 0.20, asset_class: 'Equity' }
      ]
    }
  ];
}

