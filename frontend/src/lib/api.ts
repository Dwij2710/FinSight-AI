import {
  ForecastData,
  PortfolioData,
  SentimentData,
  TradeSignalData,
  RlSimulationData,
  TftData
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export async function checkBackendHealth(): Promise<{ online: boolean; latencyMs?: number }> {
  const start = Date.now();
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(3000)
    });
    if (res.ok) {
      return { online: true, latencyMs: Date.now() - start };
    }
    return { online: false };
  } catch {
    return { online: false };
  }
}

// ==================== FORECAST API ====================
export async function getForecast(params: {
  ticker: string;
  start_date?: string;
  end_date?: string;
  p?: number;
  d?: number;
  q?: number;
  sp?: number;
  sd?: number;
  sq?: number;
  seasonal_period?: number;
  forecast_period?: number;
  run_backtest?: boolean;
}): Promise<{ data: ForecastData; isDemo?: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(20000)
    });

    const json = await res.json();
    if (json.success && json.data) {
      return { data: json.data, isDemo: false };
    }
    throw new Error(json.message || 'Forecast calculation failed');
  } catch (err) {
    console.warn('Backend unavailable, using realistic simulation data:', err);
    return { data: generateMockForecast(params.ticker || 'AAPL', params.forecast_period || 14), isDemo: true };
  }
}

// ==================== PORTFOLIO API ====================
export async function getPortfolioOptimization(params: {
  tickers: string[];
  start_date?: string;
  end_date?: string;
}): Promise<{ data: PortfolioData; isDemo?: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/portfolio/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(25000)
    });

    const json = await res.json();
    if (json.success && json.data) {
      return { data: json.data, isDemo: false };
    }
    throw new Error(json.message || 'Portfolio optimization failed');
  } catch (err) {
    console.warn('Backend unavailable, using mock portfolio data:', err);
    return { data: generateMockPortfolio(params.tickers), isDemo: true };
  }
}

// ==================== AI INSIGHTS API ====================
export async function getNewsSentiment(ticker: string): Promise<{ data: SentimentData; isDemo?: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/ai/sentiment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker }),
      signal: AbortSignal.timeout(15000)
    });

    const json = await res.json();
    if (json.success && json.data) {
      return { data: json.data, isDemo: false };
    }
    throw new Error(json.message || 'Sentiment analysis failed');
  } catch (err) {
    console.warn('Backend unavailable, using mock sentiment:', err);
    return { data: generateMockSentiment(ticker), isDemo: true };
  }
}

export async function getTradeSignal(ticker: string): Promise<{ data: TradeSignalData; isDemo?: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/ai/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker }),
      signal: AbortSignal.timeout(15000)
    });

    const json = await res.json();
    if (json.success && json.data) {
      return { data: json.data, isDemo: false };
    }
    throw new Error(json.message || 'Signal prediction failed');
  } catch (err) {
    console.warn('Backend unavailable, using mock signal:', err);
    return { data: generateMockSignal(ticker), isDemo: true };
  }
}

// ==================== RL AGENT API ====================
export async function simulateRlAgent(params: {
  ticker: string;
  initial_balance?: number;
  algo_type?: string;
  action_type?: string;
  risk_profile?: string;
  timesteps?: number;
}): Promise<{ data: RlSimulationData; isDemo?: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/rl/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(25000)
    });

    const json = await res.json();
    if (json.success && json.data) {
      return { data: json.data, isDemo: false };
    }
    throw new Error(json.message || 'RL simulation failed');
  } catch (err) {
    console.warn('Backend unavailable, using mock RL trajectory:', err);
    return { data: generateMockRl(params), isDemo: true };
  }
}

// ==================== TFT MULTI-VARIATE API ====================
export async function analyzeTft(ticker: string): Promise<{ data: TftData; isDemo?: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/tft/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker }),
      signal: AbortSignal.timeout(20000)
    });

    const json = await res.json();
    if (json.success && json.data) {
      return { data: json.data, isDemo: false };
    }
    throw new Error(json.message || 'TFT analysis failed');
  } catch (err) {
    console.warn('Backend unavailable, using mock TFT:', err);
    return { data: generateMockTft(ticker), isDemo: true };
  }
}

// ==================== REALISTIC MOCK GENERATORS ====================
function generateMockForecast(ticker: string, periods: number): ForecastData {
  const basePrice = ticker.includes('.NS') ? 2450.0 : 185.0;
  const history = [];
  const now = new Date();
  
  let p = basePrice;
  for (let i = 120; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    p += (Math.random() - 0.48) * (basePrice * 0.02);
    const fit = p + (Math.random() - 0.5) * (basePrice * 0.008);
    history.push({
      date: d.toISOString().split('T')[0],
      actual: Math.round(p * 100) / 100,
      fitted: Math.round(fit * 100) / 100
    });
  }

  const predictions = [];
  let predP = history[history.length - 1].actual || basePrice;
  for (let j = 1; j <= periods; j++) {
    const fd = new Date(now.getTime() + j * 24 * 60 * 60 * 1000);
    predP += (Math.random() - 0.46) * (basePrice * 0.015);
    const spread = (basePrice * 0.01) * Math.sqrt(j);
    predictions.push({
      date: fd.toISOString().split('T')[0],
      predicted_mean: Math.round(predP * 100) / 100,
      lower_bound: Math.round((predP - spread) * 100) / 100,
      upper_bound: Math.round((predP + spread) * 100) / 100
    });
  }

  return {
    ticker,
    column: 'Close',
    metrics: { rmse: 3.42, mape: 1.84, accuracy: 98.16 },
    adf_test: { test_statistic: -3.84, p_value: 0.0025, is_stationary: true },
    history,
    predictions,
    decomposition: {
      dates: history.map(h => h.date),
      trend: history.map((h, i) => Math.round((basePrice + i * 0.15) * 100) / 100),
      seasonal: history.map((_, i) => Math.round(Math.sin(i / 3) * 2.5 * 100) / 100),
      resid: history.map(() => Math.round((Math.random() - 0.5) * 1.8 * 100) / 100)
    },
    backtest: {
      dates: history.slice(-30).map(h => h.date),
      actual: history.slice(-30).map(h => h.actual || 0),
      predicted: history.slice(-30).map(h => (h.actual || 0) + (Math.random() - 0.5) * 4),
      rmse: 4.12,
      mape: 2.15,
      accuracy: 97.85
    }
  };
}

function generateMockPortfolio(tickers: string[]): PortfolioData {
  const valid = tickers.length > 0 ? tickers : ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS'];
  const n = valid.length;
  const weightsSharpe: Record<string, number> = {};
  const weightsVol: Record<string, number> = {};

  let remSharpe = 100;
  let remVol = 100;
  valid.forEach((t, idx) => {
    if (idx === n - 1) {
      weightsSharpe[t] = Math.round(remSharpe * 10) / 10;
      weightsVol[t] = Math.round(remVol * 10) / 10;
    } else {
      const s = Math.round((100 / n + (Math.random() - 0.5) * 15) * 10) / 10;
      const v = Math.round((100 / n + (Math.random() - 0.5) * 8) * 10) / 10;
      weightsSharpe[t] = s;
      weightsVol[t] = v;
      remSharpe -= s;
      remVol -= v;
    }
  });

  const matrix: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) row.push(1.0);
      else row.push(Math.round((0.25 + Math.random() * 0.45) * 100) / 100);
    }
    matrix.push(row);
  }

  const efVol: number[] = [];
  const efRet: number[] = [];
  for (let i = 0; i < 25; i++) {
    const vol = 12 + i * 0.8;
    const ret = 14 + Math.sqrt(i) * 3.8;
    efVol.push(Math.round(vol * 10) / 10);
    efRet.push(Math.round(ret * 10) / 10);
  }

  return {
    valid_tickers: valid,
    invalid_tickers: [],
    correlation_matrix: { tickers: valid, values: matrix },
    max_sharpe: { return: 24.8, volatility: 15.6, sharpe_ratio: 1.589, weights: weightsSharpe },
    min_volatility: { return: 16.4, volatility: 11.2, sharpe_ratio: 1.464, weights: weightsVol },
    efficient_frontier: { volatility: efVol, return: efRet },
    random_portfolios: {
      volatility: Array.from({ length: 60 }, () => Math.round((12 + Math.random() * 18) * 10) / 10),
      return: Array.from({ length: 60 }, () => Math.round((10 + Math.random() * 22) * 10) / 10),
      sharpe: Array.from({ length: 60 }, () => Math.round((0.8 + Math.random() * 0.9) * 100) / 100)
    },
    cumulative_growth: {
      dates: Array.from({ length: 24 }, (_, i) => `Month ${i + 1}`),
      series: {
        benchmark: Array.from({ length: 24 }, (_, i) => Math.round((1 + i * 0.012 + Math.sin(i / 2) * 0.04) * 1000) / 1000),
        'Max Sharpe Portfolio': Array.from({ length: 24 }, (_, i) => Math.round((1 + i * 0.021 + Math.sin(i / 2) * 0.03) * 1000) / 1000)
      }
    },
    risk_metrics: {
      beta: 0.92,
      max_drawdown_pct: 12.4,
      drawdown_history: Array.from({ length: 30 }, (_, i) => ({
        date: `2024-0${Math.floor(i / 10) + 1}-${(i % 10) * 3 + 1}`,
        drawdown: -Math.abs(Math.sin(i / 4) * 12.4)
      }))
    },
    stress_tests: [
      { scenario: 'Market Crash -10%', market_drop_pct: -10, estimated_portfolio_impact_pct: -9.2 },
      { scenario: 'Market Crash -20%', market_drop_pct: -20, estimated_portfolio_impact_pct: -18.4 },
      { scenario: 'Market Crash -30%', market_drop_pct: -30, estimated_portfolio_impact_pct: -27.6 },
      { scenario: 'Market Crash -50%', market_drop_pct: -50, estimated_portfolio_impact_pct: -46.0 }
    ]
  };
}

function generateMockSentiment(ticker: string): SentimentData {
  return {
    ticker,
    model_used: 'FinBERT (Transformer)',
    overall_score: 0.42,
    overall_label: 'Positive',
    counts: { Positive: 6, Neutral: 3, Negative: 1 },
    articles: [
      { Title: `${ticker} surges past analyst estimates following quarterly earnings beat`, Publisher: 'Bloomberg', Sentiment: 'Positive', 'Sentiment Score': 0.88, Link: '#' },
      { Title: `Wall Street raises price target on strong cloud and enterprise momentum`, Publisher: 'Reuters', Sentiment: 'Positive', 'Sentiment Score': 0.74, Link: '#' },
      { Title: `${ticker} expands strategic partnership with leading technology consortium`, Publisher: 'CNBC', Sentiment: 'Positive', 'Sentiment Score': 0.55, Link: '#' },
      { Title: `Market balances macroeconomic rate expectations against tech valuations`, Publisher: 'Financial Times', Sentiment: 'Neutral', 'Sentiment Score': 0.05, Link: '#' },
      { Title: `Minor regulatory scrutiny noted in cross-border European market filing`, Publisher: 'WSJ', Sentiment: 'Negative', 'Sentiment Score': -0.35, Link: '#' }
    ]
  };
}

function generateMockSignal(ticker: string): TradeSignalData {
  return {
    ticker,
    signal: 'Bullish (Buy) 🚀',
    confidence_pct: 78.4,
    accuracy_pct: 72.1,
    is_strong: true,
    feature_importance: [
      { feature: 'RSI (14-day)', importance: 34.2 },
      { feature: 'SMA_20 Momentum', importance: 26.5 },
      { feature: 'Price Returns', importance: 18.7 },
      { feature: 'SMA_50 Trend', importance: 12.3 },
      { feature: 'Volatility Spread', importance: 8.3 }
    ],
    technical_indicators: {
      rsi: 58.4,
      sma_20: 182.5,
      sma_50: 176.2
    }
  };
}

function generateMockRl(params: { ticker?: string; initial_balance?: number }): RlSimulationData {
  const init = params.initial_balance || 10000;
  const history = [];
  let agentNw = init;
  let benchNw = init;

  for (let i = 0; i < 90; i++) {
    const marketMove = (Math.random() - 0.47) * 0.02;
    benchNw *= (1 + marketMove);
    
    // Agent outperformance simulation
    const agentAlpha = marketMove > 0 ? marketMove * 1.2 : marketMove * 0.6;
    agentNw *= (1 + agentAlpha);

    const action = marketMove > 0.01 ? 'Buy 75%' : (marketMove < -0.01 ? 'Trim 40%' : 'Hold');
    history.push({
      date: `Day ${i + 1}`,
      price: Math.round(180 * (benchNw / init) * 100) / 100,
      agent_net_worth: Math.round(agentNw * 100) / 100,
      benchmark_net_worth: Math.round(benchNw * 100) / 100,
      action
    });
  }

  const finalBal = history[history.length - 1].agent_net_worth;
  const profit = finalBal - init;

  return {
    ticker: params.ticker || 'AAPL',
    algo_type: 'PPO',
    action_type: 'Continuous',
    risk_profile: 'Aggressive',
    engine: 'Stable-Baselines3 (Deep RL Agent)',
    initial_balance: init,
    final_balance: finalBal,
    profit: Math.round(profit * 100) / 100,
    profit_pct: Math.round((profit / init) * 1000) / 10,
    benchmark_profit_pct: Math.round(((benchNw - init) / init) * 1000) / 10,
    max_drawdown_pct: 7.8,
    win_rate_pct: 68.5,
    total_trades: 42,
    history
  };
}

function generateMockTft(ticker: string): TftData {
  return {
    ticker,
    current_price: 189.45,
    sp500_price: 5240.2,
    vix: 14.8,
    regime: 'Bull Market 📈',
    regime_desc: 'Optimistic macro sentiment, low market volatility, sustained expansion.',
    attention_weights: [
      { factor: 'Overall Market (S&P 500)', weight_pct: 32.4 },
      { factor: 'Price Trend & Momentum', weight_pct: 28.1 },
      { factor: 'Interest Rates (10Y Yield)', weight_pct: 16.5 },
      { factor: 'Fear Index (VIX)', weight_pct: 12.2 },
      { factor: 'US Dollar Strength', weight_pct: 6.5 },
      { factor: 'Crude Oil & Energy', weight_pct: 4.3 }
    ],
    anomaly_analysis: {
      is_anomaly: false,
      risk_score: 22.4,
      message: 'NORMAL: Macro conditions stable. No structural black-swan deviation detected.'
    },
    lookalike: {
      matched_date: 'November 14, 2023',
      similarity: 92.4,
      future_return: 8.6
    },
    probabilistic_forecast: {
      predicted: 194.2,
      lower: 186.5,
      upper: 201.8,
      confidence: 94
    },
    scenarios: [
      { scenario: 'Interest Rate Spike (+50bps)', projected_price: 184.2, impact_pct: -2.8 },
      { scenario: 'Market Crash (S&P -10%)', projected_price: 168.5, impact_pct: -11.1 },
      { scenario: 'Oil Supply Shock (+20%)', projected_price: 186.1, impact_pct: -1.8 },
      { scenario: 'Bull Market Expansion', projected_price: 198.6, impact_pct: 4.8 }
    ],
    macro_correlations: [
      { indicator: 'S&P 500', correlation: 0.84, latest_value: 5240.2 },
      { indicator: 'VIX', correlation: -0.62, latest_value: 14.8 },
      { indicator: 'Interest Rate (10Y)', correlation: -0.38, latest_value: 4.22 },
      { indicator: 'Gold', correlation: 0.28, latest_value: 2340.5 },
      { indicator: 'Crude Oil', correlation: 0.15, latest_value: 78.4 }
    ]
  };
}
