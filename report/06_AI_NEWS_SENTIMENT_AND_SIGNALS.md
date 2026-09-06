# Module 06: Financial Transformer NLP & Trade Signal Classifier

**Module Owner:** Quantitative Machine Learning & Natural Language Processing  
**File Path:** `backend/app/routes/news_sentiment.py`, `backend/app/routes/trade_signal.py`, `frontend/src/components/AiInsightsView.tsx`  
**Status:** Production Ready  

---

## 1. Executive Brief (High-Level Summary)

The **AI Insights & Trade Signal Module** synthesizes unstructured market narrative data with technical momentum indicators. Employing HuggingFace financial transformer models (**ProsusAI/finbert**), rule-based lexicons (**VADER**), and a Platt-calibrated Random Forest ensemble, the module translates noisy news articles into actionable directional trade signals with calibrated posterior probabilities.

---

## 2. Natural Language Processing Pipeline

```
[ Financial News Feed / RSS / Scraper ]
                   │
                   ▼
       [ Headline & Snippet Preprocessing ]
                   │
         +---------+---------+
         │                   │
         ▼                   ▼
[ ProsusAI FinBERT ]   [ VADER Lexicon ]
 (Transformer Model)     (Rule-Based)
         │                   │
         +---------+---------+
                   │
                   ▼
  [ Polarity Score (-1.0 to +1.0) & Confidence ]
```

### 2.1 ProsusAI FinBERT Architecture
Fine-tuned on the Financial PhraseBank dataset, FinBERT computes soft probabilities across three classes:
$$P(\text{sentiment} \in \{\text{positive}, \text{negative}, \text{neutral}\} \mid \mathbf{x})$$

The continuous sentiment score $S \in [-1.0, 1.0]$ is:
$$S = P(\text{positive}) - P(\text{negative})$$

### 2.2 Aggregation & Dispersion
For $K$ articles collected over the evaluation window:
- **Mean Sentiment ($\bar{S}$)**: $\frac{1}{K} \sum_{k=1}^K S_k$
- **Sentiment Dispersion ($\sigma_S$)**: $\sqrt{\frac{1}{K}\sum_{k=1}^K (S_k - \bar{S})^2}$ (Measures narrative consensus vs. disagreement).

---

## 3. Multi-Factor Trade Signal Classifier

### 3.1 Feature Vector Construction ($\mathbf{x} \in \mathbb{R}^6$)
Combines technical momentum with sentiment features:
1. `RSI_14`: 14-period Relative Strength Index.
2. `MACD_Hist`: Normalized MACD histogram value.
3. `BB_PctB`: Bollinger Band $\%B$ position: $\frac{P - \text{Lower}}{\text{Upper} - \text{Lower}}$.
4. `Realized_Vol_20`: 20-day annualized realized volatility.
5. `Sentiment_Mean`: Aggregate FinBERT polarity score.
6. `Sentiment_Dispersion`: Narrative dispersion score.

### 3.2 Platt Probability Calibration
Raw Random Forest tree votes are calibrated via logistic sigmoid regression to yield well-calibrated posterior probabilities:
$$P(Y = 1 \mid f(\mathbf{x})) = \frac{1}{1 + \exp(A \cdot f(\mathbf{x}) + B)}$$

Where $f(\mathbf{x})$ is the ensemble decision function, and parameters $A, B$ are fitted via maximum likelihood on out-of-fold validation splits.

### 3.3 Normalized Feature Importance Guarantee
Gini feature importances are normalized strictly to sum to $100.0\%$:
$$\sum_{j=1}^D I_j = 100.0\%$$

---

## 4. API Specification

- `GET /api/news-sentiment/{ticker}`: Returns parsed news articles with live URLs, individual sentiment classifications, and aggregate polarity scores.
- `GET /api/trade-signal/{ticker}`: Returns directional trade signal (`BUY`, `SELL`, `HOLD`), calibrated confidence probability, and normalized feature importances.

---

## 5. Verification & Unit Tests
Tested in `tests/test_data_integrity.py` and `tests/test_quant_math.py`:
- `test_news_articles_have_valid_urls`: Verifies all returned news items have valid HTTP/HTTPS source URLs.
- `test_feature_importance_sums_to_100`: Asserts Gini feature importances sum to $100.0\% \pm 10^{-4}$.
