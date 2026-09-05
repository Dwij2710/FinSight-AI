import {
  ForecastData,
  PortfolioData,
  SentimentData,
  TradeSignalData,
  RlSimulationData,
  TftData,
  SavedPortfolio,
  Watchlist
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

async function fetchWithDiagnostics(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  operationName: string
): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (err: any) {
    if (err.name === 'TimeoutError' || err.message?.includes('timeout') || err.name === 'AbortError') {
      throw new Error(
        `Request timed out while connecting to ${API_BASE_URL}. If hosted on Render free tier, the backend spins down when inactive and takes ~45s to wake up. Please click Retry.`
      );
    }
    if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
      throw new Error(
        `Cannot connect to FinSight AI API backend at ${API_BASE_URL}. The server is currently offline or spinning up. If running locally, start it with 'uvicorn backend.app.main:app --port 8000'. If deployed on Render, allow ~45s for cold start and click Retry.`
      );
    }
    throw new Error(`${operationName} request failed: ${err?.message || 'Network error'}`);
  }
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

import { generateDemoPortfolio, generateDemoForecast } from './demoData';

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
    if (
      err.message?.includes('Cannot connect') ||
      err.message?.includes('offline') ||
      err.message?.includes('timed out') ||
      err.message?.includes('Failed to fetch')
    ) {
      console.warn('[FinSight AI] Live backend unreachable, activating zero-downtime simulation engine.');
      return { data: generateDemoForecast(params.ticker), isDemo: true };
    }
    throw err;
  }
}

// ==================== PORTFOLIO API ====================
export async function getPortfolioOptimization(params: {
  tickers: string[];
  start_date?: string;
  end_date?: string;
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
    if (
      err.message?.includes('Cannot connect') ||
      err.message?.includes('offline') ||
      err.message?.includes('timed out') ||
      err.message?.includes('Failed to fetch')
    ) {
      console.warn('[FinSight AI] Live backend unreachable, activating zero-downtime simulation engine.');
      return { data: generateDemoPortfolio(params.tickers), isDemo: true };
    }
    throw err;
  }
}

// ==================== AI INSIGHTS API ====================
export async function getNewsSentiment(ticker: string): Promise<{ data: SentimentData; isDemo?: boolean }> {
  const res = await fetchWithDiagnostics(
    `${API_BASE_URL}/api/ai/sentiment`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker })
    },
    20000,
    'Sentiment analysis'
  );

  const data = await handleResponse(res, 'Sentiment analysis failed');
  return { data, isDemo: false };
}

export async function getTradeSignal(ticker: string): Promise<{ data: TradeSignalData; isDemo?: boolean }> {
  const res = await fetchWithDiagnostics(
    `${API_BASE_URL}/api/ai/signal`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker })
    },
    20000,
    'Signal prediction'
  );

  const data = await handleResponse(res, 'Signal prediction failed');
  return { data, isDemo: false };
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
}

// ==================== TFT / MULTI-FACTOR REGIME API ====================
export async function analyzeTft(ticker: string): Promise<{ data: TftData; isDemo?: boolean }> {
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
}

// ==================== PERSISTED PORTFOLIOS API ====================
export async function listSavedPortfolios(): Promise<SavedPortfolio[]> {
  const res = await fetchWithDiagnostics(
    `${API_BASE_URL}/api/portfolios`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    },
    10000,
    'List portfolios'
  );
  const data = await handleResponse(res, 'Failed to list saved portfolios');
  return data || [];
}

export async function savePortfolio(payload: {
  name: string;
  description?: string;
  items: { ticker: string; target_weight: number; asset_class?: string }[];
}): Promise<SavedPortfolio> {
  const res = await fetchWithDiagnostics(
    `${API_BASE_URL}/api/portfolios`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    },
    15000,
    'Save portfolio'
  );
  return await handleResponse(res, 'Failed to save portfolio');
}

export async function deleteSavedPortfolio(id: number): Promise<boolean> {
  const res = await fetchWithDiagnostics(
    `${API_BASE_URL}/api/portfolios/${id}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    },
    10000,
    'Delete portfolio'
  );
  await handleResponse(res, 'Failed to delete portfolio');
  return true;
}

// ==================== WATCHLIST API ====================
export async function listWatchlists(): Promise<Watchlist[]> {
  const res = await fetchWithDiagnostics(
    `${API_BASE_URL}/api/watchlists`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    },
    10000,
    'List watchlists'
  );
  const data = await handleResponse(res, 'Failed to list watchlists');
  return data || [];
}

export async function createWatchlist(name: string): Promise<Watchlist> {
  const res = await fetchWithDiagnostics(
    `${API_BASE_URL}/api/watchlists`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    },
    10000,
    'Create watchlist'
  );
  return await handleResponse(res, 'Failed to create watchlist');
}

export async function addWatchlistItem(watchlistId: number, ticker: string, notes?: string) {
  const res = await fetchWithDiagnostics(
    `${API_BASE_URL}/api/watchlists/${watchlistId}/items`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, notes })
    },
    10000,
    'Add watchlist item'
  );
  return await handleResponse(res, 'Failed to add item to watchlist');
}

export async function deleteWatchlistItem(watchlistId: number, itemId: number): Promise<boolean> {
  const res = await fetchWithDiagnostics(
    `${API_BASE_URL}/api/watchlists/${watchlistId}/items/${itemId}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    },
    10000,
    'Delete watchlist item'
  );
  await handleResponse(res, 'Failed to remove item from watchlist');
  return true;
}
