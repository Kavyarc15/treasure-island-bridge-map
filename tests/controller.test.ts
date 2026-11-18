import { describe, expect, it } from 'vitest';
import { Controller } from '../src/app/controller';
import { MAIN_ARCHIPELAGO } from '../src/data/archipelago';
import { ROOT_TWO_CHILDREN_DISCONNECTED } from '../src/data/samples';
import { ORACLE_ARTICULATION, ORACLE_BRIDGES, ORACLE_DISCOVERY_ORDER, ORACLE_EVENT_COUNT } from './oracle';

describe('Load My Archipelago', () => {
  it('loads in one action into the pre-traversal state', () => {
    const c = new Controller();
    const s = c.load(MAIN_ARCHIPELAGO);
    expect(s.errors).toEqual([]);
    expect(s.index).toBe(0);
    expect(s.atStart).toBe(true);
    expect(s.atEnd).toBe(false);
    expect(s.total).toBe(ORACLE_EVENT_COUNT);
    expect(s.view!.currentEvent).toBeNull();
    expect(s.view!.discoveryOrder).toEqual([]);
  });

  it('nothing is shown before anything is loaded; the controls do nothing', () => {
    const c = new Controller();
    expect(c.snapshot().view).toBeNull();
    expect(c.step().index).toBe(0);
    expect(c.runToEnd().index).toBe(0);
    expect(c.reset().view).toBeNull();
  });
});

describe('Step', () => {
  it('advances exactly one recorded event each time and stops at the end', () => {
    const c = new Controller();
    c.load(MAIN_ARCHIPELAGO);
    const events = c.snapshot().analysis!.events;
    for (let i = 1; i <= events.length; i++) {
      const s = c.step();
      expect(s.index).toBe(i);
      expect(s.view!.currentEvent).toEqual(events[i - 1]);
    }
    expect(c.snapshot().atEnd).toBe(true);
    expect(c.step().index).toBe(events.length); // no overshoot
  });
});

describe('Run to End uses the same sequence as Step', () => {
  it('ends in exactly the same state as stepping one by one', () => {
    const stepped = new Controller();
    stepped.load(MAIN_ARCHIPELAGO);
    while (!stepped.snapshot().atEnd) stepped.step();

    const direct = new Controller();
    direct.load(MAIN_ARCHIPELAGO);
    direct.runToEnd();

    expect(direct.snapshot()).toEqual(stepped.snapshot());
  });

  it('works from the middle of a replay, too', () => {
    const c = new Controller();
    c.load(MAIN_ARCHIPELAGO);
    for (let i = 0; i < 17; i++) c.step();
    const mid = c.runToEnd();
    const full = new Controller();
    full.load(MAIN_ARCHIPELAGO);
    expect(mid).toEqual(full.runToEnd());
  });

  it('keeps the whole event history available and the final summary correct', () => {
    const c = new Controller();
    c.load(MAIN_ARCHIPELAGO);
    const s = c.runToEnd();
    expect(s.analysis!.events.length).toBe(ORACLE_EVENT_COUNT);
    expect(s.view!.finished).toBe(true);
    expect(s.view!.bridges).toEqual(ORACLE_BRIDGES);
    expect(s.view!.articulationPoints).toEqual(ORACLE_ARTICULATION);
    expect(s.view!.discoveryOrder).toEqual(ORACLE_DISCOVERY_ORDER);
    expect(s.view!.componentsStarted).toBe(1);
  });

  it('summaries grow monotonically while stepping and are sorted at every moment', () => {
    const c = new Controller();
    c.load(ROOT_TWO_CHILDREN_DISCONNECTED);
    let prevBridges = 0;
    let prevArt = 0;
    while (!c.snapshot().atEnd) {
      const v = c.step().view!;
      expect(v.bridges).toEqual([...v.bridges].sort());
      expect(v.articulationPoints).toEqual([...v.articulationPoints].sort());
      expect(v.bridges.length).toBeGreaterThanOrEqual(prevBridges);
      expect(v.articulationPoints.length).toBeGreaterThanOrEqual(prevArt);
      prevBridges = v.bridges.length;
      prevArt = v.articulationPoints.length;
    }
  });
});

describe('Reset', () => {
  it('after a partial run restores the pre-traversal state exactly', () => {
    const c = new Controller();
    const fresh = c.load(MAIN_ARCHIPELAGO);
    for (let i = 0; i < 31; i++) c.step();
    expect(c.snapshot().index).toBe(31);
    expect(c.reset()).toEqual(fresh);
  });

  it('after a complete run restores the pre-traversal state exactly', () => {
    const c = new Controller();
    const fresh = c.load(MAIN_ARCHIPELAGO);
    c.runToEnd();
    expect(c.reset()).toEqual(fresh);
    expect(c.snapshot().view!.bridges).toEqual([]);
  });

  it('restores the candidate-created graph exactly (the pristine graph is frozen and unchanged)', () => {
    const c = new Controller();
    c.load(MAIN_ARCHIPELAGO);
    c.runToEnd();
    const snap = c.reset();
    expect(snap.graph).toEqual(MAIN_ARCHIPELAGO);
    expect(Object.isFrozen(snap.graph)).toBe(true);
    expect(() => {
      (snap.graph!.nodes[0] as { x: number }).x = 99;
    }).toThrow();
  });

  it('is idempotent', () => {
    const c = new Controller();
    c.load(MAIN_ARCHIPELAGO);
    c.step();
    expect(c.reset()).toEqual(c.reset());
  });
});

describe('repeated stepped and complete runs produce identical histories and results', () => {
  const finalShape = (c: Controller) => {
    const s = c.snapshot();
    return JSON.stringify({
      events: s.analysis!.events,
      table: s.analysis!.table,
      bridges: s.view!.bridges,
      art: s.view!.articulationPoints,
      comps: s.view!.componentsStarted,
      order: s.view!.discoveryOrder,
    });
  };

  it('stepped, reset, complete, reset, stepped again', () => {
    const c = new Controller();
    c.load(MAIN_ARCHIPELAGO);
    while (!c.snapshot().atEnd) c.step();
    const run1 = finalShape(c);

    c.reset();
    c.runToEnd();
    const run2 = finalShape(c);

    c.reset();
    while (!c.snapshot().atEnd) c.step();
    const run3 = finalShape(c);

    c.load(MAIN_ARCHIPELAGO); // a fresh Load gives the same result too
    c.runToEnd();
    const run4 = finalShape(c);

    expect(run2).toBe(run1);
    expect(run3).toBe(run1);
    expect(run4).toBe(run1);
  });

  it('every intermediate state is identical across two stepped runs', () => {
    const a = new Controller();
    const b = new Controller();
    a.load(MAIN_ARCHIPELAGO);
    b.load(MAIN_ARCHIPELAGO);
    b.runToEnd();
    b.reset();
    while (!a.snapshot().atEnd) {
      expect(a.step()).toEqual(b.step());
    }
  });
});
