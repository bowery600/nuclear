import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { buildIndex, searchIndex } from "../data/commandIndex";

export default function CommandPalette({ plantFeatures, onClose, onDispatch }) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);

  const index = useMemo(() => buildIndex(plantFeatures), [plantFeatures]);
  const results = useMemo(() => searchIndex(index, query), [index, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  function execute(entry) {
    if (!entry) return;
    onDispatch(entry.action);
    onClose();
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((current) => Math.min(results.length - 1, current + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((current) => Math.max(0, current - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      execute(results[cursor]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <div className="cmd-backdrop" onClick={onClose}>
      <section className="cmd-modal" role="dialog" aria-label="Command palette" onClick={(event) => event.stopPropagation()}>
        <div className="cmd-input-row">
          <Search size={16} aria-hidden="true" />
          <input
            ref={inputRef}
            className="cmd-input"
            value={query}
            placeholder="VOGTLE / CCJ / MARKETS / PJM"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className="cmd-go-hint">GO</span>
          <button className="overlay-icon-btn compact" type="button" onClick={onClose} aria-label="Close command palette">
            <X size={15} />
          </button>
        </div>

        <ul className="cmd-results" role="listbox" aria-label="Command results">
          {results.length === 0 && <li className="cmd-empty">No matches</li>}
          {results.map((entry, indexPosition) => (
            <li
              key={`${entry.kind}-${entry.label}-${indexPosition}`}
              className={`cmd-result${indexPosition === cursor ? " active" : ""}`}
              role="option"
              aria-selected={indexPosition === cursor}
              onMouseEnter={() => setCursor(indexPosition)}
              onClick={() => execute(entry)}
            >
              <span className={`cmd-kind kind-${entry.kind}`}>{entry.kind}</span>
              <span className="cmd-label">{entry.label}</span>
              <span className="cmd-hint">{entry.hint}</span>
            </li>
          ))}
        </ul>

        <footer className="cmd-footer">
          <span><kbd>Up</kbd><kbd>Down</kbd> navigate</span>
          <span><kbd>Enter</kbd> execute</span>
          <span><kbd>Esc</kbd> close</span>
        </footer>
      </section>
    </div>
  );
}
