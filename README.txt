GOLD TRADING ANALYZER V3.1
============================

Files:
- index.html
- style.css
- app.js
- manifest.json

UPLOAD:
Upload ALL files/folder to a static hosting service. Then open the hosting URL on Android Chrome.

API:
This version uses Twelve Data time_series for XAU/USD.
Open the Settings (gear) button and paste your Twelve Data API key.

IMPORTANT:
1. The API key is stored in this browser's localStorage. Do not use this approach for a public production app if the key has valuable quota; use a server-side proxy.
2. Some Twelve Data accounts/plans/symbols may have different access limits.
3. The app is a technical-analysis tool, not a profit guarantee or financial advice.
4. Browser notification permission is not implemented in this V3.1 starter; sound alerts work while the page is open.

V3.1 FEATURES:
- XAU/USD chart
- 1m/5m/15m/1h/4h/1day
- EMA 20/50/200
- RSI 14
- ATR 14
- MACD
- BUY/SELL logic
- BUY/SELL arrows
- Entry/SL/TP levels using ATR
- Sound alert on new signal
- Auto refresh every 60 seconds
- Mobile responsive / installable PWA shell
