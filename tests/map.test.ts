import { describe, expect, it } from 'vitest';
import { MAIN_ARCHIPELAGO } from '../src/data/archipelago';
import { CYCLE_ONLY, ROOT_TWO_CHILDREN_DISCONNECTED } from '../src/data/samples';
import { MAP_H, MAP_W, projectNodes } from '../src/ui/mapView';

const inside = (p: { x: number; y: number }) =>
  p.x >= 60 && p.x <= MAP_W - 60 && p.y >= 40 && p.y <= MAP_H - 60;

describe('map projection keeps every island visible (coordinates 0..100 are all legal)', () => {
  it.each([
    ['main archipelago', MAIN_ARCHIPELAGO.nodes],
    ['ring', CYCLE_ONLY.nodes],
    ['root + disconnected + isolated', ROOT_TWO_CHILDREN_DISCONNECTED.nodes],
    ['extreme corners', [
      { id: 'A', x: 0, y: 0 }, { id: 'B', x: 100, y: 0 }, { id: 'C', x: 0, y: 100 }, { id: 'D', x: 100, y: 100 },
    ]],
    ['single node', [{ id: 'A', x: 100, y: 100 }]],
    ['all on one horizontal line', [{ id: 'A', x: 0, y: 50 }, { id: 'B', x: 100, y: 50 }]],
    ['two nodes very close', [{ id: 'A', x: 50, y: 50 }, { id: 'B', x: 50.5, y: 50.5 }]],
  ])('%s', (_name, nodes) => {
    const pos = projectNodes(nodes);
    expect(pos.size).toBe(nodes.length);
    for (const p of pos.values()) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
      expect(inside(p), JSON.stringify(p)).toBe(true);
    }
  });

  it('preserves left/right and up/down order of the layout', () => {
    const pos = projectNodes([{ id: 'L', x: 10, y: 80 }, { id: 'R', x: 90, y: 20 }]);
    expect(pos.get('L')!.x).toBeLessThan(pos.get('R')!.x);
    expect(pos.get('L')!.y).toBeGreaterThan(pos.get('R')!.y);
  });

  it('is deterministic and independent of node array order', () => {
    const a = projectNodes(MAIN_ARCHIPELAGO.nodes);
    const b = projectNodes([...MAIN_ARCHIPELAGO.nodes].reverse());
    for (const [id, p] of a) expect(b.get(id)).toEqual(p);
  });
});
