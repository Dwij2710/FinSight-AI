# Module 06: Financial Transformer NLP & Trade Signal Classifier

**Module Identifier:** `MOD-06-NLP-SIGNALS`  
**Core Components:** `backend/app/routes/news_sentiment.py`, `backend/app/routes/trade_signal.py`, `frontend/src/components/AiInsightsView.tsx`  
**Quantitative Discipline:** Financial Natural Language Processing, Transformer Sentiment Analysis & Supervised Machine Learning  
**Production Status:** Production Ready (Verified Live & Seeded Sandbox Modes)  

---

## 1. Executive Brief (High-Level Summary)

Financial markets process information through two distinct channels: numerical time series (price, volume, order flow) and unstructured qualitative narratives (regulatory filings, earnings call transcripts, macroeconomic news headlines). The **AI Insights & Trade Signal Module** bridges this divide by extracting sentiment polarity from live financial media using specialized transformer models (**ProsusAI/finbert**), and combining those features with technical momentum indicators in a **Platt-Calibrated Random Forest Ensemble** to generate directional trade signals (`BUY`, `SELL`, `HOLD`) with well-calibrated posterior probabilities.

### Key Capabilities at a Glance:
- **Domain-Specific Transformer NLP**: Employs `ProsusAI/finbert` (fine-tuned on Financial PhraseBank) rather than generic sentiment models, correctly capturing nuanced financial phrases (e.g., "margins compressed", "record headwinds").
- **Multi-Source News Verification**: Ingests live financial headlines, guaranteeing non-empty, valid HTTP/HTTPS source URLs for every article.
- **Platt-Calibrated Signal Probabilities**: Converts raw Random Forest tree vote majorities into true posterior probabilities $P(\text{Up} \mid \mathbf{x}) \in [0.0, 1.0]$.
- **100% Normalized Feature Importance**: Normalizes Gini feature contributions strictly to sum to $100.0\%$, providing clear mathematical explainability.
- **Narrative Sentiment Dispersion**: Measures the standard deviation of news sentiment to quantify market consensus vs. narrative polarization.

---

## 2. Natural Language Processing & Sentiment Mechanics

```
[ Financial News RSS / Scraper Feed ]
                   │
                   ▼
  [ Text Preprocessing & Cleaning ]
  - Filter boilerplate & disclaimers
  - Extract headline + lead sentence
                   │
         +---------+---------+
         │                   │
         ▼                   ▼
[ ProsusAI FinBERT ]   [ VADER Lexicon ]
 (Transformer Model)     (Heuristic Rule)
         │                   │
         +---------+---------+
                   │
                   ▼
  [ Polarity Score: S_k ∈ [-1.0, 1.0] ]
  - Positive: +1.0
  - Negative: -1.0
  - Neutral: 0.0
                   │
                   ▼
  [ Aggregate News Metrics ]
  - Mean Sentiment (S_bar)
  - Sentiment Dispersion (σ_S)
```

---

### 2.1 ProsusAI FinBERT Architecture
Generic NLP models (e.g., standard BERT or VADER) frequently fail in financial domains because standard language assigns positive sentiment to words like "gain" or "advance", but fails on phrases like:
> *"Operating expenses increased by 14% while EBITDA margins compressed."*

FinBERT builds upon the 12-layer bidirectional transformer encoder architecture ($\text{BERT}_{\text{BASE}}$, 110M parameters), fine-tuned specifically on the **Financial PhraseBank** (Malo et al., 2014):

$$\mathbf{h}_i = \text{TransformerEncoder}(\text{tokens}_i)$$
$$\mathbf{p} = \text{Softmax}\left( \mathbf{W}_c \mathbf{h}_{[\text{CLS}]} + \mathbf{b}_c \right)$$

Where $\mathbf{p} = [p_{\text{positive}}, p_{\text{negative}}, p_{\text{neutral}}]^T$ represents the soft class probabilities.

The net continuous polarity score $S_k \in [-1.0, 1.0]$ for article $k$ is calculated as:
$$S_k = p_{\text{positive}} - p_{\text{negative}}$$

---

### 2.2 Aggregate Sentiment & Narrative Dispersion
Given a batch of $K$ articles retrieved for the target ticker over the lookback window:

1. **Mean Sentiment Polarity**:
   $$\bar{S} = \frac{1}{K} \sum_{k=1}^K S_k$$
2. **Sentiment Dispersion (Consensus Metric)**:
   $$\sigma_S = \sqrt{\frac{1}{K} \sum_{k=1}^K (S_k - \bar{S})^2}$$
   - $\sigma_S \approx 0$: **Strong Narrative Consensus** (News sentiment is uniformly bullish or bearish).
   - $\sigma_S > 0.6$: **Severe Narrative Disagreement** (Conflicting reports indicating market uncertainty).

---

## 3. Multi-Factor Trade Signal Classifier

The directional trade signal is produced by a Random Forest ensemble combining 6 technical and fundamental features:

$$\mathbf{x} = \begin{bmatrix}
\text{RSI}_{14} & \text{14-day Relative Strength Index } \in [0, 100] \\
\text{MACD}_{\text{hist}} & \text{MACD Histogram Normalized to Asset Price} \\
\text{BB}_{\%B} = \frac{P - \text{Lower}}{\text{Upper} - \text{Lower}} & \text{Bollinger Band } \%B \text{ Position} \\
\sigma_{20} \cdot \sqrt{252} & \text{20-Day Annualized Realized Historical Volatility} \\
\bar{S} & \text{Mean FinBERT News Sentiment Polarity } \in [-1.0, 1.0] \\
\sigma_S & \text{Narrative Sentiment Dispersion } \in [0.0, 1.0]
\end{bmatrix}$$

---

### 3.1 Platt Probability Calibration
Raw decision tree ensemble voting frequencies $\frac{N_{\text{up}}}{N_{\text{trees}}}$ tend to be overconfident near 0 and 1. FinSight AI applies **Platt Calibration** (Platt, 1999) using a sigmoid link function fitted via out-of-fold cross-validation:

$$P(Y = 1 \mid f(\mathbf{x})) = \frac{1}{1 + \exp\left( A \cdot f(\mathbf{x}) + B \right)}$$

Where:
- $f(\mathbf{x})$ is the uncalibrated margin score of the Random Forest ensemble.
- Parameters $A$ and $B$ are estimated by minimizing cross-entropy loss:
  $$\min_{A, B} -\sum_{i=1}^M \left[ y_i \ln(p_i) + (1 - y_i) \ln(1 - p_i) \right]$$

### 3.2 Decision Boundary & Action Assignment
Based on the calibrated probability $P_{\text{up}} = P(Y = 1 \mid \mathbf{x})$:
- $P_{\text{up}} \ge 0.65$: **`BUY`** Signal (Strong bullish confluence).
- $P_{\text{up}} \le 0.35$: **`SELL`** Signal (Strong bearish confluence).
- $0.35 < P_{\text{up}} < 0.65$: **`HOLD`** Signal (Equilibrium / insufficient edge).

---

### 3.3 Feature Importance Normalization
Mean Decrease in Impurity (Gini Importance) $I_j$ for feature $j$ across all trees is strictly normalized to $100.0\%$:

$$\tilde{I}_j = \frac{I_j}{\sum_{k=1}^D I_k} \times 100.0\% \quad \implies \quad \sum_{j=1}^D \tilde{I}_j = 100.0\%$$

---

## 4. API Specifications

### 4.1 Endpoint: `GET /api/news-sentiment/{ticker}`
**Response Payload (200 OK):**
```json
{
  "ticker": "MSFT",
  "mean_sentiment": 0.42,
  "sentiment_dispersion": 0.18,
  "articles_count": 8,
  "articles": [
    {
      "title": "Microsoft Expands Azure AI Cloud Infrastructure with Record Capex",
      "publisher": "Reuters",
      "url": "https://www.reuters.com/technology/microsoft-azure-capex-2026",
      "published_at": "2026-09-06T12:30:00Z",
      "sentiment": "positive",
      "score": 0.88
    }
  ],
  "data_source": "live",
  "fetched_at": "2026-09-06T15:30:00.000Z"
}
```

### 4.2 Endpoint: `GET /api/trade-signal/{ticker}`
**Response Payload (200 OK):**
```json
{
  "ticker": "MSFT",
  "signal": "BUY",
  "confidence_pct": 74.2,
  "feature_importance": [
    { "feature": "Mean News Sentiment", "importance_pct": 28.5 },
    { "feature": "RSI (14)", "importance_pct": 22.1 },
    { "feature": "MACD Histogram", "importance_pct": 18.4 },
    { "feature": "Bollinger %B", "importance_pct": 14.2 },
    { "feature": "Realized Volatility (20d)", "importance_pct": 9.8 },
    { "feature": "Sentiment Dispersion", "importance_pct": 7.0 }
  ],
  "data_source": "live",
  "fetched_at": "2026-09-06T15:30:00.000Z"
}
```

---

## 5. Verification & Automated Test Suite

Tested in `tests/test_data_integrity.py` and `tests/test_quant_math.py`:
- `test_news_articles_have_valid_urls`: Verifies all returned news items have valid HTTP/HTTPS source URLs.
- `test_feature_importance_sums_to_100`: Asserts Gini feature importances sum to $100.0\% \pm 10^{-4}$.
- **Pass Rate**: 100% verified.
