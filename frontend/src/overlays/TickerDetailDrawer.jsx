import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Loader2, TrendingDown, TrendingUp, X } from "lucide-react";
import { EQUITIES, plantsForEquity } from "../data/equitiesSeed";
import { useDialogFocus } from "../hooks/useDialogFocus";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const RANGES = [
  { label: "1D", range: "1d", interval: "5m" },
  { label: "1M", range: "1mo", interval: "1d" },
  { label: "6M", range: "6mo", interval: "1d" },
  { label: "1Y", range: "1y", interval: "1d" },
  { label: "5Y", range: "5y", interval: "1wk" }
];

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatMoney(value) {
  const n = numberOrNull(value);
  if (n === null) return "--";
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: n >= 1000 ? 0 : 2, minimumFractionDigits: n >= 1000 ? 0 : 2 })}`;
}

function formatNumber(value) {
  const n = numberOrNull(value);
  if (n === null) return "--";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatChange(value, pct) {
  const n = numberOrNull(value);
  const p = numberOrNull(pct);
  if (n === null || p === null) return "--";
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}${Math.abs(n).toFixed(2)} (${sign}${Math.abs(p).toFixed(2)}%)`;
}

function formatTime(value) {
  if (!value) return "Provider timestamp unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Provider timestamp unavailable";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function HistoryChart({ points, positive }) {
  const values = points.map((p) => numberOrNull(p.close)).filter((v) => v !== null);
  if (values.length < 2) {
    return <div className="ticker-chart-empty">History unavailable from provider</div>;
  }

  const width = 620;
  const height = 220;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const line = values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * (height - 18) - 9;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg className="ticker-history-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Historical closing price chart">
      <line x1="0" y1="10" x2={width} y2="10" />
      <line x1="0" y1={height - 10} x2={width} y2={height - 10} />
      <polyline points={line} className={positive ? "chart-up" : "chart-down"} />
    </svg>
  );
}

export default function TickerDetailDrawer({ symbol, plants, onClose, onHighlightTicker }) {
  const drawerRef = useRef(null);
  const [quote, setQuote] = useState(null);
  const [quoteStatus, setQuoteStatus] = useState("loading");
  const [rangeIndex, setRangeIndex] = useState(1);
  const [history, setHistory] = useState([]);
  const [historyStatus, setHistoryStatus] = useState("loading");

  const normalizedSymbol = symbol?.toUpperCase();
  const rangeConfig = RANGES[rangeIndex];
  useDialogFocus(drawerRef, onClose, { initialFocus: ".overlay-icon-btn" });

  useEffect(() => {
    if (!normalizedSymbol) return;
    const controller = new AbortController();

    async function loadQuote() {
      try {
        setQuoteStatus("loading");
        const resp = await fetch(`${API_BASE_URL}/api/quotes`, {
          signal: controller.signal,
          headers: { Accept: "application/json" }
        });
        if (!resp.ok) throw new Error(`Quote endpoint returned ${resp.status}`);
        const payload = await resp.json();
        const found = (payload.quotes || []).find((item) => item.symbol === normalizedSymbol);
        setQuote(found || { symbol: normalizedSymbol, source: "Yahoo Finance chart" });
        setQuoteStatus(found ? "ready" : "missing");
      } catch (err) {
        if (err.name !== "AbortError") {
          setQuote({ symbol: normalizedSymbol });
          setQuoteStatus("error");
        }
      }
    }

    loadQuote();
    return () => controller.abort();
  }, [normalizedSymbol]);

  useEffect(() => {
    if (!normalizedSymbol) return;
    const controller = new AbortController();

    async function loadHistory() {
      try {
        setHistoryStatus("loading");
        const params = new URLSearchParams({
          range: rangeConfig.range,
          interval: rangeConfig.interval
        });
        const resp = await fetch(`${API_BASE_URL}/api/quotes/${normalizedSymbol}/history?${params}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" }
        });
        if (!resp.ok) throw new Error(`History endpoint returned ${resp.status}`);
        const payload = await resp.json();
        setHistory(Array.isArray(payload.points) ? payload.points : []);
        setHistoryStatus("ready");
      } catch (err) {
        if (err.name !== "AbortError") {
          setHistory([]);
          setHistoryStatus("error");
        }
      }
    }

    loadHistory();
    return () => controller.abort();
  }, [normalizedSymbol, rangeConfig.range, rangeConfig.interval]);

  const relatedPlants = useMemo(() => {
    const equity = EQUITIES.find((item) => item.ticker === normalizedSymbol);
    const byCompanyKey = equity ? plantsForEquity(equity, plants) : [];
    const byTicker = (plants || []).filter((plant) => {
      const ticker = plant?.properties?.stock_ticker;
      return ticker && ticker.toUpperCase() === normalizedSymbol;
    });
    const byId = new Map();
    [...byCompanyKey, ...byTicker].forEach((plant) => {
      byId.set(plant?.properties?.id ?? plant?.id, plant);
    });
    return Array.from(byId.values()).slice(0, 8);
  }, [plants, normalizedSymbol]);

  const positive = Number(quote?.change) >= 0;
  const companyName = quote?.name || EQUITIES.find((item) => item.ticker === normalizedSymbol)?.name || normalizedSymbol;

  return (
    <aside
      ref={drawerRef}
      className="ticker-detail-drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticker-detail-title"
    >
      <header className="ticker-detail-header">
        <div>
          <p className="news-eyebrow">Market Detail</p>
          <h2 id="ticker-detail-title">{normalizedSymbol}</h2>
          <span>{companyName}</span>
        </div>
        <button className="overlay-icon-btn" type="button" onClick={onClose} aria-label="Close ticker detail">
          <X size={16} />
        </button>
      </header>

      <section className="ticker-quote-hero">
        <div>
          <strong>{formatMoney(quote?.price)}</strong>
          <span className={positive ? "up" : "down"}>
            {positive ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
            {formatChange(quote?.change, quote?.change_percent)}
          </span>
        </div>
        <small>
          {quoteStatus === "loading" ? "Loading live quote..." : `${quote?.source || "Market source"} as of ${formatTime(quote?.market_time)}`}
        </small>
      </section>

      <p className="market-disclaimer">
        Educational market context only. Quotes and history depend on public provider availability and are not investment advice.
      </p>

      <section className="ticker-stat-grid" aria-label="Quote statistics">
        <div><span>Prev Close</span><strong>{formatMoney(quote?.previous_close)}</strong></div>
        <div><span>Open</span><strong>{formatMoney(quote?.open)}</strong></div>
        <div><span>Day High</span><strong>{formatMoney(quote?.day_high)}</strong></div>
        <div><span>Day Low</span><strong>{formatMoney(quote?.day_low)}</strong></div>
        <div><span>Volume</span><strong>{formatNumber(quote?.volume)}</strong></div>
        <div><span>Currency</span><strong>{quote?.currency || "USD"}</strong></div>
      </section>

      <section className="ticker-history-block">
        <div className="ticker-range-tabs" role="tablist" aria-label="Chart range">
          {RANGES.map((item, index) => (
            <button
              key={item.label}
              type="button"
              role="tab"
              aria-selected={index === rangeIndex}
              className={index === rangeIndex ? "active" : ""}
              onClick={() => setRangeIndex(index)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {historyStatus === "loading" ? (
          <div className="ticker-chart-empty"><Loader2 size={15} className="spin" /> Loading history</div>
        ) : (
          <HistoryChart points={history} positive={positive} />
        )}
      </section>

      <section className="ticker-related-block">
        <div className="ticker-detail-section-head">
          <h3>Related Plants</h3>
          {relatedPlants.length > 0 && (
            <button type="button" onClick={() => onHighlightTicker?.(normalizedSymbol)}>
              Highlight on map
            </button>
          )}
        </div>
        {relatedPlants.length === 0 ? (
          <p className="ticker-empty-copy">No directly mapped US nuclear plants for this symbol.</p>
        ) : (
          <ul className="ticker-plant-list">
            {relatedPlants.map((plant) => (
              <li key={plant?.properties?.id ?? plant?.id}>
                <strong>{plant.properties?.plant_name}</strong>
                <span>{[plant.properties?.state, plant.properties?.parent_company_name].filter(Boolean).join(" / ")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <a
        className="ticker-yahoo-link"
        href={`https://finance.yahoo.com/quote/${normalizedSymbol}`}
        target="_blank"
        rel="noreferrer"
      >
        <ExternalLink size={14} />
        Open on Yahoo Finance
      </a>
    </aside>
  );
}
