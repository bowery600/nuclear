import { memo } from "react";
import { colorForPlant } from "./colors";

function sizeFromCapacity(capacityMw) {
  const cap = Number.isFinite(capacityMw) ? capacityMw : 800;
  const clamped = Math.max(500, Math.min(3500, cap));
  const t = (clamped - 500) / (3500 - 500);
  return {
    node: 5 + t * 5,
    glow: 16 + t * 18
  };
}

// Hyperboloid cooling tower silhouette, centered at origin.
// Width = 2 * size, height ≈ 2.6 * size, narrower at the waist, slight top lip.
function towerPath(size) {
  const baseHalf = size;
  const topHalf = size * 0.7;
  const waistHalf = size * 0.55;
  const bottomY = size * 1.2;
  const waistY = -size * 0.4;
  const topY = -size * 1.4;
  return (
    `M ${-baseHalf},${bottomY}` +
    ` C ${-waistHalf},${waistY * 0.3} ${-waistHalf},${waistY} ${-topHalf},${topY}` +
    ` L ${topHalf},${topY}` +
    ` C ${waistHalf},${waistY} ${waistHalf},${waistY * 0.3} ${baseHalf},${bottomY}` +
    ` Z`
  );
}

function PlantNodeImpl({ plant, x, y, metricMode, selected, onHover, onLeave, onSelect, scale }) {
  const props = plant.properties || {};
  const color = colorForPlant(plant, metricMode);
  const { node, glow } = sizeFromCapacity(Number(props.total_mw_capacity));
  const invScale = scale > 0 ? 1 / scale : 1;
  const outputRatio = Math.max(
    0,
    Math.min(1, Number(props.capacity_percentage) / 100 || 0)
  );
  const steamDuration = 3.2 - outputRatio * 1.2;
  const tower = towerPath(node);
  const topY = -node * 1.4;

  const label = [props.plant_name, props.state].filter(Boolean).join(", ") || "Plant";

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      onSelect?.(plant);
    }
  };

  return (
    <g
      className={`plant-node${selected ? " is-selected" : ""}`}
      transform={`translate(${x}, ${y}) scale(${invScale})`}
      tabIndex={0}
      role="button"
      aria-label={label}
      aria-pressed={selected}
      onMouseEnter={() => onHover?.(plant)}
      onMouseLeave={() => onLeave?.(plant)}
      onFocus={() => onHover?.(plant)}
      onBlur={() => onLeave?.(plant)}
      onKeyDown={handleKeyDown}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(plant);
      }}
    >
      <circle
        className="plant-glow"
        r={glow}
        fill={color}
        opacity={0.26}
        filter="url(#plantGlow)"
      />

      {/* Steam plume rising from the tower top */}
      <g className="plant-steam" pointerEvents="none">
        <ellipse
          cx={0}
          cy={topY - node * 0.4}
          rx={node * 0.55}
          ry={node * 0.32}
          fill="#e2e8f0"
          opacity={0.55}
        >
          <animate
            attributeName="cy"
            values={`${topY - node * 0.3};${topY - node * 1.4}`}
            dur={`${steamDuration}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.55;0"
            dur={`${steamDuration}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="rx"
            values={`${node * 0.45};${node * 0.9}`}
            dur={`${steamDuration}s`}
            repeatCount="indefinite"
          />
        </ellipse>
      </g>

      {/* Cooling tower silhouette */}
      <path
        className="plant-core"
        d={tower}
        fill={color}
        stroke="#f8fafc"
        strokeOpacity={0.92}
        strokeWidth={1}
        strokeLinejoin="round"
      />

      {/* Inner curve highlight for hyperboloid feel */}
      <path
        d={`M ${-node * 0.7},${topY + node * 0.15} L ${node * 0.7},${topY + node * 0.15}`}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth={0.8}
        fill="none"
        pointerEvents="none"
      />

      {selected && (
        <path
          className="plant-ring"
          d={towerPath(node + 4)}
          fill="none"
          stroke="#ffffff"
          strokeOpacity={0.9}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
      )}

      <circle className="plant-hit" r={Math.max(node * 1.8, 14)} fill="transparent" />
    </g>
  );
}

export default memo(PlantNodeImpl);
