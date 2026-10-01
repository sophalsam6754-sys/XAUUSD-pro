# XAUUSD Pro V3.2

Mobile-first XAU/USD analysis dashboard.

## Features
- Twelve Data live quote + OHLC time series
- 1m / 5m / 15m / 30m / 1H / 4H / 1D
- Candlestick chart
- EMA 20/50/200
- RSI 14
- MACD
- ATR 14
- Support / resistance
- Algorithmic BUY / SELL / WAIT signal engine
- Entry / SL / TP1 / TP2 based on ATR
- Signal-strength score
- Browser sound alert
- Price alerts
- Risk calculator / suggested lot size
- Local signal history
- Demo economic-news panel
- PWA manifest + service worker
- API key kept in browser localStorage, not in source

## Setup
1. Upload all files to your GitHub repository.
2. Enable GitHub Pages from Settings -> Pages -> Deploy from branch -> main -> root.
3. Open the Pages URL.
4. Paste your Twelve Data API key in the app Settings.
5. Select XAU/USD and a timeframe, then Save & Connect.

## Important
The signal engine is an educational technical-analysis aid. It does not guarantee profits and should not be treated as personalized financial advice.

For public GitHub Pages, never commit your private API key into `app.js`, HTML, or any public file.
