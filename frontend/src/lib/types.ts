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
  httpStatus?: number;
  errorMessage?: string;
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
  lower_80?: number;
  upper_80?: number;
  lower_95?: number;
  upper_95?: number;
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

export interface PortfolioVaRMetrics {
  confidence_levels: string[];
  horizons: string[];
  parametric_var: {
    var_95_1d_pct: number;
    var_99_1d_pct: number;
    var_95_10d_pct: number;
    var_99_10d_pct: number;
    var_95_1d_usd: number;
    var_99_1d_usd: number;
    var_95_10d_usd: number;
    var_99_10d_usd: number;
  };
  historical_var: {
    var_95_1d_pct: number;
    var_99_1d_pct: number;
    var_95_10d_pct: number;
    var_99_10d_pct: number;
    var_95_1d_usd: number;
    var_99_1d_usd: number;
    var_95_10d_usd: number;
    var_99_10d_usd: number;
  };
  cvar_expected_shortfall: {
    cvar_95_1d_pct: number;
    cvar_99_1d_pct: number;
    cvar_95_10d_pct: number;
    cvar_99_10d_pct: number;
    cvar_95_1d_usd: number;
    cvar_99_1d_usd: number;
    cvar_95_10d_usd: number;
    cvar_99_10d_usd: number;
  };
}

export interface RiskContributions {
  portfolio_volatility: number;
  marginal_risk_contributions: Record<string, number>;
  percentage_risk_contributions: Record<string, number>;
}

export interface RebalanceOrder {
  ticker: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  current_weight_pct: number;
  target_weight_pct: number;
  current_value: number;
  target_value: number;
  delta_value: number;
  price: number;
  delta_shares: number;
}

export interface RebalancePlan {
  total_capital: number;
  turnover_usd: number;
  turnover_pct: number;
  estimated_friction_usd: number;
  orders: RebalanceOrder[];
}

export interface PortfolioStrategyResult {
  return: number;
  volatility: number;
  sharpe_ratio: number;
  weights: Record<string, number>;
  var_metrics?: PortfolioVaRMetrics;
  risk_contributions?: RiskContributions;
}

export interface PortfolioData extends BaseDataProvenance {
  valid_tickers: string[];
  invalid_tickers: string[];
  initial_capital?: number;
  current_weights?: Record<string, number>;
  current_prices?: Record<string, number>;
  correlation_matrix: {
    tickers: string[];
    values: number[][];
  };
  max_sharpe: PortfolioStrategyResult;
  min_volatility: PortfolioStrategyResult;
  risk_parity?: PortfolioStrategyResult;
  current_portfolio?: {
    var_metrics?: PortfolioVaRMetrics;
  };
  rebalance_plans?: {
    max_sharpe: RebalancePlan;
    min_volatility: RebalancePlan;
    risk_parity: RebalancePlan;
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
  factor_attributions?: { factor: string; weight_pct: number; method?: string }[];
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

export type ThemeMode = 'dark' | 'light' | 'system';

export type AlertConditionType =
  | 'PRICE_ABOVE'
  | 'PRICE_BELOW'
  | 'PCT_CHANGE_ABOVE'
  | 'PCT_CHANGE_BELOW'
  | 'SCORE_ABOVE'
  | 'SCORE_BELOW'
  | 'RSI_OVERBOUGHT'
  | 'RSI_OVERSOLD';

export interface MultiConditionAlert {
  id: number | string;
  user_id?: string;
  ticker: string;
  condition_type: AlertConditionType;
  threshold_value: number;
  is_active: boolean;
  triggered_at?: string | null;
  created_at: string;
}

export interface AlertTriggerEvent {
  alert_id: number | string;
  ticker: string;
  condition_type: AlertConditionType;
  threshold_value: number;
  trigger_message: string;
  triggered_at: string;
}

export interface PriceAlert {
  id: string;
  ticker: string;
  targetPrice: number;
  condition: 'ABOVE' | 'BELOW';
  enabled: boolean;
  createdAt: string;
  lastTriggered?: string;
  status: 'ACTIVE' | 'TRIGGERED';
}

// ==================== TICKER HISTORY & TECHNICALS SCHEMAS ====================
export interface TickerHistoryBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma_20?: number | null;
  sma_50?: number | null;
  sma_200?: number | null;
  ema_12?: number | null;
  ema_26?: number | null;
  rsi_14?: number | null;
  macd?: number | null;
  macd_signal?: number | null;
  macd_hist?: number | null;
  bb_upper?: number | null;
  bb_middle?: number | null;
  bb_lower?: number | null;
  atr_14?: number | null;
}

export interface TickerHistorySummary {
  latest_price: number;
  trend: string;
  rsi: number;
  rsi_condition: string;
  macd: number;
  macd_signal: number;
  macd_condition: string;
  sma_20: number;
  sma_50: number;
  sma_200: number;
  above_sma50: boolean;
  above_sma200: boolean;
  high_52w: number;
  low_52w: number;
  avg_volume_30d: number;
}

export interface TickerHistoryData extends BaseDataProvenance {
  ticker: string;
  period: string;
  bars_count: number;
  canonical_quote?: LiveTickerQuote | null;
  summary: TickerHistorySummary;
  bars: TickerHistoryBar[];
}

// ==================== FINSIGHT AI SCORE SCHEMAS (SCORE-01) ====================
export interface FactorAttributionItem {
  dimension: string;
  factor: string;
  impact: number;
}

export interface FinSightScoreSubscores {
  technical: number;
  momentum: number;
  fundamental: number | null;
  sentiment: number;
  risk: number;
}

export interface FinSightScoreData {
  ticker: string;
  overall_score: number;
  rating: string;
  rating_code: string;
  rating_color: string;
  latest_price: number;
  as_of_date: string;
  weights_used: Record<string, number>;
  subscores: FinSightScoreSubscores;
  top_positive_contributors: FactorAttributionItem[];
  top_negative_detractors: FactorAttributionItem[];
  synthesis: string;
}

// ==================== MODEL COMPARISON ARENA SCHEMAS (COMP-01) ====================
export interface ModelEvaluationWindow {
  test_start_date: string;
  test_end_date: string;
  test_days: number;
  forecast_horizon_days: number;
}

export interface ModelConsensus {
  outlook: 'BULLISH' | 'BEARISH' | 'NEUTRAL / MIXED' | string;
  outlook_color: string;
  agreement_ratio: string;
  synthesis: string;
}

export interface CategoryWinner {
  winner: string;
  score: string;
  rationale: string;
}

export interface SarimaxComparisonModel {
  name: string;
  category: string;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  target_price: number;
  expected_return_pct: number;
  confidence_bands: {
    ci_80_lower: number;
    ci_80_upper: number;
    ci_95_lower: number;
    ci_95_upper: number;
  };
  metrics: {
    rmse: number;
    mae: number;
    directional_accuracy_pct: number;
  };
  strengths: string;
  limitations: string;
}

export interface QuantileMlComparisonModel {
  name: string;
  category: string;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  target_price: number;
  expected_return_pct: number;
  confidence_bands: {
    q10_lower: number;
    q50_median: number;
    q90_upper: number;
  };
  metrics: {
    rmse: number;
    mae: number;
    directional_accuracy_pct: number;
  };
  strengths: string;
  limitations: string;
}

export interface RlAgentComparisonModel {
  name: string;
  category: string;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  current_action: string;
  target_allocation: string;
  out_of_sample_return_pct: number;
  benchmark_return_pct: number;
  metrics: {
    sharpe_ratio: number;
    max_drawdown_pct: number;
    win_rate_pct: number;
    commission_drag_bps: number;
    slippage_drag_bps: number;
  };
  strengths: string;
  limitations: string;
}

export interface ModelComparisonData {
  ticker: string;
  current_price: number;
  as_of_date: string;
  evaluation_window: ModelEvaluationWindow;
  consensus: ModelConsensus;
  category_winners: {
    directional_accuracy: CategoryWinner;
    risk_adjusted_performance: CategoryWinner;
    capital_preservation: CategoryWinner;
  };
  models: {
    sarimax: SarimaxComparisonModel;
    quantile_ml: QuantileMlComparisonModel;
    rl_agent: RlAgentComparisonModel;
  };
  benchmark: {
    name: string;
    return_pct: number;
    max_drawdown_pct: number;
    sharpe_ratio: number;
  };
}

// ==================== FUNDAMENTAL ANALYSIS SCHEMAS (FUND-01) ====================
export interface ValuationMetrics {
  trailing_pe: number | null;
  forward_pe: number | null;
  peg_ratio: number | null;
  price_to_sales: number | null;
  price_to_book: number | null;
  ev_to_ebitda: number | null;
  market_cap_billions: number | null;
  enterprise_value_billions: number | null;
  benchmark_pe: number;
  pe_status: 'Undervalued' | 'Overvalued' | 'In-Line';
}

export interface ProfitabilityMetrics {
  return_on_equity_pct: number | null;
  return_on_assets_pct: number | null;
  operating_margin_pct: number | null;
  net_profit_margin_pct: number | null;
  gross_margin_pct: number | null;
  benchmark_roe_pct: number;
  roe_quality: 'High' | 'Moderate';
}

export interface SolvencyMetrics {
  total_cash_billions: number | null;
  total_debt_billions: number | null;
  net_debt_billions: number | null;
  debt_to_equity: number | null;
  current_ratio: number | null;
  quick_ratio: number | null;
  free_cash_flow_billions: number | null;
  balance_sheet_strength: 'Fortress' | 'Adequate';
}

export interface GrowthAndDividendsMetrics {
  quarterly_revenue_growth_yoy_pct: number | null;
  quarterly_earnings_growth_yoy_pct: number | null;
  dividend_yield_pct: number;
  payout_ratio_pct: number | null;
}

export interface FundamentalData {
  ticker: string;
  company_name: string;
  sector: string;
  industry: string;
  currency: string;
  health_score: number;
  health_rating: 'Excellent' | 'Good' | 'Fair' | 'Weak' | 'Distressed';
  health_color: string;
  as_of_date: string;
  valuation: ValuationMetrics;
  profitability: ProfitabilityMetrics;
  solvency: SolvencyMetrics;
  growth_and_dividends: GrowthAndDividendsMetrics;
  synthesis: string;
}

// ==================== PAPER TRADING SCHEMAS (PAPER-01) ====================
export interface PaperPositionItem {
  id: number;
  ticker: string;
  shares: number;
  average_entry_price: number;
  current_price: number;
  market_value: number;
  unrealized_pnl: number;
  unrealized_pnl_pct: number;
}

export interface PaperTradeItem {
  id: number;
  ticker: string;
  action: 'BUY' | 'SELL';
  order_type: 'MARKET' | 'LIMIT';
  shares: number;
  execution_price: number;
  commission: number;
  slippage: number;
  realized_pnl: number;
  executed_at: string;
}

export interface PaperAccountData {
  id: number;
  cash_balance: number;
  currency: string;
  total_portfolio_value: number;
  positions_market_value: number;
  total_unrealized_pnl: number;
  total_realized_pnl: number;
  total_pnl: number;
  total_return_pct: number;
  positions: PaperPositionItem[];
  recent_trades: PaperTradeItem[];
}

export interface PaperOrderPayload {
  ticker: string;
  action: 'BUY' | 'SELL';
  shares: number;
  order_type?: 'MARKET' | 'LIMIT';
  limit_price?: number;
}

// ==================== STRATEGY BUILDER SCHEMAS (STRAT-01) ====================
export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  universe: string[];
  defensive_asset: string;
  allocation_type: 'EQUAL_WEIGHT' | 'MOMENTUM_TOP_N' | 'INVERSE_VOLATILITY';
  top_n: number;
  rebalance_frequency_days: number;
  regime_filter: 'NONE' | 'SMA200_BENCHMARK';
}

export interface StrategyBacktestParams {
  universe: string[];
  defensive_asset?: string;
  allocation_type?: 'EQUAL_WEIGHT' | 'MOMENTUM_TOP_N' | 'INVERSE_VOLATILITY';
  top_n?: number;
  rebalance_frequency_days?: number;
  regime_filter?: 'NONE' | 'SMA200_BENCHMARK';
  initial_capital?: number;
  period?: '1y' | '2y' | '5y';
}

export interface StrategyBacktestResult {
  initial_capital: number;
  ending_capital: number;
  cagr_pct: number;
  sharpe_ratio: number;
  max_drawdown_pct: number;
  total_return_pct: number;
  benchmark_total_return_pct: number;
  total_commission_paid: number;
  total_slippage_paid: number;
  rebalances_count: number;
  equity_curve: { date: string; value: number }[];
  benchmark_curve: { date: string; value: number }[];
  rebalance_log: {
    date: string;
    selected_assets: string[];
    weights: Record<string, number>;
    turnover_dollars: number;
    fees_dollars: number;
  }[];
}

// ==================== STRESS TESTING SCHEMAS (STRESS-01) ====================
export interface StressMacroShockParams {
  tickers: string[];
  weights?: Record<string, number>;
  initial_capital?: number;
  market_shock_pct?: number;
  rate_shock_bps?: number;
  commodity_shock_pct?: number;
  vix_shock_pct?: number;
  start_date?: string;
}

export interface AssetStressBreakdown {
  ticker: string;
  weight_pct: number;
  beta: number;
  asset_shock_pct: number;
  pre_shock_value: number;
  post_shock_value: number;
  dollar_loss: number;
}

export interface CustomStressSimulation {
  market_shock_pct: number;
  rate_shock_bps: number;
  commodity_shock_pct: number;
  vix_shock_pct: number;
  initial_capital: number;
  post_shock_capital: number;
  dollar_drawdown: number;
  portfolio_impact_pct: number;
  worst_asset: string | null;
  most_resilient_asset: string | null;
  asset_breakdown: AssetStressBreakdown[];
}

export interface CrisisReplayResult {
  crisis_id: string;
  crisis_name: string;
  date_range: string;
  description: string;
  benchmark_shock_pct: number;
  portfolio_impact_pct: number;
  dollar_drawdown: number;
  post_shock_capital: number;
  worst_asset: string | null;
  most_resilient_asset: string | null;
  asset_breakdown: AssetStressBreakdown[];
}

export interface StressTestResponseData {
  tickers: string[];
  weights: Record<string, number>;
  initial_capital: number;
  custom_simulation: CustomStressSimulation;
  crisis_replays: CrisisReplayResult[];
  asset_sensitivities: Record<string, {
    beta: number;
    volatility_annualized: number;
    rate_sensitivity: number;
    vix_sensitivity: number;
    comm_sensitivity: number;
  }>;
  historical_scenarios_meta: any[];
}

// ==================== UNIVERSAL TICKER SEARCH (SEARCH-01) ====================
export interface TickerSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  asset_type: string;
  sector?: string;
  industry?: string;
}

export interface TickerSearchResponse {
  query: string;
  total: number;
  results: TickerSearchResult[];
}

export interface TickerValidationResult {
  symbol: string;
  is_valid: boolean;
  name?: string;
  exchange?: string;
  currency?: string;
  data_available: boolean;
  message?: string;
}
