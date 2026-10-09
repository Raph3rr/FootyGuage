# FootyGauge

FootyGauge is a football match tracker and explainable prediction workspace.

## Current state

The first product slice now has server adapters for three free services. It does **not** invent fixtures, scores, teams, or stories: if a source key is missing, the interface shows a clear unavailable state.

## Requested stack

- React with Vite and JavaScript/JSX for the client feature layer
- Node.js and Express for the server feature layer
- npm commands for local work
- Tailwind is enabled through `@tailwindcss/vite` and `@import "tailwindcss"`; the premium sports components also use a small custom CSS layer for precise layout control

The WebDev runtime scaffold includes framework infrastructure under `server/_core`. Feature code added for FootyGauge is written in JavaScript/JSX.

## Local setup

This project is intended to be viewed and edited on your own computer. The Manus preview is only a development check; it is not a public launch or hosting requirement.

From the project root, run:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000` in your browser. If port 3000 is already in use, choose another port before starting the command:

```bash
# macOS/Linux
PORT=4317 npm run dev

# Windows PowerShell
$env:PORT=4317; npm run dev
```

The dashboard now reads three free services from the server: API-Football for primary fixtures, football-data.org for football fallback fixtures/tables, API-Sports Basketball through its `v1.basketball.api-sports.io` endpoint, and Guardian/NewsAPI/GNews for news. Never put these keys in `VITE_` variables.

## Provider variables

Create a `.env` file in the project root for local work:

```bash
API_FOOTBALL_KEY=your_api_football_key
API_FOOTBALL_LEAGUE_ID=39
API_FOOTBALL_SEASON=2026
FOOTBALL_DATA_API_TOKEN=your_football_data_token
FOOTBALL_COMPETITION_CODE=PL
GUARDIAN_API_KEY=your_guardian_key
NEWSAPI_KEY=your_newsapi_key
GNEWS_API_KEY=your_gnews_key
BASKETBALL_LEAGUE_ID=12
BASKETBALL_SEASON=2025-2026
```

The API-Football league ID defaults to `39` (Premier League). Change it later when we choose another competition. The API keys are loaded only by Node/Express through `dotenv` and are never sent to the browser.

The first page will still start if a key is missing; it will show a clear connection message instead of inventing matches or stories. Overview is intentionally free of sport/league/live controls and shows the next fixtures, newsroom, prediction desk, and a multi-league coming-up list. News has only Football news/Basketball news toggles plus an optional competition filter; the selected competition is included in provider queries. Fixtures owns the sport, league, season, scheduled/completed fixtures, scores, historical lists, and selected-league table. Live is a separate navigation destination: it requests football and basketball live feeds independently of the selected fixture league, so a Premier League selection never narrows the live board. Live cards support local favorites and tracking; tracked provider details refresh every 30 seconds and display verified score/status information plus supplied corner data when available. API-Sports Basketball uses the same API-Sports key against the `v1` endpoint and converts a year such as `2026` to `2025-2026`. The interface supports previous seasons, Premier League, LaLiga, Serie A, Bundesliga, Champions League, NBA, WNBA, EuroLeague, and ACB.

## Data integrity rule

The client should display a clear empty or unavailable state when a provider is not connected, a response is incomplete, or data is stale. Do not add placeholder match scores or fake prediction records.

## Prediction rule

The statistical prediction service will be the source of probabilities. A language model may explain approved probabilities and supplied evidence, but it must not invent or alter numeric predictions.

## Visual direction

FootyGauge uses a black-and-gold premium sports direction: `#09090B` background, `#18181B` cards, white text, `#F59E0B` primary amber, and `#FBBF24` gold. It intentionally avoids purple-blue gradients, unnecessary pills, emoji icons, fake metrics, fake reviews, and excessive animation. Mobile rules cover narrow phone widths, stacked controls, horizontal overflow where appropriate, a slide-in navigation drawer, score columns, and single-column news cards.
