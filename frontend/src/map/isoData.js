export function aggregateLmpByIso(plantFeatures) {
  const buckets = new Map();
  plantFeatures.forEach((feature) => {
    const props = feature.properties || {};
    const iso = props.iso_code;
    const price = Number(props.current_power_cost_usd_mwh);
    if (!iso || !Number.isFinite(price)) return;
    if (!buckets.has(iso)) {
      buckets.set(iso, { sum: 0, count: 0 });
    }
    const bucket = buckets.get(iso);
    bucket.sum += price;
    bucket.count += 1;
  });

  const result = new Map();
  buckets.forEach((value, key) => {
    result.set(key, value.sum / value.count);
  });
  return result;
}

export function bboxOfPath(pathBoundsFn, feature) {
  const bounds = pathBoundsFn(feature);
  if (!bounds) return null;
  const [[x0, y0], [x1, y1]] = bounds;
  if (!Number.isFinite(x0) || !Number.isFinite(x1)) return null;
  return { minX: x0, minY: y0, maxX: x1, maxY: y1 };
}
