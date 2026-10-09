import { describe, expect, it, vi } from "vitest";
import { getApiFootballConfig, getFixtures as getApiFootballFixtures, getFixtureDetails } from "./apiFootball.js";
import { getFootballDataConfig } from "./footballData.js";
import { getFootballNews, getNewsConfig } from "./news.js";
import { getBasketballConfig, getBasketballFixtures, getBasketballGameDetails } from "./basketball.js";

const emptyEnv = {};

describe("FootyGauge free data providers", () => {
  it("selects API-Football as the primary provider without exposing its key", () => {
    const config = getApiFootballConfig({ API_FOOTBALL_KEY: "server-only-test-key", API_FOOTBALL_LEAGUE_ID: "39" });
    expect(config.connected).toBe(true);
    expect(config.leagueId).toBe("39");
    expect(config).not.toHaveProperty("key");
  });

  it("fails closed when football-data.org is not configured", () => {
    const config = getFootballDataConfig(emptyEnv);
    expect(config.provider).toBe("football-data.org");
    expect(config.connected).toBe(false);
    expect(config).not.toHaveProperty("token");
  });

  it("recognises the football-data.org and Guardian keys", () => {
    expect(getFootballDataConfig({ FOOTBALL_DATA_API_TOKEN: "server-only-test-token" }).connected).toBe(true);
    const newsConfig = getNewsConfig({ GUARDIAN_API_KEY: "server-only-test-key" });
    expect(newsConfig.connected).toBe(true);
    expect(newsConfig).not.toHaveProperty("key");
  });

  it("sends API-Football credentials only in the server-side request header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ response: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await getApiFootballFixtures({}, { API_FOOTBALL_KEY: "server-only-test-key", API_FOOTBALL_SEASON: "2026" });
    expect(result.connected).toBe(true);
    expect(fetchMock.mock.calls[0][1].headers["x-apisports-key"]).toBe("server-only-test-key");
    vi.unstubAllGlobals();
  });

  it("uses the API-Sports basketball live endpoint with the server key", async () => {
    const config = getBasketballConfig({ API_FOOTBALL_KEY: "server-only-test-key" });
    expect(config.connected).toBe(true);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ response: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await getBasketballFixtures({ live: true }, { API_FOOTBALL_KEY: "server-only-test-key" });
    const requestUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(result.connected).toBe(true);
    expect(requestUrl.pathname).toBe("/games");
    expect(requestUrl.searchParams.get("live")).toBe("all");
    expect(fetchMock.mock.calls[0][1].headers["x-apisports-key"]).toBe("server-only-test-key");
    vi.unstubAllGlobals();
  });

  it("requests football live matches without a selected league", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ response: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await getApiFootballFixtures({ live: true }, { API_FOOTBALL_KEY: "server-only-test-key" });
    const requestUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(requestUrl.pathname).toBe("/fixtures");
    expect(requestUrl.searchParams.get("live")).toBe("all");
    expect(requestUrl.searchParams.has("league")).toBe(false);
    vi.unstubAllGlobals();
  });

  it("converts a selected basketball season into the v1 API season format", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ response: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await getBasketballFixtures({ leagueId: "12", season: "2026" }, { API_FOOTBALL_KEY: "server-only-test-key" });
    const requestUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(requestUrl.searchParams.get("season")).toBe("2025-2026");
    vi.unstubAllGlobals();
  });

  it("requests provider details by id for tracked football and basketball matches", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ response: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ response: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await getFixtureDetails({ id: "123" }, { API_FOOTBALL_KEY: "server-only-test-key" });
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get("id")).toBe("123");
    await getBasketballGameDetails({ id: "456" }, { API_FOOTBALL_KEY: "server-only-test-key" });
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get("id")).toBe("456");
    vi.unstubAllGlobals();
  });

  it("builds Guardian news requests with the football section", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ response: { results: [{ id: "test-story", webTitle: "Test story", webUrl: "https://example.com/story", webPublicationDate: "2026-10-06T00:00:00Z" }] } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await getFootballNews({ query: "Premier League" }, { GUARDIAN_API_KEY: "server-only-test-key" });
    const requestUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(result.connected).toBe(true);
    expect(requestUrl.searchParams.get("section")).toBe("football");
    expect(requestUrl.searchParams.get("api-key")).toBe("server-only-test-key");
    vi.unstubAllGlobals();
  });

  it("uses the sport section for basketball news", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ response: { results: [{ id: "basketball-story", webTitle: "Basketball story", webUrl: "https://example.com/basketball", webPublicationDate: "2026-10-06T00:00:00Z" }] } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await getFootballNews({ query: "NBA", sport: "basketball" }, { GUARDIAN_API_KEY: "server-only-test-key" });
    const requestUrl = new URL(fetchMock.mock.calls[0][0]);
    expect(requestUrl.searchParams.get("section")).toBe("sport");
    expect(requestUrl.searchParams.get("q")).toBe("NBA");
    vi.unstubAllGlobals();
  });
});
