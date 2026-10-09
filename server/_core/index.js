import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth.js";
import { registerStorageProxy } from "./storageProxy.js";
import { appRouter } from "../routers.js";
import { createContext } from "./context.js";
import { setupVite } from "./vite.js";
import { getApiFootballConfig, getFixtures as getApiFootballFixtures, getFixtureDetails as getApiFootballFixtureDetails, getStandings as getApiFootballStandings } from "../apiFootball.js";
import { getFootballDataConfig, getFixtures as getFootballDataFixtures, getStandings as getFootballDataStandings } from "../footballData.js";
import { getFootballNews, getNewsConfig } from "../news.js";
import { getBasketballConfig, getBasketballFixtures, getBasketballGameDetails, getBasketballStandings } from "../basketball.js";
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
function hasApiFootballFixtures(result) {
  return Array.isArray(result?.response) && result.response.length > 0;
}
function normaliseFootballDataFixtures(result) {
  const matches = result?.matches || [];
  return matches.map((match) => ({
    fixture: { id: match.id, date: match.utcDate, status: { short: match.status }, score: { home: match.score?.fullTime?.home ?? null, away: match.score?.fullTime?.away ?? null } },
    league: { name: match.competition?.name, round: match.matchday ? `Matchday ${match.matchday}` : "Fixture" },
    teams: { home: { name: match.homeTeam?.name }, away: { name: match.awayTeam?.name } },
  }));
}
function normaliseFootballDataStandings(result) {
  const table = result?.standings?.[0]?.table || [];
  return { response: [{ league: { standings: [table.map((row) => ({ rank: row.position, team: { name: row.team?.name }, all: { played: row.playedGames, win: row.won }, points: row.points }))] } }], source: "football-data.org" };
}
async function startServer() {
  const app = express();
  const server = createServer(app);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.get("/api/status", (_req, res) => {
    res.json({
      football: getApiFootballConfig(),
      footballData: getFootballDataConfig(),
      basketball: getBasketballConfig(),
      news: getNewsConfig(),
    });
  });
  app.get("/api/fixtures", async (req, res) => {
    if (req.query.sport === "basketball") {
      try {
        const result = await getBasketballFixtures({ leagueId: req.query.league, season: req.query.season, date: req.query.date, live: req.query.live === "true" });
        return res.json({ ...result, source: "API-Sports Basketball" });
      } catch (error) {
        return res.status(502).json({ error: error.message });
      }
    }
    let primaryError = "";
    try {
      const result = await getApiFootballFixtures({
        leagueId: req.query.league,
        season: req.query.season,
        date: req.query.date,
        live: req.query.live === "true",
      });
      if (hasApiFootballFixtures(result)) return res.json({ ...result, source: "API-Football" });
      if (req.query.live === "true") return res.json({ ...result, response: [], message: "No live football matches right now.", source: "API-Football" });
      if (!getFootballDataConfig().connected) return res.json(result);
    } catch (error) {
      primaryError = error.message;
    }
    if (req.query.live === "true") return res.json({ connected: false, response: [], message: "No live football matches are available from API-Football right now." });
    try {
      const fallback = await getFootballDataFixtures({ competitionCode: req.query.competition });
      if (fallback.connected) {
        return res.json({ ...fallback, response: normaliseFootballDataFixtures(fallback), source: "football-data.org", fallbackFrom: primaryError || "API-Football returned no fixtures" });
      }
      res.json({ connected: false, response: [], message: primaryError || "No fixture provider returned matches." });
    } catch (error) {
      res.status(502).json({ error: `${primaryError ? `${primaryError}; ` : ""}Fallback failed: ${error.message}` });
    }
  });
  app.get("/api/live", async (_req, res) => {
    const [footballResult, basketballResult] = await Promise.allSettled([
      getApiFootballFixtures({ live: true }),
      getBasketballFixtures({ live: true }),
    ]);
    const football = footballResult.status === "fulfilled" ? footballResult.value : { connected: false, response: [], message: footballResult.reason?.message || "Football live feed unavailable." };
    const basketball = basketballResult.status === "fulfilled" ? basketballResult.value : { connected: false, response: [], message: basketballResult.reason?.message || "Basketball live feed unavailable." };
    res.json({ connected: Boolean(football.connected || basketball.connected), football, basketball, source: "Cross-league live feeds", updatedAt: new Date().toISOString() });
  });
  app.get("/api/live/:sport/:id", async (req, res) => {
    try {
      const result = req.params.sport === "basketball"
        ? await getBasketballGameDetails({ id: req.params.id })
        : await getApiFootballFixtureDetails({ id: req.params.id });
      res.json(result);
    } catch (error) {
      res.status(502).json({ error: error.message, response: [] });
    }
  });
  app.get("/api/overview-fixtures", async (req, res) => {
    try {
      const leagueIds = ["39", "140", "135", "78", "2"];
      const results = await Promise.all(leagueIds.map((leagueId) => getApiFootballFixtures({ leagueId, season: req.query.season })));
      const response = results.flatMap((result) => result.response || []).sort((a, b) => new Date(a.fixture?.date || 0) - new Date(b.fixture?.date || 0)).slice(0, 24);
      res.json({ connected: results.some((result) => result.connected), response, source: "API-Football" });
    } catch (error) {
      res.status(502).json({ error: error.message, response: [] });
    }
  });
  app.get("/api/standings", async (req, res) => {
    try {
      if (req.query.sport === "basketball") {
        const result = await getBasketballStandings({ leagueId: req.query.league, season: req.query.season });
        return res.json(result);
      }
      const result = await getApiFootballStandings({ leagueId: req.query.league, season: req.query.season });
      if (result.connected === false && getFootballDataConfig().connected) {
        const fallback = await getFootballDataStandings({ competitionCode: req.query.competition });
        return res.json(fallback.connected ? normaliseFootballDataStandings(fallback) : result);
      }
      res.json(result);
    } catch (error) {
      if (getFootballDataConfig().connected) {
        try {
          const fallback = await getFootballDataStandings({ competitionCode: req.query.competition });
          if (fallback.connected) return res.json(normaliseFootballDataStandings(fallback));
        } catch (fallbackError) {
          return res.status(502).json({ error: `${error.message}; Fallback failed: ${fallbackError.message}` });
        }
      }
      res.status(502).json({ error: error.message });
    }
  });
  app.get("/api/football-data/fixtures", async (req, res) => {
    try {
      const result = await getFootballDataFixtures({ competitionCode: req.query.competition });
      res.json(result);
    } catch (error) {
      res.status(502).json({ error: error.message });
    }
  });
  app.get("/api/football-data/standings", async (req, res) => {
    try {
      const result = await getFootballDataStandings({ competitionCode: req.query.competition });
      res.json(result);
    } catch (error) {
      res.status(502).json({ error: error.message });
    }
  });
  app.get("/api/news", async (req, res) => {
    try {
      const sport = req.query.sport === "basketball" ? "basketball" : "football";
      const league = typeof req.query.league === "string" ? req.query.league : "";
      const query = typeof req.query.q === "string" ? req.query.q : `${sport} ${league}`.trim();
      const result = await getFootballNews({ query, sport });
      res.json(result);
    } catch (error) {
      res.status(502).json({ error: error.message });
    }
  });
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (true) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);
