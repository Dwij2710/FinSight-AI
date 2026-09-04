import math
import numpy as np
import pandas as pd
from typing import Any

def sanitize_for_json(obj: Any) -> Any:
    """
    Recursively sanitize objects containing NumPy, Pandas, NaN, Inf, and Timestamps
    into JSON-serializable standard Python data structures.
    """
    if obj is None:
        return None
    if isinstance(obj, (bool, str)):
        return obj
    if isinstance(obj, (int, np.integer)):
        return int(obj)
    if isinstance(obj, (float, np.floating)):
        if math.isnan(obj) or np.isnan(obj):
            return None
        if math.isinf(obj) or np.isinf(obj):
            return None
        return float(obj)
    if isinstance(obj, (pd.Timestamp, np.datetime64)):
        return pd.to_datetime(obj).strftime('%Y-%m-%d')
    if isinstance(obj, dict):
        return {str(k): sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple, set)):
        return [sanitize_for_json(v) for v in obj]
    if isinstance(obj, pd.DataFrame):
        df_copy = obj.copy()
        if isinstance(df_copy.index, pd.DatetimeIndex):
            df_copy = df_copy.reset_index()
            if 'index' in df_copy.columns:
                df_copy.rename(columns={'index': 'Date'}, inplace=True)
        for col in df_copy.columns:
            if pd.api.types.is_datetime64_any_dtype(df_copy[col]):
                df_copy[col] = df_copy[col].dt.strftime('%Y-%m-%d')
        return sanitize_for_json(df_copy.to_dict(orient='records'))
    if isinstance(obj, pd.Series):
        series_copy = obj.copy()
        if isinstance(series_copy.index, pd.DatetimeIndex):
            series_dict = {k.strftime('%Y-%m-%d'): v for k, v in series_copy.items()}
        else:
            series_dict = series_copy.to_dict()
        return sanitize_for_json(series_dict)
    if isinstance(obj, np.ndarray):
        return sanitize_for_json(obj.tolist())
    
    return str(obj)
