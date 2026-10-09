import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bell, CalendarDays, ChevronDown, Clock3, Flag, Gauge, Menu, Newspaper, Radio, RefreshCw, ShieldCheck, Star, Trophy, Users, X } from "lucide-react";

const navItems = [
  { label: "Overview", icon: Gauge },
  { label: "Live", icon: Radio },
  { label: "News", icon: Newspaper },
  { label: "Fixtures", icon: CalendarDays },
  { label: "Favorites", icon: Star },
  { label: "Teams", icon: Users },
  { label: "Predictions", icon: Trophy },
];
const footballLeagues = [
  { id: "39", name: "Premier League", code: "PL" },
  { id: "140", name: "LaLiga", code: "PD" },
  { id: "135", name: "Serie A", code: "SA" },
  { id: "78", name: "Bundesliga", code: "BL1" },
  { id: "2", name: "Champions League", code: "CL" },
];
const basketballLeagues = [
  { id: "12", name: "NBA" },
  { id: "13", name: "WNBA" },
  { id: "120", name: "EuroLeague" },
  { id: "117", name: "ACB" },
];
const seasons = ["2026", "2025", "2024", "2023", "2022"];

function formatDate(value) {
  if (!value) return "Date TBC";
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
function Status({ children, live = false }) {
  return <span className={`data-status ${live ? "data-status-live" : ""}`}><span />{children}</span>;
}
function EmptyState({ title, copy, action, onAction }) {
  return <div className="empty-state"><div className="empty-ball">◉</div><div><p className="kicker">Match centre</p><h3>{title}</h3><p>{copy}</p>{action && <button className="link-button" onClick={onAction}>{action}<ArrowRight size={15} /></button>}</div></div>;
}
function normaliseBasketball(item) {
  return {
    ...item,
    fixture: { id: item.id, date: item.date, status: { short: item.status?.short || item.status?.long || "TBC" }, score: { home: item.scores?.home?.total ?? item.scores?.home?.points ?? null, away: item.scores?.away?.total ?? item.scores?.away?.points ?? null } },
    teams: { home: { name: item.teams?.home?.name }, away: { name: item.teams?.away?.name } },
    league: { name: item.league?.name, round: item.stage || item.league?.season || "Fixture" },
  };
}
function normaliseFootball(item) {
  const homeScore = item.goals?.home ?? item.score?.fulltime?.home ?? item.score?.extratime?.home ?? item.score?.halftime?.home ?? null;
  const awayScore = item.goals?.away ?? item.score?.fulltime?.away ?? item.score?.extratime?.away ?? item.score?.halftime?.away ?? null;
  return { ...item, fixture: { ...item.fixture, score: { home: homeScore, away: awayScore } } };
}
function normaliseStandings(result) {
  const response = result?.response;
  const first = Array.isArray(response) ? response[0] : null;
  const rows = first?.league?.standings?.[0] || first?.standings || (Array.isArray(first) ? first : []);
  return rows.map((row) => ({ rank: row.rank || row.position || "-", team: row.team?.name || row.name || "Team", played: row.all?.played || row.games?.played || row.played || "-", won: row.all?.win || row.games?.win || row.wins || "-", points: row.points ?? row.win?.total ?? row.wins ?? "-" }));
}
function isLiveStatus(status, basketball) {
  return basketball ? ["Q1", "Q2", "Q3", "Q4", "OT", "HT", "LIVE"].includes(status) : ["1H", "2H", "HT", "ET", "P", "LIVE", "INT", "BT"].includes(status);
}
function fixtureKey(fixture, sport) {
  return `${sport}:${fixture.fixture?.id || fixture.id}`;
}
function recordFromFixture(fixture, sport) {
  const score = fixture.fixture?.score || {};
  return { key: fixtureKey(fixture, sport), id: fixture.fixture?.id || fixture.id, sport, home: fixture.teams?.home?.name || "Home team", away: fixture.teams?.away?.name || "Away team", league: fixture.league?.name || "Competition", status: fixture.fixture?.status?.short || "TBC", date: fixture.fixture?.date || null, scoreHome: score.home ?? null, scoreAway: score.away ?? null, summary: trackingSummary(fixture, sport === "basketball") };
}
function recordToFixture(record) {
  return { fixture: { id: record.id, date: record.date, status: { short: record.status }, score: { home: record.scoreHome, away: record.scoreAway } }, teams: { home: { name: record.home }, away: { name: record.away } }, league: { name: record.league, round: "Saved match" } };
}
function getCornerSummary(fixture) {
  const stats = fixture.statistics || [];
  const values = stats.map((teamStats) => teamStats.statistics?.find((item) => item.type === "Corner Kicks")?.value ?? null);
  if (values.length >= 2 && values.some((value) => value !== null)) return `Corners ${values[0] ?? "—"}–${values[1] ?? "—"}`;
  return null;
}
function trackingSummary(fixture, basketball) {
  const corners = getCornerSummary(fixture);
  if (corners) return corners;
  const elapsed = fixture.fixture?.status?.elapsed;
  if (basketball) return `Live period ${fixture.fixture?.status?.short || "in play"}`;
  return elapsed ? `${elapsed}' in play · feed refreshes every 30s` : "Live feed refreshes every 30s";
}
function FixtureRow({ fixture, basketball = false, favorite = false, onToggleFavorite }) {
  const teams = fixture.teams || {};
  const status = fixture.fixture?.status?.short || "TBC";
  const live = isLiveStatus(status, basketball);
  const score = fixture.fixture?.score || {};
  const hasScore = (score.home !== null && score.home !== undefined) || (score.away !== null && score.away !== undefined);
  return <div className="fixture-row">
    <div className="fixture-time"><span className={live ? "live-pip" : ""} />{live ? status : formatDate(fixture.fixture?.date)}</div>
    <div className="fixture-teams"><strong>{teams.home?.name || "Home team"}</strong><span>v</span><strong>{teams.away?.name || "Away team"}</strong></div>
    <div className="fixture-score" aria-label="Score"><strong>{hasScore ? score.home ?? "—" : "—"}</strong><span>:</span><strong>{hasScore ? score.away ?? "—" : "—"}</strong></div>
    <div className="fixture-league">{fixture.league?.name || "Competition"}<small>{fixture.league?.round || "Fixture"}</small></div>
    <button className={`favorite-button ${favorite ? "favorite-active" : ""}`} onClick={() => onToggleFavorite?.(fixture, basketball ? "basketball" : "football")} aria-label={favorite ? "Remove from favorites" : "Add to favorites"} aria-pressed={favorite}><Star size={17} fill={favorite ? "currentColor" : "none"} /></button>
  </div>;
}
function LiveMatchCard({ fixture, basketball, favorite, tracked, onToggleFavorite, onToggleTracking }) {
  const status = fixture.fixture?.status?.short || "LIVE";
  const score = fixture.fixture?.score || {};
  const hasScore = score.home !== null && score.home !== undefined || score.away !== null && score.away !== undefined;
  const sport = basketball ? "basketball" : "football";
  return <article className="live-card">
    <div className="live-card-head"><span className="live-label"><span className="live-pip" /> LIVE NOW</span><span>{fixture.league?.name || "Competition"}</span></div>
    <div className="live-card-main"><div><strong>{fixture.teams?.home?.name || "Home team"}</strong><strong>{fixture.teams?.away?.name || "Away team"}</strong></div><div className="live-card-score"><strong>{hasScore ? score.home ?? "—" : "—"}</strong><span>:</span><strong>{hasScore ? score.away ?? "—" : "—"}</strong><small>{status}</small></div></div>
    <div className="live-card-meta"><span>{trackingSummary(fixture, basketball)}</span><span>{fixture.league?.round || sport}</span></div>
    <div className="live-card-actions"><button className={`favorite-button ${favorite ? "favorite-active" : ""}`} onClick={() => onToggleFavorite(fixture, sport)} aria-label={favorite ? "Remove from favorites" : "Add to favorites"} aria-pressed={favorite}><Star size={16} fill={favorite ? "currentColor" : "none"} />{favorite ? "Saved" : "Save match"}</button><button className={`track-button ${tracked ? "track-active" : ""}`} onClick={() => onToggleTracking(fixture, sport)}>{tracked ? "Tracking on" : "Track match"}<RefreshCw size={14} /></button></div>
  </article>;
}
function NewsCard({ article }) {
  const fields = article.fields || {};
  return <a className="news-card" href={article.webUrl} target="_blank" rel="noreferrer">{fields.thumbnail ? <img src={fields.thumbnail} alt="" /> : <div className="news-image"><Newspaper size={22} /></div>}<div className="news-card-body"><span className="news-tag">{article.source || "Sports news"}</span><h3>{article.webTitle}</h3><p>{fields.trailText || "Read the latest report from the original source."}</p><small>{article.webPublicationDate ? new Date(article.webPublicationDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Latest"} · {article.source || "News desk"}</small></div></a>;
}

export default function App() {
  const [active, setActive] = useState("Overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sport, setSport] = useState("football");
  const [season, setSeason] = useState("2026");
  const [league, setLeague] = useState("39");
  const [fixtures, setFixtures] = useState([]);
  const [overviewFixtures, setOverviewFixtures] = useState([]);
  const [standings, setStandings] = useState([]);
  const [liveMatches, setLiveMatches] = useState([]);
  const [news, setNews] = useState([]);
  const [newsSport, setNewsSport] = useState("football");
  const [newsLeague, setNewsLeague] = useState("39");
  const [favorites, setFavorites] = useState(() => { try { return JSON.parse(localStorage.getItem("footygauge-favorites") || "[]"); } catch { return []; } });
  const [trackedMatches, setTrackedMatches] = useState(() => { try { return JSON.parse(localStorage.getItem("footygauge-tracked") || "[]"); } catch { return []; } });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [liveLoading, setLiveLoading] = useState(false);
  const [error, setError] = useState("");
  const [liveError, setLiveError] = useState("");
  const leagues = sport === "football" ? footballLeagues : basketballLeagues;
  const selectedLeague = leagues.find((item) => item.id === league) || leagues[0];
  const newsLeagues = newsSport === "football" ? footballLeagues : basketballLeagues;
  const selectedNewsLeague = newsLeagues.find((item) => item.id === newsLeague) || newsLeagues[0];
  const pageTitle = useMemo(() => active === "Overview" ? "Match centre" : active, [active]);
  const overviewRows = overviewFixtures.slice(0, 12);

  const loadFixtures = async () => {
    setLoading(true); setError("");
    const params = new URLSearchParams({ sport, league, season });
    if (sport === "football") params.set("competition", selectedLeague.code);
    try {
      const result = await fetch(`/api/fixtures?${params}`).then((response) => response.json());
      const raw = result.response || [];
      setFixtures(sport === "basketball" ? raw.map(normaliseBasketball) : raw.map(normaliseFootball));
      if (result.error) setError(result.error);
    } catch {
      setError("Fixtures could not be loaded. Check your server keys and free API quota.");
    } finally { setLoading(false); }
  };
  const loadLive = async () => {
    setLiveLoading(true); setLiveError("");
    try {
      const result = await fetch("/api/live").then((response) => response.json());
      const football = (result.football?.response || []).map((item) => ({ ...normaliseFootball(item), sport: "football" }));
      const basketball = (result.basketball?.response || []).map((item) => ({ ...normaliseBasketball(item), sport: "basketball" }));
      const next = [...football, ...basketball].sort((a, b) => new Date(a.fixture?.date || 0) - new Date(b.fixture?.date || 0));
      setLiveMatches(next);
      if (!next.length && !result.football?.connected && !result.basketball?.connected) setLiveError("Connect API-Football to see the cross-league live board.");
    } catch { setLiveError("The live board could not be reached. Start the Node server with npm run dev."); } finally { setLiveLoading(false); }
  };
  const loadNews = (nextSport = newsSport, nextLeague = selectedNewsLeague.id) => {
    const leagueName = (nextSport === "football" ? footballLeagues : basketballLeagues).find((item) => item.id === nextLeague)?.name || "";
    fetch(`/api/news?sport=${nextSport}&league=${encodeURIComponent(leagueName)}`).then((r) => r.json()).then((result) => setNews(result.response?.results || [])).catch(() => setNews([]));
  };
  const toggleFavorite = (fixture, sportName) => {
    const record = recordFromFixture(fixture, sportName);
    setFavorites((current) => current.some((item) => item.key === record.key) ? current.filter((item) => item.key !== record.key) : [record, ...current]);
  };
  const toggleTracking = (fixture, sportName) => {
    const record = recordFromFixture(fixture, sportName);
    setTrackedMatches((current) => current.some((item) => item.key === record.key) ? current.filter((item) => item.key !== record.key) : [record, ...current]);
  };
  const isFavorite = (fixture, sportName) => favorites.some((item) => item.key === fixtureKey(fixture, sportName));
  const isTracked = (fixture, sportName) => trackedMatches.some((item) => item.key === fixtureKey(fixture, sportName));
  const refreshTrackedMatch = async (record) => {
    try {
      const result = await fetch(`/api/live/${record.sport}/${record.id}`).then((response) => response.json());
      const raw = result.response?.[0];
      if (!raw) return;
      const next = record.sport === "basketball" ? normaliseBasketball(raw) : normaliseFootball(raw);
      setLiveMatches((current) => current.map((item) => fixtureKey(item, record.sport) === record.key ? { ...next, sport: record.sport } : item));
      setTrackedMatches((current) => current.map((item) => item.key === record.key ? recordFromFixture(next, record.sport) : item));
    } catch { /* Keep the last verified tracking state when a provider refresh is unavailable. */ }
  };

  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then(setStatus).catch(() => setStatus(null));
    fetch(`/api/overview-fixtures?season=${season}`).then((r) => r.json()).then((result) => setOverviewFixtures((result.response || []).map(normaliseFootball))).catch(() => setOverviewFixtures([]));
    loadNews("football", "39");
  }, [season]);
  useEffect(() => {
    if (active !== "Fixtures") return;
    Promise.all([
      fetch(`/api/fixtures?sport=${sport}&league=${league}&season=${season}${sport === "football" ? `&competition=${selectedLeague.code}` : ""}`).then((r) => r.json()),
      fetch(`/api/standings?sport=${sport}&league=${league}&season=${season}${sport === "football" ? `&competition=${selectedLeague.code}` : ""}`).then((r) => r.json()),
    ]).then(([fixtureResult, standingsResult]) => {
      const raw = fixtureResult.response || [];
      setFixtures(sport === "basketball" ? raw.map(normaliseBasketball) : raw.map(normaliseFootball));
      setStandings(normaliseStandings(standingsResult));
      if (fixtureResult.message) setError(fixtureResult.message);
    }).catch(() => setError("The fixture routes are unavailable. Start the Node server with npm run dev."));
  }, [active, sport, league, season]);
  useEffect(() => {
    if (active !== "Live") return;
    loadLive();
    const interval = window.setInterval(loadLive, 60000);
    return () => window.clearInterval(interval);
  }, [active]);
  useEffect(() => { localStorage.setItem("footygauge-favorites", JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem("footygauge-tracked", JSON.stringify(trackedMatches)); }, [trackedMatches]);
  useEffect(() => {
    if (!trackedMatches.length) return undefined;
    trackedMatches.forEach(refreshTrackedMatch);
    const interval = window.setInterval(() => trackedMatches.forEach(refreshTrackedMatch), 30000);
    return () => window.clearInterval(interval);
  }, [trackedMatches.map((item) => item.key).join(",")]);

  const chooseNav = (label) => { setActive(label); setMobileOpen(false); setError(""); if (label === "News") loadNews(); if (label === "Live") loadLive(); };
  const changeSport = (next) => { setSport(next); setLeague(next === "football" ? "39" : "12"); };
  const changeNewsSport = (next) => { const nextLeague = next === "football" ? "39" : "12"; setNewsSport(next); setNewsLeague(nextLeague); loadNews(next, nextLeague); };
  const connectedCount = [status?.football?.connected, status?.footballData?.connected, status?.news?.connected].filter(Boolean).length;
  const fixtureTitle = sport === "football" ? "Football fixtures" : "Basketball fixtures";
  const favoriteFixtures = favorites.map((record) => ({ ...recordToFixture(record), sport: record.sport }));

  return <div className="sport-shell">
    <aside className={`sport-sidebar ${mobileOpen ? "sport-sidebar-open" : ""}`}><div className="club-brand"><div className="club-crest">FG</div><div><strong>FootyGauge</strong><span>Matchday intelligence</span></div><button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={20} /></button></div><label className="season-picker"><span>SEASON</span><select value={season} onChange={(event) => setSeason(event.target.value)}>{seasons.map((item) => <option key={item} value={item}>{item}/{String(Number(item) + 1).slice(-2)}</option>)}</select><ChevronDown size={14} /></label><nav className="sport-nav" aria-label="Main navigation"><p>YOUR DESK</p>{navItems.map(({ label, icon: Icon }) => <button key={label} className={active === label ? "sport-nav-active" : ""} onClick={() => chooseNav(label)}><Icon size={18} /><span>{label}</span>{label === "Live" && <em className="nav-live-mark">NOW</em>}{label === "Predictions" && <em>LOCKED</em>}</button>)}</nav><div className="sidebar-foot"><div className="follow-box"><Flag size={17} /><strong>Save your matchday</strong><p>Star fixtures you want to find again. Track live games without turning the desk into a betting screen.</p><button onClick={() => chooseNav("Favorites")}>Open favorites <ArrowRight size={14} /></button></div><small><ShieldCheck size={13} /> Keys stay on your server</small></div></aside>
    {mobileOpen && <button className="mobile-scrim" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}
    <main className="sport-main"><header className="sport-topbar"><div className="topbar-heading"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={21} /></button><div><span className="topbar-kicker">FOOTYGAUGE / {pageTitle.toUpperCase()}</span><h1>{pageTitle}</h1></div></div><div className="topbar-right"><Status live={connectedCount === 3}>{connectedCount}/3 DATA SOURCES</Status><button className="notification-button" aria-label="Notifications"><Bell size={18} /></button><div className="user-badge">FG</div></div></header>
      {error && <div className="error-strip">{error}</div>}
      {active === "Overview" && <><section className="hero-band"><div><span className="hero-kicker">THE MATCHDAY STARTS HERE</span><h2>Know the fixture.<br /><i>Read the game.</i></h2><p>Football and basketball data, trusted reporting and a clearer route from match facts to informed opinion.</p></div><div className="hero-score"><span>DATA DESK</span><strong>{connectedCount}<small>/ 3</small></strong><p>sources connected</p></div></section><section className="quick-grid"><div className="quick-card quick-card-dark"><span>NEXT ON THE DESK</span><strong>{overviewRows[0]?.league?.name || "Waiting for fixtures"}</strong><p>{overviewRows[0] ? `${overviewRows[0].teams.home.name} v ${overviewRows[0].teams.away.name} · ${formatDate(overviewRows[0].fixture.date)}` : "Connect football data to see the next fixture."}</p><button onClick={() => chooseNav("Fixtures")}>Open fixtures <ArrowRight size={15} /></button></div><div className="quick-card"><span>LIVE BOARD</span><strong>Every league, in play</strong><p>Live is independent of the competition selected in Fixtures.</p><button onClick={() => chooseNav("Live")}>Open live board <ArrowRight size={15} /></button></div><div className="quick-card"><span>PREDICTION DESK</span><strong>Account required</strong><p>Predictions will unlock after registration and model setup.</p><button onClick={() => chooseNav("Predictions")}>See the approach <ArrowRight size={15} /></button></div></section><section className="split-section"><div className="section-block"><div className="section-title"><div><span className="kicker">FOOTBALL / MAJOR LEAGUES</span><h2>Coming up</h2></div><button className="outline-link" onClick={() => chooseNav("Fixtures")}>{overviewRows.length ? "All fixtures" : "Open fixtures"} <Clock3 size={14} /></button></div>{overviewRows.length ? overviewRows.map((fixture) => <FixtureRow key={fixture.fixture?.id} fixture={fixture} favorite={isFavorite(fixture, "football")} onToggleFavorite={toggleFavorite} />) : <EmptyState title="No fixtures loaded" copy="Add the matching server key to see verified fixtures." action="Open fixtures" onAction={() => chooseNav("Fixtures")} />}</div><div className="section-block news-block"><div className="section-title"><div><span className="kicker">FROM EVERY NEWSROOM</span><h2>Latest stories</h2></div><button className="outline-link" onClick={() => chooseNav("News")}>All {news.length || ""} <ArrowRight size={14} /></button></div>{news.length ? news.slice(0, 8).map((article) => <NewsCard key={article.id} article={article} />) : <EmptyState title="News is waiting" copy="Add NewsAPI or GNews beside Guardian for a broader stream." />}</div></section></>}
      {active === "Live" && <section className="page-section"><div className="page-intro live-intro"><span className="hero-kicker">LIVE MATCHDAY</span><h2>Every live match.<br /><i>Every league.</i></h2><p>This board is independent of the sport and league selected in Fixtures. It checks football and basketball providers together for matches happening now.</p><div className="live-board-toolbar"><Status live={liveMatches.length > 0}>{liveMatches.length ? `${liveMatches.length} matches in play` : "No matches in play"}</Status><button className="solid-button" onClick={loadLive}><RefreshCw size={15} />{liveLoading ? "Refreshing..." : "Refresh live board"}</button></div></div>{liveError && <div className="error-strip">{liveError}</div>}<div className="live-grid">{liveMatches.length ? liveMatches.map((fixture) => <LiveMatchCard key={fixtureKey(fixture, fixture.sport)} fixture={fixture} basketball={fixture.sport === "basketball"} favorite={isFavorite(fixture, fixture.sport)} tracked={isTracked(fixture, fixture.sport)} onToggleFavorite={toggleFavorite} onToggleTracking={toggleTracking} />) : <EmptyState title="No live matches right now" copy="The live board does not substitute scheduled fixtures. Refresh when matches are in progress across the connected providers." />}</div><section className="tracking-section"><div className="section-title"><div><span className="kicker">YOUR LIVE DESK</span><h2>Tracked matches</h2></div><span className="tracking-refresh-note">Updates every 30 seconds</span></div>{trackedMatches.length ? <div className="tracked-list">{trackedMatches.map((record) => <div className="tracked-row" key={record.key}><div><span className="live-label"><span className="live-pip" /> TRACKING</span><strong>{record.home} v {record.away}</strong><small>{record.league} · {record.sport} · {record.summary}</small></div><div className="tracked-score"><strong>{record.scoreHome ?? "—"}</strong><span>:</span><strong>{record.scoreAway ?? "—"}</strong><small>{record.status}</small></div><button className="link-button" onClick={() => toggleTracking(recordToFixture(record), record.sport)}>Stop tracking <X size={14} /></button></div>)}</div> : <EmptyState title="Nothing tracked yet" copy="Choose Track match on a live card to keep its score and provider updates in this desk." />}</section></section>}
      {active === "Fixtures" && <section className="page-section"><div className="page-intro"><span className="hero-kicker">FIXTURE LIST</span><h2>{fixtureTitle} by competition.</h2><p>Select a sport, league, and season for scheduled, completed, or historical matches. For matches happening across all leagues, use the separate Live desk.</p><div className="fixture-controls"><div className="fixture-sport-tabs"><button className={sport === "football" ? "sport-tab-active" : ""} onClick={() => changeSport("football")}>Football</button><button className={sport === "basketball" ? "sport-tab-active" : ""} onClick={() => changeSport("basketball")}>Basketball</button></div><select value={league} onChange={(event) => setLeague(event.target.value)}>{leagues.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><select value={season} onChange={(event) => setSeason(event.target.value)}>{seasons.map((item) => <option value={item} key={item}>{item}/{String(Number(item) + 1).slice(-2)}</option>)}</select><button className="solid-button" onClick={loadFixtures}>{loading ? "Refreshing..." : "Refresh fixtures"} <ArrowRight size={16} /></button></div></div><div className="fixture-list">{fixtures.length ? fixtures.map((fixture) => <FixtureRow key={fixture.fixture?.id} fixture={fixture} basketball={sport === "basketball"} favorite={isFavorite(fixture, sport)} onToggleFavorite={toggleFavorite} />) : <EmptyState title={`No ${sport} fixtures returned`} copy="Check the selected league, season, API key, and free daily quota." />}</div><div className="table-section"><div className="section-title"><div><span className="kicker">{selectedLeague.name.toUpperCase()}</span><h2>League table</h2></div></div>{standings.length ? <div className="standings-table"><div className="standings-head"><span>#</span><span>Team</span><span>P</span><span>W</span><span>Pts</span></div>{standings.map((row) => <div className="standings-row" key={`${row.rank}-${row.team}`}><strong>{row.rank}</strong><span>{row.team}</span><span>{row.played}</span><span>{row.won}</span><strong>{row.points}</strong></div>)}</div> : <EmptyState title="No league table returned" copy="Select a supported league and season with a working provider key." />}</div></section>}
      {active === "News" && <section className="page-section"><div className="page-intro"><span className="hero-kicker">THE NEWSROOM</span><h2>{newsSport === "football" ? "Football" : "Basketball"} news, beyond the scoreline.</h2><p>Choose the sport and competition. The request sent to Guardian, NewsAPI, and GNews includes that context.</p><div className="news-controls"><div className="mode-tabs"><button className={newsSport === "football" ? "mode-active" : ""} onClick={() => changeNewsSport("football")}>Football news</button><button className={newsSport === "basketball" ? "mode-active" : ""} onClick={() => changeNewsSport("basketball")}>Basketball news</button></div><select value={newsLeague} onChange={(event) => { setNewsLeague(event.target.value); loadNews(newsSport, event.target.value); }}>{newsLeagues.map((item) => <option value={item.id} key={item.id}>{item.name} news</option>)}</select></div></div><div className="news-grid">{news.length ? news.map((article) => <NewsCard key={article.id} article={article} />) : <EmptyState title="No news returned" copy="Add at least one free news API key to the server environment." />}</div></section>}
      {active === "Favorites" && <section className="page-section"><div className="page-intro"><span className="hero-kicker">YOUR MATCHDAY</span><h2>Saved fixtures, in one desk.</h2><p>Stars are stored locally in this browser for now. Account sync will come with the MongoDB workspace.</p></div><div className="fixture-list favorites-list">{favoriteFixtures.length ? favoriteFixtures.map(({ sport: savedSport, ...fixture }) => <FixtureRow key={fixtureKey(fixture, savedSport)} fixture={fixture} basketball={savedSport === "basketball"} favorite onToggleFavorite={toggleFavorite} />) : <EmptyState title="No favorites yet" copy="Use the star on any fixture or live match to save it here." action="Open fixtures" onAction={() => chooseNav("Fixtures")} />}</div></section>}
      {active === "Teams" && <section className="page-section"><div className="page-intro"><span className="hero-kicker">CLUB DESK</span><h2>Your teams, your matchday.</h2><p>Team following will be backed by MongoDB later. Match favorites and live tracking now work locally while the provider layer settles.</p></div><div className="coming-card"><Users size={28} /><h3>Team watchlists are next.</h3><p>We will add accounts, saved clubs, and club-specific match feeds after the data connections are stable.</p></div></section>}
      {active === "Predictions" && <section className="page-section"><div className="prediction-lock"><div className="lock-shape"><Trophy size={28} /></div><span className="hero-kicker">PRIVATE ANALYSIS</span><h2>Predictions belong behind an account.</h2><p>We will require registration before showing model probabilities. The statistical model will calculate the numbers; an explanation layer will describe the evidence without changing them.</p><button className="solid-button" onClick={() => chooseNav("Teams")}>Prepare my workspace <ArrowRight size={16} /></button></div></section>}
      <footer className="sport-footer"><span>FOOTYGAUGE</span><span>Data-backed matchday tools</span><span>Local-first build</span></footer>
    </main>
  </div>;
}
