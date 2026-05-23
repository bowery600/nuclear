import { memo } from "react";
import { colorForVendor, styleForPhase } from "./smrColors";

const BASE_R = 5;

function SmrNodeImpl({ site, x, y, scale, onHover, onLeave }) {
  const invScale = scale > 0 ? 1 / scale : 1;
  const stroke = colorForVendor(site.vendor);
  const { dash, innerDot } = styleForPhase(site.phase);

  const label = `${site.site_name} (${site.vendor} ${site.reactor_model})`;

  return (
    <g
      className="smr-node"
      transform={`translate(${x}, ${y}) scale(${invScale})`}
      role="img"
      aria-label={label}
      onMouseEnter={() => onHover?.(site)}
      onMouseLeave={() => onLeave?.(site)}
      onFocus={() => onHover?.(site)}
      onBlur={() => onLeave?.(site)}
      tabIndex={0}
    >
      <circle
        r={BASE_R}
        fill="none"
        stroke={stroke}
        strokeWidth={1.4}
        strokeOpacity={0.95}
        strokeDasharray={dash || undefined}
      />
      {innerDot && (
        <circle
          r={BASE_R * 0.35}
          fill={stroke}
          fillOpacity={0.9}
          pointerEvents="none"
        />
      )}
      {/* Larger transparent hit target for easier hovering */}
      <circle r={BASE_R * 2.4} fill="transparent" />
    </g>
  );
}

export default memo(SmrNodeImpl);
