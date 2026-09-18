import { FOCUS_STATES } from "@/lib/site";
import { STATE_NAMES } from "@/lib/schemas";

/**
 * The state outlines, loaded on demand.
 *
 * `lib/us-map.json` is 134 KB of path data (~35 KB over the wire). It used
 * to be a static import in the coverage map, and the coverage map is on
 * every page, so every page carried it in its JavaScript whether or not the
 * reader ever scrolled to the map. Now the two maps ask for it when they are
 * within a viewport and a half of being seen; the JSON becomes its own chunk
 * and the first-load bundle loses it on all nine routes.
 *
 * The viewBox is duplicated here as a constant because the placeholder that
 * holds the map's space needs the aspect before anything has loaded.
 * scripts/build-map.mjs writes `0 0 ${W} ${H}` with W = 975, H = 610; if the
 * projection ever changes, change this with it (the guard below catches a
 * drift at load).
 */
export const US_MAP_VIEWBOX = "0 0 975 610";

/** The twelve focus states by name, sorted, static so the chips render on the server without the geometry. */
export const FOCUS_NAMES: ReadonlyArray<{ abbr: string; name: string }> = FOCUS_STATES.map((abbr) => ({ abbr, name: STATE_NAMES[abbr] })).sort((a, b) => a.name.localeCompare(b.name));
export const WEST = new Set<string>(FOCUS_STATES);

export type St = { id: string; abbr: string; name: string; d: string; cx: number; cy: number };

export interface UsMap {
  viewBox: string;
  states: St[];
  /** Focus states, north-west to south-east: the order the block assembles in. */
  sweep: St[];
  /** The reverse: down-right first, so up-left tiles shingle on top of their neighbors. */
  paint: St[];
  /** True center of each focus state's outline (bounding-box midpoint, see `box`). */
  origin: Record<string, { ox: number; oy: number }>;
  west: Set<string>;
}

/**
 * The true center of a state's outline.
 *
 * The path data is M/L/Z only (topojson → svg), so every number in `d` is a
 * coordinate and an exact bounding box is a pairwise min/max — no getBBox, no
 * layout dependency, identical wherever it runs. `s.cx/s.cy` are LABEL
 * anchors, not centroids, and drift by as much as 24 user units on the long
 * states; scaling a state about its label anchor slides it sideways.
 */
function box(d: string) {
  const n = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let i = 0; i < n.length; i += 2) {
    if (n[i] < x0) x0 = n[i];
    if (n[i] > x1) x1 = n[i];
    if (n[i + 1] < y0) y0 = n[i + 1];
    if (n[i + 1] > y1) y1 = n[i + 1];
  }
  return { ox: (x0 + x1) / 2, oy: (y0 + y1) / 2 };
}

let cached: Promise<UsMap> | null = null;

export function loadUsMap(): Promise<UsMap> {
  if (cached) return cached;
  cached = import("@/lib/us-map.json").then((mod) => {
    const raw = (mod.default ?? mod) as { viewBox: string; states: St[] };
    if (raw.viewBox !== US_MAP_VIEWBOX && process.env.NODE_ENV !== "production") {
      console.warn(`us-map: viewBox drifted (${raw.viewBox} vs ${US_MAP_VIEWBOX}); update lib/us-map.ts`);
    }
    const west = new Set<string>(FOCUS_STATES);
    const focus = raw.states.filter((s) => west.has(s.abbr));
    const origin: Record<string, { ox: number; oy: number }> = Object.fromEntries(focus.map((s) => [s.abbr, box(s.d)]));
    const sweep = [...focus].sort((a, b) => origin[a.abbr].ox + origin[a.abbr].oy - (origin[b.abbr].ox + origin[b.abbr].oy));
    return { viewBox: raw.viewBox, states: raw.states, sweep, paint: [...sweep].reverse(), origin, west };
  });
  return cached;
}
