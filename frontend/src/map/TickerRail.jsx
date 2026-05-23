import { useEffect, useRef, useState } from "react";
import { EQUITIES } from "../data/equitiesSeed";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const REFRESH_MS = 60_000;

const FALLBACK_QUOTES = EQUITIES.slice(0, 10).map((item, index) => {
  const direction = index % 3 === 1 ? -1 : 1;
  const change = direction * item.basePrice * (0.0015 + index * 0.0004);
  return {
    symbol: item.ticker,
    price: item.basePrice,
    change,
    change_percent: (change / item.basePrice) * 100
  };
});

function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "--.--";
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return n.toFixed(2);
}

function formatChange(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.00";
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}${Math.abs(n).toFixed(2)}`;
}

function formatPct(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.00";
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}${Math.abs(n).toFixed(2)}%`;
}

export default function TickerRail() {
  const [quotes, setQuotes] = useState(FALLBACK_QUOTES);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    async function load() {
      try {
        const resp = await fetch(`${API_BASE_URL}/api/quotes`, {
          headers: { Accept: "application/json" },
        });
        if (!resp.ok) return;
        const data = await resp.json();
        if (cancelledRef.current) return;
        if (Array.isArray(data?.quotes)) setQuotes(data.quotes);
      } catch {
        // Network blip: keep last successful payload or seeded fallback.
      }
    }

    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelledRef.current = true;
      clearInterval(id);
    };
  }, []);

  if (quotes.length === 0) return null;

  const doubled = [...quotes, ...quotes];

  return (
    <div className="ticker-rail" aria-label="Nuclear sector live quotes">
      <div className="ticker-track">
        {doubled.map((q, idx) => {
          const dir = q.change > 0 ? "up" : q.change < 0 ? "down" : "flat";
          return (
            <div className="ticker-item" key={`${q.symbol}-${idx}`}>
              <span className="ticker-name">{q.symbol}</span>
              <span className="ticker-val">${formatPrice(q.price)}</span>
              <span className={`ticker-delta ${dir}`}>
                {formatChange(q.change)} ({formatPct(q.change_percent)})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
