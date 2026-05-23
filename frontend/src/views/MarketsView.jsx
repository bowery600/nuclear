import { useEffect, useMemo, useState } from "react";
import { Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { EQUITIES } from "../data/equitiesSeed";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const REFRESH_MS = 60_000;

const FUEL_PROXIES = [
  { symbol: "URA", label: "Uranium Miners ETF", role: "Uranium mining proxy" },
  { symbol: "CCJ", label: "Cameco", role: "Uranium producer proxy" },
  { symbol: "LEU", label: "Centrus Energy", role: "Enrichment proxy" },
];

function numberOrNull(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function fmt(n, digits = 2) {
  const value = numberOrNull(n);
  if (value === null) return "--";
  return value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function quoteDirection(q) {
  const change = Number(q?.change);
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "flat";
}

function QuoteDelta({ quote }) {
  const dir = quoteDirection(quote);
  const up = dir !== "down";
  return (
    <span className={`fuel-delta ${dir}`}>
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {Number(quote?.change_percent) >= 0 ? "+" : ""}{fmt(quote?.change_percent, 2)}%
    </span>
  );
}

export default function MarketsView({ onHighlightTicker, highlightTicker, onSelectTicker }) {
  const [quotes, setQuotes] = useState([]);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const controller = new AbortController();

    async function loadQuotes() {
      try {
        setStatus((current) => (current === "ready" ? "refreshing" : "loading"));
        const resp = await fetch(`${API_BASE_URL}/api/quotes`, {
          signal: controller.signal,
          headers: { Accept: "application/json" }
        });
        if (!resp.ok) throw new Error(`Quote endpoint returned ${resp.status}`);
        const payload = await resp.json();
        setQuotes(Array.isArray(payload.quotes) ? payload.quotes : []);
        setStatus("ready");
      } catch (err) {
        if (err.name !== "AbortError") setStatus("error");
      }
    }

    loadQuotes();
    const id = setInterval(loadQuotes, REFRESH_MS);
    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, []);

  const quoteBySymbol = useMemo(() => {
    return new Map(quotes.map((quote) => [quote.symbol, quote]));
  }, [quotes]);

  const equityRows = useMemo(() => {
    return EQUITIES.map((equity) => ({
      ...equity,
      quote: quoteBySymbol.get(equity.ticker)
    }));
  }, [quoteBySymbol]);

  return (
    <div className="markets-view">
      <div className="markets-fuel-col">
        <h2 className="markets-section-title">Fuel Cycle Proxies</h2>
        {FUEL_PROXIES.map((item) => {
          const quote = quoteBySymbol.get(item.symbol);
          const dir = quoteDirection(quote);
          return (
            <button
              type="button"
              key={item.symbol}
              className="fuel-card fuel-card-button"
              onClick={() => onSelectTicker?.(item.symbol)}
            >
              <div className="fuel-card-head">
                <span className="fuel-label">{item.label}</span>
                {quote ? <QuoteDelta quote={quote} /> : <span className="fuel-delta flat">--</span>}
              </div>
              <div className="fuel-card-price">
                <span className="fuel-price">${fmt(quote?.price)}</span>
                <span className="fuel-unit">{item.symbol}</span>
              </div>
              <div className={`market-source-pill ${dir}`}>{item.role} / Yahoo Finance</div>
            </button>
          );
        })}
      </div>

      <div className="markets-equities-col">
        <div className="markets-heading-row">
          <h2 className="markets-section-title">Nuclear Equities</h2>
          {status === "loading" && <span className="markets-status"><Loader2 size={13} className="spin" /> Loading real quotes</span>}
          {status === "refreshing" && <span className="markets-status">Refreshing</span>}
          {status === "error" && <span className="markets-status error">Quote feed unavailable</span>}
        </div>
        <table className="equities-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Name</th>
              <th className="num">Price</th>
              <th className="num">Delta</th>
              <th className="num">Delta %</th>
              <th>Source</th>
              <th className="num">Mkt Cap</th>
            </tr>
          </thead>
          <tbody>
            {equityRows.map((eq) => {
              const quote = eq.quote;
              const up = Number(quote?.change) >= 0;
              return (
                <tr
                  key={eq.ticker}
                  className={highlightTicker === eq.ticker ? "is-highlighted" : ""}
                  onClick={() => {
                    onHighlightTicker?.(eq.ticker);
                    onSelectTicker?.(eq.ticker);
                  }}
                >
                  <td className="ticker-cell">{eq.ticker}</td>
                  <td className="name-cell">{quote?.name || eq.name}</td>
                  <td className="num">${fmt(quote?.price)}</td>
                  <td className={`num ${up ? "up" : "down"}`}>{Number(quote?.change) >= 0 ? "+" : ""}{fmt(quote?.change)}</td>
                  <td className={`num ${up ? "up" : "down"}`}>{Number(quote?.change_percent) >= 0 ? "+" : ""}{fmt(quote?.change_percent)}%</td>
                  <td><span className="source-chip">{quote?.source || "Unavailable"}</span></td>
                  <td className="num">${fmt(eq.mktCapB, 1)}B</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="markets-footnote">Rows use live no-key Yahoo chart quote data when available; click a row for history and plant exposure.</p>
      </div>
    </div>
  );
}
