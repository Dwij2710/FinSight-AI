"""
FinSight AI — Multi-Condition Alert Evaluation Engine
Evaluates market and quantitative conditions against real-time stock state:
- Price thresholds (PRICE_ABOVE, PRICE_BELOW)
- Daily percentage change (PCT_CHANGE_ABOVE, PCT_CHANGE_BELOW)
- Composite FinSight AI Score thresholds (SCORE_ABOVE, SCORE_BELOW)
- Technical RSI thresholds (RSI_OVERBOUGHT, RSI_OVERSOLD)
"""

from typing import Dict, Any, Tuple, Optional
import math


VALID_CONDITION_TYPES = {
    "PRICE_ABOVE": "Price rises to or above target threshold",
    "PRICE_BELOW": "Price drops to or below target threshold",
    "PCT_CHANGE_ABOVE": "24h price change % rises above threshold",
    "PCT_CHANGE_BELOW": "24h price change % drops below threshold",
    "SCORE_ABOVE": "FinSight AI composite score rises to or above threshold",
    "SCORE_BELOW": "FinSight AI composite score drops to or below threshold",
    "RSI_OVERBOUGHT": "RSI(14) rises to or above threshold (e.g. 70)",
    "RSI_OVERSOLD": "RSI(14) drops to or below threshold (e.g. 30)",
}


def evaluate_alert_condition(
    condition_type: str,
    threshold_value: float,
    current_price: Optional[float] = None,
    pct_change: Optional[float] = None,
    score: Optional[float] = None,
    rsi: Optional[float] = None,
) -> Tuple[bool, str]:
    """
    Evaluates whether a multi-condition alert is triggered.
    
    Returns:
        (is_triggered: bool, trigger_message: str)
    """
    cond = condition_type.upper().strip()
    
    if cond not in VALID_CONDITION_TYPES:
        return False, f"Unknown condition type: {cond}"

    if cond == "PRICE_ABOVE":
        if current_price is None or math.isnan(current_price):
            return False, "Price data unavailable"
        if current_price >= threshold_value:
            return True, f"Price ${current_price:.2f} reached or exceeded target ${threshold_value:.2f}"
        return False, ""

    elif cond == "PRICE_BELOW":
        if current_price is None or math.isnan(current_price):
            return False, "Price data unavailable"
        if current_price <= threshold_value:
            return True, f"Price ${current_price:.2f} reached or dropped below target ${threshold_value:.2f}"
        return False, ""

    elif cond == "PCT_CHANGE_ABOVE":
        if pct_change is None or math.isnan(pct_change):
            return False, "Percentage change data unavailable"
        if pct_change >= threshold_value:
            return True, f"24h change +{pct_change:.2f}% exceeded threshold +{threshold_value:.2f}%"
        return False, ""

    elif cond == "PCT_CHANGE_BELOW":
        if pct_change is None or math.isnan(pct_change):
            return False, "Percentage change data unavailable"
        if pct_change <= threshold_value:
            return True, f"24h change {pct_change:.2f}% dropped below threshold {threshold_value:.2f}%"
        return False, ""

    elif cond == "SCORE_ABOVE":
        if score is None or math.isnan(score):
            return False, "FinSight AI Score unavailable"
        if score >= threshold_value:
            return True, f"FinSight AI Score {score:.1f} reached or exceeded target {threshold_value:.1f}"
        return False, ""

    elif cond == "SCORE_BELOW":
        if score is None or math.isnan(score):
            return False, "FinSight AI Score unavailable"
        if score <= threshold_value:
            return True, f"FinSight AI Score {score:.1f} dropped to or below target {threshold_value:.1f}"
        return False, ""

    elif cond == "RSI_OVERBOUGHT":
        if rsi is None or math.isnan(rsi):
            return False, "RSI data unavailable"
        if rsi >= threshold_value:
            return True, f"RSI {rsi:.1f} reached overbought threshold >= {threshold_value:.1f}"
        return False, ""

    elif cond == "RSI_OVERSOLD":
        if rsi is None or math.isnan(rsi):
            return False, "RSI data unavailable"
        if rsi <= threshold_value:
            return True, f"RSI {rsi:.1f} dropped into oversold threshold <= {threshold_value:.1f}"
        return False, ""

    return False, ""
