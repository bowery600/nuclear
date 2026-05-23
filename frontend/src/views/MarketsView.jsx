import { TrendingUp, TrendingDown } from "lucide-react";
import { FUEL_CYCLE, priceAt, sparkSeries as fuelSpark } from "../data/fuelCycleSeed";
import { EQUITIES, quoteAt, sparkSeries as equitySpark } from "../data/equitiesSeed";

function Sparkline({ values, width = 80, height = 22, color = "#22d3ee" }) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = width / (values.length - 1);
  const points = values
    .map((v, i) => `${(i * step).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={width} height={height} className="sparkline" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.4" />
    </svg>
  );
}

function fmt(n, digits = 2) {
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export default function MarketsView({ plants, tick, onHighlightTicker, highlightTicker }) {
  return (
    <div className="markets-view">
      <div className="markets-fuel-col">
        <h2 className="markets-section-title">Fuel Cycle</h2>
        {FUEL_CYCLE.map((item) => {
          const price = priceAt(item, tick);
          const prev  = priceAt(item, tick - 30);
          const delta = price - prev;
          const deltaPct = (delta / prev) * 100;
          const up = delta >= 0;
          return (
            <div key={item.id} className="fuel-card">
              <div className="fuel-card-head">
                <span className="fuel-label">{item.label}</span>
                <span className={`fuel-delta ${up ? "up" : "down"}`}>
                  {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {up ? "+" : ""}{fmt(deltaPct, 2)}%
                </span>
              </div>
              <div className="fuel-card-price">
                <span className="fuel-price">${fmt(price)}</span>
                <span className="fuel-unit">{item.unit}</span>
              </div>
              <Sparkline values={fuelSpark(item, tick)} width={220} height={36} color={up ? "#22d3ee" : "#f87171"} />
            </div>
          );
        })}
      </div>

      <div className="markets-equities-col">
        <h2 className="markets-section-title">Nuclear Equities</h2>
        <table className="equities-table">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Name</th>
              <th className="num">Price</th>
              <th className="num">Delta</th>
              <th className="num">Delta %</th>
              <th>Chart</th>
              <th className="num">Mkt Cap</th>
            </tr>
          </thead>
          <tbody>
            {EQUITIES.map((eq) => {
              const q = quoteAt(eq, tick);
              const up = q.delta >= 0;
              return (
                <tr
                  key={eq.ticker}
                  className={highlightTicker === eq.ticker ? "is-highlighted" : ""}
                  onClick={() => onHighlightTicker && onHighlightTicker(eq.ticker)}
                >
                  <td className="ticker-cell">{eq.ticker}</td>
                  <td className="name-cell">{eq.name}</td>
                  <td className="num">${fmt(q.price)}</td>
                  <td className={`num ${up ? "up" : "down"}`}>{up ? "+" : ""}{fmt(q.delta)}</td>
                  <td className={`num ${up ? "up" : "down"}`}>{up ? "+" : ""}{fmt(q.deltaPct)}%</td>
                  <td><Sparkline values={equitySpark(eq, tick)} color={up ? "#22d3ee" : "#f87171"} /></td>
                  <td className="num">${fmt(eq.mktCapB, 1)}B</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="markets-footnote">Click a row to highlight that company's plants on MAP.</p>
      </div>
    </div>
  );
}
