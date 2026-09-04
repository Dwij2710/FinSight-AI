from fastapi import APIRouter, HTTPException
import yfinance as yf
import pandas as pd
import numpy as np
import datetime
from datetime import date, timedelta
import sys
from pathlib import Path

_PROJECT_ROOT = str(Path(__file__).resolve().parent.parent.parent.parent)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from src.data_fetcher import DataFetcher
from ..schemas import ForecastRequest, ApiResponse
from ..utils.serializer import sanitize_for_json

router = APIRouter(prefix="/api/forecast", tags=["Forecast"])

@router.post("", response_model=ApiResponse)
async def generate_forecast(req: ForecastRequest):
    try:
        ticker = req.ticker.strip().upper()
        if not ticker:
            raise HTTPException(status_code=400, detail="Ticker symbol is required.")

        start_date = req.start_date or "2023-01-01"
        end_date = req.end_date or date.today().strftime("%Y-%m-%d")

        # 1. Download stock data via institutional DataFetcher (Polygon + YF fallback + caching)
        fetcher = DataFetcher()
        data = fetcher.fetch_single_ticker(ticker, start_date=start_date, end_date=end_date)
        if data.empty:
            raise HTTPException(status_code=404, detail=f"No data found for ticker '{ticker}'.")

        if 'Date' not in data.columns:
            data = data.reset_index()
            if 'Date' not in data.columns and 'index' in data.columns:
                data.rename(columns={'index': 'Date'}, inplace=True)
            elif 'Date' not in data.columns:
                data.insert(0, "Date", data.index)


        col = req.column
        if col not in data.columns:
            matching = [c for c in data.columns if 'Close' in c]
            col = matching[0] if matching else data.columns[1]

        data_subset = data[['Date', col]].dropna()
        if len(data_subset) < 20:
            raise HTTPException(status_code=400, detail="Insufficient data points for forecasting.")

        series = data_subset[col].astype(float)

        # 2. Stationarity test (ADF)
        adf_result = None
        try:
            from statsmodels.tsa.stattools import adfuller
            adf_test = adfuller(series)
            adf_result = {
                "test_statistic": float(adf_test[0]),
                "p_value": float(adf_test[1]),
                "is_stationary": bool(adf_test[1] < 0.05)
            }
        except Exception as e:
            adf_result = {"is_stationary": True, "note": str(e)}

        # 3. Seasonal Decomposition
        decomp_data = {}
        try:
            from statsmodels.tsa.seasonal import seasonal_decompose
            period = min(req.seasonal_period or 12, len(series) // 2)
            if period > 1 and len(series) > 2 * period:
                decomp = seasonal_decompose(series, model='additive', period=period)
                decomp_data = {
                    "dates": [d.strftime('%Y-%m-%d') if hasattr(d, 'strftime') else str(d) for d in data_subset['Date']],
                    "trend": [None if np.isnan(v) else round(float(v), 2) for v in decomp.trend],
                    "seasonal": [None if np.isnan(v) else round(float(v), 2) for v in decomp.seasonal],
                    "resid": [None if np.isnan(v) else round(float(v), 2) for v in decomp.resid]
                }
        except Exception as e:
            decomp_data = {"error": str(e)}

        # 4. SARIMAX Model
        forecast_steps = req.forecast_period
        last_date = pd.to_datetime(data_subset['Date'].iloc[-1])
        future_dates = pd.date_range(start=last_date + timedelta(days=1), periods=forecast_steps, freq='B')

        predictions_list = []
        fitted_vals = None
        accuracy = 95.0
        rmse = 2.5
        mape = 2.0

        try:
            import statsmodels.api as sm
            from sklearn.metrics import mean_squared_error

            order = (req.p, req.d, req.q)
            seasonal_order = (req.sp, req.sd, req.sq, req.seasonal_period) if (req.seasonal_period and req.seasonal_period > 0) else (0, 0, 0, 0)
            model = sm.tsa.statespace.SARIMAX(
                series,
                order=order,
                seasonal_order=seasonal_order,
                enforce_stationarity=False,
                enforce_invertibility=False
            )
            fitted_model = model.fit(disp=False, maxiter=200)

            pred_res = fitted_model.get_prediction(start=len(series), end=len(series) + forecast_steps - 1)
            pred_mean = pred_res.predicted_mean
            conf_int = pred_res.conf_int()

            for i, (f_date, val) in enumerate(zip(future_dates, pred_mean)):
                lower = float(conf_int.iloc[i, 0]) if not conf_int.empty else float(val * 0.95)
                upper = float(conf_int.iloc[i, 1]) if not conf_int.empty else float(val * 1.05)
                predictions_list.append({
                    "date": f_date.strftime('%Y-%m-%d'),
                    "predicted_mean": round(float(val), 2),
                    "lower_bound": round(lower, 2),
                    "upper_bound": round(upper, 2)
                })

            fitted_vals = fitted_model.fittedvalues
            rmse = float(np.sqrt(mean_squared_error(series, fitted_vals)))
            with np.errstate(divide='ignore', invalid='ignore'):
                mape_vals = np.abs((series - fitted_vals) / series)
                mape = float(np.nanmean(mape_vals) * 100)
            accuracy = max(0.0, min(100.0, 100.0 - mape))

        except HTTPException:
            raise
        except Exception as err:
            raise HTTPException(
                status_code=422,
                detail=f"SARIMAX optimization did not converge with order ({req.p},{req.d},{req.q}) and seasonal ({req.sp},{req.sd},{req.sq},{req.seasonal_period}): {str(err)}. Please adjust differencing (d=1) or seasonal period."
            )

        # 5. Out-of-sample holdout backtest (if requested and sufficient data)
        backtest_data = None
        if req.run_backtest and len(series) >= 40:
            holdout_len = min(30, len(series) // 4)
            train_series = series.iloc[:-holdout_len]
            test_series = series.iloc[-holdout_len:]
            test_dates = [d.strftime('%Y-%m-%d') if hasattr(d, 'strftime') else str(d) for d in data_subset['Date'].iloc[-holdout_len:]]

            try:
                bt_model = sm.tsa.statespace.SARIMAX(
                    train_series,
                    order=order,
                    seasonal_order=seasonal_order,
                    enforce_stationarity=False,
                    enforce_invertibility=False
                )
                bt_fitted = bt_model.fit(disp=False, maxiter=200)
                bt_preds = bt_fitted.get_prediction(start=len(train_series), end=len(train_series) + holdout_len - 1).predicted_mean
                
                bt_rmse = float(np.sqrt(mean_squared_error(test_series, bt_preds)))
                with np.errstate(divide='ignore', invalid='ignore'):
                    bt_mape_vals = np.abs((test_series - bt_preds) / test_series)
                    bt_mape = float(np.nanmean(bt_mape_vals) * 100)
                bt_acc = max(0.0, min(100.0, 100.0 - bt_mape))

                backtest_data = {
                    "dates": test_dates,
                    "actual": [round(float(v), 2) for v in test_series],
                    "predicted": [round(float(v), 2) for v in bt_preds],
                    "rmse": round(bt_rmse, 2),
                    "mape": round(bt_mape, 2),
                    "accuracy": round(bt_acc, 2)
                }
            except Exception as e:
                backtest_data = {"error": f"Backtest fitting failed: {str(e)}"}

        # Format history data
        history_points = []
        for d, v, f in zip(data_subset['Date'], series, fitted_vals if fitted_vals is not None else series):
            history_points.append({
                "date": d.strftime('%Y-%m-%d') if hasattr(d, 'strftime') else str(d),
                "actual": round(float(v), 2),
                "fitted": round(float(f), 2)
            })

        return ApiResponse(
            success=True,
            data=sanitize_for_json({
                "ticker": ticker,
                "column": col,
                "metrics": {
                    "rmse": round(rmse, 2),
                    "mape": round(mape, 2),
                    "accuracy": round(accuracy, 2)
                },
                "adf_test": adf_result,
                "history": history_points,
                "predictions": predictions_list,
                "decomposition": decomp_data,
                "backtest": backtest_data
            })
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Forecast error: {str(e)}")

