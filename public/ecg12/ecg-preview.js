import { ECGRenderer, ELECTRODES } from "./src/ecg-renderer.js";
import { scenarioStatesFromScenario } from "./src/scenario.js";
import { fetchJson } from "./src/asset-loader.js";

let assetsPromise = null;

export function preloadEcgAssets() {
  if (!assetsPromise) {
    assetsPromise = Promise.all([
      fetchJson("/ecg12/assets/12LeadECG-REALITi360.json"),
      fetchJson("/ecg12/assets/waveforms.json"),
    ]).then(([ecg12LeadData, waveforms]) => ({ ecg12LeadData, waveforms }));
  }
  return assetsPromise;
}

function allElectrodesConnected() {
  return Object.fromEntries(ELECTRODES.map((name) => [name, true]));
}

function ecgFingerprint(state) {
  return JSON.stringify({
    ecgWaveform: state.ecgWaveform,
    hr: state.hr,
    respRate: state.respRate,
    sinusArrhythmia: state.sinusArrhythmia,
    artifact: state.artifact,
    electrical: state.electrical,
    pac: state.pac,
    pvc: state.pvc,
    pjc: state.pjc,
  });
}

function prepareRenderState(state) {
  return {
    ...state,
    electrodes: allElectrodesConnected(),
  };
}

export function buildEcgGroups(scenario, waveforms) {
  const scenarioWithEvents = Array.isArray(scenario.scenarioEvents)
    ? scenario
    : { ...scenario, scenarioEvents: scenario.events || [] };
  const events = scenarioStatesFromScenario(scenarioWithEvents, waveforms);
  const groups = [];

  for (const event of events) {
    const fingerprint = ecgFingerprint(event.state);
    const stateIndex = event.sourceIndex;

    if (groups.length === 0 || groups[groups.length - 1].fingerprint !== fingerprint) {
      groups.push({
        fingerprint,
        stateIndices: [stateIndex],
        renderState: prepareRenderState(event.state),
      });
    } else {
      groups[groups.length - 1].stateIndices.push(stateIndex);
    }
  }

  return groups;
}

export function formatStateTitle(indices) {
  if (!indices.length) return "";
  if (indices.length === 1) return `State ${indices[0]}`;
  if (indices.length === 2) return `State ${indices[0]} & ${indices[1]}`;
  const last = indices[indices.length - 1];
  const rest = indices.slice(0, -1).join(", ");
  return `State ${rest} & ${last}`;
}

export async function renderEcgToCanvas(canvas, renderState) {
  const assets = await preloadEcgAssets();
  const renderer = new ECGRenderer(canvas, assets);
  await renderer.render(renderState);
  return canvas;
}
