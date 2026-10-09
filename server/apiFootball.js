const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

export function getApiFootballConfig(env = process.env) {
  return {
    provider: "API-Football",
    leagueId: env.API_FOOTBALL_LEAGUE_ID || "39",
    season: env.API_FOOTBALL_SEASON || String(new Date().getUTCFullYear()),
    connected: Boolean(env.API_FOOTBALL_KEY),
  };
}

async function requestApiFootball(path, env = process.env) {
  const config = getApiFootballConfig(env);
  if (!config.connected) {
    return {
      connected: false,
      provider: config.provider,
      message: "Add API_FOOTBALL_KEY to the server environment.",
      response: [],
    };
  }

  const response = await fetch(`${API_FOOTBALL_BASE}${path}`, {
    headers: { "x-apisports-key": env.API_FOOTBALL_KEY },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`API-Football returned ${response.status}: ${detail.slice(0, 180)}`);
  }

  const result = await response.json();
  if (result.errors && Object.keys(result.errors).length > 0) {
    throw new Error(`API-Football error: ${JSON.stringify(result.errors)}`);
  }
  return result;
}

function withConnection(result, config) {
  if (result.connected === false) return result;
  return { ...result, connected: true, provider: config.provider };
}

export async function getFixtures({ leagueId, season, date, live } = {}, env = process.env) {
  const config = getApiFootballConfig(env);
  const params = new URLSearchParams(live ? { live: "all" } : {
    league: leagueId || config.leagueId,
    season: season || config.season,
  });
  if (date) params.set("date", date);
  return withConnection(await requestApiFootball(`/fixtures?${params}`, env), config);
}

export async function getFixtureDetails({ id } = {}, env = process.env) {
  const config = getApiFootballConfig(env);
  if (!id) return { connected: false, provider: config.provider, response: [], message: "A fixture id is required." };
  return withConnection(await requestApiFootball(`/fixtures?id=${encodeURIComponent(id)}`, env), config);
}

export async function getStandings({ leagueId, season } = {}, env = process.env) {
  const config = getApiFootballConfig(env);
  const params = new URLSearchParams({
    league: leagueId || config.leagueId,
    season: season || config.season,
  });
  return withConnection(await requestApiFootball(`/standings?${params}`, env), config);
}
