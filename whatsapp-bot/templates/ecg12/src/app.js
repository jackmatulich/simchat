import { fetchJson } from "./asset-loader.js";
import { ECGRenderer, ELECTRODES } from "./ecg-renderer.js";
import { ECG_BASELINE, scenarioMetaText, scenarioStatesFromScenario } from "./scenario.js";

const canvas = document.getElementById("ecgCanvas");
const statusEl = document.getElementById("status");
const controls = document.getElementById("controls");
const waveformSelect = document.getElementById("ecgWaveform");
const electrodesEl = document.getElementById("electrodes");
const renderButton = document.getElementById("renderButton");
const downloadButton = document.getElementById("downloadButton");
const scenarioFile = document.getElementById("scenarioFile");
const scenarioOutput = document.getElementById("scenarioOutput");
const scenarioSummary = document.getElementById("scenarioSummary");
const scenarioCanvases = document.getElementById("scenarioCanvases");

let renderer;
let assets;

boot().catch((error) => {
  console.error(error);
  setStatus(error.message, true);
});

async function boot() {
  renderElectrodeControls();
  setStatus("Loading ECG metadata...");

  const [ecg12LeadData, waveforms] = await Promise.all([
    fetchJson("./assets/12LeadECG-REALITi360.json"),
    fetchJson("./assets/waveforms.json"),
  ]);

  assets = { ecg12LeadData, waveforms };
  renderer = new ECGRenderer(canvas, assets);

  populateWaveforms(waveforms, ecg12LeadData);
  bindEvents();
  await render();
}

function populateWaveforms(waveforms, ecg12LeadData) {
  const options = Object.entries(waveforms)
    .sort(([idA], [idB]) => Number(idA) - Number(idB));

  waveformSelect.innerHTML = options
    .map(([id, waveform]) => {
      const selected = id === "9" ? " selected" : "";
      const mapping = ecg12LeadData[waveform.ecg12LeadId] ? "" : " (monitor fallback)";
      return `<option value="${id}"${selected}>${id} - ${escapeHtml(waveform.name || waveform.acronym || "Unnamed")}${mapping}</option>`;
    })
    .join("");
}

function renderElectrodeControls() {
  electrodesEl.innerHTML = ELECTRODES.map(
    (name) => `
      <label title="${name}">
        <input type="checkbox" name="electrode-${name}" data-electrode="${name}" checked>
        ${name}
      </label>
    `,
  ).join("");
}

function bindEvents() {
  renderButton.addEventListener("click", () => {
    render().catch((error) => {
      console.error(error);
      setStatus(error.message, true);
    });
  });

  downloadButton.addEventListener("click", () => {
    const link = document.createElement("a");
    link.download = "realiti-monitor-inclusive-12lead.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });

  controls.addEventListener("change", () => {
    render().catch((error) => {
      console.error(error);
      setStatus(error.message, true);
    });
  });

  scenarioFile.addEventListener("change", () => {
    const [file] = scenarioFile.files;
    if (!file) return;

    loadScenarioFile(file).catch((error) => {
      console.error(error);
      setStatus(error.message, true);
    });
  });
}

async function render() {
  setStatus("Generating ECG...");
  renderButton.disabled = true;
  try {
    const state = readState();
    await renderer.render(state);
    const waveform = assets.waveforms[String(state.ecgWaveform)];
    const extras = [];
    if (state.pac) extras.push(`PAC ${state.pac}`);
    if (state.pvc) extras.push(`PVC ${state.pvc}`);
    if (state.pjc) extras.push(`PJC ${state.pjc}`);
    if (state.artifact) extras.push(`artifact ${state.artifact}`);
    if (state.electrical) extras.push("electrical interference");
    const mapping = mappingNote(state.ecgWaveform);
    setStatus(`Generated ${waveform?.name || "ECG"} at HR ${state.hr}${extras.length ? ` with ${extras.join(", ")}` : ""}${mapping ? ` (${mapping})` : ""}.`);
  } finally {
    renderButton.disabled = false;
  }
}

function readState() {
  const electrodeEntries = [...document.querySelectorAll("[data-electrode]")].map((input) => [
    input.dataset.electrode,
    input.checked,
  ]);

  return {
    ...ECG_BASELINE,
    ecgWaveform: Number(document.getElementById("ecgWaveform").value),
    hr: numberValue("hr", 78),
    respRate: numberValue("respRate", 12),
    sinusArrhythmia: numberValue("sinusArrhythmia", 1),
    artifact: numberValue("artifact", 0),
    electrical: document.getElementById("electrical").checked,
    pac: numberValue("pac", 0),
    pvc: numberValue("pvc", 0),
    pjc: numberValue("pjc", 0),
    electrodes: Object.fromEntries(electrodeEntries),
  };
}

async function loadScenarioFile(file) {
  setStatus(`Reading ${file.name}...`);
  const text = await file.text();
  const scenario = JSON.parse(text);
  const renderedEvents = scenarioStatesFromScenario(scenario, assets.waveforms);

  scenarioCanvases.innerHTML = "";
  scenarioOutput.hidden = false;
  scenarioSummary.textContent = `${scenario.scenarioName || scenario.patientInformation?.patientCondition || file.name}: ${renderedEvents.length} ScenarioEvent ECGs generated.`;

  if (!renderedEvents.length) {
    scenarioCanvases.innerHTML = `<p class="empty-state">No ScenarioEvent entries with parameters were found.</p>`;
    setStatus("Scenario loaded, but no renderable events were found.", true);
    return;
  }

  for (const event of renderedEvents) {
    const card = document.createElement("article");
    card.className = "scenario-card";

    const title = document.createElement("h3");
    title.textContent = `${event.number}. ${event.name}`;

    const meta = document.createElement("p");
    meta.className = "scenario-meta";
    meta.textContent = [scenarioMetaText(event), mappingNote(event.state.ecgWaveform)].filter(Boolean).join(" | ");

    const canvas = document.createElement("canvas");
    canvas.width = 1562;
    canvas.height = 722;

    card.append(title, meta, canvas);
    scenarioCanvases.append(card);

    const scenarioRenderer = new ECGRenderer(canvas, assets);
    await scenarioRenderer.render(event.state);
  }

  setStatus(`Generated ${renderedEvents.length} scenario 12-lead ECGs from ${file.name}.`);
}

function numberValue(id, fallback) {
  const value = Number(document.getElementById(id).value);
  return Number.isFinite(value) ? value : fallback;
}

function mappingNote(ecgWaveform) {
  const waveform = assets?.waveforms?.[String(ecgWaveform)];
  if (!waveform) return "unknown waveform, using sinus fallback";
  if (!waveform.ecg12LeadId) return "no 12-lead mapping, using monitor waveform fallback";
  if (!assets.ecg12LeadData[waveform.ecg12LeadId]) {
    return `no 12-lead group ${waveform.ecg12LeadId}, using monitor waveform fallback`;
  }
  return "";
}

function setStatus(message, error = false) {
  statusEl.textContent = message;
  statusEl.style.color = error ? "#b42318" : "";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
