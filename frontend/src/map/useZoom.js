import { useCallback, useEffect, useRef, useState } from "react";
import { select } from "d3-selection";
import { zoom as d3Zoom, zoomIdentity } from "d3-zoom";
import "d3-transition";

const DEFAULT_PADDING = { top: 120, right: 420, bottom: 80, left: 80 };

export function useZoom({ width, height, scaleExtent = [1, 8] }) {
  const svgRef = useRef(null);
  const zoomRef = useRef(null);
  const [transform, setTransform] = useState(zoomIdentity);

  useEffect(() => {
    if (!svgRef.current) return undefined;
    const svgNode = svgRef.current;
    const svgSelection = select(svgNode);
    const behavior = d3Zoom()
      .scaleExtent(scaleExtent)
      .filter((event) => {
        if (event.type === "wheel") return true;
        if (event.type === "dblclick") return false;
        return !event.button;
      })
      .on("zoom", (event) => {
        setTransform(event.transform);
      });
    svgSelection.call(behavior);
    zoomRef.current = behavior;

    // Interrupt any in-flight zoom transition the moment the user touches
    // the map, so click-to-zoom doesn't lock them out.
    const interrupt = () => svgSelection.interrupt();
    svgNode.addEventListener("wheel", interrupt, { passive: true });
    svgNode.addEventListener("mousedown", interrupt);
    svgNode.addEventListener("touchstart", interrupt, { passive: true });

    return () => {
      svgSelection.on(".zoom", null);
      svgNode.removeEventListener("wheel", interrupt);
      svgNode.removeEventListener("mousedown", interrupt);
      svgNode.removeEventListener("touchstart", interrupt);
      zoomRef.current = null;
    };
  }, [scaleExtent]);

  const animateToBounds = useCallback(
    (bbox, padding = DEFAULT_PADDING, duration = 260) => {
      if (!svgRef.current || !zoomRef.current || !bbox || !width || !height) return;
      const pad = { ...DEFAULT_PADDING, ...padding };
      const usableW = Math.max(80, width - pad.left - pad.right);
      const usableH = Math.max(80, height - pad.top - pad.bottom);
      const w = Math.max(20, bbox.maxX - bbox.minX);
      const h = Math.max(20, bbox.maxY - bbox.minY);
      const scale = Math.max(
        scaleExtent[0],
        Math.min(scaleExtent[1], Math.min(usableW / w, usableH / h) * 0.95)
      );
      const cx = (bbox.minX + bbox.maxX) / 2;
      const cy = (bbox.minY + bbox.maxY) / 2;
      const offsetX = (pad.left - pad.right) / 2;
      const offsetY = (pad.top - pad.bottom) / 2;
      const tx = width / 2 - scale * cx + offsetX;
      const ty = height / 2 - scale * cy + offsetY;
      const next = zoomIdentity.translate(tx, ty).scale(scale);
      select(svgRef.current)
        .transition()
        .duration(duration)
        .call(zoomRef.current.transform, next);
    },
    [width, height, scaleExtent]
  );

  const resetZoom = useCallback(
    (duration = 260) => {
      if (!svgRef.current || !zoomRef.current) return;
      select(svgRef.current)
        .transition()
        .duration(duration)
        .call(zoomRef.current.transform, zoomIdentity);
    },
    []
  );

  return { svgRef, transform, animateToBounds, resetZoom };
}
