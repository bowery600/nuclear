import { useEffect, useMemo, useRef, useState } from "react";
import { feature } from "topojson-client";
import statesTopo from "us-atlas/states-10m.json";
import isoRegions from "./iso-regions.json";
import smrSitesData from "../data/smr_sites.json";
import { createProjection, projectPlant, bboxOfFeatures } from "./projection";
import { aggregateLmpByIso, bboxOfPath } from "./isoData";
import { colorForIsoHeatmap } from "./colors";
import { useZoom } from "./useZoom";
import PlantNode from "./PlantNode";
import SmrNode from "./SmrNode";
import PlantTooltip from "./PlantTooltip";
import SmrTooltip from "./SmrTooltip";
import RegionChips from "./RegionChips";

const statesFc = feature(statesTopo, statesTopo.objects.states);

function useContainerSize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return undefined;
    const el = ref.current;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

export default function NuclearMap({ plants, selectedPlant, onSelect, metricMode }) {
  const containerRef = useRef(null);
  const { width, height } = useContainerSize(containerRef);
  const features = plants?.features || [];

  const { projection, path } = useMemo(() => {
    if (!width || !height) {
      return { projection: null, path: null };
    }
    return createProjection(width, height);
  }, [width, height]);

  const { svgRef, transform, animateToBounds, resetZoom } = useZoom({ width, height });
  const [hoveredPlant, setHoveredPlant] = useState(null);
  const [hoveredSmr, setHoveredSmr] = useState(null);
  const [activeRegion, setActiveRegion] = useState(null);

  const lmpByIso = useMemo(() => aggregateLmpByIso(features), [features]);

  const projectedPlants = useMemo(() => {
    if (!projection) return [];
    return features
      .map((f) => {
        const p = projectPlant(projection, f);
        if (!p) return null;
        return { feature: f, x: p[0], y: p[1] };
      })
      .filter(Boolean);
  }, [features, projection]);

  const projectedSmrs = useMemo(() => {
    if (!projection) return [];
    return smrSitesData
      .map((site) => {
        const p = projection([site.lon, site.lat]);
        if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) return null;
        return { site, x: p[0], y: p[1] };
      })
      .filter(Boolean);
  }, [projection]);

  const selectedId = selectedPlant?.properties?.id ?? selectedPlant?.id ?? null;

  const ownershipLines = useMemo(() => {
    if (!selectedPlant || !projection) return [];
    const parent = selectedPlant.properties?.parent_company_name;
    if (!parent) return [];
    const origin = projectPlant(projection, selectedPlant);
    if (!origin) return [];
    return projectedPlants
      .filter(
        (p) =>
          p.feature !== selectedPlant &&
          (p.feature.properties?.id ?? null) !== selectedId &&
          p.feature.properties?.parent_company_name === parent
      )
      .map((p) => {
        const mx = (origin[0] + p.x) / 2;
        const my = (origin[1] + p.y) / 2;
        const dx = p.x - origin[0];
        const dy = p.y - origin[1];
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const lift = Math.min(60, len * 0.18);
        const cx = mx - (dy / len) * lift;
        const cy = my + (dx / len) * lift;
        return {
          id: p.feature.properties?.id || `${p.x}-${p.y}`,
          d: `M ${origin[0]} ${origin[1]} Q ${cx} ${cy} ${p.x} ${p.y}`
        };
      });
  }, [selectedPlant, selectedId, projectedPlants, projection]);

  const hasFittedRef = useRef(false);
  useEffect(() => {
    if (!projection || features.length === 0 || hasFittedRef.current) return;
    const bbox = bboxOfFeatures(projection, features);
    if (bbox) {
      animateToBounds(bbox, undefined, 220);
      hasFittedRef.current = true;
    }
  }, [features, projection, animateToBounds]);

  useEffect(() => {
    if (!projection || !selectedPlant) return;
    const p = projectPlant(projection, selectedPlant);
    if (!p) return;
    // Gentler centering: wider bbox keeps surrounding context visible
    // instead of slamming the camera all the way in.
    const bbox = { minX: p[0] - 240, minY: p[1] - 240, maxX: p[0] + 240, maxY: p[1] + 240 };
    animateToBounds(bbox, { top: 120, right: 460, bottom: 80, left: 80 }, 260);
  }, [selectedPlant, projection, animateToBounds]);

  const regionMeta = useMemo(() => {
    if (!path) return [];
    return isoRegions.features.map((f) => ({
      code: f.properties.code,
      name: f.properties.name,
      feature: f,
      bbox: bboxOfPath(path.bounds, f)
    }));
  }, [path]);

  const handleJumpRegion = (region) => {
    setActiveRegion(region.code);
    if (region.bbox) animateToBounds(region.bbox);
  };

  const handleResetRegion = () => {
    setActiveRegion(null);
    if (projection && features.length > 0) {
      const bbox = bboxOfFeatures(projection, features);
      if (bbox) {
        animateToBounds(bbox);
        return;
      }
    }
    resetZoom();
  };

  const handleBackgroundClick = () => {
    if (selectedPlant) {
      onSelect?.(null);
    }
    setActiveRegion(null);
  };

  const tooltipPos = useMemo(() => {
    if (!hoveredPlant || !projection) return null;
    const p = projectPlant(projection, hoveredPlant);
    if (!p) return null;
    const screenX = transform.x + p[0] * transform.k;
    const screenY = transform.y + p[1] * transform.k;
    return { x: screenX + 14, y: screenY - 18 };
  }, [hoveredPlant, projection, transform]);

  const smrTooltipPos = useMemo(() => {
    if (!hoveredSmr || !projection) return null;
    const p = projection([hoveredSmr.lon, hoveredSmr.lat]);
    if (!p) return null;
    const screenX = transform.x + p[0] * transform.k;
    const screenY = transform.y + p[1] * transform.k;
    return { x: screenX + 14, y: screenY - 18 };
  }, [hoveredSmr, projection, transform]);

  return (
    <div className="nuclear-map" ref={containerRef}>
      <svg
        ref={svgRef}
        className="nuclear-map-svg"
        width={width || 0}
        height={height || 0}
        onClick={handleBackgroundClick}
      >
        <defs>
          <filter id="plantGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id="wireGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="bgGlow" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#0f172a" stopOpacity="0.0" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0.6" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bgGlow)" />

        {projection && path && (
          <g
            transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}
          >
            <g className="iso-regions">
              {regionMeta.map((region) => {
                const avg = lmpByIso.get(region.code);
                const active = activeRegion === region.code;
                const fill = Number.isFinite(avg)
                  ? colorForIsoHeatmap(avg)
                  : "rgba(148, 163, 184, 0.05)";
                return (
                  <path
                    key={region.code}
                    d={path(region.feature)}
                    className={`iso-region${active ? " is-active" : ""}`}
                    fill={fill}
                    fillOpacity={Number.isFinite(avg) ? 0.13 : 0.05}
                    stroke="rgba(148, 163, 184, 0.25)"
                    strokeWidth={0.6 / transform.k}
                  />
                );
              })}
            </g>

            <g className="states">
              {statesFc.features.map((state) => (
                <path
                  key={state.id}
                  d={path(state)}
                  className="state-outline"
                  fill="none"
                  stroke="rgba(226, 232, 240, 0.32)"
                  strokeWidth={0.6 / transform.k}
                />
              ))}
            </g>

            {ownershipLines.length > 0 && (
              <g className="ownership-lines" filter="url(#wireGlow)">
                {ownershipLines.map((line, index) => {
                  const sw = 1.6 / transform.k;
                  const pulseLen = 18 / transform.k;
                  const gapLen = 140 / transform.k;
                  const cycle = pulseLen + gapLen;
                  // Stagger starts so currents don't all blink together.
                  const begin = `${-(index * 0.35) % 1.8}s`;
                  return (
                    <g key={line.id}>
                      {/* Steady wire */}
                      <path
                        d={line.d}
                        fill="none"
                        stroke="rgba(103, 232, 249, 0.55)"
                        strokeWidth={sw}
                        strokeLinecap="round"
                      />
                      {/* Traveling current pulse */}
                      <path
                        d={line.d}
                        fill="none"
                        stroke="#f0fdfa"
                        strokeWidth={sw * 1.8}
                        strokeLinecap="round"
                        strokeDasharray={`${pulseLen} ${gapLen}`}
                      >
                        <animate
                          attributeName="stroke-dashoffset"
                          from={cycle}
                          to={0}
                          dur="1.8s"
                          begin={begin}
                          repeatCount="indefinite"
                        />
                      </path>
                    </g>
                  );
                })}
              </g>
            )}

            <g className="smr-layer">
              {projectedSmrs.map(({ site, x, y }) => (
                <SmrNode
                  key={site.site_id}
                  site={site}
                  x={x}
                  y={y}
                  scale={transform.k}
                  onHover={setHoveredSmr}
                  onLeave={() => setHoveredSmr(null)}
                />
              ))}
            </g>

            <g className="plant-nodes">
              {projectedPlants.map(({ feature: f, x, y }) => {
                const fid = f.properties?.id ?? f.id;
                return (
                  <PlantNode
                    key={fid ?? `${x}-${y}`}
                    plant={f}
                    x={x}
                    y={y}
                    metricMode={metricMode}
                    selected={selectedId !== null && fid === selectedId}
                    scale={transform.k}
                    onHover={setHoveredPlant}
                    onLeave={() => setHoveredPlant(null)}
                    onSelect={onSelect}
                  />
                );
              })}
            </g>
          </g>
        )}
      </svg>

      <RegionChips
        regions={regionMeta}
        activeCode={activeRegion}
        onJump={handleJumpRegion}
        onReset={handleResetRegion}
      />

      {tooltipPos && <PlantTooltip plant={hoveredPlant} x={tooltipPos.x} y={tooltipPos.y} />}
      {smrTooltipPos && <SmrTooltip site={hoveredSmr} x={smrTooltipPos.x} y={smrTooltipPos.y} />}
    </div>
  );
}
