import numpy as np
import pandas as pd
import gymnasium as gym
from gymnasium import spaces
from stable_baselines3 import PPO, A2C, DQN

def add_technical_indicators(df):
    """Calculates RSI, MACD, and Bollinger Bands natively."""
    df = df.copy()
    
    # RSI (14-day)
    delta = df['Close'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss
    df['RSI'] = 100 - (100 / (1 + rs))
    df['RSI'] = df['RSI'].fillna(50) # Fallback neutral
    
    # MACD
    ema12 = df['Close'].ewm(span=12, adjust=False).mean()
    ema26 = df['Close'].ewm(span=26, adjust=False).mean()
    df['MACD'] = ema12 - ema26
    df['MACD'] = df['MACD'].fillna(0)
    
    # Bollinger Bands (Distance from standard deviation)
    sma20 = df['Close'].rolling(window=20).mean()
    std20 = df['Close'].rolling(window=20).std()
    upper_band = sma20 + (std20 * 2)
    lower_band = sma20 - (std20 * 2)
    band_width = (upper_band - lower_band).replace(0, np.nan)  # avoid div-by-zero → inf
    df['BB_Position'] = (df['Close'] - lower_band) / band_width
    df['BB_Position'] = df['BB_Position'].fillna(0.5).replace([np.inf, -np.inf], 0.5)
    
    return df

class StockTradingEnv(gym.Env):
    """
    A custom stock trading environment for OpenAI gymnasium.
    Supports both Discrete (Buy/Sell All) and Continuous (Fractional Position Sizing).
    """
    metadata = {'render_modes': ['human']}

    def __init__(self, df, initial_balance=10000.0, risk_profile='Aggressive', action_type='Discrete'):
        super(StockTradingEnv, self).__init__()
        
        self.df = df.reset_index(drop=True)
        self.initial_balance = initial_balance
        self.risk_profile = risk_profile
        self.action_type = action_type
        
        # Action Space definition
        if self.action_type == 'Continuous':
            # -1.0 to 1.0 (float percentage of portfolio)
            self.action_space = spaces.Box(low=np.array([-1.0]), high=np.array([1.0]), dtype=np.float32)
        else:
            # 0: Hold, 1: Buy max, 2: Sell all
            self.action_space = spaces.Discrete(3)
        
        # Observation space shape: (9,)
        self.observation_space = spaces.Box(
            low=-np.inf, high=np.inf, shape=(9,), dtype=np.float32
        )
        
        self.prices = np.squeeze(self.df['Close'].values).astype(float)
        self.rsis = np.squeeze(self.df['RSI'].values).astype(float) / 100.0
        self.macds = np.squeeze(self.df['MACD'].values).astype(float)
        self.bb_positions = np.squeeze(self.df['BB_Position'].values).astype(float)

        self.current_step = 0
        self.balance = self.initial_balance
        self.shares_held = 0
        self.net_worth = self.initial_balance
        self.max_net_worth = self.initial_balance
        
    def _next_observation(self):
        current_price = float(self.prices[self.current_step])
        rsi = float(self.rsis[self.current_step])
        macd = float(self.macds[self.current_step])
        bb_pos = float(self.bb_positions[self.current_step])
        
        if self.current_step > 0:
            prev_price = float(self.prices[self.current_step - 1])
            day_pct = (current_price - prev_price) / prev_price if prev_price > 0 else 0.0
        else:
            day_pct = 0.0
            
        if self.current_step > 5:
            prev_5_day_price = float(self.prices[self.current_step - 5])
            five_day_pct = (current_price - prev_5_day_price) / prev_5_day_price if prev_5_day_price > 0 else 0.0
        else:
            five_day_pct = 0.0
            
        first_price = float(self.prices[0])
            
        obs = np.array([
            self.balance / self.initial_balance,
            self.shares_held,
            current_price / first_price if first_price > 0 else 1.0,
            self.net_worth / self.initial_balance,
            day_pct,
            five_day_pct,
            rsi,
            macd,
            bb_pos
        ], dtype=np.float32)
        
        return obs

    def step(self, action):
        current_price = float(self.prices[self.current_step])
        prev_net_worth = self.net_worth
        
        # Log textual action for UI tracking
        action_text = "Hold"
        
        # Institutional execution modeling: 5 bps commission, 2 bps slippage
        COMMISSION_RATE = 0.0005
        SLIPPAGE_RATE = 0.0002

        if self.action_type == 'Continuous':
            act_val = float(action[0])
            
            if act_val > 0.05 and self.balance > current_price:
                cash_to_spend = self.balance * act_val
                buy_price = current_price * (1 + SLIPPAGE_RATE)
                shares_bought = int(cash_to_spend / (buy_price * (1 + COMMISSION_RATE)))
                if shares_bought > 0:
                    cost = shares_bought * buy_price
                    fee = cost * COMMISSION_RATE
                    self.balance -= (cost + fee)
                    self.shares_held += shares_bought
                    action_text = f"Buy {int(act_val*100)}%"
            elif act_val < -0.05 and self.shares_held > 0:
                fraction_to_sell = abs(act_val)
                shares_to_sell = int(self.shares_held * fraction_to_sell)
                if shares_to_sell > 0:
                    sell_price = current_price * (1 - SLIPPAGE_RATE)
                    gross = shares_to_sell * sell_price
                    fee = gross * COMMISSION_RATE
                    self.balance += (gross - fee)
                    self.shares_held -= shares_to_sell
                    action_text = f"Sell {int(fraction_to_sell*100)}%"
                    
        else:
            # Discrete logic
            if action == 1 and self.balance > current_price: 
                buy_price = current_price * (1 + SLIPPAGE_RATE)
                shares_bought = int(self.balance / (buy_price * (1 + COMMISSION_RATE)))
                if shares_bought > 0:
                    cost = shares_bought * buy_price
                    fee = cost * COMMISSION_RATE
                    self.balance -= (cost + fee)
                    self.shares_held += shares_bought
                    action_text = "Buy Max"
            elif action == 2 and self.shares_held > 0: 
                sell_price = current_price * (1 - SLIPPAGE_RATE)
                gross = self.shares_held * sell_price
                fee = gross * COMMISSION_RATE
                self.balance += (gross - fee)
                self.shares_held = 0
                action_text = "Sell All"
                
        # Update net worth
        self.net_worth = self.balance + self.shares_held * current_price
        self.max_net_worth = max(self.net_worth, self.max_net_worth)
        
        # Risk-Adjusted Reward Processing
        if prev_net_worth > 0:
            reward = ((self.net_worth - prev_net_worth) / prev_net_worth) * 100.0
        else:
            reward = 0.0
            
        if self.risk_profile == 'Conservative':
            drawdown = (self.max_net_worth - self.net_worth) / self.max_net_worth
            if drawdown > 0.05: 
                reward -= (drawdown * 150) 
                
        # Additional penalty in Continuous mode to encourage trading instead of passive holding
        if self.action_type == 'Continuous' and abs(float(action[0])) < 0.05:
           reward -= 0.005

        self.current_step += 1
        
        terminated = self.current_step >= len(self.df) - 1
        truncated = self.net_worth <= 0.0
        done = terminated or truncated
            
        obs = self._next_observation()
        info = {
            'step': self.current_step,
            'balance': self.balance,
            'net_worth': self.net_worth,
            'shares': self.shares_held,
            'price': current_price,
            'action_text': action_text
        }
        
        return obs, reward, terminated, truncated, info
        
    def reset(self, seed=None, options=None):
        super().reset(seed=seed)
        self.current_step = 0
        self.balance = self.initial_balance
        self.shares_held = 0
        self.net_worth = self.initial_balance
        self.max_net_worth = self.initial_balance
        
        obs = self._next_observation()
        info = {}
        return obs, info

def get_rl_model_class(algo_type):
    algo_type = algo_type.upper()
    if algo_type == 'A2C':
        return A2C
    elif algo_type == 'DQN':
        return DQN
    else:
        return PPO

def train_rl_agent(df, initial_balance=10000.0, total_timesteps=20000, risk_profile='Aggressive', action_type='Discrete', algo_type='PPO'):
    df_with_ta = add_technical_indicators(df)
    env = StockTradingEnv(df_with_ta, initial_balance=initial_balance, risk_profile=risk_profile, action_type=action_type)
    
    ModelClass = get_rl_model_class(algo_type)
    
    # DQN doesn't support the raw standard feature extractor as gracefully, but MlpPolicy covers it.
    model = ModelClass("MlpPolicy", env, verbose=0)
    model.learn(total_timesteps=total_timesteps)
    return model

def evaluate_rl_agent(model, df, initial_balance=10000.0, risk_profile='Aggressive', action_type='Discrete'):
    df_with_ta = add_technical_indicators(df)
    env = StockTradingEnv(df_with_ta, initial_balance=initial_balance, risk_profile=risk_profile, action_type=action_type)
    obs, info = env.reset()
    
    net_worths = []
    actions_taken = []
    
    done = False
    while not done:
        action, _states = model.predict(obs, deterministic=True)
        obs, reward, terminated, truncated, info = env.step(action)
        
        net_worths.append(info['net_worth'])
        actions_taken.append(info['action_text'])
            
        done = terminated or truncated
    
    # Prepend initial state so length matches the full DataFrame
    net_worths.insert(0, initial_balance)
    actions_taken.insert(0, 'Hold')
    
    # Ensure lists exactly match df length (pad or trim if needed)
    target_len = len(df)
    while len(net_worths) < target_len:
        net_worths.append(net_worths[-1])
        actions_taken.append('Hold')
    net_worths = net_worths[:target_len]
    actions_taken = actions_taken[:target_len]
        
    return net_worths, actions_taken
