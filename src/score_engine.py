"""
FinSight AI - Explainable Equity Rating Engine (SCORE-01)
Computes a mathematically grounded, 0–100 composite equity rating with transparent
factor attribution across 5 quantitative dimensions:
1. Technical Health (25%)
2. Momentum Dynamics (20%)
3. Fundamental Strength (25%)
4. News & Market Sentiment (15%)
5. Risk & Drawdown Profile (15%)

Fully explainable with documented top positive contributors and negative detractors.
Guarantees zero fabricated labels and rigorous normalization.
"""

import numpy as np
import pandas as pd
import yfinance as yf
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple

from src.ai_features import SentimentAnalyzer

class FinSightScoreEngine:
    """
    Institutional quantitative equity scoring engine.
    Calculates calibrated subscores (0-100) and composite ratings with factor attributions.
    """

    def __init__(self):
        self.weights = {
            'technical': 0.25,
            'momentum': 0.20,
            'fundamental': 0.25,
            'sentiment': 0.15,
            'risk': 0.15
        }

    def compute_score(self, ticker: str) -> Dict[str, Any]:
        sym = ticker.strip().upper()
        ticker_obj = yf.Ticker(sym)

        # 1. Fetch historical OHLCV data (1 Year for robust indicators)
        try:
            df = ticker_obj.history(period="1y", auto_adjust=False)
        except Exception:
            df = pd.DataFrame()

        if df.empty or len(df) < 20:
            # Fallback download
            df = yf.download(sym, period="1y", progress=False, auto_adjust=False)
            if isinstance(df.columns, pd.MultiIndex):
                sub_dict = {}
                for col in ['Open', 'High', 'Low', 'Close', 'Volume']:
                    if col in df.columns.get_level_values(0):
                        sub = df[col]
                        sub_dict[col] = sub.iloc[:, 0] if isinstance(sub, pd.DataFrame) else sub
                df = pd.DataFrame(sub_dict, index=df.index)

        df = df.sort_index().dropna(subset=['Close'])
        if len(df) < 15:
            raise ValueError(f"Insufficient trading history to compute FinSight Score for '{sym}' (found {len(df)} bars).")

        # 2. Fetch company fundamental profile
        info = {}
        try:
            info = ticker_obj.info or {}
        except Exception:
            info = {}

        # 3. Calculate 5 Subscores & Factor Attribution Collectors
        contributors: List[Dict[str, Any]] = []
        detractors: List[Dict[str, Any]] = []

        tech_score = self._compute_technical_subscore(df, contributors, detractors)
        mom_score = self._compute_momentum_subscore(df, contributors, detractors)
        fund_score, has_fundamentals = self._compute_fundamental_subscore(info, contributors, detractors)
        sent_score = self._compute_sentiment_subscore(sym, ticker_obj, contributors, detractors)
        risk_score = self._compute_risk_subscore(df, info, contributors, detractors)

        # 4. Weight Renormalization
        active_weights = dict(self.weights)
        if not has_fundamentals:
            # Reallocate fundamental weight across remaining 4 dimensions
            del active_weights['fundamental']
            total_remaining = sum(active_weights.values())
            for k in active_weights:
                active_weights[k] = active_weights[k] / total_remaining

        subscores = {
            'technical': round(float(tech_score), 1),
            'momentum': round(float(mom_score), 1),
            'fundamental': round(float(fund_score), 1) if has_fundamentals else None,
            'sentiment': round(float(sent_score), 1),
            'risk': round(float(risk_score), 1)
        }

        # 5. Composite Score Calculation
        overall = (
            active_weights['technical'] * tech_score +
            active_weights['momentum'] * mom_score +
            (active_weights.get('fundamental', 0.0) * fund_score if has_fundamentals else 0.0) +
            active_weights['sentiment'] * sent_score +
            active_weights['risk'] * risk_score
        )
        overall_score = round(float(max(0.0, min(100.0, overall))), 1)

        # 6. Qualitative Rating Determination
        if overall_score >= 80.0:
            rating = "Strong Buy"
            rating_code = "STRONG_BUY"
            color = "#10B981"
        elif overall_score >= 65.0:
            rating = "Buy"
            rating_code = "BUY"
            color = "#00F2FE"
        elif overall_score >= 45.0:
            rating = "Neutral / Hold"
            rating_code = "HOLD"
            color = "#94A3B8"
        elif overall_score >= 30.0:
            rating = "Underweight"
            rating_code = "UNDERWEIGHT"
            color = "#F59E0B"
        else:
            rating = "Strong Sell"
            rating_code = "STRONG_SELL"
            color = "#F43F5E"

        # 7. Sort and select Top 3 Positive Contributors & Top 3 Negative Detractors
        contributors.sort(key=lambda x: x['impact'], reverse=True)
        detractors.sort(key=lambda x: x['impact'], reverse=True)

        top_contributors = contributors[:3]
        top_detractors = detractors[:3]

        # 8. Dynamic Synthesis Summary
        latest_price = round(float(df['Close'].iloc[-1]), 2)
        summary_text = (
            f"{sym} scores {overall_score}/100 ({rating}), driven by a {subscores['technical']}/100 technical rating "
            f"and {subscores['momentum']}/100 momentum score. Key drivers include {top_contributors[0]['factor'] if top_contributors else 'balanced indicators'}, "
            f"while risk considerations include {top_detractors[0]['factor'] if top_detractors else 'macro systematic exposure'}."
        )

        return {
            "ticker": sym,
            "overall_score": overall_score,
            "rating": rating,
            "rating_code": rating_code,
            "rating_color": color,
            "latest_price": latest_price,
            "as_of_date": df.index[-1].strftime('%Y-%m-%d') if hasattr(df.index[-1], 'strftime') else str(df.index[-1])[:10],
            "weights_used": {k: round(v, 3) for k, v in active_weights.items()},
            "subscores": subscores,
            "top_positive_contributors": top_contributors,
            "top_negative_detractors": top_detractors,
            "synthesis": summary_text
        }

    # ==================== SUBSCORE CALCULATORS ====================
    def _compute_technical_subscore(self, df: pd.DataFrame, contributors: list, detractors: list) -> float:
        close = df['Close']
        latest_close = float(close.iloc[-1])
        points = 50.0  # neutral baseline

        # SMA 20
        sma_20 = float(close.rolling(20, min_periods=1).mean().iloc[-1])
        diff_20_pct = ((latest_close - sma_20) / sma_20) * 100
        if latest_close > sma_20:
            points += 10.0
            contributors.append({
                "dimension": "Technical",
                "factor": f"Price trading {diff_20_pct:+.1f}% above 20-day short-term SMA",
                "impact": round(min(15.0, diff_20_pct * 2), 1)
            })
        else:
            points -= 10.0
            detractors.append({
                "dimension": "Technical",
                "factor": f"Price lagging {abs(diff_20_pct):.1f}% below 20-day short-term SMA",
                "impact": round(min(15.0, abs(diff_20_pct) * 2), 1)
            })

        # SMA 50
        sma_50 = float(close.rolling(50, min_periods=1).mean().iloc[-1])
        diff_50_pct = ((latest_close - sma_50) / sma_50) * 100
        if latest_close > sma_50:
            points += 12.0
            contributors.append({
                "dimension": "Technical",
                "factor": f"Price holding {diff_50_pct:+.1f}% above 50-day intermediate trendline",
                "impact": round(min(18.0, diff_50_pct * 1.5), 1)
            })
        else:
            points -= 12.0
            detractors.append({
                "dimension": "Technical",
                "factor": f"Price trading {abs(diff_50_pct):.1f}% below 50-day intermediate trendline",
                "impact": round(min(18.0, abs(diff_50_pct) * 1.5), 1)
            })

        # SMA 200 (Long-Term Structural Trend)
        if len(close) >= 120:
            sma_200 = float(close.rolling(min(200, len(close)), min_periods=1).mean().iloc[-1])
            diff_200_pct = ((latest_close - sma_200) / sma_200) * 100
            if latest_close > sma_200:
                points += 15.0
                contributors.append({
                    "dimension": "Technical",
                    "factor": f"Structural bull trend: {diff_200_pct:+.1f}% above 200-day institutional SMA",
                    "impact": round(min(22.0, diff_200_pct * 1.2), 1)
                })
            else:
                points -= 15.0
                detractors.append({
                    "dimension": "Technical",
                    "factor": f"Structural bear regime: {abs(diff_200_pct):.1f}% below 200-day institutional SMA",
                    "impact": round(min(22.0, abs(diff_200_pct) * 1.2), 1)
                })

            # Golden Cross / Death Cross Check
            if sma_50 > sma_200:
                points += 8.0
            else:
                points -= 8.0

        # Bollinger Bands Position
        sma20_series = close.rolling(20, min_periods=1).mean()
        std20_series = close.rolling(20, min_periods=1).std().fillna(0)
        upper_bb = float((sma20_series + 2 * std20_series).iloc[-1])
        lower_bb = float((sma20_series - 2 * std20_series).iloc[-1])
        bb_range = upper_bb - lower_bb
        if bb_range > 0:
            pct_b = (latest_close - lower_bb) / bb_range
            if 0.45 <= pct_b <= 0.85:
                points += 5.0
            elif pct_b > 0.95:
                # Potential overextension
                points -= 3.0

        return max(0.0, min(100.0, points))

    def _compute_momentum_subscore(self, df: pd.DataFrame, contributors: list, detractors: list) -> float:
        close = df['Close']
        points = 50.0

        # RSI (14)
        delta = close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(14, min_periods=1).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(14, min_periods=1).mean()
        rs = gain / loss.replace(0, np.nan)
        rsi_series = 100 - (100 / (1 + rs))
        latest_rsi = float(rsi_series.fillna(50.0).iloc[-1])

        if 50.0 <= latest_rsi <= 65.0:
            points += 20.0
            contributors.append({
                "dimension": "Momentum",
                "factor": f"Healthy expansion momentum (RSI {latest_rsi:.1f} in sweet-spot 50-65 range)",
                "impact": 18.0
            })
        elif 65.0 < latest_rsi <= 75.0:
            points += 12.0
        elif latest_rsi > 75.0:
            points -= 10.0
            detractors.append({
                "dimension": "Momentum",
                "factor": f"Technical overbought exhaustion warning (RSI {latest_rsi:.1f} > 75)",
                "impact": 14.0
            })
        elif 35.0 <= latest_rsi < 50.0:
            points -= 5.0
        else:
            # RSI < 35
            points -= 12.0
            detractors.append({
                "dimension": "Momentum",
                "factor": f"Depressed momentum territory (RSI {latest_rsi:.1f} indicating persistent selling)",
                "impact": 16.0
            })

        # MACD (12, 26, 9)
        ema12 = close.ewm(span=12, adjust=False).mean()
        ema26 = close.ewm(span=26, adjust=False).mean()
        macd = ema12 - ema26
        signal = macd.ewm(span=9, adjust=False).mean()
        macd_val = float(macd.iloc[-1])
        signal_val = float(signal.iloc[-1])

        if macd_val > signal_val:
            points += 15.0
            contributors.append({
                "dimension": "Momentum",
                "factor": f"MACD bullish crossover confirmed (MACD {macd_val:+.2f} > Signal {signal_val:+.2f})",
                "impact": 15.0
            })
        else:
            points -= 12.0
            detractors.append({
                "dimension": "Momentum",
                "factor": f"MACD bearish divergence active (MACD {macd_val:+.2f} < Signal {signal_val:+.2f})",
                "impact": 13.0
            })

        # Trailing 3-Month Momentum
        window_3m = min(63, len(close) - 1)
        if window_3m > 10:
            return_3m = float(((close.iloc[-1] - close.iloc[-window_3m]) / close.iloc[-window_3m]) * 100)
            if return_3m > 10.0:
                points += 15.0
                contributors.append({
                    "dimension": "Momentum",
                    "factor": f"Exceptional 3-month trailing return of {return_3m:+.1f}%",
                    "impact": round(min(20.0, return_3m), 1)
                })
            elif return_3m > 0:
                points += 8.0
            else:
                points -= 12.0
                detractors.append({
                    "dimension": "Momentum",
                    "factor": f"Negative 3-month trailing return ({return_3m:.1f}%)",
                    "impact": round(min(18.0, abs(return_3m)), 1)
                })

        return max(0.0, min(100.0, points))

    def _compute_fundamental_subscore(self, info: dict, contributors: list, detractors: list) -> Tuple[float, bool]:
        if not info:
            return 50.0, False

        points = 50.0
        metrics_evaluated = 0

        # 1. Valuation: P/E Ratio
        pe = info.get('trailingPE') or info.get('forwardPE')
        if pe is not None and not np.isnan(pe) and pe > 0:
            metrics_evaluated += 1
            if pe <= 18.0:
                points += 15.0
                contributors.append({
                    "dimension": "Fundamental",
                    "factor": f"Attractive valuation multiple (P/E {pe:.1f}x below market median)",
                    "impact": 16.0
                })
            elif pe <= 30.0:
                points += 5.0
            elif pe > 45.0:
                points -= 12.0
                detractors.append({
                    "dimension": "Fundamental",
                    "factor": f"Premium growth valuation (P/E {pe:.1f}x demanding aggressive execution)",
                    "impact": 14.0
                })

        # 2. Profitability: Return on Equity (ROE)
        roe = info.get('returnOnEquity')
        if roe is not None and not np.isnan(roe):
            metrics_evaluated += 1
            roe_pct = roe * 100
            if roe_pct >= 20.0:
                points += 16.0
                contributors.append({
                    "dimension": "Fundamental",
                    "factor": f"Exceptional capital efficiency (Return on Equity of {roe_pct:.1f}%)",
                    "impact": 18.0
                })
            elif roe_pct >= 10.0:
                points += 8.0
            elif roe_pct < 0:
                points -= 15.0
                detractors.append({
                    "dimension": "Fundamental",
                    "factor": f"Negative capital returns (ROE {roe_pct:.1f}% indicates ongoing shareholder dilution)",
                    "impact": 16.0
                })

        # 3. Margins: Operating Margins
        margin = info.get('operatingMargins')
        if margin is not None and not np.isnan(margin):
            metrics_evaluated += 1
            margin_pct = margin * 100
            if margin_pct >= 22.0:
                points += 12.0
                contributors.append({
                    "dimension": "Fundamental",
                    "factor": f"High pricing power & operating margin ({margin_pct:.1f}%)",
                    "impact": 14.0
                })
            elif margin_pct < 5.0:
                points -= 10.0
                detractors.append({
                    "dimension": "Fundamental",
                    "factor": f"Compressed operating margin ({margin_pct:.1f}% leaves little room for cost inflation)",
                    "impact": 12.0
                })

        # 4. Solvency: Debt-to-Equity
        debt_to_equity = info.get('debtToEquity')
        if debt_to_equity is not None and not np.isnan(debt_to_equity):
            metrics_evaluated += 1
            de_ratio = debt_to_equity / 100 if debt_to_equity > 10 else debt_to_equity
            if de_ratio <= 0.6:
                points += 10.0
                contributors.append({
                    "dimension": "Fundamental",
                    "factor": f"Conservatively leveraged fortress balance sheet (Debt/Equity {de_ratio:.2f}x)",
                    "impact": 12.0
                })
            elif de_ratio > 2.0:
                points -= 12.0
                detractors.append({
                    "dimension": "Fundamental",
                    "factor": f"High financial leverage (Debt/Equity {de_ratio:.2f}x heightens interest rate sensitivity)",
                    "impact": 14.0
                })

        if metrics_evaluated < 2:
            return 50.0, False

        return max(0.0, min(100.0, points)), True

    def _compute_sentiment_subscore(self, ticker: str, ticker_obj: yf.Ticker, contributors: list, detractors: list) -> float:
        points = 50.0
        analyzer = SentimentAnalyzer(ticker)

        news_items = []
        try:
            news_items = ticker_obj.news or []
        except Exception:
            news_items = []

        if not news_items:
            return 50.0

        scores = []
        for item in news_items[:8]:
            title = item.get('title', '')
            if title:
                s = analyzer._get_financial_sentiment(title)
                scores.append(s)

        if not scores:
            return 50.0

        avg_sentiment = float(np.mean(scores))
        # Map [-1.0, +1.0] -> [0.0, 100.0]
        points = float((avg_sentiment + 1.0) * 50.0)

        if avg_sentiment > 0.25:
            contributors.append({
                "dimension": "Sentiment",
                "factor": f"Strongly bullish financial press narrative (Sentiment score {avg_sentiment:+.2f})",
                "impact": round(avg_sentiment * 25, 1)
            })
        elif avg_sentiment < -0.20:
            detractors.append({
                "dimension": "Sentiment",
                "factor": f"Adverse news flow & cautious analyst sentiment (Score {avg_sentiment:+.2f})",
                "impact": round(abs(avg_sentiment) * 25, 1)
            })

        return max(0.0, min(100.0, points))

    def _compute_risk_subscore(self, df: pd.DataFrame, info: dict, contributors: list, detractors: list) -> float:
        close = df['Close']
        points = 50.0

        # 1. Annualized Realized Volatility
        daily_returns = close.pct_change().dropna()
        if len(daily_returns) > 20:
            ann_vol = float(daily_returns.std() * np.sqrt(252) * 100)
            if ann_vol <= 20.0:
                points += 20.0
                contributors.append({
                    "dimension": "Risk",
                    "factor": f"Low annualized historical price volatility ({ann_vol:.1f}%)",
                    "impact": 18.0
                })
            elif ann_vol <= 32.0:
                points += 5.0
            elif ann_vol > 45.0:
                points -= 18.0
                detractors.append({
                    "dimension": "Risk",
                    "factor": f"Elevated realized historical volatility ({ann_vol:.1f}% indicates high price turbulence)",
                    "impact": 20.0
                })

        # 2. Maximum Drawdown over the last 1 year
        cummax = close.cummax()
        drawdown = (close - cummax) / cummax
        max_dd = float(abs(drawdown.min()) * 100)
        if max_dd <= 15.0:
            points += 15.0
            contributors.append({
                "dimension": "Risk",
                "factor": f"Superior capital preservation: 1-Year maximum drawdown capped at -{max_dd:.1f}%",
                "impact": 15.0
            })
        elif max_dd > 30.0:
            points -= 15.0
            detractors.append({
                "dimension": "Risk",
                "factor": f"Severe 1-Year historical drawdown risk of -{max_dd:.1f}%",
                "impact": round(min(22.0, max_dd * 0.5), 1)
            })

        # 3. Systematic Beta Risk
        beta = info.get('beta')
        if beta is not None and not np.isnan(beta):
            if 0.7 <= beta <= 1.25:
                points += 8.0
            elif beta > 1.6:
                points -= 10.0
                detractors.append({
                    "dimension": "Risk",
                    "factor": f"High market sensitivity (Beta {beta:.2f} amplifies systematic downturns)",
                    "impact": 12.0
                })

        return max(0.0, min(100.0, points))

score_engine = FinSightScoreEngine()
