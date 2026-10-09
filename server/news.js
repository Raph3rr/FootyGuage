const GUARDIAN_BASE = "https://content.guardianapis.com";
const NEWS_API_BASE = "https://newsapi.org/v2";
const GNEWS_BASE = "https://gnews.io/api/v4";

export function getNewsConfig(env = process.env) {
  const sources = { guardian: Boolean(env.GUARDIAN_API_KEY), newsApi: Boolean(env.NEWSAPI_KEY), gnews: Boolean(env.GNEWS_API_KEY) };
  return { provider: "Football and basketball news sources", sources, connected: Object.values(sources).some(Boolean) };
}
function cleanHtml(value = "") { return value.replace(/<[^>]*>/g, "").trim(); }
async function requestGuardian(query, env, sport = "football") {
  const params = new URLSearchParams({ "api-key": env.GUARDIAN_API_KEY, q: query, section: sport === "basketball" ? "sport" : "football", "order-by": "newest", "page-size": "20", "show-fields": "thumbnail,trailText" });
  const response = await fetch(`${GUARDIAN_BASE}/search?${params}`);
  if (!response.ok) throw new Error(`Guardian returned ${response.status}`);
  const result = await response.json();
  return (result.response?.results || []).map((item) => ({ id: `guardian-${item.id}`, webTitle: item.webTitle, webUrl: item.webUrl, webPublicationDate: item.webPublicationDate, fields: { thumbnail: item.fields?.thumbnail, trailText: cleanHtml(item.fields?.trailText) }, source: "The Guardian" }));
}
async function requestNewsApi(query, env) {
  const params = new URLSearchParams({ q: query, language: "en", sortBy: "publishedAt", pageSize: "20" });
  const response = await fetch(`${NEWS_API_BASE}/everything?${params}`, { headers: { "X-Api-Key": env.NEWSAPI_KEY } });
  if (!response.ok) throw new Error(`NewsAPI returned ${response.status}`);
  const result = await response.json();
  return (result.articles || []).map((item, index) => ({ id: `newsapi-${item.url || index}`, webTitle: item.title, webUrl: item.url, webPublicationDate: item.publishedAt, fields: { thumbnail: item.urlToImage, trailText: item.description || "" }, source: item.source?.name || "NewsAPI" }));
}
async function requestGNews(query, env) {
  const params = new URLSearchParams({ q: query, lang: "en", max: "10", apikey: env.GNEWS_API_KEY });
  const response = await fetch(`${GNEWS_BASE}/search?${params}`);
  if (!response.ok) throw new Error(`GNews returned ${response.status}`);
  const result = await response.json();
  return (result.articles || []).map((item, index) => ({ id: `gnews-${item.url || index}`, webTitle: item.title, webUrl: item.url, webPublicationDate: item.publishedAt, fields: { thumbnail: item.image, trailText: item.description || item.content || "" }, source: item.source?.name || "GNews" }));
}
export async function getFootballNews({ query = "football", sport = "football" } = {}, env = process.env) {
  const config = getNewsConfig(env);
  if (!config.connected) return { connected: false, provider: config.provider, sources: config.sources, message: "Add a news API key to the server environment.", response: { results: [] } };
  const requests = [];
  if (config.sources.guardian) requests.push(["The Guardian", requestGuardian(query, env, sport)]);
  if (config.sources.newsApi) requests.push(["NewsAPI", requestNewsApi(query, env)]);
  if (config.sources.gnews) requests.push(["GNews", requestGNews(query, env)]);
  const settled = await Promise.allSettled(requests.map(([, request]) => request));
  const results = settled.flatMap((item) => item.status === "fulfilled" ? item.value : []);
  const errors = settled.flatMap((item, index) => item.status === "rejected" ? [`${requests[index][0]}: ${item.reason.message}`] : []);
  const unique = [...new Map(results.filter((item) => item.webUrl).map((item) => [item.webUrl, item])).values()];
  unique.sort((a, b) => new Date(b.webPublicationDate || 0) - new Date(a.webPublicationDate || 0));
  return { connected: unique.length > 0, provider: config.provider, sources: config.sources, errors, response: { results: unique.slice(0, 60) } };
}
