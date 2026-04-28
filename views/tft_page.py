import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd
from src.tft_features import MultiVariateDataFetcher, TemporalFusionModel

@st.cache_data(ttl=3600, show_spinner=False)
def fetch_tft_data(ticker):
    fetcher = MultiVariateDataFetcher(ticker)
    return fetcher.fetch_data()

@st.cache_resource(ttl=3600, show_spinner=False)
def load_tft_model(ticker, _data):
    model = TemporalFusionModel(_data)
    attention = model.train_and_extract_attention()
    anomaly = model.detect_macro_anomaly()
    lookalike = model.historical_lookalike(None)
    return model, attention, anomaly, lookalike

def show_tft_page():
    st.title("🌐 Multi-Variate Time-Series Transformer (TFT)")
    st.markdown("""
    Instead of predicting stock price using just the past price, this elite-level module learns from **multiple correlated macro-economic factors** simultaneously.
    """)
    st.info("ℹ️ Inspired by architecture used in advanced OpenAI/DeepMind forecasting systems.")
    
    ticker = st.text_input("Enter Asset Ticker (e.g., AAPL):", "AAPL").upper()
    
    # Session state to prevent UI resetting when sliders are moved
    if "tft_analyzed" not in st.session_state:
        st.session_state.tft_analyzed = False
        st.session_state.tft_ticker = ticker
        
    # Reset analysis if ticker changes
    if ticker != st.session_state.get("tft_ticker", ""):
        st.session_state.tft_analyzed = False
        st.session_state.tft_ticker = ticker
    
    if st.button("Run Multi-Variate Analysis"):
        st.session_state.tft_analyzed = True
        
    if st.session_state.tft_analyzed:
        with st.spinner("Processing Multi-Variate Data (Price, S&P 500, VIX, Interest Rates, Oil, Gold)..."):
            data = fetch_tft_data(ticker)
            
            if data.empty:
                st.error("Failed to load multi-variate data. Check the ticker.")
                st.session_state.tft_analyzed = False
                return
                
            model, attention_weights, anomaly_data, lookalike_data = load_tft_model(ticker, data)
            current_price = data['Price'].iloc[-1]
            
            st.write("---")
            
            # --- 1. Top Bar: Current State and Regime ---
            regime, regime_desc = model.detect_market_regime()
            
            col_t1, col_t2, col_t3 = st.columns(3)
            with col_t1:
                st.metric("Current Asset Price", f"${current_price:.2f}")
            with col_t2:
                sp_val = data['S&P 500'].iloc[-1]
                st.metric("S&P 500 (Macro)", f"{sp_val:.2f}")
            with col_t3:
                st.metric("AI Detected Market Regime", regime, help=regime_desc)

            st.write("---")

            # --- NEW: Phase 3 Features ---
            st.subheader("🚨 Macro Anomaly & Lookalike Analysis")
            st.markdown("*Uses advanced unsupervised machine learning to mathematically scan the current environment.*")
            
            col_a1, col_a2 = st.columns(2)
            with col_a1:
                st.markdown("#### **Isolation Forest Anomaly Detection**")
                st.markdown("*Is today's global macro environment structurally broken?*")
                if anomaly_data:
                    # Rendering anomaly gauge
                    fig_anom = go.Figure(go.Indicator(
                        mode = "gauge+number",
                        value = anomaly_data['risk_score'],
                        title = {'text': "Macro Risk Level"},
                        gauge = {
                            'axis': {'range': [0, 100]},
                            'bar': {'color': "darkred" if anomaly_data['is_anomaly'] else "teal"},
                            'steps': [
                                {'range': [0, 50], 'color': "lightgreen"},
                                {'range': [50, 80], 'color': "yellow"},
                                {'range': [80, 100], 'color': "salmon"}
                            ],
                            'threshold': {
                                'line': {'color': "red", 'width': 4},
                                'thickness': 0.75,
                                'value': 85}
                        }
                    ))
                    fig_anom.update_layout(height=250)
                    st.plotly_chart(fig_anom, use_container_width=True)
                    
                    if anomaly_data['is_anomaly']:
                        st.error(anomaly_data['message'])
                    else:
                        st.success(anomaly_data['message'])
                        
            with col_a2:
                st.markdown("#### **K-Nearest Neighbors (KNN) Historical Match**")
                st.markdown("*Searching 2 years of history for the most statistically identical macro-day.*")
                if lookalike_data:
                    st.info(f"**Mathematical Match Found:** {lookalike_data['matched_date']}")
                    st.metric("Similarity Score", f"{lookalike_data['similarity']:.1f}%")
                    
                    ret_color = "normal" if lookalike_data['future_return'] >= 0 else "inverse"
                    st.metric("What happened next? (30-Day Return)", f"{lookalike_data['future_return']:+.2f}%", delta=f"{lookalike_data['future_return']:+.2f}%", delta_color=ret_color)
                    st.caption("Disclaimer: Historical patterns do not guarantee future exact repetition.")
                else:
                    st.warning("Not enough historical data to generate a perfect lookalike match.")

            st.write("---")

            # --- 2. Advanced Feature: Attention Heatmap ---
            st.subheader("🔥 Key Advanced Feature: AI Attention Weights")
            st.markdown("*Shows exactly what variables the AI is focusing on right now to make its predictions. (Explainable AI)*")
            
            # attention_weights already loaded and cached via load_tft_model
            
            if attention_weights:
                att_df = pd.DataFrame(list(attention_weights.items()), columns=['Factor', 'Attention Weight']).sort_values('Attention Weight', ascending=True)
                
                # Plotly Horizontal Bar / "Heatmap" proxy
                fig_att = px.bar(att_df, x='Attention Weight', y='Factor', orientation='h',
                                 title="Real-Time AI Attention Distribution",
                                 color='Attention Weight', color_continuous_scale='Magma')
                
                fig_att.update_layout(xaxis_tickformat='.1%')
                st.plotly_chart(fig_att, use_container_width=True)
            else:
                st.warning("Could not calculate attention weights.")
                
            st.write("---")

            # --- 3. Probabilistic Forecasting ---
            st.subheader("📊 Probabilistic Forecasting")
            st.markdown("*Instead of a single point prediction, the Transformer model yields confidence intervals.*")
            
            forecast = model.probabilistic_forecast(current_price)
            if forecast:
                col_f1, col_f2 = st.columns(2)
                with col_f1:
                    st.metric("Predicted Target Price", f"${forecast['predicted']:.2f}")
                with col_f2:
                    st.metric("Confidence Level", f"{forecast['confidence']}%", delta=f"${forecast['lower']:.2f} - ${forecast['upper']:.2f} Range")
                
                # Visualizing bounds
                fig_bound = go.Figure()
                fig_bound.add_trace(go.Indicator(
                    mode = "number+gauge", value = forecast['predicted'],
                    domain = {'x': [0.1, 1], 'y': [0, 1]},
                    title = {'text' :"Price Range Prediction"},
                    gauge = {
                        'shape': "bullet",
                        'axis': {'range': [current_price * 0.9, current_price * 1.1]},
                        'threshold': {
                            'line': {'color': "red", 'width': 2},
                            'thickness': 0.75,
                            'value': current_price},
                        'steps': [
                            {'range': [forecast['lower'], forecast['upper']], 'color': "rgba(0, 200, 100, 0.4)"}
                        ]}
                ))
                fig_bound.update_layout(height=250)
                st.plotly_chart(fig_bound, use_container_width=True)

            st.write("---")

            # --- 4. Advanced Interactive Scenario Simulation ---
            st.subheader("🕹️ Advanced Interactive Scenario Simulation")
            st.markdown("*Use the sliders below to manually stress-test the model by tweaking macro-economic conditions.*")
            
            # Interactive Sliders
            st.markdown("#### **Tweak Macro Factors:**")
            col_sl1, col_sl2 = st.columns(2)
            with col_sl1:
                sp_slider = st.slider("S&P 500 Market Movement (%)", min_value=-20.0, max_value=20.0, value=0.0, step=0.5)
                vix_slider = st.slider("Volatility / Fear Index (VIX) Change (%)", min_value=-50.0, max_value=100.0, value=0.0, step=5.0)
            with col_sl2:
                rate_slider = st.slider("Interest Rates Change (%)", min_value=-5.0, max_value=5.0, value=0.0, step=0.25)
                oil_slider = st.slider("Crude Oil Price Change (%)", min_value=-30.0, max_value=30.0, value=0.0, step=1.0)
            
            st.markdown("#### **Forecast Engine Response:**")
            new_price, impact_pct = model.simulate_scenario_custom(current_price, sp_slider, vix_slider, rate_slider, oil_slider)
            
            col_sim1, col_sim2 = st.columns(2)
            with col_sim1:
                st.metric("Simulated Target Price", f"${new_price:.2f}", f"{impact_pct:+.2f}% Impact",
                          delta_color="normal")
            with col_sim2:
                if impact_pct < -5.0:
                    st.error("📉 Severe negative impact detected. Major macro headwind.")
                elif impact_pct > 5.0:
                    st.success("🚀 Strong positive macro environment for this asset.")
                else:
                    st.info("⚖️ Moderate/Neutral impact based on macro environment.")
            
            st.success("Module 5 Multi-Variate Analysis Completed Successfully! ✅")
