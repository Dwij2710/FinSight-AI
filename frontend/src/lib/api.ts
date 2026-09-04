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
  const res = await fetch(`${API_BASE_URL}/api/forecast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(30000)
  });

  const data = await handleResponse(res, 'Forecast calculation failed');
  return { data, isDemo: false };
}

// ==================== PORTFOLIO API ====================
export async function getPortfolioOptimization(params: {
  tickers: string[];
  start_date?: string;
  end_date?: string;
}): Promise<{ data: PortfolioData; isDemo?: boolean }> {
  const res = await fetch(`${API_BASE_URL}/api/portfolio/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(35000)
  });

  const data = await handleResponse(res, 'Portfolio optimization failed');
  return { data, isDemo: false };
}

// ==================== AI INSIGHTS API ====================
export async function getNewsSentiment(ticker: string): Promise<{ data: SentimentData; isDemo?: boolean }> {
  const res = await fetch(`${API_BASE_URL}/api/ai/sentiment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker }),
    signal: AbortSignal.timeout(20000)
  });

  const data = await handleResponse(res, 'Sentiment analysis failed');
  return { data, isDemo: false };
}

export async function getTradeSignal(ticker: string): Promise<{ data: TradeSignalData; isDemo?: boolean }> {
  const res = await fetch(`${API_BASE_URL}/api/ai/signal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker }),
    signal: AbortSignal.timeout(20000)
  });

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
  const res = await fetch(`${API_BASE_URL}/api/rl/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(45000)
  });

  const data = await handleResponse(res, 'RL simulation failed');
  return { data, isDemo: false };
}

// ==================== TFT / MULTI-FACTOR REGIME API ====================
export async function analyzeTft(ticker: string): Promise<{ data: TftData; isDemo?: boolean }> {
  const res = await fetch(`${API_BASE_URL}/api/tft/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker }),
    signal: AbortSignal.timeout(30000)
  });

  const data = await handleResponse(res, 'Multi-Factor Regime analysis failed');
  return { data, isDemo: false };
}

// ==================== PERSISTED PORTFOLIOS API ====================
export async function listSavedPortfolios(): Promise<SavedPortfolio[]> {
  const res = await fetch(`${API_BASE_URL}/api/portfolios`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(10000)
  });
  const data = await handleResponse(res, 'Failed to list saved portfolios');
  return data || [];
}

export async function savePortfolio(payload: {
  name: string;
  description?: string;
  items: { ticker: string; target_weight: number; asset_class?: string }[];
}): Promise<SavedPortfolio> {
  const res = await fetch(`${API_BASE_URL}/api/portfolios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000)
  });
  return await handleResponse(res, 'Failed to save portfolio');
}

export async function deleteSavedPortfolio(id: number): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/api/portfolios/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(10000)
  });
  await handleResponse(res, 'Failed to delete portfolio');
  return true;
}

// ==================== WATCHLIST API ====================
export async function listWatchlists(): Promise<Watchlist[]> {
  const res = await fetch(`${API_BASE_URL}/api/watchlists`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(10000)
  });
  const data = await handleResponse(res, 'Failed to list watchlists');
  return data || [];
}

export async function createWatchlist(name: string): Promise<Watchlist> {
  const res = await fetch(`${API_BASE_URL}/api/watchlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
    signal: AbortSignal.timeout(10000)
  });
  return await handleResponse(res, 'Failed to create watchlist');
}

export async function addWatchlistItem(watchlistId: number, ticker: string, notes?: string) {
  const res = await fetch(`${API_BASE_URL}/api/watchlists/${watchlistId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker, notes }),
    signal: AbortSignal.timeout(10000)
  });
  return await handleResponse(res, 'Failed to add item to watchlist');
}

export async function deleteWatchlistItem(watchlistId: number, itemId: number): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/api/watchlists/${watchlistId}/items/${itemId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(10000)
  });
  await handleResponse(res, 'Failed to remove item from watchlist');
  return true;
}
