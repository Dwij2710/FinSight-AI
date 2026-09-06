from fastapi import APIRouter, HTTPException
import pandas as pd
import numpy as np
import datetime
import sys
from pathlib import Path

# Add project root to sys.path
_PROJECT_ROOT = str(Path(__file__).resolve().parent.parent.parent.parent)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from src.tft_features import MultiVariateDataFetcher, MultiFactorRegimeModel
from ..schemas import TftRequest, ApiResponse
from ..services.market_data import market_data_service
from ..utils.serializer import sanitize_for_json

router = APIRouter(prefix="/api/tft", tags=["Multi-Factor Regime"])

@router.post("/analyze", response_model=ApiResponse)
async def analyze_tft(req: TftRequest):
    try:
        ticker = req.ticker.strip().upper()
        if not ticker:
            raise HTTPException(status_code=400, detail="Ticker is required.")

        fetcher = MultiVariateDataFetcher(ticker)
        data = fetcher.fetch_data()

        if data.empty or 'Price' not in data.columns:
            raise HTTPException(status_code=404, detail=f"Failed to fetch multi-variate macro data for {ticker}")

        current_price = float(data['Price'].iloc[-1])
        try:
            quote = market_data_service.get_quote(ticker)
            if quote and quote.price > 0:
                current_price = quote.price
        except Exception:
            pass
        sp_val = float(data['S&P 500'].iloc[-1]) if 'S&P 500' in data.columns else 0.0
        vix_val = float(data['VIX'].iloc[-1]) if 'VIX' in data.columns else 0.0

        model = MultiFactorRegimeModel(data)
        attention_weights = model.train_and_extract_attention()
        anomaly_data = model.detect_macro_anomaly()
        lookalike_data = model.historical_lookalike(current_price)
        regime, regime_desc = model.detect_market_regime()
        prob_forecast = model.probabilistic_forecast(current_price)

        # Pre-calculate scenario simulations
        scenarios = [
            {"name": "Interest Rate Spike (+50bps)", "sp": -2.0, "vix": 15.0, "rate": 10.0, "oil": 0.0},
            {"name": "Market Crash (S&P -10%)", "sp": -10.0, "vix": 50.0, "rate": -5.0, "oil": -8.0},
            {"name": "Oil Supply Shock (+20%)", "sp": -1.5, "vix": 8.0, "rate": 2.0, "oil": 20.0},
            {"name": "Bull Market Expansion", "sp": 5.0, "vix": -10.0, "rate": 0.0, "oil": 3.0}
        ]

        scenario_results = []
        for sc in scenarios:
            new_price, impact_pct = model.simulate_scenario_custom(
                current_price, sc["sp"], sc["vix"], sc["rate"], sc["oil"]
            )
            scenario_results.append({
                "scenario": sc["name"],
                "projected_price": round(float(new_price), 2),
                "impact_pct": round(float(impact_pct), 2)
            })

        # Macro correlation with asset price
        macro_corrs = []
        for col in data.columns:
            if col != 'Price':
                corr_val = float(data['Price'].corr(data[col]))
                macro_corrs.append({
                    "indicator": col,
                    "correlation": round(corr_val, 3),
                    "latest_value": round(float(data[col].iloc[-1]), 2)
                })

        # Recent 30-day normalized trends for charting
        recent_30 = data.tail(30).copy()
        norm_recent = recent_30 / recent_30.iloc[0] * 100
        chart_dates = [d.strftime('%Y-%m-%d') for d in recent_30.index]
        chart_series = {col: [round(float(v), 2) for v in norm_recent[col]] for col in norm_recent.columns}

        now_ts = datetime.datetime.utcnow().isoformat() + "Z"
        return ApiResponse(
            success=True,
            data_source="live",
            fetched_at=now_ts,
            data=sanitize_for_json({
                "ticker": ticker,
                "current_price": round(current_price, 2),
                "sp500_price": round(sp_val, 2),
                "vix": round(vix_val, 2),
                "regime": regime,
                "regime_desc": regime_desc,
                "data_source": "live",
                "fetched_at": now_ts,
                "attention_weights": [
                    {"factor": k, "weight_pct": round(float(v * 100), 2)}
                    for k, v in attention_weights.items()
                ],
                "anomaly_analysis": {
                    "is_anomaly": anomaly_data.get('is_anomaly', False),
                    "risk_score": round(float(anomaly_data.get('risk_score', 0.0)), 1),
                    "message": anomaly_data.get('message', ''),
                    "scanned_at": now_ts
                },
                "lookalike": lookalike_data,
                "probabilistic_forecast": prob_forecast,
                "scenarios": scenario_results,
                "macro_correlations": macro_corrs,
                "macro_chart": {
                    "dates": chart_dates,
                    "series": chart_series
                }
            })
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        return ApiResponse(success=False, message=f"TFT analysis failed: {str(e)}\n{traceback.format_exc()}")
