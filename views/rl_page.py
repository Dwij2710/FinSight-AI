import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from src.data_fetcher import DataFetcher
from src.rl_agent import train_rl_agent, evaluate_rl_agent

def show_rl_page():
    st.title("🤖 Extreme RL Trading Agent")
    st.markdown("""
    This module trains a deep reinforcement learning agent to maximize your **Net Worth**.
    **Elite Upgrades:** Now supports multiple Neural Network architectures (**PPO, A2C, DQN**) and Fractional **Continuous** Position Sizing.
    """)
    
    st.sidebar.header("Data Settings")
    ticker = st.sidebar.text_input("Stock Ticker", "AAPL").upper()
    
    col1, col2 = st.sidebar.columns(2)
    with col1:
        start_date = st.date_input("Start Date", value=pd.to_datetime("2020-01-01"))
    with col2:
        end_date = st.date_input("End Date", value=pd.to_datetime("today"))
        
    initial_balance = st.sidebar.number_input("Initial Balance ($)", value=10000, step=1000)
    timesteps = st.sidebar.slider("Training Timesteps", 5000, 50000, 20000, step=5000)
    
    st.sidebar.markdown("### AI Architecture (The 'Brain')")
    algo_type = st.sidebar.selectbox("Algorithm", ["PPO", "A2C", "DQN"])
    st.sidebar.caption("PPO: Stable. A2C: Fast multi-sync. DQN: Deep Q-Values.")
    
    st.sidebar.markdown("### Trading Behavior (The Environment)")
    action_type_ui = st.sidebar.radio("Action Space", ["Discrete (Buy/Sell All)", "Continuous (Fractional Sizing)"])
    action_type = "Continuous" if "Continuous" in action_type_ui else "Discrete"
    
    if algo_type == "DQN" and action_type == "Continuous":
        st.sidebar.warning("⚠️ DQN architectures mathematically require a Discrete action space. Execution will be forced to Discrete.")
        action_type = "Discrete"
        
    st.sidebar.markdown("### Risk Appetite")
    risk_profile = st.sidebar.radio("AI Risk Profile", ["Aggressive", "Conservative"])
    st.sidebar.caption("Conservative heavily penalizes the agent during training if it enters a mass drawdown.")
    
    if st.button("Train Agent", use_container_width=True):
        st.write("---")
        with st.spinner(f"Fetching data for {ticker}..."):
            fetcher = DataFetcher(tickers=[ticker], start_date=start_date.strftime('%Y-%m-%d'), end_date=end_date.strftime('%Y-%m-%d'))
            price_df = fetcher.fetch_stock_data(save_to_csv=False)
            
            if price_df.empty or ticker not in price_df.columns:
                st.error("Failed to fetch data or not enough data to train. Try a different date range or ticker.")
                return
                
            df = pd.DataFrame({'Close': price_df[ticker]})
            
        if len(df) < 50:
            st.error("Not enough data to train. Needs at least 50 days of data.")
            return
            
        st.success(f"Data ready: {len(df)} trading days loaded.")
        
        with st.spinner(f"Training {algo_type} Agent in {action_type} mode..."):
            model = train_rl_agent(df, initial_balance=initial_balance, total_timesteps=timesteps, risk_profile=risk_profile, action_type=action_type, algo_type=algo_type)
            
        st.success("Agent Training Complete!")
        
        with st.spinner("Evaluating RL Agent on historical data..."):
            net_worths, actions = evaluate_rl_agent(model, df, initial_balance=initial_balance, risk_profile=risk_profile, action_type=action_type)
            
        df['Agent_Net_Worth'] = net_worths
        df['Agent_Action'] = actions
        
        # Calculate Advanced Quant Metrics
        final_balance = df['Agent_Net_Worth'].iloc[-1]
        profit = final_balance - initial_balance
        profit_pct = (profit / initial_balance) * 100
        
        cummax = df['Agent_Net_Worth'].cummax()
        drawdown = (cummax - df['Agent_Net_Worth']) / cummax
        max_drawdown = drawdown.max() * 100
        
        actions_list = list(df['Agent_Action'])
        nw_list = list(df['Agent_Net_Worth'])
        winning_trades = 0
        losing_trades = 0
        last_buy_nw = None
        for i, act in enumerate(actions_list):
             if 'Buy' in act and last_buy_nw is None:
                 last_buy_nw = nw_list[i]
             elif 'Sell' in act and last_buy_nw is not None:
                 if nw_list[i] > last_buy_nw:
                     winning_trades += 1
                 else:
                     losing_trades += 1
                 last_buy_nw = None
                 
        total_round_trips = winning_trades + losing_trades
        win_rate = (winning_trades / total_round_trips * 100) if total_round_trips > 0 else 0
        
        st.subheader("📊 Quantitative Trading Dashboard")
        
        col1, col2, col3, col4 = st.columns(4)
        col1.metric("Final Balance", f"${final_balance:,.2f}", f"{profit_pct:.2f}%")
        
        num_buys = len([a for a in df['Agent_Action'] if 'Buy' in a])
        num_sells = len([a for a in df['Agent_Action'] if 'Sell' in a])
        col2.metric("Total Executions", f"{num_buys + num_sells}", f"{num_buys} Buys, {num_sells} Sells")
        
        col3.metric("Maximum Drawdown", f"-{max_drawdown:.2f}%", delta="Risk", delta_color="inverse")
        col4.metric("AI Win Rate", f"{win_rate:.1f}%", f"{winning_trades} Profitable Exits")
        
        st.subheader("📈 Learning Curve (Agent's Net Worth)")
        fig1 = go.Figure()
        fig1.add_trace(go.Scatter(x=df.index, y=df['Agent_Net_Worth'], mode='lines', name='Net Worth', line=dict(color='#00ff88', width=2)))
        fig1.update_layout(height=400, template='plotly_dark', margin=dict(l=0, r=0, t=30, b=0),
                           paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)')
        st.plotly_chart(fig1, use_container_width=True)
        
        st.subheader("🎯 Agent's Trading Decisions")
        fig2 = go.Figure()
        fig2.add_trace(go.Scatter(x=df.index, y=df['Close'], mode='lines', name='Stock Price', line=dict(color='gray', width=1.5)))
        
        buy_points = df[df['Agent_Action'].str.contains('Buy')]
        if not buy_points.empty:
            fig2.add_trace(go.Scatter(x=buy_points.index, y=buy_points['Close'], mode='markers', name='Buy', 
                                     marker=dict(color='#00ff88', size=10, symbol='triangle-up', line=dict(color='white', width=1))))
        
        sell_points = df[df['Agent_Action'].str.contains('Sell')]
        if not sell_points.empty:
            fig2.add_trace(go.Scatter(x=sell_points.index, y=sell_points['Close'], mode='markers', name='Sell', 
                                     marker=dict(color='#ff3366', size=10, symbol='triangle-down', line=dict(color='white', width=1))))
        
        fig2.update_layout(height=500, template='plotly_dark', margin=dict(l=0, r=0, t=30, b=0),
                           paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)')
        st.plotly_chart(fig2, use_container_width=True)
