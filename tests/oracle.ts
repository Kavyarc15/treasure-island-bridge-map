// Expected values for the main archipelago, typed in by hand from docs/oracle.md
// BEFORE the engine existed. Only tests import this file. The application
// (src/) must never import it; tests/engine.main.test.ts enforces that.

export const ORACLE_ADJACENCY: Record<string, Array<[string, string]>> = {
  ANCHOR: [['HARBOR', 'BR01'], ['MANGO', 'BR03'], ['REEF', 'BR05']],
  HARBOR: [['ANCHOR', 'BR01'], ['KELP', 'BR02']],
  KELP: [['HARBOR', 'BR02']],
  MANGO: [['ANCHOR', 'BR03'], ['REEF', 'BR04']],
  PEARL: [['TIDE', 'BR10']],
  REEF: [['ANCHOR', 'BR05'], ['MANGO', 'BR04'], ['SHELL', 'BR06']],
  SHELL: [['REEF', 'BR06'], ['TIDE', 'BR07'], ['WAVE', 'BR09']],
  TIDE: [['PEARL', 'BR10'], ['SHELL', 'BR07'], ['WAVE', 'BR08']],
  WAVE: [['SHELL', 'BR09'], ['TIDE', 'BR08']],
};

export const ORACLE_DISCOVERY_ORDER = [
  'ANCHOR', 'HARBOR', 'KELP', 'MANGO', 'REEF', 'SHELL', 'TIDE', 'PEARL', 'WAVE',
];

// id -> [parent, discovery, low]
export const ORACLE_TABLE: Record<string, [string | null, number, number]> = {
  ANCHOR: [null, 0, 0],
  HARBOR: ['ANCHOR', 1, 1],
  KELP: ['HARBOR', 2, 2],
  MANGO: ['ANCHOR', 3, 0],
  REEF: ['MANGO', 4, 0],
  SHELL: ['REEF', 5, 5],
  TIDE: ['SHELL', 6, 5],
  PEARL: ['TIDE', 7, 7],
  WAVE: ['TIDE', 8, 5],
};

export const ORACLE_COMPONENT_COUNT = 1;
export const ORACLE_BRIDGES = ['BR01', 'BR02', 'BR06', 'BR10'];
export const ORACLE_ARTICULATION = ['ANCHOR', 'HARBOR', 'REEF', 'SHELL', 'TIDE'];
export const ORACLE_EVENT_COUNT = 62;
