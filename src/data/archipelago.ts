import type { Graph } from '../engine/types';

/**
 * "Tidewater Isles": the main demonstration archipelago (9 islands, 10 bridges).
 *
 * The arrays are deliberately NOT in sorted order, and BR05 / BR09 / BR10 are
 * written with their endpoints "backwards", to prove that source order and
 * endpoint order never change the traversal. The expected results are written
 * down separately in docs/oracle.md and tests/oracle.ts and are never read by
 * the application.
 */
export const MAIN_ARCHIPELAGO: Graph = {
  nodes: [
    { id: 'TIDE', name: 'Tidewater Terrace (music stage)', x: 78, y: 32 },
    { id: 'ANCHOR', name: 'Anchor Cove (main gate)', x: 22, y: 52 },
    { id: 'PEARL', name: 'Pearl Point (first-aid tent)', x: 92, y: 10 },
    { id: 'REEF', name: 'Reef Rotunda (games)', x: 42, y: 74 },
    { id: 'KELP', name: 'Kelp Karaoke Stage', x: 27, y: 8 },
    { id: 'WAVE', name: 'Wave Walk', x: 86, y: 74 },
    { id: 'MANGO', name: 'Mango Mooring', x: 42, y: 30 },
    { id: 'SHELL', name: 'Shell Square', x: 62, y: 56 },
    { id: 'HARBOR', name: 'Harbour Market (food stalls)', x: 7, y: 28 },
  ],
  edges: [
    { id: 'BR07', a: 'SHELL', b: 'TIDE' },
    { id: 'BR01', a: 'ANCHOR', b: 'HARBOR' },
    { id: 'BR09', a: 'WAVE', b: 'SHELL' },
    { id: 'BR05', a: 'REEF', b: 'ANCHOR' },
    { id: 'BR10', a: 'TIDE', b: 'PEARL' },
    { id: 'BR03', a: 'ANCHOR', b: 'MANGO' },
    { id: 'BR06', a: 'REEF', b: 'SHELL' },
    { id: 'BR02', a: 'HARBOR', b: 'KELP' },
    { id: 'BR08', a: 'TIDE', b: 'WAVE' },
    { id: 'BR04', a: 'MANGO', b: 'REEF' },
  ],
};
