const BASKETBALL_BASE = "https://v1.basketball.api-sports.io";

export function getBasketballConfig(env = process.env) {
  return {
    provider: "API-Sports Basketball",
    leagueId: env.BASKETBALL_LEAGUE_ID || "12",
    season: env.BASKETBALL_SEASON || env.API_FOOTBALL_SEASON || "2025-2026",
    connected: Boolean(env.API_FOOTBALL_KEY),
  };
}
function normaliseSeason(season, fallback) {
  if (!season) return fallback;
  if (/^\d{4}$/.test(String(season))) {
    const end = Number(season);
    return `${end - 1}-${end}`;
  }
  return String(season);
}
async function requestBasketball(path, env = process.env) {
  const config = getBasketballConfig(env);
  if (!config.connected) return { connected: false, provider: config.provider, message: "Add API_FOOTBALL_KEY to power API-Sports Basketball.", response: [] };
  const response = await fetch(`${BASKETBALL_BASE}${path}`, { headers: { "x-apisports-key": env.API_FOOTBALL_KEY } });
  if (!response.ok) throw new Error(`API-Sports Basketball returned ${response.status}`);
  const result = await response.json();
  if (result.errors && Object.keys(result.errors).length) throw new Error(`API-Sports Basketball error: ${JSON.stringify(result.errors)}`);
  return result;
}
function withConnection(result, config) {
  if (result.connected === false) return result;
  return { ...result, connected: true, provider: config.provider };
}
export async function getBasketballFixtures({ leagueId, season, date, live } = {}, env = process.env) {
  const config = getBasketballConfig(env);
  const params = new URLSearchParams(live ? { live: "all" } : { league: leagueId || config.leagueId, season: normaliseSeason(season, config.season) });
  if (date) params.set("date", date);
  return withConnection(await requestBasketball(`/games?${params}`, env), config);
}

export async function getBasketballGameDetails({ id } = {}, env = process.env) {
  const config = getBasketballConfig(env);
  if (!id) return { connected: false, provider: config.provider, response: [], message: "A game id is required." };
  return withConnection(await requestBasketball(`/games?id=${encodeURIComponent(id)}`, env), config);
}

export async function getBasketballStandings({ leagueId, season } = {}, env = process.env) {
  const config = getBasketballConfig(env);
  const params = new URLSearchParams({ league: leagueId || config.leagueId, season: normaliseSeason(season, config.season) });
  return withConnection(await requestBasketball(`/standings?${params}`, env), config);
}
