from fastapi import APIRouter, HTTPException
import yfinance as yf
import pandas as pd
import numpy as np
import datetime
import sys
from pathlib import Path

# Add project root to sys.path
_PROJECT_ROOT = str(Path(__file__).resolve().parent.parent.parent.parent)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from src.ai_features import SentimentAnalyzer, FinBERTAnalyzer, TrendClassifier
from ..schemas import SentimentRequest, SignalRequest, ApiResponse
from ..utils.serializer import sanitize_for_json

router = APIRouter(prefix="/api/ai", tags=["AI Insights"])

@router.post("/sentiment", response_model=ApiResponse)
async def analyze_sentiment(req: SentimentRequest):
    try:
        ticker = req.ticker.strip().upper()
        if not ticker:
            raise HTTPException(status_code=400, detail="Ticker symbol is required.")

        analyzer = FinBERTAnalyzer(ticker)
        sentiment_df, model_used = analyzer.get_news_sentiment()

        if sentiment_df.empty:
            return ApiResponse(
                success=True,
                data={
                    "ticker": ticker,
                    "model_used": model_used,
                    "overall_score": 0.0,
                    "overall_label": "Neutral",
                    "counts": {"Positive": 0, "Neutral": 0, "Negative": 0},
                    "articles": []
                }
            )

        avg_score = float(sentiment_df['Sentiment Score'].mean())
        if avg_score > 0.05:
            overall_label = "Positive"
        elif avg_score < -0.05:
            overall_label = "Negative"
        else:
            overall_label = "Neutral"

        counts = sentiment_df['Sentiment'].value_counts().to_dict()

        articles = sentiment_df.to_dict(orient='records')

        return ApiResponse(
            success=True,
            data=sanitize_for_json({
                "ticker": ticker,
                "model_used": model_used,
                "overall_score": round(avg_score, 3),
                "overall_label": overall_label,
                "counts": {
                    "Positive": int(counts.get("Positive", 0)),
                    "Neutral": int(counts.get("Neutral", 0)),
                    "Negative": int(counts.get("Negative", 0))
                },
                "articles": articles
            })
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        return ApiResponse(success=False, message=f"Sentiment analysis failed: {str(e)}\n{traceback.format_exc()}")

@router.post("/signal", response_model=ApiResponse)
async def predict_trade_signal(req: SignalRequest):
    try:
        ticker = req.ticker.strip().upper()
        if not ticker:
            raise HTTPException(status_code=400, detail="Ticker symbol is required.")

        end = datetime.date.today()
        start = end - datetime.timedelta(days=365 * 2)
        data = yf.download(ticker, start=start, end=end, progress=False)

        if data.empty:
            raise HTTPException(status_code=404, detail=f"No price history found for {ticker}")

        # Extract close price series
        if isinstance(data.columns, pd.MultiIndex):
            if 'Close' in data.columns.get_level_values(0):
                close_series = data['Close'].iloc[:, 0] if isinstance(data['Close'], pd.DataFrame) else data['Close']
            else:
                close_series = data.iloc[:, 0]
        elif 'Close' in data.columns:
            close_series = data['Close']
        else:
            close_series = data.iloc[:, 0]

        classifier = TrendClassifier(close_series)
        signal, confidence, accuracy, feature_importance = classifier.predict_trend()

        if signal is None:
            raise HTTPException(status_code=400, detail="Insufficient data points to generate AI trade signal.")

        feat_list = []
        if feature_importance:
            feat_list = [
                {"feature": str(k), "importance": round(float(v) * 100, 2)}
                for k, v in feature_importance.items()
            ]

        # Calculate current indicators for context
        df_ind = classifier.add_indicators()
        last_row = df_ind.iloc[-1] if not df_ind.empty else {}

        current_rsi = float(last_row.get('RSI', 50.0)) if 'RSI' in last_row else None
        current_sma20 = float(last_row.get('SMA_20', 0.0)) if 'SMA_20' in last_row else None
        current_sma50 = float(last_row.get('SMA_50', 0.0)) if 'SMA_50' in last_row else None

        return ApiResponse(
            success=True,
            data=sanitize_for_json({
                "ticker": ticker,
                "signal": signal,
                "confidence_pct": round(float(confidence) * 100, 1),
                "accuracy_pct": round(float(accuracy) * 100, 1),
                "is_strong": bool(confidence > 0.6),
                "feature_importance": feat_list,
                "technical_indicators": {
                    "rsi": round(current_rsi, 2) if current_rsi else None,
                    "sma_20": round(current_sma20, 2) if current_sma20 else None,
                    "sma_50": round(current_sma50, 2) if current_sma50 else None
                }
            })
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        return ApiResponse(success=False, message=f"Trade signal generation failed: {str(e)}\n{traceback.format_exc()}")
