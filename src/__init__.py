"""
Stock Portfolio Analysis Package
Uses PEP 562 module __getattr__ lazy-loading to eliminate circular dependencies,
prevent heavy DLL load failures, and ensure lightweight, fast startups.
"""

def __getattr__(name):
    if name == 'DataFetcher':
        from .data_fetcher import DataFetcher
        return DataFetcher
    elif name == 'PolygonClient':
        from .polygon_client import PolygonClient
        return PolygonClient
    elif name == 'ReturnsAnalysis':
        from .returns_analysis import ReturnsAnalysis
        return ReturnsAnalysis
    elif name == 'RiskMetrics':
        from .risk_metrics import RiskMetrics
        return RiskMetrics
    elif name == 'CorrelationAnalysis':
        from .correlation_analysis import CorrelationAnalysis
        return CorrelationAnalysis
    elif name == 'PortfolioOptimizer':
        from .portfolio_optimizer import PortfolioOptimizer
        return PortfolioOptimizer
    elif name == 'StressTesting':
        from .stress_testing import StressTesting
        return StressTesting
    elif name in ('SentimentAnalyzer', 'NeuralNetForecaster', 'TrendClassifier', 'LSTMForecaster', 'FinBERTAnalyzer'):
        from . import ai_features
        return getattr(ai_features, name)
    raise AttributeError(f"module 'src' has no attribute '{name}'")

__all__ = [
    'DataFetcher',
    'PolygonClient',
    'ReturnsAnalysis', 
    'RiskMetrics',
    'CorrelationAnalysis',
    'PortfolioOptimizer',
    'StressTesting',
    'SentimentAnalyzer',
    'NeuralNetForecaster',
    'TrendClassifier',
    'LSTMForecaster',
    'FinBERTAnalyzer'
]
