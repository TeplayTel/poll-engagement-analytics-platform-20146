import React, { useState, useEffect } from "react";
import "./App.css";

// Chart libraries
import { Bar, Doughnut } from "react-chartjs-2";
import Chart from "chart.js/auto";

// Utilities for date formatting
const formatDate = (dt) => {
  if (!dt) return "";
  const d = new Date(dt);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Color palette for the dashboard
const colorPrimary = "#1976d2";
const colorSecondary = "#424242";
const colorAccent = "#ffb300";

// REST API root
const API_ROOT = "https://vscode-internal-39943-beta.beta01.cloud.kavia.ai:3001";

// Filters initial state
const getInitFilters = () => ({
  poll_id: "",
  event_type: "",
  event_id: "",
  user_id: "",
  start_time: "",
  end_time: "",
});

function App() {
  // Theme
  const [theme, setTheme] = useState("light");

  // Dashboard state
  const [filters, setFilters] = useState(getInitFilters());
  const [isLoading, setIsLoading] = useState(false);
  const [analyticsSummary, setAnalyticsSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventsCount, setEventsCount] = useState(0);
  const [error, setError] = useState("");
  const [pollIdFocus, setPollIdFocus] = useState(""); // For quick navigation.
  const [showWordCloud, setShowWordCloud] = useState(false);

  // Set theme on document root
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Helpers for filter controls
  const handleFilterChange = (e) => {
    setFilters((old) => ({
      ...old,
      [e.target.name]: e.target.value,
    }));
  };

  // Fetch poll analytics summary metrics (for cards & breakdowns)
  const fetchPollSummary = async (poll_id) => {
    if (!poll_id) {
      setAnalyticsSummary(null);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const resp = await fetch(`${API_ROOT}/fanEngage/analytics/v1/pollSummary?poll_id=${encodeURIComponent(poll_id)}`);
      if (!resp.ok) throw new Error("Failed to fetch poll analytics summary");
      const data = await resp.json();
      setAnalyticsSummary(data);
    } catch (err) {
      setError("Error fetching summary: " + err.message);
      setAnalyticsSummary(null);
    }
    setIsLoading(false);
  };

  // Fetch filtered events log (for tables/drilldown, etc.)
  const fetchEvents = async (filterObj) => {
    setIsLoading(true);
    setError("");
    try {
      let url = `${API_ROOT}/fanEngage/analytics/v1/query`;
      // Attach pagination (limit 100)
      url += "?limit=100&offset=0";
      const queryPayload = {
        ...filterObj,
      };
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(queryPayload),
      });
      if (!resp.ok) throw new Error("Failed to fetch events data");
      const data = await resp.json();
      setEvents(data.events || []);
      setEventsCount(data.total_count || 0);
    } catch (err) {
      setError("Error fetching events: " + err.message);
      setEvents([]);
      setEventsCount(0);
    }
    setIsLoading(false);
  };

  // Dashboard filter submit
  const onApplyFilters = (e) => {
    e.preventDefault();
    fetchEvents(filters);
    if (filters.poll_id) fetchPollSummary(filters.poll_id);
    else setAnalyticsSummary(null);
  };

  // Initial load (optionally auto-fetch)
  useEffect(() => {
    // Do not auto-fetch without poll_id
  }, []);

  // Device/platform/geo chart data (from poll summary)
  const deviceChartData = analyticsSummary
    ? {
        labels: Object.keys(analyticsSummary.device_breakdown || {}),
        datasets: [
          {
            label: "Device type",
            data: Object.values(analyticsSummary.device_breakdown || {}),
            backgroundColor: [
              colorPrimary,
              colorSecondary,
              colorAccent,
              "#9c27b0",
              "#388e3c",
              "#00838f",
            ],
          },
        ],
      }
    : null;
  const platformChartData = analyticsSummary
    ? {
        labels: Object.keys(analyticsSummary.platform_breakdown || {}),
        datasets: [
          {
            label: "Platform",
            data: Object.values(analyticsSummary.platform_breakdown || {}),
            backgroundColor: [
              colorPrimary,
              colorAccent,
              colorSecondary,
              "#9c27b0",
              "#388e3c",
              "#00838f",
            ],
          },
        ],
      }
    : null;
  const geoChartData = analyticsSummary
    ? {
        labels: Object.keys(analyticsSummary.geo_breakdown || {}),
        datasets: [
          {
            label: "Geo region",
            data: Object.values(analyticsSummary.geo_breakdown || {}),
            backgroundColor: [
              colorPrimary,
              colorSecondary,
              colorAccent,
              "#388e3c",
              "#9c27b0",
              "#00838f",
            ],
          },
        ],
      }
    : null;
  const voteDistributionChartData = analyticsSummary
    ? {
        labels: Object.keys(analyticsSummary.vote_distribution || {}),
        datasets: [
          {
            label: "Votes",
            data: Object.values(analyticsSummary.vote_distribution || {}),
            backgroundColor: [
              colorPrimary,
              colorAccent,
              "#388e3c",
              "#f06292",
              "#ffb74d",
            ],
          },
        ],
      }
    : null;

  // Word Cloud for "event_type" and "user_choice"
  function renderWordCloud(events) {
    // Count frequencies
    let wordFreq = {};
    events.forEach((ev) => {
      // Include event_type, user_choice
      if (ev.event_type) {
        wordFreq[ev.event_type] = (wordFreq[ev.event_type] || 0) + 1;
      }
      if (ev.user_choice) {
        wordFreq[ev.user_choice] = (wordFreq[ev.user_choice] || 0) + 1;
      }
    });
    const words = Object.entries(wordFreq);

    // Max count for scaling
    const maxCount = Math.max(...words.map(([, v]) => v), 1);

    return (
      <div className="wordcloud">
        {words.map(([word, count], i) => (
          <span
            key={word}
            style={{
              fontSize: `${1 + (2.5 * count) / maxCount}em`,
              color: i % 2 === 0 ? colorPrimary : colorAccent,
              margin: "0 8px 8px 0",
              fontWeight: "bold",
              display: "inline-block",
              textShadow: "0 1px 6px rgba(0,0,0,0.09)",
            }}
          >
            {word}
          </span>
        ))}
      </div>
    );
  }

  // Table columns — show the most meaningful analytic event fields
  function renderEventsTable(events) {
    return (
      <div style={{ overflowX: "auto" }}>
        <table className="analytics-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Timestamp</th>
              <th>Type</th>
              <th>Poll ID</th>
              <th>Event ID</th>
              <th>User ID</th>
              <th>User Choice</th>
              <th>Device</th>
              <th>Platform</th>
              <th>Geo</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev, i) => (
              <tr key={ev.id || ev.event_id}>
                <td>{i + 1}</td>
                <td>{formatDate(ev.timestamp)}</td>
                <td>{ev.event_type}</td>
                <td>{ev.poll_id}</td>
                <td style={{ fontSize: "0.93em", fontFamily: "monospace" }}>
                  {ev.event_id}
                </td>
                <td>{ev.metadata.user_id || "-"}</td>
                <td>{ev.user_choice || "-"}</td>
                <td>{ev.metadata.device_type}</td>
                <td>{ev.metadata.platform}</td>
                <td>{ev.metadata.geo || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Metrics cards — highlight summary analytics at top of dashboard
  function renderSummaryCards() {
    if (!analyticsSummary) return null;
    return (
      <div className="metric-cards">
        <Card
          title="Total Impressions"
          value={analyticsSummary.total_impressions}
        />
        <Card title="Total Votes" value={analyticsSummary.total_votes} />
        <Card title="Participants" value={analyticsSummary.participants} />
        <Card
          title="First Event"
          value={formatDate(analyticsSummary.first_event_at)}
        />
        <Card
          title="Last Event"
          value={formatDate(analyticsSummary.last_event_at)}
        />
      </div>
    );
  }

  // Quick navigation for pollId focus
  const onPollIdQuickNav = (e) => {
    e.preventDefault();
    setFilters((old) => ({
      ...old,
      poll_id: pollIdFocus,
    }));
    fetchPollSummary(pollIdFocus);
    fetchEvents({ ...getInitFilters(), poll_id: pollIdFocus });
  };

  // Event tracking UI - simulate sending an event, for quick demo
  const [eventForm, setEventForm] = useState({
    poll_id: "",
    event_type: "impression",
    event_id: "",
    user_choice: "",
    user_id: "",
    device_type: "web",
    platform: "web",
    app_version: "1.0",
    session_id: "",
    geo: "",
  });
  const [eventLogResp, setEventLogResp] = useState(null);
  const [eventLogErr, setEventLogErr] = useState("");

  // Generate quick UUID for example event_id & session_id
  const uuid = () =>
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0,
        v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  // Set default session_id on mount
  useEffect(() => {
    setEventForm((prev) => ({
      ...prev,
      session_id: uuid(),
      event_id: uuid(),
    }));
  }, []);

  const handleEventFormChange = (e) => {
    setEventForm((old) => ({
      ...old,
      [e.target.name]: e.target.value,
    }));
  };
  // On submit, POST event to API
  async function onLogEvent(e) {
    e.preventDefault();
    setEventLogResp(null);
    setEventLogErr("");
    try {
      const payload = {
        event_id: eventForm.event_id || uuid(),
        poll_id: eventForm.poll_id,
        event_type: eventForm.event_type,
        user_choice:
          eventForm.event_type === "vote" ? eventForm.user_choice : null,
        timestamp: new Date().toISOString(),
        metadata: {
          device_type: eventForm.device_type,
          platform: eventForm.platform,
          app_version: eventForm.app_version,
          session_id: eventForm.session_id,
          user_id: eventForm.user_id,
          geo: eventForm.geo,
          additional: {},
        },
      };
      const resp = await fetch(
        `${API_ROOT}/fanEngage/analytics/v1/event`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!resp.ok) throw new Error("Failed to log event");
      const data = await resp.json();
      setEventLogResp(data);
      setEventForm((old) => ({
        ...old,
        event_id: uuid(),
      }));
    } catch (err) {
      setEventLogErr(err.message);
    }
  }

  return (
    <div className="dashboard-root">
      {/* Side navigation bar */}
      <aside className="sidebar">
        <div className="nav-brand">
          <span role="img" aria-label="chart" style={{ fontSize: "2rem" }}>
            📊
          </span>
          <span style={{ marginLeft: 8, fontWeight: 700 }}>
            Poll Analytics
          </span>
        </div>
        <nav>
          <ul>
            <li>
              <a href="#dashboard">Dashboard</a>
            </li>
            <li>
              <a href="#events">Events Table</a>
            </li>
            <li>
              <a href="#tracking">Track Event</a>
            </li>
            <li>
              <a href="#filter">Filters</a>
            </li>
          </ul>
        </nav>
        <div style={{ flexGrow: 1 }} />
        <button
          className="theme-toggle"
          onClick={() => setTheme((th) => (th === "light" ? "dark" : "light"))}
          aria-label="Toggle theme"
        >
          {theme === "light" ? "🌙" : "☀️"}
        </button>
      </aside>
      {/* Main dashboard area */}
      <main className="main-content">
        <div className="dashboard-header" id="dashboard">
          <h1 className="dashboard-title">Poll Engagement Dashboard</h1>
          <form
            className="quick-poll-nav"
            onSubmit={onPollIdQuickNav}
            style={{ marginBottom: 24 }}
            autoComplete="off"
          >
            <input
              type="text"
              placeholder="Quick pollId (jump)..."
              value={pollIdFocus}
              onChange={(e) => setPollIdFocus(e.target.value)}
              className="input"
              style={{ minWidth: 120, marginRight: 8 }}
            />
            <button type="submit" className="btn-accent">
              Go
            </button>
          </form>
        </div>
        {/* Filter controls bar */}
        <section className="filter-controls" id="filter">
          <form className="filter-form" onSubmit={onApplyFilters}>
            <div className="filter-row">
              <div className="filter-group">
                <label>Poll ID</label>
                <input
                  type="text"
                  name="poll_id"
                  value={filters.poll_id}
                  onChange={handleFilterChange}
                  className="input"
                  placeholder="1234abcd-..."
                />
              </div>
              <div className="filter-group">
                <label>Event Type</label>
                <select
                  name="event_type"
                  value={filters.event_type}
                  onChange={handleFilterChange}
                  className="input"
                >
                  <option value="">All</option>
                  <option value="impression">Impression</option>
                  <option value="vote">Vote</option>
                  <option value="abandonment">Abandonment</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Event ID</label>
                <input
                  type="text"
                  name="event_id"
                  value={filters.event_id}
                  onChange={handleFilterChange}
                  className="input"
                  placeholder="(debug)"
                />
              </div>
              <div className="filter-group">
                <label>User ID</label>
                <input
                  type="text"
                  name="user_id"
                  value={filters.user_id}
                  onChange={handleFilterChange}
                  className="input"
                  placeholder="User123..."
                />
              </div>
              <div className="filter-group">
                <label>Start Date</label>
                <input
                  type="datetime-local"
                  name="start_time"
                  value={filters.start_time}
                  onChange={handleFilterChange}
                  className="input"
                />
              </div>
              <div className="filter-group">
                <label>End Date</label>
                <input
                  type="datetime-local"
                  name="end_time"
                  value={filters.end_time}
                  onChange={handleFilterChange}
                  className="input"
                />
              </div>
              <button type="submit" className="btn-primary filter-btn">
                {isLoading ? "Loading..." : "Apply Filters"}
              </button>
            </div>
          </form>
          {error && (
            <div className="error-msg" role="alert">
              {error}
            </div>
          )}
        </section>

        {/* Overview metrics cards */}
        {renderSummaryCards()}

        {/* Data breakdown and visualizations */}
        {analyticsSummary && (
          <section className="charts-section">
            <div className="chart-grid">
              <div className="chart-card">
                <h3>Device types</h3>
                {deviceChartData && (
                  <Doughnut data={deviceChartData} />
                )}
              </div>
              <div className="chart-card">
                <h3>Platforms</h3>
                {platformChartData && (
                  <Doughnut data={platformChartData} />
                )}
              </div>
              <div className="chart-card">
                <h3>Geo regions</h3>
                {geoChartData && (
                  <Bar data={geoChartData} options={{ indexAxis: "y" }} />
                )}
              </div>
              <div className="chart-card">
                <h3>Vote Distribution</h3>
                {voteDistributionChartData && (
                  <Bar data={voteDistributionChartData} />
                )}
              </div>
            </div>
          </section>
        )}

        {/* Word cloud control */}
        <button
          className="btn-secondary"
          style={{ marginTop: 16 }}
          onClick={() => setShowWordCloud((v) => !v)}
          disabled={events.length === 0}
        >
          {showWordCloud ? "Hide" : "Show"} Word Cloud (event_type, user_choice)
        </button>
        {showWordCloud && renderWordCloud(events)}

        {/* Events Table */}
        <section className="events-table-section" id="events">
          <h2 style={{ marginTop: 24 }}>Analytics Event Log</h2>
          <p>
            Showing {events.length} / {eventsCount} events
          </p>
          {renderEventsTable(events)}
        </section>

        {/* Event Tracker UI */}
        <section className="event-tracking-section" id="tracking">
          <h2 style={{ marginTop: 24 }}>Track Event</h2>
          <form
            className="event-form"
            onSubmit={onLogEvent}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <input
              required
              name="poll_id"
              className="input"
              placeholder="Poll ID"
              value={eventForm.poll_id}
              onChange={handleEventFormChange}
              style={{ minWidth: 100, maxWidth: 140, flex: "1" }}
            />
            <select
              required
              name="event_type"
              className="input"
              value={eventForm.event_type}
              onChange={handleEventFormChange}
            >
              <option value="impression">Impression</option>
              <option value="vote">Vote</option>
              <option value="abandonment">Abandonment</option>
              <option value="custom">Custom</option>
            </select>
            {eventForm.event_type === "vote" && (
              <input
                name="user_choice"
                className="input"
                placeholder="User Choice"
                value={eventForm.user_choice}
                onChange={handleEventFormChange}
                style={{ minWidth: 100, maxWidth: 120, flex: "1" }}
              />
            )}
            <input
              name="event_id"
              className="input"
              value={eventForm.event_id}
              placeholder="Event ID (auto)"
              onChange={handleEventFormChange}
              style={{ minWidth: 130, maxWidth: 160, flex: "1" }}
            />
            <input
              name="user_id"
              className="input"
              placeholder="User ID"
              value={eventForm.user_id}
              onChange={handleEventFormChange}
              style={{ minWidth: 90, maxWidth: 120, flex: "1" }}
            />
            <input
              name="device_type"
              className="input"
              placeholder="Device Type"
              value={eventForm.device_type}
              onChange={handleEventFormChange}
              style={{ minWidth: 90, maxWidth: 110, flex: "1" }}
            />
            <input
              name="platform"
              className="input"
              placeholder="Platform"
              value={eventForm.platform}
              onChange={handleEventFormChange}
              style={{ minWidth: 75, maxWidth: 100, flex: "1" }}
            />
            <input
              name="app_version"
              className="input"
              placeholder="App Version"
              value={eventForm.app_version}
              onChange={handleEventFormChange}
              style={{ minWidth: 70, maxWidth: 90, flex: "1" }}
            />
            <input
              name="session_id"
              className="input"
              placeholder="Session ID (auto)"
              value={eventForm.session_id}
              onChange={handleEventFormChange}
              style={{ minWidth: 120, maxWidth: 140, flex: "1" }}
            />
            <input
              name="geo"
              className="input"
              placeholder="Geo"
              value={eventForm.geo}
              onChange={handleEventFormChange}
              style={{ minWidth: 60, maxWidth: 76, flex: "1" }}
            />
            <button className="btn-primary" type="submit">
              Log Event
            </button>
          </form>
          {eventLogResp && (
            <div className="success-msg" style={{ marginTop: 10 }}>
              Event logged (
              {eventLogResp.stored
                ? "stored"
                : eventLogResp.deduplicated
                ? "deduplicated"
                : "?"
              }
              )
            </div>
          )}
          {eventLogErr && (
            <div className="error-msg" style={{ marginTop: 10 }}>
              {eventLogErr}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// Metrics Card subcomponent
function Card({ title, value }) {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <div className="card-value">{typeof value === "number" ? value.toLocaleString() : value}</div>
    </div>
  );
}

export default App;
