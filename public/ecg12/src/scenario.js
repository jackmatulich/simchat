import { ELECTRODES } from "./ecg-renderer.js";

export const ECG_BASELINE = {
  ecgWaveform: 9,
  hr: 78,
  respRate: 12,
  sinusArrhythmia: 1,
  artifact: 0,
  electrical: false,
  pac: 0,
  pvc: 0,
  pjc: 0,
  electrodes: Object.fromEntries(ELECTRODES.map((name) => [name, true])),
};

export function scenarioStatesFromScenario(scenario, waveforms = {}) {
  const events = Array.isArray(scenario.scenarioEvents) ? scenario.scenarioEvents : [];
  let currentState = cloneState(ECG_BASELINE);
  const rendered = [];

  events.forEach((event, index) => {
    if (!isScenarioEvent(event)) return;

    currentState = applyScenarioParameters(currentState, event.parameters || {}, waveforms);
    rendered.push({
      number: rendered.length + 1,
      sourceIndex: index + 1,
      name: event.name || `ScenarioEvent ${rendered.length + 1}`,
      jumpTime: event.jumpTime,
      changedKeys: Object.keys(event.parameters || {}).filter(isKnownEcgParameter),
      state: cloneState(currentState),
    });
  });

  return rendered;
}

export function scenarioMetaText(event) {
  const parts = [
    `Source event ${event.sourceIndex}`,
    `HR ${event.state.hr}`,
    `waveform ${event.state.ecgWaveform}`,
  ];
  if (hasValue(event.jumpTime)) parts.push(`jumpTime ${event.jumpTime}`);
  if (event.changedKeys.length) parts.push(`changed: ${event.changedKeys.join(", ")}`);
  return parts.join(" | ");
}

function isScenarioEvent(event) {
  return event && (event.type === "ScenarioEvent" || event.parameters);
}

function applyScenarioParameters(previousState, params, waveforms) {
  const nextState = cloneState(previousState);
  const waveformChanged = hasValue(params.ecgWaveform);
  const hrChanged = hasValue(params.hr);

  if (waveformChanged) nextState.ecgWaveform = Number(params.ecgWaveform);
  if (hrChanged) {
    nextState.hr = Number(params.hr);
  } else if (waveformChanged) {
    const waveformRate = waveformDefaultRate(waveforms[String(nextState.ecgWaveform)]);
    if (hasValue(waveformRate)) nextState.hr = waveformRate;
  }
  if (hasValue(params.respRate)) nextState.respRate = Number(params.respRate);
  if (hasValue(params.sinusArrhythmiaInterference)) nextState.sinusArrhythmia = Number(params.sinusArrhythmiaInterference);
  if (hasValue(params.articInterference)) nextState.artifact = Number(params.articInterference);
  if (hasValue(params.electricalInterference)) nextState.electrical = Boolean(params.electricalInterference);
  if (hasValue(params.ectopicsPac)) nextState.pac = Number(params.ectopicsPac);
  if (hasValue(params.ectopicsPvc)) nextState.pvc = Number(params.ectopicsPvc);
  if (hasValue(params.ectopicsPjc)) nextState.pjc = Number(params.ectopicsPjc);

  if (Array.isArray(params.electrodeStatus)) {
    nextState.electrodes = electrodeArrayToState(params.electrodeStatus, nextState.electrodes);
  }

  return nextState;
}

function waveformDefaultRate(waveform) {
  if (!waveform) return undefined;

  const recommendedRate = numberOrUndefined(waveform.recommendedRate);
  const minBpm = numberOrUndefined(waveform.minbpm);
  const maxBpm = numberOrUndefined(waveform.maxbpm);

  if (waveform.passiverate === false && hasValue(recommendedRate)) return recommendedRate;
  if (hasValue(minBpm) && hasValue(maxBpm) && minBpm === maxBpm) return minBpm;
  return undefined;
}

function electrodeArrayToState(electrodeStatus, previousElectrodes) {
  const nextElectrodes = { ...previousElectrodes };
  ELECTRODES.forEach((name, index) => {
    if (index < electrodeStatus.length) nextElectrodes[name] = Boolean(electrodeStatus[index]);
  });
  return nextElectrodes;
}

function cloneState(state) {
  return {
    ...state,
    electrodes: { ...state.electrodes },
  };
}

function hasValue(value) {
  return value !== undefined && value !== null;
}

function numberOrUndefined(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function isKnownEcgParameter(key) {
  return [
    "ecgWaveform",
    "hr",
    "respRate",
    "sinusArrhythmiaInterference",
    "articInterference",
    "electricalInterference",
    "ectopicsPac",
    "ectopicsPvc",
    "ectopicsPjc",
    "electrodeStatus",
  ].includes(key);
}
