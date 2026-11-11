// Shapes of the baked entrance data (tools/geo/bake_entrance.py writes them).

export interface GridInfo { x0: number; z0: number; step: number; nx: number; nz: number }
export interface Placed { x: number; z: number; y: number; yaw?: number }

export interface Lodge {
  id: string; x: number; z: number; w: number; d: number; yaw: number;
  yMin: number; yMax: number; storeys: number; seed: number; role: 'blueRoof' | 'pinkWhite' | null;
  /** M2.5: the old prototype's colours (hex strings) and kind, from data/namche_layout.json. */
  roof?: string; wall?: string; frame?: string; kind?: string; name?: string | null;
}

export interface WaterLine { id: string; invented: boolean; pts: [number, number, number][] }

export interface Layout {
  scale: number;
  hRef: number;
  near: GridInfo; mid: GridInfo; far: GridInfo;
  play?: { x0: number; z0: number; x1: number; z1: number };
  gate: Placed & { yaw: number };
  stupa: Placed;
  plaza: Placed & { w: number; d: number };
  market: Placed & { w: number; d: number };
  route: { pts: [number, number, number][]; gateS: number; flightStart: number };
  flight: { x: number; z: number; y: number; yaw: number; w: number; d: number }[];
  sidePath: [number, number, number][];
  spawn: Placed;
  bridge: Placed & { yaw: number; invented: boolean; reason: string };
  water: WaterLine[];
  lodges: Lodge[];
}

export interface Grid extends GridInfo { h: Float32Array }

export async function loadEntrance(base = 'assets/entrance/'): Promise<{ layout: Layout; near: Grid; mid: Grid; far: Grid; ground: Uint8Array }> {
  const get = async (f: string) => {
    const r = await fetch(base + f);
    if (!r.ok) throw new Error(`Missing baked asset ${f}: run npm run bake`);
    return r;
  };
  const layout = (await (await get('layout.json')).json()) as Layout;
  const [n, m, f, g] = await Promise.all(['near.bin', 'mid.bin', 'far.bin', 'near_ground.bin'].map(async (k) => (await get(k)).arrayBuffer()));
  return {
    layout,
    near: { ...layout.near, h: new Float32Array(n) },
    mid: { ...layout.mid, h: new Float32Array(m) },
    far: { ...layout.far, h: new Float32Array(f) },
    ground: new Uint8Array(g),
  };
}

/** Bilinear height on a grid (clamped at the edges). */
export function sampleGrid(g: Grid, x: number, z: number): number {
  const fx = Math.min(Math.max((x - g.x0) / g.step, 0), g.nx - 1.0001);
  const fz = Math.min(Math.max((z - g.z0) / g.step, 0), g.nz - 1.0001);
  const ix = Math.floor(fx), iz = Math.floor(fz);
  const tx = fx - ix, tz = fz - iz;
  const i = iz * g.nx + ix;
  const a = g.h[i], b = g.h[i + 1], c = g.h[i + g.nx], d = g.h[i + g.nx + 1];
  return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
}

export function inGrid(g: GridInfo, x: number, z: number, margin = 0): boolean {
  return x > g.x0 + margin && z > g.z0 + margin && x < g.x0 + (g.nx - 1) * g.step - margin && z < g.z0 + (g.nz - 1) * g.step - margin;
}
