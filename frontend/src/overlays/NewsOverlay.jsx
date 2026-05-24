import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { NEWS_ITEMS, NEWS_TOPICS } from "../data/newsSeed";
import { useDialogFocus } from "../hooks/useDialogFocus";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function formatAge(minutesAgo) {
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  const hours = Math.floor(minutesAgo / 60);
  const minutes = minutesAgo % 60;
  return minutes ? `${hours}h ${minutes}m ago` : `${hours}h ago`;
}

function formatNewsTime(item) {
  if (item.minutesAgo !== undefined) return formatAge(item.minutesAgo);
  if (!item.published_at) return "recent";
  const published = new Date(item.published_at);
  if (Number.isNaN(published.getTime())) return "recent";
  const minutes = Math.max(0, Math.round((Date.now() - published.getTime()) / 60000));
  return formatAge(minutes);
}

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function NewsOverlay({ onClose, onTicker }) {
  const panelRef = useRef(null);
  const [topic, setTopic] = useState("ALL");
  const [items, setItems] = useState(NEWS_ITEMS);
  const [isFallback, setIsFallback] = useState(true);
  useDialogFocus(panelRef, onClose, { initialFocus: ".overlay-icon-btn" });

  useEffect(() => {
    const controller = new AbortController();

    async function loadNews() {
      try {
        const resp = await fetch(`${API_BASE_URL}/api/news`, {
          signal: controller.signal,
          headers: { Accept: "application/json" }
        });
        if (!resp.ok) throw new Error(`News endpoint returned ${resp.status}`);
        const payload = await resp.json();
        if (Array.isArray(payload.items) && payload.items.length > 0) {
          setItems(payload.items);
          setIsFallback(false);
        }
      } catch {
        setItems(NEWS_ITEMS);
        setIsFallback(true);
      }
    }

    loadNews();
    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => {
    if (topic === "ALL") return items;
    return items.filter((item) => item.topic === topic);
  }, [items, topic]);

  const topics = useMemo(() => {
    const discovered = Array.from(new Set(items.map((item) => item.topic).filter(Boolean)));
    return isFallback ? NEWS_TOPICS : ["ALL", ...discovered.filter((item) => item !== "ALL")];
  }, [isFallback, items]);

  return (
    <aside
      ref={panelRef}
      className="news-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="news-title"
    >
      <header className="news-header">
        <div>
          <p className="news-eyebrow">{isFallback ? "Fallback Wire" : "Live Wire"}</p>
          <h2 id="news-title">NUCLEAR NEWS</h2>
        </div>
        <button className="overlay-icon-btn" type="button" onClick={onClose} aria-label="Close news feed">
          <X size={16} />
        </button>
      </header>

      <div className="news-topic-row" role="tablist" aria-label="News topics">
        {topics.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={topic === item}
            className={`news-topic-chip${topic === item ? " active" : ""}`}
            onClick={() => setTopic(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <ul className="news-list">
        {filtered.map((item) => (
          <li key={item.id} className="news-item">
            <div className="news-meta">
              <span className="news-time">{formatNewsTime(item)}</span>
              <span>{item.source}</span>
              <span className={`news-topic-tag topic-${item.topic.toLowerCase().replace(/[^a-z]/g, "")}`}>
                {item.topic}
              </span>
            </div>
            {item.url ? (
              <a className="news-headline news-headline-link" href={item.url} target="_blank" rel="noreferrer">
                {cleanText(item.headline)}
              </a>
            ) : (
              <p className="news-headline">{cleanText(item.headline)}</p>
            )}
            <p className="news-summary">{cleanText(item.summary)}</p>
            {item.tickers.length > 0 && (
              <div className="news-tickers" aria-label="Related tickers">
                {item.tickers.map((ticker) => (
                  <button
                    key={ticker}
                    type="button"
                    className="news-ticker-chip"
                    onClick={() => onTicker?.(ticker)}
                  >
                    <ExternalLink size={10} />
                    {ticker}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
