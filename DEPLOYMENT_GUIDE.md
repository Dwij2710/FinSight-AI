# FinSight AI — Deployment Guide: Vercel & Render

This guide walks you through deploying **FinSight AI** using a modern, scalable cloud architecture:
- **Frontend**: **Vercel** (Next.js 14, React, Edge Network, 0-downtime)
- **Backend**: **Render** (FastAPI, PyTorch, yfinance, Stable-Baselines3, SARIMAX)

---

## 🎯 Architecture Overview

```
   [ Global Users ]
          │
          ▼
   ┌──────────────┐
   │    VERCEL    │  <-- Next.js 14 Frontend
   │ (Sub-second) │      • Rich dark-mode fintech UI
   └──────┬───────┘      • Interactive SVG charts
          │ HTTP API     • Built-in fallback demo engine
          ▼
   ┌──────────────┐
   │    RENDER    │  <-- FastAPI Python Backend
   │ (ML Worker)  │      • PyTorch & Stable-Baselines3
   └──────────────┘      • Statsmodels SARIMAX & MPT
```

---

## 🚀 Part 1: Deploy Backend to Render (5 Minutes, 100% Free)

Render provides free hosting for containerized and Python web services.

### Option A: Standard Web Service Setup (Recommended)
1. Push your latest code to GitHub:
   ```bash
   git add .
   git commit -m "Add FastAPI backend and Next.js frontend"
   git push origin main
   ```
2. Log in to **[render.com](https://render.com/)** and click **New +** → **Web Service**.
3. Connect your GitHub repository (`FinSight-AI` or `StockAI`).
4. Configure the service settings:
   - **Name**: `finsight-ai-backend`
   - **Language**: `Python 3`
   - **Branch**: `main`
   - **Region**: Closest to your users (e.g., *Singapore*, *Frankfurt*, or *Oregon*)
   - **Build Command**:
     ```bash
     pip install --upgrade pip && pip install -r backend/requirements.txt
     ```
   - **Start Command**:
     ```bash
     uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance Type**: **Free**
5. Click **Create Web Service**.
6. Once deployed, Render will give you a public URL (e.g., `https://finsight-ai-backend.onrender.com`).
   - Test it by opening: `https://finsight-ai-backend.onrender.com/health` in your browser. It should respond with `{"status": "healthy"}`.

> [!TIP]
> **Render Free Tier Note**: Free services spin down after 15 minutes of inactivity. The first request after a sleep period may take ~30–45 seconds to wake up. FinSight AI's frontend has a smart status indicator and automatic fallback simulation so your site never breaks while waking up!

---

## 🌐 Part 2: Deploy Frontend to Vercel (2 Minutes, 100% Free)

1. Log in to **[vercel.com](https://vercel.com/)** and click **Add New...** → **Project**.
2. Select your GitHub repository.
3. In the **Configure Project** screen:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click *Edit* and select **`frontend`**
4. Under **Environment Variables**, add:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: Your Render backend URL (e.g., `https://finsight-ai-backend.onrender.com` without trailing slash)
5. Click **Deploy**!
6. In ~60 seconds, your site will be live at `https://your-project.vercel.app`.

---

## 💻 Part 3: Running Locally

You can test both services on your machine simultaneously:

### 1. Start the FastAPI Backend
Open Terminal 1:
```powershell
# In project root: c:\Dwij\StockAI\StockAI
.\venv\Scripts\activate
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
API is running at: `http://127.0.0.1:8000` (Swagger docs at `/docs`).

### 2. Start the Next.js Frontend
Open Terminal 2:
```powershell
cd frontend
npm run dev
```
Frontend is running at: `http://localhost:3000`.

---

## 💡 What About the Streamlit Version?

Your original Streamlit app remains 100% intact and untouched in `app.py` and `views/`. You can still run it locally at any time:
```powershell
streamlit run app.py
```
