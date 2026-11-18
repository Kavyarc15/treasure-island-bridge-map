import { analyzeGraph, replayStateAt } from '../engine';
import type { Analysis, Graph, ReplayState, ValidationError } from '../engine';

/** Deep-copies and freezes so the pristine graph can never be mutated. */
function pristineCopy(graph: Graph): Graph {
  const copy: Graph = JSON.parse(JSON.stringify(graph));
  copy.nodes.forEach((n) => Object.freeze(n));
  copy.edges.forEach((e) => Object.freeze(e));
  Object.freeze(copy.nodes);
  Object.freeze(copy.edges);
  return Object.freeze(copy);
}

export interface ControllerSnapshot {
  /** the loaded (pristine) graph, or null if nothing valid is loaded */
  graph: Graph | null;
  analysis: Analysis | null;
  errors: ValidationError[];
  /** number of events applied; 0 = pre-traversal */
  index: number;
  total: number;
  view: ReplayState | null;
  atStart: boolean;
  atEnd: boolean;
}

/**
 * UI-independent application state machine: Load, Step, Run to End, Reset.
 * It owns the single event list and the single replay index; everything the
 * screen shows is derived from them.
 */
export class Controller {
  private pristine: Graph | null = null;
  private analysis: Analysis | null = null;
  private errors: ValidationError[] = [];
  private index = 0;

  /** Validates, analyses and shows the pre-traversal state. */
  load(input: unknown): ControllerSnapshot {
    const outcome = analyzeGraph(input);
    if (!outcome.ok) {
      // Invalid input: clear EVERYTHING stale, keep only the errors.
      this.pristine = null;
      this.analysis = null;
      this.index = 0;
      this.errors = outcome.errors;
      return this.snapshot();
    }
    this.pristine = pristineCopy(input as Graph);
    this.analysis = outcome.analysis;
    this.index = 0;
    this.errors = [];
    return this.snapshot();
  }

  /** Advances exactly one recorded event (no-op at the end or if nothing is loaded). */
  step(): ControllerSnapshot {
    if (this.analysis && this.index < this.analysis.events.length) this.index += 1;
    return this.snapshot();
  }

  /** Walks the SAME event list to the end; the history stays available. */
  runToEnd(): ControllerSnapshot {
    if (this.analysis) this.index = this.analysis.events.length;
    return this.snapshot();
  }

  /** Restores the originally loaded graph and the pre-traversal state exactly. */
  reset(): ControllerSnapshot {
    if (this.pristine) return this.load(this.pristine);
    this.index = 0;
    return this.snapshot();
  }

  snapshot(): ControllerSnapshot {
    const total = this.analysis ? this.analysis.events.length : 0;
    const view =
      this.pristine && this.analysis
        ? replayStateAt(this.pristine, this.analysis.events, this.index)
        : null;
    return {
      graph: this.pristine,
      analysis: this.analysis,
      errors: this.errors,
      index: this.index,
      total,
      view,
      atStart: this.index === 0,
      atEnd: this.analysis !== null && this.index === total,
    };
  }
}
