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
  SavedPortfolio,
  TickerHistoryData,
  TickerHistoryBar,
  FinSightScoreData,
  ModelComparisonData,
  FundamentalData,
  PaperPositionItem,
  PaperTradeItem,
  PaperAccountData,
  PaperOrderPayload,
  TickerSearchResult
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
  const capital = 100000;

  const buildDemoVaR = (volPct: number) => {
    const dailyVol = (volPct / 100) / Math.sqrt(252);
    const p95_1d = Number((1.6449 * dailyVol * 100).toFixed(2));
    const p99_1d = Number((2.3263 * dailyVol * 100).toFixed(2));
    const p95_10d = Number((p95_1d * Math.sqrt(10)).toFixed(2));
    const p99_10d = Number((p99_1d * Math.sqrt(10)).toFixed(2));

    const h95_1d = Number((p95_1d * 1.05).toFixed(2));
    const h99_1d = Number((p99_1d * 1.08).toFixed(2));
    const h95_10d = Number((h95_1d * Math.sqrt(10)).toFixed(2));
    const h99_10d = Number((h99_1d * Math.sqrt(10)).toFixed(2));

    const c95_1d = Number((h95_1d * 1.25).toFixed(2));
    const c99_1d = Number((h99_1d * 1.3).toFixed(2));
    const c95_10d = Number((c95_1d * Math.sqrt(10)).toFixed(2));
    const c99_10d = Number((c99_1d * Math.sqrt(10)).toFixed(2));

    return {
      confidence_levels: ['95%', '99%'],
      horizons: ['1-Day', '10-Day'],
      parametric_var: {
        var_95_1d_pct: p95_1d,
        var_99_1d_pct: p99_1d,
        var_95_10d_pct: p95_10d,
        var_99_10d_pct: p99_10d,
        var_95_1d_usd: Math.round(capital * (p95_1d / 100)),
        var_99_1d_usd: Math.round(capital * (p99_1d / 100)),
        var_95_10d_usd: Math.round(capital * (p95_10d / 100)),
        var_99_10d_usd: Math.round(capital * (p99_10d / 100)),
      },
      historical_var: {
        var_95_1d_pct: h95_1d,
        var_99_1d_pct: h99_1d,
        var_95_10d_pct: h95_10d,
        var_99_10d_pct: h99_10d,
        var_95_1d_usd: Math.round(capital * (h95_1d / 100)),
        var_99_1d_usd: Math.round(capital * (h99_1d / 100)),
        var_95_10d_usd: Math.round(capital * (h95_10d / 100)),
        var_99_10d_usd: Math.round(capital * (h99_10d / 100)),
      },
      cvar_expected_shortfall: {
        cvar_95_1d_pct: c95_1d,
        cvar_99_1d_pct: c99_1d,
        cvar_95_10d_pct: c95_10d,
        cvar_99_10d_pct: c99_10d,
        cvar_95_1d_usd: Math.round(capital * (c95_1d / 100)),
        cvar_99_1d_usd: Math.round(capital * (c99_1d / 100)),
        cvar_95_10d_usd: Math.round(capital * (c95_10d / 100)),
        cvar_99_10d_usd: Math.round(capital * (c99_10d / 100)),
      }
    };
  };

  const currentWeights: Record<string, number> = {};
  const currentPrices: Record<string, number> = {};
  valid.forEach(t => {
    currentWeights[t] = Number((100 / n).toFixed(1));
    currentPrices[t] = 100 + (hashString(t) % 250);
  });

  const buildRebalancePlan = (targetWeights: Record<string, number>) => {
    let buys = 0;
    let sells = 0;
    const orders = valid.map(sym => {
      const cPct = currentWeights[sym] || (100 / n);
      const tPct = targetWeights[sym] || 0;
      const price = currentPrices[sym] || 100;
      const cVal = capital * (cPct / 100);
      const tVal = capital * (tPct / 100);
      const deltaVal = tVal - cVal;
      const deltaShares = Math.round(deltaVal / price);
      let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      if (deltaVal > 25 && deltaShares > 0) {
        action = 'BUY';
        buys += deltaVal;
      } else if (deltaVal < -25 && deltaShares < 0) {
        action = 'SELL';
        sells += Math.abs(deltaVal);
      }
      return {
        ticker: sym,
        action,
        current_weight_pct: cPct,
        target_weight_pct: tPct,
        current_value: Math.round(cVal),
        target_value: Math.round(tVal),
        delta_value: Math.round(deltaVal),
        price,
        delta_shares: Math.abs(deltaShares)
      };
    });

    const turnover = (buys + sells) / 2;
    return {
      total_capital: capital,
      turnover_usd: Math.round(turnover),
      turnover_pct: Number(((turnover / capital) * 100).toFixed(1)),
      estimated_friction_usd: Number(((buys + sells) * 0.0007).toFixed(2)),
      orders
    };
  };

  const buildRiskContributions = (weights: Record<string, number>, portVol: number) => {
    const mrc: Record<string, number> = {};
    const prc: Record<string, number> = {};
    valid.forEach(t => {
      mrc[t] = Number(((portVol / 100) * (0.8 + (hashString(t) % 40) / 100)).toFixed(4));
      prc[t] = Number((100 / n).toFixed(2));
    });
    return {
      portfolio_volatility: portVol,
      marginal_risk_contributions: mrc,
      percentage_risk_contributions: prc
    };
  };

  return {
    valid_tickers: valid,
    invalid_tickers: [],
    data_source: 'simulated',
    fetched_at: new Date().toISOString(),
    initial_capital: capital,
    current_weights: currentWeights,
    current_prices: currentPrices,
    correlation_matrix: {
      tickers: valid,
      values: matrixValues
    },
    max_sharpe: {
      return: 23.8,
      volatility: 14.2,
      sharpe_ratio: 1.68,
      weights: sharpeWeights,
      var_metrics: buildDemoVaR(14.2),
      risk_contributions: buildRiskContributions(sharpeWeights, 14.2)
    },
    min_volatility: {
      return: 16.4,
      volatility: 11.1,
      sharpe_ratio: 1.48,
      weights: volWeights,
      var_metrics: buildDemoVaR(11.1),
      risk_contributions: buildRiskContributions(volWeights, 11.1)
    },
    risk_parity: {
      return: 19.2,
      volatility: 12.2,
      sharpe_ratio: 1.57,
      weights: parityWeights,
      var_metrics: buildDemoVaR(12.2),
      risk_contributions: buildRiskContributions(parityWeights, 12.2)
    },
    rebalance_plans: {
      max_sharpe: buildRebalancePlan(sharpeWeights),
      min_volatility: buildRebalancePlan(volWeights),
      risk_parity: buildRebalancePlan(parityWeights)
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

// ==================== TICKER HISTORY DEMO ====================
export function generateDemoTickerHistory(ticker: string, period: string = '1Y'): TickerHistoryData {
  const sym = ticker.toUpperCase().trim() || 'AAPL';
  const basePrice = getDemoTickerBasePrice(sym);
  const rng = createRng(hashString(sym + period));

  const barCountMap: Record<string, number> = {
    '1M': 22,
    '3M': 66,
    '6M': 130,
    '1Y': 252,
    '2Y': 504,
    '5Y': 1260
  };
  const count = barCountMap[period.toUpperCase()] || 252;

  let current = basePrice * 0.85;
  const bars: TickerHistoryBar[] = [];

  const now = new Date();
  const dates: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - Math.floor(i * (7 / 5)));
    dates.push(d.toISOString().slice(0, 10));
  }

  const closes: number[] = [];
  for (let i = 0; i < count; i++) {
    const dailyReturn = (rng() - 0.485) * 0.028;
    const open = current;
    current = Number((current * (1 + dailyReturn)).toFixed(2));
    const high = Number((Math.max(open, current) + rng() * current * 0.012).toFixed(2));
    const low = Number((Math.min(open, current) - rng() * current * 0.012).toFixed(2));
    const close = current;
    closes.push(close);
    const volume = Math.floor(25000000 + rng() * 50000000);

    const slice20 = closes.slice(Math.max(0, i - 19), i + 1);
    const sma20 = slice20.reduce((a, b) => a + b, 0) / slice20.length;
    const slice50 = closes.slice(Math.max(0, i - 49), i + 1);
    const sma50 = slice50.reduce((a, b) => a + b, 0) / slice50.length;
    const slice200 = closes.slice(Math.max(0, i - 199), i + 1);
    const sma200 = slice200.reduce((a, b) => a + b, 0) / slice200.length;

    const std20 = Math.sqrt(slice20.map(x => Math.pow(x - sma20, 2)).reduce((a, b) => a + b, 0) / slice20.length) || 1;
    const bbUpper = Number((sma20 + 2 * std20).toFixed(2));
    const bbLower = Number((sma20 - 2 * std20).toFixed(2));

    bars.push({
      date: dates[i],
      open,
      high,
      low,
      close,
      volume,
      sma_20: Number(sma20.toFixed(2)),
      sma_50: Number(sma50.toFixed(2)),
      sma_200: Number(sma200.toFixed(2)),
      ema_12: Number(sma20.toFixed(2)),
      ema_26: Number(sma50.toFixed(2)),
      rsi_14: Number((45 + rng() * 25).toFixed(1)),
      macd: Number(((rng() - 0.5) * 2).toFixed(2)),
      macd_signal: Number(((rng() - 0.5) * 1.5).toFixed(2)),
      macd_hist: Number(((rng() - 0.5) * 0.8).toFixed(2)),
      bb_upper: bbUpper,
      bb_middle: Number(sma20.toFixed(2)),
      bb_lower: bbLower,
      atr_14: Number((current * 0.015).toFixed(2))
    });
  }

  const lastClose = bars[bars.length - 1].close;
  const lastSma50 = bars[bars.length - 1].sma_50 || lastClose;
  const lastSma200 = bars[bars.length - 1].sma_200 || lastClose;

  return {
    ticker: sym,
    period: period.toUpperCase(),
    bars_count: bars.length,
    data_source: 'simulated',
    fetched_at: new Date().toISOString(),
    summary: {
      latest_price: lastClose,
      trend: lastClose >= lastSma50 && lastSma50 >= lastSma200 ? 'STRONG_BULLISH' : (lastClose >= lastSma50 ? 'MODERATE_BULLISH' : 'NEUTRAL'),
      rsi: bars[bars.length - 1].rsi_14 || 55,
      rsi_condition: 'NEUTRAL',
      macd: bars[bars.length - 1].macd || 0.5,
      macd_signal: bars[bars.length - 1].macd_signal || 0.3,
      macd_condition: 'BULLISH_CROSSOVER',
      sma_20: bars[bars.length - 1].sma_20 || lastClose,
      sma_50: lastSma50,
      sma_200: lastSma200,
      above_sma50: lastClose > lastSma50,
      above_sma200: lastClose > lastSma200,
      high_52w: Math.max(...bars.map(b => b.high)),
      low_52w: Math.min(...bars.map(b => b.low)),
      avg_volume_30d: Math.floor(bars.slice(-30).reduce((acc, b) => acc + b.volume, 0) / 30)
    },
    bars
  };
}

// ==================== FINSIGHT SCORE DEMO (SCORE-01) ====================
export function generateDemoFinSightScore(ticker: string): FinSightScoreData {
  const sym = ticker.toUpperCase().trim();
  const seed = hashString(sym);
  const rng = createRng(seed);

  const tech = Number((55 + rng() * 35).toFixed(1));
  const mom = Number((50 + rng() * 40).toFixed(1));
  const fund = Number((60 + rng() * 30).toFixed(1));
  const sent = Number((48 + rng() * 38).toFixed(1));
  const risk = Number((52 + rng() * 35).toFixed(1));

  const overall = Number((0.25 * tech + 0.20 * mom + 0.25 * fund + 0.15 * sent + 0.15 * risk).toFixed(1));

  let rating = "Neutral / Hold";
  let ratingCode = "HOLD";
  let ratingColor = "#94A3B8";

  if (overall >= 80.0) {
    rating = "Strong Buy";
    ratingCode = "STRONG_BUY";
    ratingColor = "#10B981";
  } else if (overall >= 65.0) {
    rating = "Buy";
    ratingCode = "BUY";
    ratingColor = "#00F2FE";
  } else if (overall >= 45.0) {
    rating = "Neutral / Hold";
    ratingCode = "HOLD";
    ratingColor = "#94A3B8";
  } else if (overall >= 30.0) {
    rating = "Underweight";
    ratingCode = "UNDERWEIGHT";
    ratingColor = "#F59E0B";
  } else {
    rating = "Strong Sell";
    ratingCode = "STRONG_SELL";
    ratingColor = "#F43F5E";
  }

  const basePrice = getDemoTickerBasePrice(sym);

  return {
    ticker: sym,
    overall_score: overall,
    rating,
    rating_code: ratingCode,
    rating_color: ratingColor,
    latest_price: basePrice,
    as_of_date: new Date().toISOString().split('T')[0],
    weights_used: {
      technical: 0.25,
      momentum: 0.20,
      fundamental: 0.25,
      sentiment: 0.15,
      risk: 0.15
    },
    subscores: {
      technical: tech,
      momentum: mom,
      fundamental: fund,
      sentiment: sent,
      risk: risk
    },
    top_positive_contributors: [
      {
        dimension: "Technical",
        factor: "Structural trendline: Trading comfortably above 50-day moving average",
        impact: 16.5
      },
      {
        dimension: "Fundamental",
        factor: "Resilient operating margins and conservative balance sheet leverage",
        impact: 14.2
      },
      {
        dimension: "Momentum",
        factor: "RSI and MACD technical setup in healthy expansion territory",
        impact: 12.0
      }
    ],
    top_negative_detractors: [
      {
        dimension: "Risk",
        factor: "Elevated systematic beta sensitivity to broad market pullbacks",
        impact: 11.5
      },
      {
        dimension: "Momentum",
        factor: "Short-term consolidation resistance near recent local highs",
        impact: 8.2
      }
    ],
    synthesis: `${sym} earns an institutional FinSight Score of ${overall}/100 (${rating}), driven by solid technical support (${tech}/100) and healthy fundamental quality (${fund}/100).`
  };
}

// ==================== MODEL COMPARISON DEMO (COMP-01) ====================
export function generateDemoModelComparison(
  ticker: string,
  horizon: number = 30,
  testDays: number = 60
): ModelComparisonData {
  const sym = ticker.toUpperCase().trim();
  const seed = hashString(sym);
  const rng = createRng(seed);

  const basePrice = getDemoTickerBasePrice(sym);
  const sarimaReturn = Number((2.5 + rng() * 4.0).toFixed(2));
  const sarimaTarget = Number((basePrice * (1 + sarimaReturn / 100)).toFixed(2));

  const qmlReturn = Number((2.0 + rng() * 3.8).toFixed(2));
  const qmlTarget = Number((basePrice * (1 + qmlReturn / 100)).toFixed(2));

  const rlReturn = Number((4.5 + rng() * 5.5).toFixed(2));
  const benchReturn = Number((3.0 + rng() * 4.0).toFixed(2));

  const today = new Date();
  const testEnd = today.toISOString().split('T')[0];
  const startDateObj = new Date(today.getTime() - testDays * 86400000);
  const testStart = startDateObj.toISOString().split('T')[0];

  return {
    ticker: sym,
    current_price: basePrice,
    as_of_date: testEnd,
    evaluation_window: {
      test_start_date: testStart,
      test_end_date: testEnd,
      test_days: testDays,
      forecast_horizon_days: horizon
    },
    consensus: {
      outlook: 'BULLISH',
      outlook_color: '#10B981',
      agreement_ratio: '3/3 Models',
      synthesis: `Consensus outlook is BULLISH for ${sym}. Over the ${testDays}-day out-of-sample window, SARIMAX projects +${sarimaReturn}% target price of $${sarimaTarget}, while Quantile Multi-Factor ML projects +${qmlReturn}% median shift to $${qmlTarget}. Deep RL Agent generated +${rlReturn}% out-of-sample return net of commissions and slippage.`
    },
    category_winners: {
      directional_accuracy: {
        winner: 'Quantile Multi-Factor ML',
        score: '68.5%',
        rationale: `Achieved highest out-of-sample directional hit rate of 68.5% over ${testDays}-day test window.`
      },
      risk_adjusted_performance: {
        winner: 'Reinforcement Learning Agent',
        score: 'Sharpe 1.84',
        rationale: `Delivered higher Sharpe Ratio (1.84 vs 1.25 benchmark) via active tactical volatility dampening.`
      },
      capital_preservation: {
        winner: 'Reinforcement Learning Agent',
        score: '-4.2% MDD',
        rationale: `Strict stop-loss allocation limited peak-to-trough drawdown to -4.2% (benchmark suffered -8.6%).`
      }
    },
    models: {
      sarimax: {
        name: 'SARIMAX Statistical Time Series',
        category: 'Autoregressive / Seasonality',
        direction: 'BULLISH',
        target_price: sarimaTarget,
        expected_return_pct: sarimaReturn,
        confidence_bands: {
          ci_80_lower: Number((sarimaTarget * 0.96).toFixed(2)),
          ci_80_upper: Number((sarimaTarget * 1.04).toFixed(2)),
          ci_95_lower: Number((sarimaTarget * 0.92).toFixed(2)),
          ci_95_upper: Number((sarimaTarget * 1.08).toFixed(2))
        },
        metrics: {
          rmse: Number((basePrice * 0.024).toFixed(2)),
          mae: Number((basePrice * 0.018).toFixed(2)),
          directional_accuracy_pct: 64.2
        },
        strengths: 'Superior modeling of mean-reversion, autocorrelation, and seasonal cycles.',
        limitations: 'Linear assumption can understate sudden non-linear structural shocks.'
      },
      quantile_ml: {
        name: 'Quantile Multi-Factor Gradient Boosting',
        category: 'Supervised Quantile Regression',
        direction: 'BULLISH',
        target_price: qmlTarget,
        expected_return_pct: qmlReturn,
        confidence_bands: {
          q10_lower: Number((qmlTarget * 0.94).toFixed(2)),
          q50_median: qmlTarget,
          q90_upper: Number((qmlTarget * 1.07).toFixed(2))
        },
        metrics: {
          rmse: Number((basePrice * 0.021).toFixed(2)),
          mae: Number((basePrice * 0.016).toFixed(2)),
          directional_accuracy_pct: 68.5
        },
        strengths: 'Captures asymmetric tail risk and non-linear multi-factor macro interactions.',
        limitations: 'Prone to lagging sudden macro policy shocks without live macro feeds.'
      },
      rl_agent: {
        name: 'Deep Reinforcement Learning (PPO Policy)',
        category: 'Dynamic Asset Allocation Policy',
        direction: 'BULLISH',
        current_action: 'BUY',
        target_allocation: '80% Equity / 20% Cash',
        out_of_sample_return_pct: rlReturn,
        benchmark_return_pct: benchReturn,
        metrics: {
          sharpe_ratio: 1.84,
          max_drawdown_pct: 4.2,
          win_rate_pct: 66.7,
          commission_drag_bps: 5,
          slippage_drag_bps: 2
        },
        strengths: 'Optimizes dynamic cash-hedging during high volatility regimes.',
        limitations: 'Transaction drag and whipsaw risk during low-volatility trendless chop.'
      }
    },
    benchmark: {
      name: 'Passive Buy & Hold Benchmark',
      return_pct: benchReturn,
      max_drawdown_pct: 8.6,
      sharpe_ratio: 1.25
    }
  };
}

// ==================== FUNDAMENTALS DEMO (FUND-01) ====================
export function generateDemoFundamentals(ticker: string): FundamentalData {
  const sym = ticker.toUpperCase().trim();
  const seed = hashString(sym);
  const rng = createRng(seed);

  const pe = Number((18 + rng() * 18).toFixed(1));
  const fwdPe = Number((pe * (0.85 + rng() * 0.15)).toFixed(1));
  const roe = Number((15 + rng() * 25).toFixed(1));
  const opMargin = Number((16 + rng() * 18).toFixed(1));
  const netMargin = Number((opMargin * (0.7 + rng() * 0.2)).toFixed(1));
  const de = Number((0.3 + rng() * 0.9).toFixed(2));
  const cr = Number((1.1 + rng() * 1.4).toFixed(2));
  const revGrowth = Number((6 + rng() * 18).toFixed(1));
  const earnGrowth = Number((8 + rng() * 22).toFixed(1));
  const divYield = Number((0.5 + rng() * 2.2).toFixed(2));

  const score = Math.round(55 + rng() * 35);
  let rating: 'Excellent' | 'Good' | 'Fair' | 'Weak' | 'Distressed' = 'Good';
  let color = '#00F2FE';
  if (score >= 80) { rating = 'Excellent'; color = '#10B981'; }
  else if (score >= 65) { rating = 'Good'; color = '#00F2FE'; }
  else if (score >= 45) { rating = 'Fair'; color = '#94A3B8'; }
  else { rating = 'Weak'; color = '#F59E0B'; }

  return {
    ticker: sym,
    company_name: `${sym} Corporation`,
    sector: 'Technology',
    industry: 'Consumer Electronics & Software',
    currency: 'USD',
    health_score: score,
    health_rating: rating,
    health_color: color,
    as_of_date: new Date().toISOString().split('T')[0],
    valuation: {
      trailing_pe: pe,
      forward_pe: fwdPe,
      peg_ratio: Number((1.2 + rng() * 1.1).toFixed(2)),
      price_to_sales: Number((4.5 + rng() * 3.5).toFixed(2)),
      price_to_book: Number((6.0 + rng() * 8.0).toFixed(2)),
      ev_to_ebitda: Number((14.0 + rng() * 10.0).toFixed(1)),
      market_cap_billions: Number((120 + rng() * 800).toFixed(1)),
      enterprise_value_billions: Number((130 + rng() * 820).toFixed(1)),
      benchmark_pe: 28.0,
      pe_status: pe < 25 ? 'Undervalued' : (pe > 35 ? 'Overvalued' : 'In-Line')
    },
    profitability: {
      return_on_equity_pct: roe,
      return_on_assets_pct: Number((roe * 0.45).toFixed(1)),
      operating_margin_pct: opMargin,
      net_profit_margin_pct: netMargin,
      gross_margin_pct: Number((opMargin + 20).toFixed(1)),
      benchmark_roe_pct: 22.0,
      roe_quality: roe >= 20 ? 'High' : 'Moderate'
    },
    solvency: {
      total_cash_billions: Number((15 + rng() * 45).toFixed(1)),
      total_debt_billions: Number((20 + rng() * 50).toFixed(1)),
      net_debt_billions: Number((5 + rng() * 15).toFixed(1)),
      debt_to_equity: de,
      current_ratio: cr,
      quick_ratio: Number((cr * 0.85).toFixed(2)),
      free_cash_flow_billions: Number((18 + rng() * 50).toFixed(1)),
      balance_sheet_strength: de <= 0.6 && cr >= 1.3 ? 'Fortress' : 'Adequate'
    },
    growth_and_dividends: {
      quarterly_revenue_growth_yoy_pct: revGrowth,
      quarterly_earnings_growth_yoy_pct: earnGrowth,
      dividend_yield_pct: divYield,
      payout_ratio_pct: Number((divYield * 15).toFixed(1))
    },
    synthesis: `${sym} Corporation holds a Fundamental Health Score of ${score}/100 (${rating}) in Technology. Trading at ${pe}x trailing P/E with operating margins of ${opMargin}% and Debt/Equity of ${de}x.`
  };
}

// ==================== PAPER TRADING DEMO (PAPER-01) ====================
let _demoPaperCash = 100000.0;
let _demoPaperPositions: PaperPositionItem[] = [
  {
    id: 1,
    ticker: 'AAPL',
    shares: 40,
    average_entry_price: 182.50,
    current_price: 189.25,
    market_value: 7570.0,
    unrealized_pnl: 270.0,
    unrealized_pnl_pct: 3.70
  },
  {
    id: 2,
    ticker: 'MSFT',
    shares: 25,
    average_entry_price: 415.00,
    current_price: 428.60,
    market_value: 10715.0,
    unrealized_pnl: 340.0,
    unrealized_pnl_pct: 3.28
  },
  {
    id: 3,
    ticker: 'NVDA',
    shares: 80,
    average_entry_price: 118.20,
    current_price: 124.50,
    market_value: 9960.0,
    unrealized_pnl: 504.0,
    unrealized_pnl_pct: 5.33
  }
];

let _demoPaperTrades: PaperTradeItem[] = [
  {
    id: 101,
    ticker: 'NVDA',
    action: 'BUY',
    order_type: 'MARKET',
    shares: 80,
    execution_price: 118.22,
    commission: 4.73,
    slippage: 1.89,
    realized_pnl: 0,
    executed_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 102,
    ticker: 'MSFT',
    action: 'BUY',
    order_type: 'MARKET',
    shares: 25,
    execution_price: 415.08,
    commission: 5.19,
    slippage: 2.08,
    realized_pnl: 0,
    executed_at: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: 103,
    ticker: 'AAPL',
    action: 'BUY',
    order_type: 'MARKET',
    shares: 40,
    execution_price: 182.54,
    commission: 3.65,
    slippage: 1.46,
    realized_pnl: 0,
    executed_at: new Date(Date.now() - 86400000 * 8).toISOString()
  }
];

export function generateDemoPaperAccount(): PaperAccountData {
  const posValue = _demoPaperPositions.reduce((acc, p) => acc + p.market_value, 0);
  const totalUnrealized = _demoPaperPositions.reduce((acc, p) => acc + p.unrealized_pnl, 0);
  const totalRealized = _demoPaperTrades.reduce((acc, t) => acc + t.realized_pnl, 0);
  const totalEquity = Math.round((_demoPaperCash + posValue) * 100) / 100;
  const totalPnl = Math.round((totalEquity - 100000.0) * 100) / 100;

  return {
    id: 999,
    cash_balance: Math.round(_demoPaperCash * 100) / 100,
    currency: 'USD',
    total_portfolio_value: totalEquity,
    positions_market_value: Math.round(posValue * 100) / 100,
    total_unrealized_pnl: Math.round(totalUnrealized * 100) / 100,
    total_realized_pnl: Math.round(totalRealized * 100) / 100,
    total_pnl: totalPnl,
    total_return_pct: Number(((totalPnl / 100000.0) * 100).toFixed(2)),
    positions: [..._demoPaperPositions],
    recent_trades: [..._demoPaperTrades]
  };
}

export function executeDemoPaperOrder(order: PaperOrderPayload): { trade: PaperTradeItem; account: PaperAccountData } {
  const sym = order.ticker.toUpperCase().trim();
  const basePrice = 100 + (hashString(sym) % 250);
  const slip = basePrice * 0.0002;
  const execPrice = order.action === 'BUY' ? basePrice + slip : basePrice - slip;
  const gross = order.shares * execPrice;
  const comm = Math.max(1.0, gross * 0.0005);

  let realizedPnl = 0;
  if (order.action === 'BUY') {
    _demoPaperCash -= (gross + comm);
    const existing = _demoPaperPositions.find(p => p.ticker === sym);
    if (existing) {
      const newShares = existing.shares + order.shares;
      existing.average_entry_price = Number(((existing.shares * existing.average_entry_price + order.shares * execPrice) / newShares).toFixed(2));
      existing.shares = newShares;
      existing.market_value = Number((newShares * basePrice).toFixed(2));
      existing.unrealized_pnl = Number((existing.market_value - newShares * existing.average_entry_price).toFixed(2));
      existing.unrealized_pnl_pct = Number(((existing.unrealized_pnl / (newShares * existing.average_entry_price)) * 100).toFixed(2));
    } else {
      _demoPaperPositions.push({
        id: Date.now(),
        ticker: sym,
        shares: order.shares,
        average_entry_price: Number(execPrice.toFixed(2)),
        current_price: Number(basePrice.toFixed(2)),
        market_value: Number((order.shares * basePrice).toFixed(2)),
        unrealized_pnl: 0,
        unrealized_pnl_pct: 0
      });
    }
  } else {
    const existing = _demoPaperPositions.find(p => p.ticker === sym);
    const entryPrice = existing ? existing.average_entry_price : basePrice;
    realizedPnl = Number(((execPrice - entryPrice) * order.shares - comm).toFixed(2));
    _demoPaperCash += (gross - comm);
    if (existing) {
      existing.shares -= order.shares;
      if (existing.shares <= 0) {
        _demoPaperPositions = _demoPaperPositions.filter(p => p.ticker !== sym);
      } else {
        existing.market_value = Number((existing.shares * basePrice).toFixed(2));
        existing.unrealized_pnl = Number((existing.market_value - existing.shares * existing.average_entry_price).toFixed(2));
      }
    }
  }

  const trade: PaperTradeItem = {
    id: Date.now(),
    ticker: sym,
    action: order.action,
    order_type: order.order_type || 'MARKET',
    shares: order.shares,
    execution_price: Number(execPrice.toFixed(2)),
    commission: Number(comm.toFixed(2)),
    slippage: Number((slip * order.shares).toFixed(2)),
    realized_pnl: realizedPnl,
    executed_at: new Date().toISOString()
  };

  _demoPaperTrades.unshift(trade);
  return { trade, account: generateDemoPaperAccount() };
}

export function resetDemoPaperAccount(): PaperAccountData {
  _demoPaperCash = 100000.0;
  _demoPaperPositions = [];
  _demoPaperTrades = [];
  return generateDemoPaperAccount();
}

export function searchDemoTickers(query: string): TickerSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const demoUniverse: TickerSearchResult[] = [
    { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', asset_type: 'Equity', sector: 'Technology' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', asset_type: 'Equity', sector: 'Technology' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', asset_type: 'Equity', sector: 'Technology' },
    { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ', asset_type: 'Equity', sector: 'Consumer Cyclical' },
    { symbol: 'GOOGL', name: 'Alphabet Inc. (Class A)', exchange: 'NASDAQ', asset_type: 'Equity', sector: 'Communication Services' },
    { symbol: 'AMZN', name: 'Amazon.com, Inc.', exchange: 'NASDAQ', asset_type: 'Equity', sector: 'Consumer Cyclical' },
    { symbol: 'META', name: 'Meta Platforms, Inc.', exchange: 'NASDAQ', asset_type: 'Equity', sector: 'Communication Services' },
    { symbol: 'NFLX', name: 'Netflix, Inc.', exchange: 'NASDAQ', asset_type: 'Equity', sector: 'Communication Services' },
    { symbol: 'AMD', name: 'Advanced Micro Devices', exchange: 'NASDAQ', asset_type: 'Equity', sector: 'Technology' },
    { symbol: 'INTC', name: 'Intel Corporation', exchange: 'NASDAQ', asset_type: 'Equity', sector: 'Technology' },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', exchange: 'NYSE Arca', asset_type: 'ETF', sector: 'Index ETF' },
    { symbol: 'QQQ', name: 'Invesco QQQ Trust', exchange: 'NASDAQ', asset_type: 'ETF', sector: 'Index ETF' },
    { symbol: 'RELIANCE.NS', name: 'Reliance Industries Limited', exchange: 'NSE', asset_type: 'Equity', sector: 'Energy' },
    { symbol: 'TCS.NS', name: 'Tata Consultancy Services Ltd.', exchange: 'NSE', asset_type: 'Equity', sector: 'Technology' },
    { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Limited', exchange: 'NSE', asset_type: 'Equity', sector: 'Financial Services' },
    { symbol: 'INFY.NS', name: 'Infosys Limited', exchange: 'NSE', asset_type: 'Equity', sector: 'Technology' }
  ];
  return demoUniverse.filter(item =>
    item.symbol.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
  );
}





