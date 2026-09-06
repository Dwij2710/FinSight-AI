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
from ..services.cache import CacheService

router = APIRouter(prefix="/api/forecast", tags=["Forecast"])
cache_service = CacheService.get_instance()

@router.post("", response_model=ApiResponse)
async def generate_forecast(req: ForecastRequest):
    try:
        ticker = req.ticker.strip().upper()
        if not ticker:
            raise HTTPException(status_code=400, detail="Ticker symbol is required.")

        start_date = req.start_date or "2023-01-01"
        end_date = req.end_date or date.today().strftime("%Y-%m-%d")

        # Validate date range format and bounds
        try:
            parsed_start = datetime.datetime.strptime(start_date, "%Y-%m-%d").date()
            parsed_end = datetime.datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Dates must be in YYYY-MM-DD format.")

        if parsed_start >= parsed_end:
            raise HTTPException(status_code=400, detail=f"Start date ({start_date}) must precede end date ({end_date}).")

        if parsed_end > date.today() + timedelta(days=2):
            raise HTTPException(status_code=400, detail="End date cannot be in the future.")

        # Cache check before expensive data download and SARIMAX model estimation
        cache_key = f"finsight:forecast:{ticker}:{req.column or 'Close'}:{start_date}:{end_date}:{req.p}_{req.d}_{req.q}_{req.sp}_{req.sd}_{req.sq}_{req.seasonal_period}:{req.forecast_period}:{req.run_backtest}"
        cached_data = cache_service.get_sync(cache_key)
        if cached_data:
            return ApiResponse(
                success=True,
                data_source="cache",
                freshness="cached",
                fetched_at=datetime.datetime.utcnow().isoformat() + "Z",
                data=cached_data
            )

        # 1. Download stock data via institutional DataFetcher (Polygon + YF fallback + caching)
        fetcher = DataFetcher()
        data = fetcher.fetch_single_ticker(ticker, start_date=start_date, end_date=end_date)
        if data.empty:
            raise HTTPException(status_code=404, detail=f"No market data found for ticker '{ticker}' between {start_date} and {end_date}.")

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
        if len(data_subset) < 30:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient trading data ({len(data_subset)} trading days) for ticker '{ticker}' between {start_date} and {end_date}. SARIMAX requires at least 30 trading days for stationarity checks and parameter convergence."
            )

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
            conf_int_95 = pred_res.conf_int(alpha=0.05)
            conf_int_80 = pred_res.conf_int(alpha=0.20)

            for i, (f_date, val) in enumerate(zip(future_dates, pred_mean)):
                p_val = float(val)
                l95 = float(conf_int_95.iloc[i, 0]) if not conf_int_95.empty else float(p_val * 0.90)
                u95 = float(conf_int_95.iloc[i, 1]) if not conf_int_95.empty else float(p_val * 1.10)
                l80 = float(conf_int_80.iloc[i, 0]) if not conf_int_80.empty else float(p_val * 0.95)
                u80 = float(conf_int_80.iloc[i, 1]) if not conf_int_80.empty else float(p_val * 1.05)

                # Strict monotonic ordering enforcement: lower_95 <= lower_80 <= predicted <= upper_80 <= upper_95
                l80 = max(l95, min(l80, p_val))
                u80 = min(u95, max(u80, p_val))
                l95 = min(l95, l80)
                u95 = max(u95, u80)

                predictions_list.append({
                    "date": f_date.strftime('%Y-%m-%d'),
                    "predicted_mean": round(p_val, 2),
                    "lower_80": round(l80, 2),
                    "upper_80": round(u80, 2),
                    "lower_95": round(l95, 2),
                    "upper_95": round(u95, 2),
                    "lower_bound": round(l95, 2),  # Backward compatibility for legacy frontend
                    "upper_bound": round(u95, 2)   # Backward compatibility for legacy frontend
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
            if seasonal_order != (0, 0, 0, 0):
                # High-availability fallback: Attempt non-seasonal ARIMA if seasonal Kalman filter exhausts memory/diverges
                try:
                    seasonal_order = (0, 0, 0, 0)
                    model = sm.tsa.statespace.SARIMAX(
                        series,
                        order=order,
                        seasonal_order=(0, 0, 0, 0),
                        enforce_stationarity=False,
                        enforce_invertibility=False
                    )
                    fitted_model = model.fit(disp=False, maxiter=150)
                    pred_res = fitted_model.get_prediction(start=len(series), end=len(series) + forecast_steps - 1)
                    pred_mean = pred_res.predicted_mean
                    conf_int_95 = pred_res.conf_int(alpha=0.05)
                    conf_int_80 = pred_res.conf_int(alpha=0.20)
                    predictions_list = []
                    for i, (f_date, val) in enumerate(zip(future_dates, pred_mean)):
                        p_val = float(val)
                        l95 = float(conf_int_95.iloc[i, 0]) if not conf_int_95.empty else float(p_val * 0.90)
                        u95 = float(conf_int_95.iloc[i, 1]) if not conf_int_95.empty else float(p_val * 1.10)
                        l80 = float(conf_int_80.iloc[i, 0]) if not conf_int_80.empty else float(p_val * 0.95)
                        u80 = float(conf_int_80.iloc[i, 1]) if not conf_int_80.empty else float(p_val * 1.05)
                        l80 = max(l95, min(l80, p_val))
                        u80 = min(u95, max(u80, p_val))
                        l95 = min(l95, l80)
                        u95 = max(u95, u80)
                        predictions_list.append({
                            "date": f_date.strftime('%Y-%m-%d'),
                            "predicted_mean": round(p_val, 2),
                            "lower_80": round(l80, 2),
                            "upper_80": round(u80, 2),
                            "lower_95": round(l95, 2),
                            "upper_95": round(u95, 2),
                            "lower_bound": round(l95, 2),
                            "upper_bound": round(u95, 2)
                        })
                    fitted_vals = fitted_model.fittedvalues
                    rmse = float(np.sqrt(mean_squared_error(series, fitted_vals)))
                    with np.errstate(divide='ignore', invalid='ignore'):
                        mape_vals = np.abs((series - fitted_vals) / series)
                        mape = float(np.nanmean(mape_vals) * 100)
                    accuracy = max(0.0, min(100.0, 100.0 - mape))
                except Exception as fallback_err:
                    raise HTTPException(
                        status_code=422,
                        detail=f"SARIMAX optimization did not converge with order ({req.p},{req.d},{req.q}) and seasonal ({req.sp},{req.sd},{req.sq},{req.seasonal_period}): {str(err)}. Fallback failed: {str(fallback_err)}"
                    )
            else:
                raise HTTPException(
                    status_code=422,
                    detail=f"SARIMAX optimization did not converge with order ({req.p},{req.d},{req.q}): {str(err)}. Please adjust differencing (d=1)."
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
                
                from sklearn.metrics import mean_absolute_error
                bt_rmse = float(np.sqrt(mean_squared_error(test_series, bt_preds)))
                bt_mae = float(mean_absolute_error(test_series, bt_preds))
                with np.errstate(divide='ignore', invalid='ignore'):
                    bt_mape_vals = np.abs((test_series - bt_preds) / test_series)
                    bt_mape = float(np.nanmean(bt_mape_vals) * 100)
                bt_acc = max(0.0, min(100.0, 100.0 - bt_mape))

                # Directional accuracy (identifying market swing sign correctly)
                test_diff = np.diff(test_series.values)
                pred_diff = np.diff(bt_preds.values)
                dir_acc = float(np.mean((test_diff * pred_diff) > 0) * 100) if len(test_diff) > 0 else 50.0

                backtest_data = {
                    "evaluation_type": "out_of_sample_holdout",
                    "holdout_steps": holdout_len,
                    "dates": test_dates,
                    "actual": [round(float(v), 2) for v in test_series],
                    "predicted": [round(float(v), 2) for v in bt_preds],
                    "rmse": round(bt_rmse, 2),
                    "mae": round(bt_mae, 2),
                    "mape": round(bt_mape, 2),
                    "directional_accuracy_pct": round(dir_acc, 1),
                    "accuracy": round(bt_acc, 2)
                }
            except Exception as e:
                backtest_data = {
                    "evaluation_type": "out_of_sample_holdout",
                    "error": f"Backtest fitting failed: {str(e)}"
                }

        # Format history data
        history_points = []
        for d, v, f in zip(data_subset['Date'], series, fitted_vals if fitted_vals is not None else series):
            history_points.append({
                "date": d.strftime('%Y-%m-%d') if hasattr(d, 'strftime') else str(d),
                "actual": round(float(v), 2),
                "fitted": round(float(f), 2)
            })

        now_ts = datetime.datetime.utcnow().isoformat() + "Z"
        aic_val = round(float(fitted_model.aic), 2) if hasattr(fitted_model, 'aic') else None
        bic_val = round(float(fitted_model.bic), 2) if hasattr(fitted_model, 'bic') else None
        llf_val = round(float(fitted_model.llf), 2) if hasattr(fitted_model, 'llf') else None

        in_sample_metrics = {
            "aic": aic_val,
            "bic": bic_val,
            "log_likelihood": llf_val,
            "rmse": round(rmse, 2),
            "mape": round(mape, 2),
            "fit_score": round(accuracy, 2)
        }

        response_payload = sanitize_for_json({
            "ticker": ticker,
            "column": col,
            "data_source": "live",
            "fetched_at": now_ts,
            "in_sample_fit": in_sample_metrics,
            "out_of_sample_validation": backtest_data,
            "metrics": {
                # Backward compatibility fields
                "aic": aic_val,
                "bic": bic_val,
                "rmse": round(rmse, 2),
                "mape": round(mape, 2),
                "accuracy": round(accuracy, 2),
                "in_sample": in_sample_metrics,
                "out_of_sample": backtest_data if backtest_data and "error" not in backtest_data else None
            },
            "adf_test": adf_result,
            "history": history_points,
            "predictions": predictions_list,
            "decomposition": decomp_data,
            "backtest": backtest_data
        })

        cache_service.set_sync(cache_key, response_payload, ttl_seconds=300)

        return ApiResponse(
            success=True,
            data_source="live",
            fetched_at=now_ts,
            data=response_payload
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=f"Forecast error: {str(e)}")

