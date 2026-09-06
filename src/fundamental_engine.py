"""
FinSight AI - Institutional Fundamental Analysis Engine (FUND-01)
Extracts and computes comprehensive corporate valuation multiples, profitability ratios,
balance sheet solvency metrics, growth indicators, and financial health scores.
Guarantees transparent handling of missing metrics (e.g. ETFs, negative earnings).
"""

import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple

class FundamentalAnalysisEngine:
    """
    Evaluates corporate financial statements and calculates institutional health scores.
    """

    def __init__(self):
        # Sector benchmark medians for relative comparison
        self.sector_benchmarks = {
            "Technology": {"pe": 28.0, "ps": 6.5, "pb": 7.0, "roe": 22.0, "margin": 20.0, "de": 0.6},
            "Healthcare": {"pe": 24.0, "ps": 4.5, "pb": 4.0, "roe": 15.0, "margin": 14.0, "de": 0.8},
            "Financial Services": {"pe": 13.5, "ps": 2.8, "pb": 1.3, "roe": 12.0, "margin": 25.0, "de": 1.5},
            "Consumer Cyclical": {"pe": 20.0, "ps": 2.0, "pb": 4.5, "roe": 18.0, "margin": 9.0, "de": 1.0},
            "Communication Services": {"pe": 22.0, "ps": 3.8, "pb": 3.5, "roe": 16.0, "margin": 17.0, "de": 0.9},
            "Industrials": {"pe": 19.0, "ps": 1.8, "pb": 3.2, "roe": 14.0, "margin": 10.0, "de": 1.1},
            "Energy": {"pe": 11.0, "ps": 1.2, "pb": 1.8, "roe": 16.0, "margin": 12.0, "de": 0.5},
            "Default": {"pe": 20.0, "ps": 3.0, "pb": 3.0, "roe": 15.0, "margin": 12.0, "de": 0.8}
        }

    def analyze_ticker(self, ticker: str) -> Dict[str, Any]:
        sym = ticker.strip().upper()
        ticker_obj = yf.Ticker(sym)

        info = {}
        try:
            info = ticker_obj.info or {}
        except Exception:
            info = {}

        if not info or len(info) < 5:
            raise ValueError(f"Fundamental financial data unavailable for '{sym}'. Asset may be an unlisted security or index.")

        sector = info.get("sector") or "General Equity"
        benchmarks = self.sector_benchmarks.get(sector, self.sector_benchmarks["Default"])

        # 1. Valuation Metrics
        trailing_pe = self._safe_float(info.get("trailingPE"))
        forward_pe = self._safe_float(info.get("forwardPE"))
        peg_ratio = self._safe_float(info.get("pegRatio"))
        ps_ratio = self._safe_float(info.get("priceToSalesTrailing12Months"))
        pb_ratio = self._safe_float(info.get("priceToBook"))
        ev_ebitda = self._safe_float(info.get("enterpriseToEbitda"))
        market_cap = self._safe_float(info.get("marketCap"))
        enterprise_val = self._safe_float(info.get("enterpriseValue"))

        valuation = {
            "trailing_pe": trailing_pe,
            "forward_pe": forward_pe,
            "peg_ratio": peg_ratio,
            "price_to_sales": ps_ratio,
            "price_to_book": pb_ratio,
            "ev_to_ebitda": ev_ebitda,
            "market_cap_billions": round(market_cap / 1e9, 2) if market_cap else None,
            "enterprise_value_billions": round(enterprise_val / 1e9, 2) if enterprise_val else None,
            "benchmark_pe": benchmarks["pe"],
            "pe_status": "Undervalued" if trailing_pe and trailing_pe < benchmarks["pe"] else ("Overvalued" if trailing_pe and trailing_pe > benchmarks["pe"] * 1.3 else "In-Line")
        }

        # 2. Profitability & Margins
        roe = self._safe_float(info.get("returnOnEquity"))
        roa = self._safe_float(info.get("returnOnAssets"))
        operating_margin = self._safe_float(info.get("operatingMargins"))
        profit_margin = self._safe_float(info.get("profitMargins"))
        gross_margin = self._safe_float(info.get("grossMargins"))

        profitability = {
            "return_on_equity_pct": round(roe * 100, 2) if roe is not None else None,
            "return_on_assets_pct": round(roa * 100, 2) if roa is not None else None,
            "operating_margin_pct": round(operating_margin * 100, 2) if operating_margin is not None else None,
            "net_profit_margin_pct": round(profit_margin * 100, 2) if profit_margin is not None else None,
            "gross_margin_pct": round(gross_margin * 100, 2) if gross_margin is not None else None,
            "benchmark_roe_pct": benchmarks["roe"],
            "roe_quality": "High" if roe and (roe * 100) >= benchmarks["roe"] else "Moderate"
        }

        # 3. Solvency & Balance Sheet
        total_cash = self._safe_float(info.get("totalCash"))
        total_debt = self._safe_float(info.get("totalDebt"))
        raw_de = self._safe_float(info.get("debtToEquity"))
        debt_to_equity = round(raw_de / 100, 2) if raw_de and raw_de > 10 else raw_de
        current_ratio = self._safe_float(info.get("currentRatio"))
        quick_ratio = self._safe_float(info.get("quickRatio"))
        free_cash_flow = self._safe_float(info.get("freeCashflow"))

        solvency = {
            "total_cash_billions": round(total_cash / 1e9, 2) if total_cash else None,
            "total_debt_billions": round(total_debt / 1e9, 2) if total_debt else None,
            "net_debt_billions": round((total_debt - total_cash) / 1e9, 2) if total_debt and total_cash else None,
            "debt_to_equity": debt_to_equity,
            "current_ratio": current_ratio,
            "quick_ratio": quick_ratio,
            "free_cash_flow_billions": round(free_cash_flow / 1e9, 2) if free_cash_flow else None,
            "balance_sheet_strength": "Fortress" if (debt_to_equity is not None and debt_to_equity <= 0.6) and (current_ratio is not None and current_ratio >= 1.3) else "Adequate"
        }

        # 4. Growth & Dividends
        rev_growth = self._safe_float(info.get("revenueGrowth"))
        earnings_growth = self._safe_float(info.get("earningsGrowth"))
        div_yield = self._safe_float(info.get("dividendYield"))
        payout_ratio = self._safe_float(info.get("payoutRatio"))

        growth_dividends = {
            "quarterly_revenue_growth_yoy_pct": round(rev_growth * 100, 2) if rev_growth is not None else None,
            "quarterly_earnings_growth_yoy_pct": round(earnings_growth * 100, 2) if earnings_growth is not None else None,
            "dividend_yield_pct": round(div_yield * 100, 2) if div_yield is not None else 0.0,
            "payout_ratio_pct": round(payout_ratio * 100, 2) if payout_ratio is not None else None
        }

        # 5. Financial Health Rating (0–100)
        health_score, rating_label, rating_color = self._compute_health_score(
            trailing_pe, benchmarks["pe"], roe, operating_margin, debt_to_equity, current_ratio, rev_growth
        )

        # 6. Qualitative Institutional Synthesis
        co_name = info.get("longName") or info.get("shortName") or sym
        summary = (
            f"{co_name} ({sym}) holds a Fundamental Health Score of {health_score}/100 ({rating_label}) in the {sector} sector. "
            f"Trading at {trailing_pe}x trailing P/E (Sector median: {benchmarks['pe']}x) with an operating margin of "
            f"{profitability['operating_margin_pct']}% and Debt/Equity of {debt_to_equity}x."
        )

        return {
            "ticker": sym,
            "company_name": co_name,
            "sector": sector,
            "industry": info.get("industry") or "General",
            "currency": info.get("currency") or "USD",
            "health_score": health_score,
            "health_rating": rating_label,
            "health_color": rating_color,
            "as_of_date": datetime.utcnow().strftime('%Y-%m-%d'),
            "valuation": valuation,
            "profitability": profitability,
            "solvency": solvency,
            "growth_and_dividends": growth_dividends,
            "synthesis": summary
        }

    def _safe_float(self, val: Any) -> Optional[float]:
        if val is None:
            return None
        try:
            f = float(val)
            if np.isnan(f) or np.isinf(f):
                return None
            return round(f, 4)
        except (ValueError, TypeError):
            return None

    def _compute_health_score(
        self,
        pe: Optional[float],
        bench_pe: float,
        roe: Optional[float],
        margin: Optional[float],
        de: Optional[float],
        cr: Optional[float],
        rev_growth: Optional[float]
    ) -> Tuple[float, str, str]:
        score = 50.0

        # Valuation component (20 pts)
        if pe and pe > 0:
            if pe <= bench_pe * 0.8:
                score += 15.0
            elif pe <= bench_pe * 1.2:
                score += 8.0
            elif pe > bench_pe * 2.0:
                score -= 10.0
        elif pe and pe <= 0:
            score -= 8.0

        # Profitability & Margins (30 pts)
        if roe is not None:
            if roe >= 0.20:
                score += 15.0
            elif roe >= 0.10:
                score += 8.0
            elif roe < 0:
                score -= 12.0

        if margin is not None:
            if margin >= 0.20:
                score += 15.0
            elif margin >= 0.08:
                score += 8.0
            elif margin < 0:
                score -= 12.0

        # Solvency (25 pts)
        if de is not None:
            if de <= 0.5:
                score += 12.0
            elif de <= 1.2:
                score += 6.0
            elif de > 2.5:
                score -= 12.0

        if cr is not None:
            if cr >= 1.5:
                score += 13.0
            elif cr >= 1.0:
                score += 6.0
            elif cr < 0.8:
                score -= 10.0

        # Growth (15 pts)
        if rev_growth is not None:
            if rev_growth >= 0.15:
                score += 15.0
            elif rev_growth >= 0.05:
                score += 8.0
            elif rev_growth < -0.05:
                score -= 10.0

        final_score = round(float(max(0.0, min(100.0, score))), 1)

        if final_score >= 80.0:
            return final_score, "Excellent", "#10B981"
        elif final_score >= 65.0:
            return final_score, "Good", "#00F2FE"
        elif final_score >= 45.0:
            return final_score, "Fair", "#94A3B8"
        elif final_score >= 30.0:
            return final_score, "Weak", "#F59E0B"
        else:
            return final_score, "Distressed", "#F43F5E"

fundamental_engine = FundamentalAnalysisEngine()
