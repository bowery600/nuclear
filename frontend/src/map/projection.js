import { geoAlbersUsa, geoPath } from "d3-geo";

export function createProjection(width, height) {
  const projection = geoAlbersUsa()
    .scale(Math.min(width * 1.25, height * 2.1))
    .translate([width / 2, height / 2]);
  const path = geoPath(projection);
  return { projection, path };
}

export function projectPlant(projection, feature) {
  const coords = feature?.geometry?.coordinates;
  if (!coords) return null;
  const projected = projection(coords);
  if (!projected || !Number.isFinite(projected[0]) || !Number.isFinite(projected[1])) {
    return null;
  }
  return projected;
}

export function bboxOfFeatures(projection, features) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let count = 0;

  features.forEach((feature) => {
    const projected = projectPlant(projection, feature);
    if (!projected) return;
    count += 1;
    if (projected[0] < minX) minX = projected[0];
    if (projected[1] < minY) minY = projected[1];
    if (projected[0] > maxX) maxX = projected[0];
    if (projected[1] > maxY) maxY = projected[1];
  });

  if (count === 0) return null;
  return { minX, minY, maxX, maxY };
}
