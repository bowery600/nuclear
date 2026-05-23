import { useMemo, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { NEWS_ITEMS, NEWS_TOPICS } from "../data/newsSeed";

function formatAge(minutesAgo) {
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  const hours = Math.floor(minutesAgo / 60);
  const minutes = minutesAgo % 60;
  return minutes ? `${hours}h ${minutes}m ago` : `${hours}h ago`;
}

export default function NewsOverlay({ onClose, onTicker }) {
  const [topic, setTopic] = useState("ALL");

  const filtered = useMemo(() => {
    if (topic === "ALL") return NEWS_ITEMS;
    return NEWS_ITEMS.filter((item) => item.topic === topic);
  }, [topic]);

  return (
    <aside className="news-overlay" role="dialog" aria-label="Nuclear news feed">
      <header className="news-header">
        <div>
          <p className="news-eyebrow">Live Wire</p>
          <h2>NUCLEAR NEWS</h2>
        </div>
        <button className="overlay-icon-btn" type="button" onClick={onClose} aria-label="Close news feed">
          <X size={16} />
        </button>
      </header>

      <div className="news-topic-row" role="tablist" aria-label="News topics">
        {NEWS_TOPICS.map((item) => (
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
              <span className="news-time">{formatAge(item.minutesAgo)}</span>
              <span>{item.source}</span>
              <span className={`news-topic-tag topic-${item.topic.toLowerCase().replace(/[^a-z]/g, "")}`}>
                {item.topic}
              </span>
            </div>
            <p className="news-headline">{item.headline}</p>
            <p className="news-summary">{item.summary}</p>
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
