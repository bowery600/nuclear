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

function PlantNodeImpl({ plant, x, y, metricMode, selected, onHover, onLeave, onSelect, scale }) {
  const props = plant.properties || {};
  const color = colorForPlant(plant, metricMode);
  const { node, glow } = sizeFromCapacity(Number(props.total_mw_capacity));
  const invScale = scale > 0 ? 1 / scale : 1;
  const outputRatio = Math.max(
    0,
    Math.min(1, Number(props.capacity_percentage) / 100 || 0)
  );
  const pulseAmplitude = 0.4 + outputRatio * 0.9;
  const pulseDuration = 2.4 - outputRatio * 0.9;

  return (
    <g
      className={`plant-node${selected ? " is-selected" : ""}`}
      transform={`translate(${x}, ${y}) scale(${invScale})`}
      onMouseEnter={() => onHover?.(plant)}
      onMouseLeave={() => onLeave?.(plant)}
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
      <circle className="plant-pulse" r={node} fill={color} opacity={0.55}>
        <animate
          attributeName="r"
          values={`${node};${node * (1 + pulseAmplitude)};${node}`}
          dur={`${pulseDuration}s`}
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.55;0;0.55"
          dur={`${pulseDuration}s`}
          repeatCount="indefinite"
        />
      </circle>
      <circle
        className="plant-core"
        r={node}
        fill={color}
        stroke="#f8fafc"
        strokeOpacity={0.92}
        strokeWidth={1.2}
      />
      {selected && (
        <circle
          className="plant-ring"
          r={node + 5}
          fill="none"
          stroke="#ffffff"
          strokeOpacity={0.9}
          strokeWidth={2}
        />
      )}
      <circle className="plant-hit" r={Math.max(node + 6, 12)} fill="transparent" />
    </g>
  );
}

export default memo(PlantNodeImpl);
