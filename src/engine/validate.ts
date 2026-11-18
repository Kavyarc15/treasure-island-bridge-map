import type { ValidationError, ValidationResult } from './types';

export const ID_PATTERN = /^[A-Z][A-Z0-9_-]{0,15}$/;
export const MIN_NODES = 1;
export const MAX_NODES = 12;
export const MIN_EDGES = 0;
export const MAX_EDGES = 20;
export const COORD_MIN = 0;
export const COORD_MAX = 100;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Validates the COMPLETE graph before any traversal. Returns every problem
 * found (nodes first, then edges, each in source order) so the message can name
 * the relevant node, edge or endpoint. Never throws on malformed input.
 */
export function validateGraph(input: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!isRecord(input) || !Array.isArray(input.nodes) || !Array.isArray(input.edges)) {
    return {
      ok: false,
      errors: [
        {
          code: 'INVALID_STRUCTURE',
          message: 'Graph must be an object with a "nodes" array and an "edges" array.',
        },
      ],
    };
  }

  const nodes: unknown[] = input.nodes;
  const edges: unknown[] = input.edges;

  if (nodes.length < MIN_NODES || nodes.length > MAX_NODES) {
    errors.push({
      code: 'NODE_COUNT_OUT_OF_RANGE',
      message: `Graph has ${nodes.length} nodes; the engine supports ${MIN_NODES} to ${MAX_NODES}.`,
    });
  }
  if (edges.length < MIN_EDGES || edges.length > MAX_EDGES) {
    errors.push({
      code: 'EDGE_COUNT_OUT_OF_RANGE',
      message: `Graph has ${edges.length} edges; the engine supports ${MIN_EDGES} to ${MAX_EDGES}.`,
    });
  }

  // ---- nodes
  const nodeIds = new Set<string>();
  nodes.forEach((raw, i) => {
    if (!isRecord(raw)) {
      errors.push({ code: 'INVALID_STRUCTURE', message: `Node #${i + 1} is not an object.` });
      return;
    }
    const id = raw.id;
    const label = typeof id === 'string' && id !== '' ? `Node "${id}"` : `Node #${i + 1}`;
    const nodeId = typeof id === 'string' ? id : undefined;

    if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
      errors.push({
        code: 'BAD_NODE_ID',
        message: `${label}: ID must match [A-Z][A-Z0-9_-]{0,15}.`,
        nodeId,
      });
    } else if (nodeIds.has(id)) {
      errors.push({ code: 'DUPLICATE_NODE_ID', message: `${label}: duplicate node ID.`, nodeId: id });
    } else {
      nodeIds.add(id);
    }

    if (typeof raw.name !== 'string' || raw.name.trim() === '') {
      errors.push({
        code: 'EMPTY_NODE_NAME',
        message: `${label}: display name must be a non-empty string.`,
        nodeId,
      });
    }

    for (const axis of ['x', 'y'] as const) {
      const value = raw[axis];
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        errors.push({
          code: 'NON_FINITE_COORDINATE',
          message: `${label}: coordinate ${axis} must be a finite number (got ${String(value)}).`,
          nodeId,
        });
      } else if (value < COORD_MIN || value > COORD_MAX) {
        errors.push({
          code: 'COORDINATE_OUT_OF_RANGE',
          message: `${label}: coordinate ${axis}=${value} is outside ${COORD_MIN}..${COORD_MAX}.`,
          nodeId,
        });
      }
    }
  });

  // ---- edges
  const edgeIds = new Set<string>();
  const pairOwner = new Map<string, string>();
  edges.forEach((raw, i) => {
    if (!isRecord(raw)) {
      errors.push({ code: 'INVALID_STRUCTURE', message: `Edge #${i + 1} is not an object.` });
      return;
    }
    const id = raw.id;
    const label = typeof id === 'string' && id !== '' ? `Edge "${id}"` : `Edge #${i + 1}`;
    const edgeId = typeof id === 'string' ? id : undefined;

    if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
      errors.push({
        code: 'BAD_EDGE_ID',
        message: `${label}: ID must match [A-Z][A-Z0-9_-]{0,15}.`,
        edgeId,
      });
    } else if (edgeIds.has(id)) {
      errors.push({ code: 'DUPLICATE_EDGE_ID', message: `${label}: duplicate edge ID.`, edgeId: id });
    } else {
      edgeIds.add(id);
    }

    const a = raw.a;
    const b = raw.b;
    let endpointsKnown = true;
    for (const [side, endpoint] of [['a', a], ['b', b]] as const) {
      if (typeof endpoint !== 'string' || !nodeIds.has(endpoint)) {
        endpointsKnown = false;
        errors.push({
          code: 'UNKNOWN_ENDPOINT',
          message: `${label}: endpoint ${side} "${String(endpoint)}" is not an existing node.`,
          edgeId,
          endpointId: typeof endpoint === 'string' ? endpoint : undefined,
        });
      }
    }

    if (typeof a === 'string' && a === b) {
      errors.push({
        code: 'SELF_LOOP',
        message: `${label}: connects "${a}" to itself (self-loops are not allowed).`,
        edgeId,
        endpointId: a,
      });
      return;
    }

    if (endpointsKnown && typeof a === 'string' && typeof b === 'string') {
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      const owner = pairOwner.get(key);
      if (owner !== undefined) {
        errors.push({
          code: 'DUPLICATE_CONNECTION',
          message: `${label}: duplicates edge "${owner}" between "${a}" and "${b}".`,
          edgeId,
        });
      } else if (edgeId !== undefined) {
        pairOwner.set(key, edgeId);
      }
    }
  });

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
