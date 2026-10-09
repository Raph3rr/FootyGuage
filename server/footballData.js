const FOOTBALL_DATA_BASE = "https://api.football-data.org/v4";

function toDate(value) {
  return value.toISOString().slice(0, 10);
}

function dateWindow() {
  const from = new Date();
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 7);
  return { dateFrom: toDate(from), dateTo: toDate(to) };
}

export function getFootballDataConfig(env = process.env) {
  return {
    provider: "football-data.org",
    competitionCode: env.FOOTBALL_COMPETITION_CODE || "PL",
    connected: Boolean(env.FOOTBALL_DATA_API_TOKEN),
  };
}

async function requestFootballData(path, env = process.env) {
  const config = getFootballDataConfig(env);
  if (!config.connected) {
    return {
      connected: false,
      provider: config.provider,
      message: "Add FOOTBALL_DATA_API_TOKEN to the server environment.",
      data: [],
    };
  }

  const response = await fetch(`${FOOTBALL_DATA_BASE}${path}`, {
    headers: { "X-Auth-Token": env.FOOTBALL_DATA_API_TOKEN },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`football-data.org returned ${response.status}: ${detail.slice(0, 180)}`);
  }

  return response.json();
}

function withConnection(result, config, competitionCode) {
  if (result.connected === false) return result;
  return { ...result, competitionCode, connected: true, provider: config.provider };
}

export async function getFixtures({ competitionCode, dateFrom, dateTo } = {}, env = process.env) {
  const config = getFootballDataConfig(env);
  const window = dateFrom && dateTo ? { dateFrom, dateTo } : dateWindow();
  const competition = competitionCode || config.competitionCode;
  const query = new URLSearchParams({ status: "SCHEDULED", dateFrom: window.dateFrom, dateTo: window.dateTo });
  return withConnection(await requestFootballData(`/competitions/${competition}/matches?${query}`, env), config, competition);
}

export async function getStandings({ competitionCode } = {}, env = process.env) {
  const config = getFootballDataConfig(env);
  const competition = competitionCode || config.competitionCode;
  return withConnection(await requestFootballData(`/competitions/${competition}/standings`, env), config, competition);
}

export function assertFootballDataReady(env = process.env) {
  const config = getFootballDataConfig(env);
  if (!config.connected) {
    throw new Error("football-data.org is not configured. Add FOOTBALL_DATA_API_TOKEN to the server environment.");
  }
  return config;
}
