import {
  ForecastData,
  PortfolioData,
  SentimentData,
  TradeSignalData,
  RlSimulationData,
  TftData,
  SavedPortfolio,
  Watchlist,
  WatchlistItem,
  LiveTickerQuote,
  BackendHealthStatus,
  DataSourceType
} from './types';

import {
  generateDemoPortfolio,
  generateDemoForecast,
  generateDemoSentiment,
  generateDemoSignal,
  generateDemoRl,
  generateDemoTft,
  generateDemoWatchlists,
  generateDemoSavedPortfolios,
  generateDemoTickerHistory,
  generateDemoFinSightScore,
  generateDemoModelComparison,
  generateDemoFundamentals,
  generateDemoPaperAccount,
  executeDemoPaperOrder,
  resetDemoPaperAccount,
  searchDemoTickers
} from './demoData';
import {
  TickerHistoryData,
  FinSightScoreData,
  ModelComparisonData,
  FundamentalData,
  PaperAccountData,
  PaperPositionItem,
  PaperTradeItem,
  PaperOrderPayload,
  MultiConditionAlert,
  AlertConditionType,
  AlertTriggerEvent,
  StrategyTemplate,
  StrategyBacktestParams,
  StrategyBacktestResult,
  StressMacroShockParams,
  StressTestResponseData,
  TickerSearchResult,
  TickerSearchResponse,
  TickerValidationResult
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const WATCHLISTS_STORAGE_KEY = 'finsight_watchlists_cache';
const PORTFOLIOS_STORAGE_KEY = 'finsight_portfolios_cache';

export function isExplicitDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('finsight_explicit_demo_mode') === 'true';
}

export function setExplicitDemoMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('finsight_explicit_demo_mode', enabled ? 'true' : 'false');
}

const DEMO_TICKER_QUOTES: LiveTickerQuote[] = [
  { ticker: 'AAPL', price: 224.50, change: 1.85, change_pct: 0.83, volume: 48200000, market_state: 'OPEN', last_updated: new Date().toISOString(), day_low: 222.1, day_high: 225.4, year_low: 164.08, year_high: 237.23, prev_close: 222.65, open_price: 223.1 },
  { ticker: 'NVDA', price: 118.20, change: 3.40, change_pct: 2.96, volume: 89400000, market_state: 'OPEN', last_updated: new Date().toISOString(), day_low: 115.8, day_high: 119.5, year_low: 40.5, year_high: 140.76, prev_close: 114.80, open_price: 116.0 },
  { ticker: 'MSFT', price: 412.80, change: -1.20, change_pct: -0.29, volume: 18500000, market_state: 'OPEN', last_updated: new Date().toISOString(), day_low: 410.2, day_high: 415.6, year_low: 309.45, year_high: 468.35, prev_close: 414.00, open_price: 413.5 },
  { ticker: 'TSLA', price: 215.60, change: 5.10, change_pct: 2.42, volume: 62100000, market_state: 'OPEN', last_updated: new Date().toISOString(), day_low: 209.5, day_high: 218.0, year_low: 138.8, year_high: 271.0, prev_close: 210.50, open_price: 211.2 },
  { ticker: 'RELIANCE.NS', price: 3012.40, change: 14.80, change_pct: 0.49, volume: 5400000, market_state: 'CLOSED', last_updated: new Date().toISOString(), day_low: 2985.0, day_high: 3028.0, year_low: 2220.0, year_high: 3217.9, prev_close: 2997.60, open_price: 3000.0 },
  { ticker: 'TCS.NS', price: 4480.00, change: -22.50, change_pct: -0.50, volume: 2100000, market_state: 'CLOSED', last_updated: new Date().toISOString(), day_low: 4450.0, day_high: 4510.0, year_low: 3313.0, year_high: 4592.0, prev_close: 4502.50, open_price: 4500.0 }
];

function getLocalWatchlists(): Watchlist[] {
  if (typeof window === 'undefined') return generateDemoWatchlists();
  try {
    const raw = localStorage.getItem(WATCHLISTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  const presets = generateDemoWatchlists();
  try { localStorage.setItem(WATCHLISTS_STORAGE_KEY, JSON.stringify(presets)); } catch {}
  return presets;
}

function saveLocalWatchlists(list: Watchlist[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(WATCHLISTS_STORAGE_KEY, JSON.stringify(list)); } catch {}
}

function getLocalPortfolios(): SavedPortfolio[] {
  if (typeof window === 'undefined') return generateDemoSavedPortfolios();
  try {
    const raw = localStorage.getItem(PORTFOLIOS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  const presets = generateDemoSavedPortfolios();
  try { localStorage.setItem(PORTFOLIOS_STORAGE_KEY, JSON.stringify(presets)); } catch {}
  return presets;
}

function saveLocalPortfolios(list: SavedPortfolio[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(PORTFOLIOS_STORAGE_KEY, JSON.stringify(list)); } catch {}
}

export async function checkBackendHealth(): Promise<BackendHealthStatus> {
  const start = Date.now();
  try {
    const res = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000)
    });
    if (res.ok) {
      const data = await res.json();
      return {
        online: true,
        status: data.status,
        uptime_seconds: data.uptime_seconds,
        last_data_fetch_ts: data.last_data_fetch_ts,
        yfinance_reachable: data.yfinance_reachable,
        latencyMs: Date.now() - start,
        httpStatus: res.status
      };
    }
    return {
      online: false,
      httpStatus: res.status,
      errorMessage: res.status === 404
        ? `Backend service returned 404 Not Found at ${API_BASE_URL}. Verify your Render deployment URL.`
        : `Backend returned HTTP ${res.status} (${res.statusText || 'Error'})`
    };
  } catch (err: any) {
    return {
      online: false,
      errorMessage: err?.message || `Cannot reach backend at ${API_BASE_URL}. Connection refused or timed out.`
    };
  }
}

export async function getLiveTickerQuotes(tickers?: string[]): Promise<{
  quotes: LiveTickerQuote[];
  dataSource: DataSourceType;
  fetchedAt: string;
}> {
  const query = tickers && tickers.length > 0 ? `?tickers=${encodeURIComponent(tickers.join(','))}` : '';
  try {
    const res = await fetch(`${API_BASE_URL}/api/ticker/live${query}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000)
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return {
          quotes: json.data,
          dataSource: json.data_source || 'live',
          fetchedAt: json.fetched_at || new Date().toISOString()
        };
      }
    }
    throw new Error(`Ticker endpoint returned HTTP ${res.status}`);
  } catch (err) {
    if (isExplicitDemoMode()) {
      return {
        quotes: DEMO_TICKER_QUOTES,
        dataSource: 'simulated',
        fetchedAt: new Date().toISOString()
      };
    }
    // In production/live path without explicit demo mode: return empty list so the app shows real state
    return {
      quotes: [],
      dataSource: 'stale_cache',
      fetchedAt: new Date().toISOString()
    };
  }
}

export async function getSingleQuote(ticker: string): Promise<LiveTickerQuote | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/ticker/quote/${encodeURIComponent(ticker)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000)
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data as LiveTickerQuote;
      }
    }
  } catch (err) {
    console.warn(`[FinSight AI] Failed to fetch authoritative live quote for ${ticker}:`, err);
  }
  return null;
}

export async function getTickerHistory(
  ticker: string,
  period: string = '1Y'
): Promise<{ data: TickerHistoryData; isDemo?: boolean }> {
  if (isExplicitDemoMode()) {
    return {
      data: generateDemoTickerHistory(ticker, period),
      isDemo: true
    };
  }

  try {
    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/ticker/history/${encodeURIComponent(ticker)}?period=${encodeURIComponent(period)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      },
      20000,
      `Market History for ${ticker}`,
      1
    );
    const data = await handleResponse(res, `Failed to load market history for ${ticker}`);
    return { data, isDemo: false };
  } catch (err: any) {
    if (isExplicitDemoMode()) {
      return {
        data: generateDemoTickerHistory(ticker, period),
        isDemo: true
      };
    }
    throw err;
  }
}

export async function getFinSightScore(
  ticker: string
): Promise<{ data: FinSightScoreData; isDemo?: boolean }> {
  if (isExplicitDemoMode()) {
    return {
      data: generateDemoFinSightScore(ticker),
      isDemo: true
    };
  }

  try {
    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/score/${encodeURIComponent(ticker)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      },
      20000,
      `FinSight AI Score for ${ticker}`,
      1
    );
    const data = await handleResponse(res, `Failed to load FinSight AI Score for ${ticker}`);
    return { data, isDemo: false };
  } catch (err: any) {
    if (isExplicitDemoMode()) {
      return {
        data: generateDemoFinSightScore(ticker),
        isDemo: true
      };
    }
    throw err;
  }
}

export async function getModelComparison(
  ticker: string,
  horizon: number = 30,
  testDays: number = 60
): Promise<{ data: ModelComparisonData; isDemo?: boolean }> {
  if (isExplicitDemoMode()) {
    return {
      data: generateDemoModelComparison(ticker, horizon, testDays),
      isDemo: true
    };
  }

  try {
    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/models/compare/${encodeURIComponent(ticker)}?horizon=${horizon}&test_days=${testDays}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      },
      25000,
      `Model Comparison for ${ticker}`,
      1
    );
    const data = await handleResponse(res, `Failed to load Model Comparison Arena for ${ticker}`);
    return { data, isDemo: false };
  } catch (err: any) {
    if (isExplicitDemoMode()) {
      return {
        data: generateDemoModelComparison(ticker, horizon, testDays),
        isDemo: true
      };
    }
    throw err;
  }
}

export async function getFundamentals(
  ticker: string
): Promise<{ data: FundamentalData; isDemo?: boolean }> {
  if (isExplicitDemoMode()) {
    return {
      data: generateDemoFundamentals(ticker),
      isDemo: true
    };
  }

  try {
    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/fundamentals/${encodeURIComponent(ticker)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      },
      20000,
      `Fundamental Analysis for ${ticker}`,
      1
    );
    const data = await handleResponse(res, `Failed to load Fundamental Analysis for ${ticker}`);
    return { data, isDemo: false };
  } catch (err: any) {
    if (isExplicitDemoMode()) {
      return {
        data: generateDemoFundamentals(ticker),
        isDemo: true
      };
    }
    throw err;
  }
}

async function fetchWithDiagnostics(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  operationName: string,
  retries: number = 1
): Promise<Response> {
  let lastErr: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, 1500 * Math.pow(2, attempt - 1)));
      }
      return await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(timeoutMs)
      });
    } catch (err: any) {
      lastErr = err;
      if (err.name !== 'TimeoutError' && !err.message?.includes('timeout') && err.name !== 'AbortError' && err.message !== 'Failed to fetch' && err.name !== 'TypeError') {
        break;
      }
    }
  }

  if (lastErr) {
    if (lastErr.name === 'TimeoutError' || lastErr.message?.includes('timeout') || lastErr.name === 'AbortError') {
      throw new Error(
        `Request timed out while connecting to FinSight backend (${operationName}). If hosted on Render free tier, the backend spins down when inactive (~45s wake-up time). Please click Retry.`
      );
    }
    if (lastErr.message === 'Failed to fetch' || lastErr.name === 'TypeError') {
      throw new Error(
        `Cannot connect to FinSight AI API backend at ${API_BASE_URL}. The server is currently offline or spinning up. If running locally, verify with 'uvicorn backend.app.main:app --port 8000'.`
      );
    }
    throw new Error(`${operationName} request failed: ${lastErr?.message || 'Network error'}`);
  }
  throw new Error(`${operationName} failed without response.`);
}

async function handleResponse(res: Response, fallbackMessage: string) {
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    throw new Error(`Server returned status ${res.status}: ${res.statusText || fallbackMessage}`);
  }

  if (!res.ok) {
    const errorMsg = json.detail || json.message || `${fallbackMessage} (Status ${res.status})`;
    throw new Error(errorMsg);
  }

  if (json.success === false) {
    throw new Error(json.message || fallbackMessage);
  }

  return json.data !== undefined ? json.data : json;
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
    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/forecast`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      },
      30000,
      'Forecast'
    );

    const data = await handleResponse(res, 'Forecast calculation failed');
    return { data, isDemo: false };
  } catch (err: any) {
    if (isExplicitDemoMode()) {
      console.info('[FinSight AI] Demo Sandbox active. Serving reference demo forecast.');
      return { data: generateDemoForecast(params.ticker), isDemo: true };
    }
    // Production path: Throw error rather than silently showing synthetic data!
    throw err;
  }
}

// ==================== PORTFOLIO API ====================
export async function getPortfolioOptimization(params: {
  tickers: string[];
  start_date?: string;
  end_date?: string;
  initial_capital?: number;
  current_weights?: Record<string, number>;
}): Promise<{ data: PortfolioData; isDemo?: boolean }> {
  try {
    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/portfolio/optimize`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      },
      35000,
      'Portfolio optimization'
    );

    const data = await handleResponse(res, 'Portfolio optimization failed');
    return { data, isDemo: false };
  } catch (err: any) {
    if (isExplicitDemoMode()) {
      console.info('[FinSight AI] Demo Sandbox active. Serving reference demo portfolio.');
      return { data: generateDemoPortfolio(params.tickers), isDemo: true };
    }
    throw err;
  }
}

// ==================== AI INSIGHTS API ====================
export async function getNewsSentiment(ticker: string): Promise<{ data: SentimentData; isDemo?: boolean }> {
  try {
    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/ai/sentiment`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker })
      },
      25000,
      'Sentiment analysis'
    );

    const data = await handleResponse(res, 'Sentiment analysis failed');
    return { data, isDemo: false };
  } catch (err: any) {
    if (isExplicitDemoMode()) {
      console.info('[FinSight AI] Demo Sandbox active. Serving reference demo sentiment.');
      return { data: generateDemoSentiment(ticker), isDemo: true };
    }
    throw err;
  }
}

export async function getTradeSignal(ticker: string): Promise<{ data: TradeSignalData; isDemo?: boolean }> {
  try {
    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/ai/signal`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker })
      },
      25000,
      'Signal prediction'
    );

    const data = await handleResponse(res, 'Signal prediction failed');
    return { data, isDemo: false };
  } catch (err: any) {
    if (isExplicitDemoMode()) {
      console.info('[FinSight AI] Demo Sandbox active. Serving reference demo trade signal.');
      return { data: generateDemoSignal(ticker), isDemo: true };
    }
    throw err;
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
    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/rl/simulate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      },
      45000,
      'RL simulation'
    );

    const data = await handleResponse(res, 'RL simulation failed');
    return { data, isDemo: false };
  } catch (err: any) {
    if (isExplicitDemoMode()) {
      console.info('[FinSight AI] Demo Sandbox active. Serving reference demo RL simulation.');
      return {
        data: generateDemoRl(params.ticker, params.initial_balance, params.algo_type),
        isDemo: true
      };
    }
    throw err;
  }
}

// ==================== TFT / MULTI-FACTOR REGIME API ====================
export async function analyzeTft(ticker: string): Promise<{ data: TftData; isDemo?: boolean }> {
  try {
    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/tft/analyze`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker })
      },
      30000,
      'Multi-Factor Regime analysis'
    );

    const data = await handleResponse(res, 'Multi-Factor Regime analysis failed');
    return { data, isDemo: false };
  } catch (err: any) {
    if (isExplicitDemoMode()) {
      console.info('[FinSight AI] Demo Sandbox active. Serving reference demo regime analysis.');
      return { data: generateDemoTft(ticker), isDemo: true };
    }
    throw err;
  }
}

// ==================== SESSION TOKEN & AUTHENTICATION ====================
export function getSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('finsight_session_token');
}

export function setSessionToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('finsight_session_token', token);
}

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getSessionToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function ensureSession(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  let token = getSessionToken();
  if (token) return token;
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data?.session_token) {
        setSessionToken(json.data.session_token);
        return json.data.session_token;
      }
    }
  } catch (err) {
    console.warn('[FinSight AI] Guest session initialization deferred:', err);
  }
  return null;
}

// ==================== PERSISTED PORTFOLIOS API ====================
export async function listSavedPortfolios(): Promise<SavedPortfolio[]> {
  try {
    await ensureSession();
    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/portfolios`,
      {
        method: 'GET',
        headers: getAuthHeaders()
      },
      10000,
      'List portfolios'
    );
    const data = await handleResponse(res, 'Failed to list saved portfolios');
    if (data && data.length > 0) {
      saveLocalPortfolios(data);
      return data;
    }
    return getLocalPortfolios();
  } catch (err: any) {
    console.warn('[FinSight AI] Live backend unreachable, serving portfolios from local storage:', err?.message || err);
    return getLocalPortfolios();
  }
}

export async function savePortfolio(payload: {
  name: string;
  description?: string;
  items: { ticker: string; target_weight: number; asset_class?: string }[];
}): Promise<SavedPortfolio> {
  try {
    await ensureSession();
    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/portfolios`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      },
      15000,
      'Save portfolio'
    );
    return await handleResponse(res, 'Failed to save portfolio');
  } catch (err: any) {
    console.warn('[FinSight AI] Live backend offline, saving portfolio locally in browser storage:', err?.message || err);
    const local = getLocalPortfolios();
    const newPortfolio: SavedPortfolio = {
      id: Date.now(),
      name: payload.name,
      description: payload.description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: payload.items.map((it, idx) => ({
        id: Date.now() + idx,
        portfolio_id: Date.now(),
        ticker: it.ticker,
        target_weight: it.target_weight,
        asset_class: it.asset_class || 'Equity'
      }))
    };
    saveLocalPortfolios([newPortfolio, ...local]);
    return newPortfolio;
  }
}

export async function deleteSavedPortfolio(id: number): Promise<boolean> {
  try {
    await ensureSession();
    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/portfolios/${id}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders()
      },
      10000,
      'Delete portfolio'
    );
    await handleResponse(res, 'Failed to delete portfolio');
    const local = getLocalPortfolios().filter(p => p.id !== id);
    saveLocalPortfolios(local);
    return true;
  } catch (err: any) {
    console.warn('[FinSight AI] Live backend offline, deleting portfolio locally from browser storage:', err?.message || err);
    const local = getLocalPortfolios().filter(p => p.id !== id);
    saveLocalPortfolios(local);
    return true;
  }
}

// ==================== PERSISTED WATCHLISTS API ====================
export async function listWatchlists(): Promise<Watchlist[]> {
  try {
    await ensureSession();
    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/watchlists`,
      {
        method: 'GET',
        headers: getAuthHeaders()
      },
      10000,
      'List watchlists'
    );
    const data = await handleResponse(res, 'Failed to list watchlists');
    if (data && data.length > 0) {
      saveLocalWatchlists(data);
      return data;
    }
    return getLocalWatchlists();
  } catch (err: any) {
    console.warn('[FinSight AI] Live backend unreachable, serving watchlists from local storage:', err?.message || err);
    return getLocalWatchlists();
  }
}

export async function createWatchlist(name: string): Promise<Watchlist> {
  try {
    await ensureSession();
    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/watchlists`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name })
      },
      10000,
      'Create watchlist'
    );
    return await handleResponse(res, 'Failed to create watchlist');
  } catch (err: any) {
    console.warn('[FinSight AI] Live backend offline, creating watchlist locally in browser storage:', err?.message || err);
    const local = getLocalWatchlists();
    const newWatchlist: Watchlist = {
      id: Date.now(),
      name,
      created_at: new Date().toISOString(),
      items: []
    };
    saveLocalWatchlists([newWatchlist, ...local]);
    return newWatchlist;
  }
}

export async function addWatchlistItem(watchlistId: number, ticker: string, notes?: string): Promise<WatchlistItem> {
  try {
    await ensureSession();
    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/watchlists/${watchlistId}/items`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ticker, notes })
      },
      10000,
      'Add watchlist item'
    );
    return await handleResponse(res, 'Failed to add item to watchlist');
  } catch (err: any) {
    console.warn('[FinSight AI] Live backend offline, adding watchlist item locally in browser storage:', err?.message || err);
    const local = getLocalWatchlists();
    const wl = local.find(w => w.id === watchlistId);
    const item: WatchlistItem = {
      id: Date.now(),
      watchlist_id: watchlistId,
      ticker,
      notes,
      added_at: new Date().toISOString()
    };
    if (wl) {
      wl.items = [...wl.items, item];
      saveLocalWatchlists(local);
    }
    return item;
  }
}

export async function deleteWatchlistItem(watchlistId: number, itemId: number): Promise<boolean> {
  try {
    await ensureSession();
    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/watchlists/${watchlistId}/items/${itemId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders()
      },
      10000,
      'Delete watchlist item'
    );
    await handleResponse(res, 'Failed to remove item from watchlist');
    return true;
  } catch (err: any) {
    console.warn('[FinSight AI] Live backend offline, deleting watchlist item locally in browser storage:', err?.message || err);
    const local = getLocalWatchlists();
    const wl = local.find(w => w.id === watchlistId);
    if (wl) {
      wl.items = wl.items.filter(i => i.id !== itemId);
      saveLocalWatchlists(local);
    }
    return true;
  }
}

// ==================== ASYNC JOBS API (P0.2) ====================
export async function getJobStatus(jobId: string): Promise<any> {
  await ensureSession();
  const res = await fetchWithDiagnostics(
    `${API_BASE_URL}/api/jobs/${encodeURIComponent(jobId)}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
      cache: 'no-store'
    },
    10000,
    `Poll Job ${jobId}`
  );
  return await handleResponse(res, 'Failed to query job status');
}

export async function submitRlSimulationJob(req: {
  ticker: string;
  start_date?: string;
  end_date?: string;
  initial_balance: number;
  timesteps: number;
  risk_profile: string;
  action_type: string;
  algo_type: string;
}): Promise<{ job_id: string; status: string; polling_url: string }> {
  await ensureSession();
  const res = await fetchWithDiagnostics(
    `${API_BASE_URL}/api/rl/simulate-async`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(req)
    },
    15000,
    'Submit RL simulation job'
  );
  return await handleResponse(res, 'Failed to submit RL simulation job');
}

// ==================== PAPER TRADING API (PAPER-01) ====================
export async function getPaperAccount(): Promise<{ data: PaperAccountData; isDemo?: boolean }> {
  if (isExplicitDemoMode()) {
    return { data: generateDemoPaperAccount(), isDemo: true };
  }
  try {
    await ensureSession();
    const headers = getAuthHeaders();

    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/paper/account`,
      { method: 'GET', headers, cache: 'no-store' },
      15000,
      'Paper Trading Account'
    );
    const data = await handleResponse(res, 'Failed to fetch paper trading account');
    return { data, isDemo: false };
  } catch (err: any) {
    if (isExplicitDemoMode()) {
      return { data: generateDemoPaperAccount(), isDemo: true };
    }
    throw err;
  }
}

export async function placePaperOrder(order: PaperOrderPayload): Promise<{ data: any; isDemo?: boolean }> {
  if (isExplicitDemoMode()) {
    const res = executeDemoPaperOrder(order);
    return { data: res, isDemo: true };
  }
  try {
    await ensureSession();
    const headers = getAuthHeaders();

    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/paper/order`,
      { method: 'POST', headers, body: JSON.stringify(order) },
      15000,
      'Submit Paper Order'
    );
    const data = await handleResponse(res, 'Order placement failed');
    return { data, isDemo: false };
  } catch (err: any) {
    if (isExplicitDemoMode()) {
      const res = executeDemoPaperOrder(order);
      return { data: res, isDemo: true };
    }
    throw err;
  }
}

export async function resetPaperAccount(): Promise<{ success: boolean; isDemo?: boolean }> {
  if (isExplicitDemoMode()) {
    resetDemoPaperAccount();
    return { success: true, isDemo: true };
  }
  try {
    await ensureSession();
    const headers = getAuthHeaders();

    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/paper/reset`,
      { method: 'POST', headers },
      10000,
      'Reset Paper Account'
    );
    await handleResponse(res, 'Failed to reset paper trading account');
    return { success: true, isDemo: false };
  } catch (err: any) {
    if (isExplicitDemoMode()) {
      resetDemoPaperAccount();
      return { success: true, isDemo: true };
    }
    throw err;
  }
}

export async function getPaperTrades(): Promise<{ data: PaperTradeItem[]; isDemo?: boolean }> {
  if (isExplicitDemoMode()) {
    const acc = generateDemoPaperAccount();
    return { data: acc.recent_trades, isDemo: true };
  }
  try {
    await ensureSession();
    const headers = getAuthHeaders();

    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/paper/trades`,
      { method: 'GET', headers, cache: 'no-store' },
      10000,
      'Paper Trades History'
    );
    const data = await handleResponse(res, 'Failed to fetch paper trades');
    return { data, isDemo: false };
  } catch (err: any) {
    if (isExplicitDemoMode()) {
      const acc = generateDemoPaperAccount();
      return { data: acc.recent_trades, isDemo: true };
    }
    throw err;
  }
}

// ==================== MULTI-CONDITION ALERTS API ====================
export async function getUserAlerts(): Promise<{ data: MultiConditionAlert[]; isDemo?: boolean }> {
  try {
    await ensureSession();
    const headers = getAuthHeaders();

    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/alerts`,
      { method: 'GET', headers, cache: 'no-store' },
      10000,
      'Get Alerts'
    );
    const data = await handleResponse(res, 'Failed to fetch user alerts');
    return { data, isDemo: false };
  } catch (err: any) {
    if (isExplicitDemoMode()) {
      return { data: [], isDemo: true };
    }
    throw err;
  }
}

export async function createUserAlert(payload: {
  ticker: string;
  condition_type: AlertConditionType;
  threshold_value: number;
}): Promise<{ data: MultiConditionAlert; isDemo?: boolean }> {
  try {
    await ensureSession();
    const headers = getAuthHeaders();

    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/alerts`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      },
      10000,
      'Create Alert'
    );
    const data = await handleResponse(res, 'Failed to create alert');
    return { data, isDemo: false };
  } catch (err: any) {
    if (isExplicitDemoMode()) {
      const demoAlert: MultiConditionAlert = {
        id: `demo_${Date.now()}`,
        ticker: payload.ticker.toUpperCase(),
        condition_type: payload.condition_type,
        threshold_value: payload.threshold_value,
        is_active: true,
        created_at: new Date().toISOString()
      };
      return { data: demoAlert, isDemo: true };
    }
    throw err;
  }
}

export async function deleteUserAlert(alert_id: number | string): Promise<{ success: boolean; isDemo?: boolean }> {
  try {
    await ensureSession();
    const headers = getAuthHeaders();

    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/alerts/${alert_id}`,
      { method: 'DELETE', headers },
      10000,
      'Delete Alert'
    );
    await handleResponse(res, 'Failed to delete alert');
    return { success: true, isDemo: false };
  } catch (err: any) {
    if (isExplicitDemoMode()) {
      return { success: true, isDemo: true };
    }
    throw err;
  }
}

export async function toggleUserAlert(alert_id: number | string): Promise<{ data: MultiConditionAlert; isDemo?: boolean }> {
  try {
    await ensureSession();
    const headers = getAuthHeaders();

    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/alerts/${alert_id}/toggle`,
      { method: 'PATCH', headers },
      10000,
      'Toggle Alert'
    );
    const data = await handleResponse(res, 'Failed to toggle alert');
    return { data, isDemo: false };
  } catch (err: any) {
    if (isExplicitDemoMode()) {
      return {
        data: {
          id: alert_id,
          ticker: 'AAPL',
          condition_type: 'PRICE_ABOVE',
          threshold_value: 200,
          is_active: false,
          created_at: new Date().toISOString()
        },
        isDemo: true
      };
    }
    throw err;
  }
}

export async function evaluateUserAlerts(): Promise<{
  data: { evaluated_count: number; triggered_count: number; triggered_events: AlertTriggerEvent[] };
  isDemo?: boolean;
}> {
  try {
    await ensureSession();
    const headers = getAuthHeaders();

    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/alerts/evaluate`,
      { method: 'POST', headers },
      15000,
      'Evaluate Alerts'
    );
    const data = await handleResponse(res, 'Failed to evaluate alerts');
    return { data, isDemo: false };
  } catch (err: any) {
    if (isExplicitDemoMode()) {
      return { data: { evaluated_count: 0, triggered_count: 0, triggered_events: [] }, isDemo: true };
    }
    throw err;
  }
}

// ==================== STRATEGY BUILDER API (STRAT-01) ====================
export async function getStrategyTemplates(): Promise<{
  templates: StrategyTemplate[];
  isDemo?: boolean;
}> {
  try {
    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/strategy/templates`,
      { method: 'GET' },
      10000,
      'Get Strategy Templates'
    );
    const data = await handleResponse(res, 'Failed to fetch strategy templates');
    return { templates: data.templates || [], isDemo: false };
  } catch (err: any) {
    if (isExplicitDemoMode()) {
      return {
        templates: [
          {
            id: 'tech_momentum_alpha',
            name: 'Tech Momentum Alpha',
            description: 'Selects top 3 momentum leaders among tech giants based on 60-day returns, rebalancing monthly.',
            universe: ['AAPL', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META'],
            defensive_asset: 'SHY',
            allocation_type: 'MOMENTUM_TOP_N',
            top_n: 3,
            rebalance_frequency_days: 21,
            regime_filter: 'NONE'
          },
          {
            id: 'all_weather_parity',
            name: 'All-Weather Risk Parity',
            description: 'Diversified asset allocation balancing equities, long-term treasuries, and gold by inverse volatility.',
            universe: ['SPY', 'TLT', 'GLD', 'IEF', 'DBC'],
            defensive_asset: 'SHY',
            allocation_type: 'INVERSE_VOLATILITY',
            top_n: 5,
            rebalance_frequency_days: 30,
            regime_filter: 'NONE'
          },
          {
            id: 'dual_momentum_trend',
            name: 'Dual Momentum Regime Shield',
            description: 'Allocates to high-beta equities in market uptrends (SPY > 200-day SMA), shifting to defensive assets during market corrections.',
            universe: ['AAPL', 'NVDA', 'MSFT', 'TSLA'],
            defensive_asset: 'TLT',
            allocation_type: 'EQUAL_WEIGHT',
            top_n: 4,
            rebalance_frequency_days: 14,
            regime_filter: 'SMA200_BENCHMARK'
          }
        ],
        isDemo: true
      };
    }
    throw err;
  }
}

export async function runStrategyBacktest(params: StrategyBacktestParams): Promise<{
  data: StrategyBacktestResult;
  isDemo?: boolean;
}> {
  try {
    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/strategy/backtest`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      },
      30000,
      'Strategy Backtest'
    );
    const data = await handleResponse(res, 'Strategy backtest simulation failed');
    return { data, isDemo: false };
  } catch (err: any) {
    if (isExplicitDemoMode()) {
      const initCap = params.initial_capital || 100000;
      const days = params.period === '1y' ? 252 : params.period === '5y' ? 1260 : 504;
      const eqCurve: { date: string; value: number }[] = [];
      const bmCurve: { date: string; value: number }[] = [];
      let val = initCap;
      let bmVal = initCap;
      const now = new Date();

      for (let i = days; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
        val = val * (1 + (Math.sin(i / 15) * 0.003 + 0.0006));
        bmVal = bmVal * (1 + (Math.cos(i / 20) * 0.002 + 0.0004));
        eqCurve.push({ date: d, value: Math.round(val) });
        bmCurve.push({ date: d, value: Math.round(bmVal) });
      }

      return {
        data: {
          initial_capital: initCap,
          ending_capital: Math.round(val),
          cagr_pct: 18.4,
          sharpe_ratio: 1.45,
          max_drawdown_pct: -12.3,
          total_return_pct: Number((((val - initCap) / initCap) * 100).toFixed(1)),
          benchmark_total_return_pct: Number((((bmVal - initCap) / initCap) * 100).toFixed(1)),
          total_commission_paid: 142.50,
          total_slippage_paid: 57.00,
          rebalances_count: Math.round(days / (params.rebalance_frequency_days || 21)),
          equity_curve: eqCurve,
          benchmark_curve: bmCurve,
          rebalance_log: [
            {
              date: eqCurve[0]?.date || '2023-01-01',
              selected_assets: params.universe.slice(0, params.top_n || 3),
              weights: params.universe.slice(0, params.top_n || 3).reduce((acc, t) => ({ ...acc, [t]: 100 / (params.top_n || 3) }), {}),
              turnover_dollars: initCap,
              fees_dollars: 7.00
            }
          ]
        },
        isDemo: true
      };
    }
    throw err;
  }
}

// ==================== STRESS TESTING API (STRESS-01) ====================
export async function runPortfolioStressTest(params: StressMacroShockParams): Promise<{
  data: StressTestResponseData;
  isDemo?: boolean;
}> {
  try {
    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/portfolio/stress-test`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      },
      30000,
      'Portfolio Stress Test'
    );
    const data = await handleResponse(res, 'Portfolio stress test simulation failed');
    return { data, isDemo: false };
  } catch (err: any) {
    if (isExplicitDemoMode()) {
      const capital = params.initial_capital || 100000;
      const mktDrop = params.market_shock_pct !== undefined ? params.market_shock_pct : -15.0;
      const rateBps = params.rate_shock_bps !== undefined ? params.rate_shock_bps : 100.0;
      const vixSurge = params.vix_shock_pct !== undefined ? params.vix_shock_pct : 50.0;
      const commShock = params.commodity_shock_pct !== undefined ? params.commodity_shock_pct : 0.0;

      const tickers = params.tickers && params.tickers.length > 0 ? params.tickers : ['AAPL', 'MSFT', 'GOOGL', 'AMZN'];
      const defaultW = 100 / tickers.length;

      const breakdown = tickers.map((sym, idx) => {
        const beta = 1.0 + (idx * 0.15);
        const shock = beta * mktDrop + (-1.2 * beta * (rateBps / 100)) + (-6.5 * beta * (vixSurge / 100)) + (2.5 * (beta - 0.8) * (commShock / 100));
        const boundedShock = Math.max(-95, Math.min(150, shock));
        const pre = (capital * defaultW) / 100;
        const post = Math.max(0, pre * (1 + boundedShock / 100));
        return {
          ticker: sym,
          weight_pct: defaultW,
          beta: Number(beta.toFixed(2)),
          asset_shock_pct: Number(boundedShock.toFixed(2)),
          pre_shock_value: Number(pre.toFixed(2)),
          post_shock_value: Number(post.toFixed(2)),
          dollar_loss: Number((post - pre).toFixed(2))
        };
      });

      const totalLoss = breakdown.reduce((acc, b) => acc + b.dollar_loss, 0);
      const postCap = Math.max(0, capital + totalLoss);
      const impactPct = Number(((totalLoss / capital) * 100).toFixed(2));

      return {
        data: {
          tickers,
          weights: tickers.reduce((acc, t) => ({ ...acc, [t]: defaultW }), {}),
          initial_capital: capital,
          custom_simulation: {
            market_shock_pct: mktDrop,
            rate_shock_bps: rateBps,
            commodity_shock_pct: commShock,
            vix_shock_pct: vixSurge,
            initial_capital: capital,
            post_shock_capital: Number(postCap.toFixed(2)),
            dollar_drawdown: Number(totalLoss.toFixed(2)),
            portfolio_impact_pct: impactPct,
            worst_asset: breakdown[0]?.ticker || null,
            most_resilient_asset: breakdown[breakdown.length - 1]?.ticker || null,
            asset_breakdown: breakdown
          },
          crisis_replays: [
            {
              crisis_id: 'gfc_2008',
              crisis_name: '2008 Global Financial Crisis',
              date_range: 'Sep 2008 – Mar 2009',
              description: 'Subprime collapse, Lehman bankruptcy, systemic credit freeze.',
              benchmark_shock_pct: -50.0,
              portfolio_impact_pct: Number((impactPct * 1.8).toFixed(2)),
              dollar_drawdown: Number((capital * (impactPct * 1.8 / 100)).toFixed(2)),
              post_shock_capital: Number((capital * (1 + (impactPct * 1.8 / 100))).toFixed(2)),
              worst_asset: breakdown[0]?.ticker || null,
              most_resilient_asset: breakdown[breakdown.length - 1]?.ticker || null,
              asset_breakdown: breakdown
            },
            {
              crisis_id: 'covid_2020',
              crisis_name: '2020 COVID Flash Crash',
              date_range: 'Feb 2020 – Mar 2020',
              description: 'Global lockdowns, rapid liquidation, historic volatility surge.',
              benchmark_shock_pct: -34.0,
              portfolio_impact_pct: Number((impactPct * 1.3).toFixed(2)),
              dollar_drawdown: Number((capital * (impactPct * 1.3 / 100)).toFixed(2)),
              post_shock_capital: Number((capital * (1 + (impactPct * 1.3 / 100))).toFixed(2)),
              worst_asset: breakdown[0]?.ticker || null,
              most_resilient_asset: breakdown[breakdown.length - 1]?.ticker || null,
              asset_breakdown: breakdown
            },
            {
              crisis_id: 'rate_shock_2022',
              crisis_name: '2022 Stagflation & Rate Shock',
              date_range: 'Jan 2022 – Oct 2022',
              description: '40-year high inflation, fastest global rate hiking cycle in 4 decades.',
              benchmark_shock_pct: -25.0,
              portfolio_impact_pct: Number((impactPct * 1.1).toFixed(2)),
              dollar_drawdown: Number((capital * (impactPct * 1.1 / 100)).toFixed(2)),
              post_shock_capital: Number((capital * (1 + (impactPct * 1.1 / 100))).toFixed(2)),
              worst_asset: breakdown[0]?.ticker || null,
              most_resilient_asset: breakdown[breakdown.length - 1]?.ticker || null,
              asset_breakdown: breakdown
            }
          ],
          asset_sensitivities: tickers.reduce((acc, t, i) => ({
            ...acc,
            [t]: {
              beta: Number((1.0 + i * 0.15).toFixed(2)),
              volatility_annualized: 0.25,
              rate_sensitivity: -1.5,
              vix_sensitivity: -7.0,
              comm_sensitivity: 1.2
            }
          }), {}),
          historical_scenarios_meta: []
        },
        isDemo: true
      };
    }
    throw err;
  }
}

// ==================== UNIVERSAL TICKER SEARCH (SEARCH-01) ====================
export async function searchTickers(query: string): Promise<TickerSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  if (isExplicitDemoMode()) {
    return searchDemoTickers(q);
  }

  try {
    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/ticker/search?q=${encodeURIComponent(q)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      },
      8000,
      `Ticker search for ${q}`,
      1
    );
    const json = await res.json();
    if (json && json.success && json.data && Array.isArray(json.data.results)) {
      return json.data.results;
    }
    return searchDemoTickers(q);
  } catch (err: any) {
    return searchDemoTickers(q);
  }
}

export async function validateTicker(ticker: string): Promise<TickerValidationResult> {
  const sym = ticker.trim().toUpperCase();
  if (!sym) {
    return { symbol: '', is_valid: false, data_available: false, message: 'Ticker is required.' };
  }

  if (isExplicitDemoMode()) {
    return {
      symbol: sym,
      is_valid: true,
      data_available: true,
      name: `${sym} Corp.`,
      exchange: 'NASDAQ',
      currency: 'USD',
      message: 'Validated in sandbox demo mode.'
    };
  }

  try {
    const res = await fetchWithDiagnostics(
      `${API_BASE_URL}/api/ticker/validate/${encodeURIComponent(sym)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      },
      8000,
      `Validate ticker ${sym}`,
      1
    );
    const json = await res.json();
    if (json && json.data) {
      return json.data;
    }
    return {
      symbol: sym,
      is_valid: Boolean(json?.success),
      data_available: Boolean(json?.success),
      message: json?.message || 'Validation response received.'
    };
  } catch (err: any) {
    return {
      symbol: sym,
      is_valid: false,
      data_available: false,
      message: err?.message || `Failed to validate ticker ${sym}`
    };
  }
}


