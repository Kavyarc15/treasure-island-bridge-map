import { Controller } from '../app/controller';
import type { ControllerSnapshot } from '../app/controller';
import { SAMPLE_OPTIONS } from '../data/samples';
import { renderLegend, renderMap } from './mapView';
import { renderErrors, renderEventCard, renderHistory, renderSummary, renderTable } from './panels';

const SHELL = `
<header class="top">
  <div class="brand">
    <h1>Treasure-Island Bridge Safety Map</h1>
    <p>Which single bridge or island could split the festival if it closed? Press <b>Step</b> and watch the proof, one move at a time.</p>
  </div>
  <div class="toolbar" role="group" aria-label="Replay controls">
    <label class="pick">Island plan
      <select id="sample"></select>
    </label>
    <button id="btn-load" class="primary" type="button">Load My Archipelago</button>
    <button id="btn-step" type="button">Step</button>
    <button id="btn-run" type="button">Run to End</button>
    <button id="btn-reset" type="button">Reset</button>
    <div class="progress" aria-live="off">
      <span id="progress-text">No archipelago loaded</span>
      <div class="bar"><div id="progress-fill"></div></div>
    </div>
  </div>
</header>
<main id="stage"></main>
`;

export function mountApp(root: HTMLElement): { controller: Controller } {
  const controller = new Controller();
  root.innerHTML = SHELL;

  const $ = <T extends HTMLElement>(id: string): T => root.querySelector<T>('#' + id)!;
  const select = $<HTMLSelectElement>('sample');
  const stage = $<HTMLElement>('stage');
  const bLoad = $<HTMLButtonElement>('btn-load');
  const bStep = $<HTMLButtonElement>('btn-step');
  const bRun = $<HTMLButtonElement>('btn-run');
  const bReset = $<HTMLButtonElement>('btn-reset');
  const progressText = $<HTMLElement>('progress-text');
  const progressFill = $<HTMLElement>('progress-fill');

  select.innerHTML = SAMPLE_OPTIONS.map((o) => `<option value="${o.key}">${o.label}</option>`).join('');

  function render(snap: ControllerSnapshot): void {
    const loaded = snap.graph !== null && snap.analysis !== null && snap.view !== null;
    bStep.disabled = !loaded || snap.atEnd;
    bRun.disabled = !loaded || snap.atEnd;
    bReset.disabled = !loaded;

    if (snap.errors.length > 0) {
      progressText.textContent = 'Invalid archipelago: nothing analysed';
      progressFill.style.width = '0%';
      stage.innerHTML = `<div class="single">${renderErrors(snap.errors)}</div>`;
      return;
    }
    if (!loaded) {
      progressText.textContent = 'No archipelago loaded';
      progressFill.style.width = '0%';
      stage.innerHTML = `
        <div class="single"><section class="card empty">
          <h2>Welcome, safety volunteer</h2>
          <p>Press <b>Load My Archipelago</b> to draw the festival islands and footbridges.
          Then use <b>Step</b> to follow the inspection, or <b>Run to End</b> for the finished safety map.</p>
        </section></div>`;
      return;
    }

    const graph = snap.graph!;
    const view = snap.view!;
    const events = snap.analysis!.events;
    progressText.textContent = `Event ${snap.index} of ${snap.total}${snap.atEnd ? ' · complete' : ''}`;
    progressFill.style.width = `${snap.total === 0 ? 0 : (snap.index / snap.total) * 100}%`;

    stage.innerHTML = `
      <div class="layout">
        <section class="card mapcard" aria-labelledby="map-h">
          <h2 id="map-h">Island map</h2>
          <div class="mapwrap">${renderMap(graph, view)}</div>
          ${renderLegend()}
        </section>
        <div class="side">
          ${renderEventCard(graph, view)}
          ${renderSummary(graph, view)}
        </div>
        <div class="lower">
          ${renderTable(view)}
          ${renderHistory(graph, view, events)}
        </div>
      </div>`;

    const list = stage.querySelector<HTMLElement>('#history-list');
    if (list) list.scrollTop = list.scrollHeight;
  }

  bLoad.addEventListener('click', () => {
    const chosen = SAMPLE_OPTIONS.find((o) => o.key === select.value) ?? SAMPLE_OPTIONS[0];
    render(controller.load(chosen.graph));
  });
  bStep.addEventListener('click', () => render(controller.step()));
  bRun.addEventListener('click', () => render(controller.runToEnd()));
  bReset.addEventListener('click', () => render(controller.reset()));

  render(controller.snapshot());
  return { controller };
}
