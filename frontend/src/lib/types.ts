export type DataSourceType = 'live' | 'polygon' | 'yfinance' | 'cache' | 'stale_cache' | 'simulated';

export interface BaseDataProvenance {
  data_source?: DataSourceType;
  fetched_at?: string;
}

export interface LiveTickerQuote {
  ticker: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  market_state: 'OPEN' | 'CLOSED';
  last_updated: string;
  day_low?: number;
  day_high?: number;
  year_low?: number;
  year_high?: number;
  prev_close?: number;
  open_price?: number;
}

export interface BackendHealthStatus {
  online: boolean;
  status?: string;
  uptime_seconds?: number;
  last_data_fetch_ts?: string | null;
  yfinance_reachable?: boolean;
  latencyMs?: number;
}

export interface ForecastPoint {
  date: string;
  actual?: number;
  fitted?: number;
}

export interface PredictionPoint {
  date: string;
  predicted_mean: number;
  lower_bound: number;
  upper_bound: number;
}

export interface BacktestResult {
  dates: string[];
  actual: number[];
  predicted: number[];
  rmse: number;
  mape: number;
  accuracy: number;
  error?: string;
}

export interface ForecastData extends BaseDataProvenance {
  ticker: string;
  column: string;
  metrics: {
    rmse: number;
    mape: number;
    accuracy: number;
  };
  adf_test: {
    test_statistic?: number;
    p_value?: number;
    is_stationary: boolean;
    error?: string;
  };
  history: ForecastPoint[];
  predictions: PredictionPoint[];
  decomposition?: {
    dates?: string[];
    trend?: (number | null)[];
    seasonal?: (number | null)[];
    resid?: (number | null)[];
    error?: string;
  };
  backtest?: BacktestResult | null;
  summary?: string | null;
}

export interface PortfolioData extends BaseDataProvenance {
  valid_tickers: string[];
  invalid_tickers: string[];
  correlation_matrix: {
    tickers: string[];
    values: number[][];
  };
  max_sharpe: {
    return: number;
    volatility: number;
    sharpe_ratio: number;
    weights: Record<string, number>;
  };
  min_volatility: {
    return: number;
    volatility: number;
    sharpe_ratio: number;
    weights: Record<string, number>;
  };
  risk_parity?: {
    return: number;
    volatility: number;
    sharpe_ratio: number;
    weights: Record<string, number>;
  };
  benchmark_info?: {
    ticker: string;
    name: string;
    risk_free_rate_pct: number;
  };
  efficient_frontier: {
    volatility: number[];
    return: number[];
  };
  random_portfolios: {
    volatility: number[];
    return: number[];
    sharpe: number[];
  };
  cumulative_growth: {
    dates: string[];
    series: Record<string, number[]>;
  };
  risk_metrics: {
    beta: number;
    max_drawdown_pct: number;
    drawdown_history: { date: string; drawdown: number }[];
  };
  stress_tests: {
    scenario: string;
    market_drop_pct: number;
    estimated_portfolio_impact_pct: number;
  }[];
}

export interface NewsArticle {
  Title: string;
  Publisher: string;
  Sentiment: 'Positive' | 'Negative' | 'Neutral';
  'Sentiment Score': number;
  Link: string;
  PublishDate?: string;
}

export interface SentimentData extends BaseDataProvenance {
  ticker: string;
  model_used: string;
  overall_score: number;
  overall_label: 'Positive' | 'Negative' | 'Neutral';
  counts: {
    Positive: number;
    Neutral: number;
    Negative: number;
  };
  articles: NewsArticle[];
}

export interface TradeSignalData extends BaseDataProvenance {
  ticker: string;
  signal: string;
  confidence_pct: number;
  accuracy_pct: number;
  is_strong: boolean;
  training_period?: string;
  feature_importance: { feature: string; importance: number }[];
  technical_indicators: {
    rsi: number | null;
    sma_20: number | null;
    sma_50: number | null;
  };
}

export interface RlHistoryPoint {
  date: string;
  price: number;
  agent_net_worth: number;
  benchmark_net_worth: number;
  action: string;
}

export interface RlSimulationData extends BaseDataProvenance {
  ticker: string;
  algo_type: string;
  action_type: string;
  risk_profile: string;
  engine: string;
  initial_balance: number;
  final_balance: number;
  profit: number;
  profit_pct: number;
  benchmark_profit_pct: number;
  max_drawdown_pct: number;
  win_rate_pct: number;
  total_trades: number;
  episodes_trained?: number;
  history: RlHistoryPoint[];
}

export interface TftData extends BaseDataProvenance {
  ticker: string;
  current_price: number;
  sp500_price: number;
  vix: number;
  regime: string;
  regime_desc: string;
  attention_weights: { factor: string; weight_pct: number }[];
  anomaly_analysis: {
    is_anomaly: boolean;
    risk_score: number;
    message: string;
  };
  lookalike?: {
    matched_date: string;
    similarity: number;
    future_return: number;
  } | null;
  probabilistic_forecast?: {
    predicted: number;
    lower: number;
    upper: number;
    confidence: number;
  } | null;
  scenarios: {
    scenario: string;
    projected_price: number;
    impact_pct: number;
  }[];
  macro_correlations: {
    indicator: string;
    correlation: number;
    latest_value: number;
  }[];
  macro_chart?: {
    dates: string[];
    series: Record<string, number[]>;
  };
}

export interface SavedPortfolioItem {
  id: number;
  portfolio_id: number;
  ticker: string;
  target_weight: number;
  asset_class?: string;
}

export interface SavedPortfolio {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  items: SavedPortfolioItem[];
}

export interface WatchlistItem {
  id: number;
  watchlist_id: number;
  ticker: string;
  notes?: string;
  added_at: string;
}

export interface Watchlist {
  id: number;
  name: string;
  created_at: string;
  items: WatchlistItem[];
}

