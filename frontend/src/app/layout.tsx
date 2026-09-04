import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FinSight AI — Quantitative Intelligence & Stock Forecasting',
  description: 'AI-Powered Stock Intelligence, SARIMAX price forecasting, Modern Portfolio Theory optimization, FinBERT sentiment analysis, and Deep Reinforcement Learning trading agents.',
  keywords: ['Stock Prediction', 'FinSight AI', 'Quantitative Finance', 'Machine Learning', 'Reinforcement Learning', 'SARIMAX', 'Portfolio Optimization'],
  authors: [{ name: 'Dwij Prajapati' }]
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
