import { leadImagePath, pixelDataForImage, waveformImagePath } from "./asset-loader.js";

export const LEADS = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];
export const ELECTRODES = ["RA", "LA", "RL", "LL", "V1", "V2", "V3", "V4", "V5", "V6"];

const DEFAULT_BUFFER_Y = 50;
const SQUARE_NUM_X = 260;
const SQUARE_NUM_Y = 120;
const SQUARE_SIZE = 6;
const THICK_LINE_WIDTH = 1.5;
const THIN_LINE_WIDTH = 0.5;
const LEAD_WIDTH = 62.5 * SQUARE_SIZE;
const LEAD_HEIGHT = 30 * SQUARE_SIZE;
const LEFT_PADDING = 5 * SQUARE_SIZE;
const PIXEL_RATE = (SQUARE_SIZE / 0.04) * 60;

const ECTOPIC_TIER_AMOUNTS = [0, 10, 15, 20, 20, 20];
const ECTOPIC_TEMPLATES = {
  pac: ["w_ecg_pac_1.png", "w_ecg_pac_2.png", "w_ecg_pac_3.png"],
  pvc: ["w_ecg_pvc1.png", "w_ecg_pvc2.png", "w_ecg_pvc_3.png"],
  pjc: ["w_ecg_pjc_1.png", "w_ecg_pjc_2.png"],
};

export class ECGRenderer {
  constructor(canvas, assets) {
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.assets = assets;
    this.canvas.width = Math.round(SQUARE_NUM_X * SQUARE_SIZE + THICK_LINE_WIDTH);
    this.canvas.height = Math.round(SQUARE_NUM_Y * SQUARE_SIZE + THICK_LINE_WIDTH);
  }

  async render(state) {
    const waveform = this.assets.waveforms[String(state.ecgWaveform)] || this.assets.waveforms["9"];
    const group = this.assets.ecg12LeadData[waveform.ecg12LeadId] || null;
    const ctx = this.context;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawGrid(ctx);

    ctx.strokeStyle = "#000000";
    ctx.fillStyle = "#000000";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.font = "20px Courier New, monospace";

    const fullWidth = Math.ceil(LEAD_WIDTH * 4);
    const ectopicSource = await this.buildEctopicSource(state);
    const ectopicSchedule = buildEctopicSchedule(state, waveform, group, fullWidth);
    const interference = await this.buildInterferenceSource(state);
    const monitorFallbackBase = group ? null : await this.buildMonitorFallbackBase(waveform, state, fullWidth);

    const longLead = await this.buildTrace(group, waveform, state, 1, LEAD_WIDTH * 4, true, 0, {
      ectopicSource,
      ectopicSchedule,
      interference,
      monitorFallbackBase,
    });
    this.drawLeadLabel("II", { x: LEFT_PADDING, y: LEAD_HEIGHT * 3, width: LEAD_WIDTH * 4, height: LEAD_HEIGHT });
    this.drawTrace(longLead, { x: LEFT_PADDING, y: LEAD_HEIGHT * 3, width: LEAD_WIDTH * 4, height: LEAD_HEIGHT }, state.electrodes);

    for (let i = 0; i < LEADS.length; i += 1) {
      const rect = {
        x: LEFT_PADDING + Math.floor(i / 3) * LEAD_WIDTH,
        y: (i % 3) * LEAD_HEIGHT,
        width: LEAD_WIDTH,
        height: LEAD_HEIGHT,
      };
      const trace = await this.buildTrace(group, waveform, state, i, LEAD_WIDTH, false, Math.floor(i / 3) * LEAD_WIDTH, {
        ectopicSource,
        ectopicSchedule,
        interference,
        monitorFallbackBase,
      });
      this.drawLeadLabel(LEADS[i], rect);
      this.drawTrace(trace, rect, state.electrodes);
      this.drawSeparator(rect);
    }
  }

  drawGrid(ctx) {
    const gridsWidth = SQUARE_NUM_X * SQUARE_SIZE + THICK_LINE_WIDTH;
    const gridsHeight = SQUARE_NUM_Y * SQUARE_SIZE + THICK_LINE_WIDTH;
    ctx.strokeStyle = "#F5C4CE";

    for (let x = 0; x <= SQUARE_NUM_X; x += 1) {
      ctx.lineWidth = x % 5 === 0 ? THICK_LINE_WIDTH : THIN_LINE_WIDTH;
      ctx.beginPath();
      ctx.moveTo(x * SQUARE_SIZE + THICK_LINE_WIDTH / 2, 0);
      ctx.lineTo(x * SQUARE_SIZE + THICK_LINE_WIDTH / 2, gridsHeight);
      ctx.stroke();
    }

    for (let y = 0; y <= SQUARE_NUM_Y; y += 1) {
      ctx.lineWidth = y % 5 === 0 ? THICK_LINE_WIDTH : THIN_LINE_WIDTH;
      ctx.beginPath();
      ctx.moveTo(0, y * SQUARE_SIZE + THICK_LINE_WIDTH / 2);
      ctx.lineTo(gridsWidth, y * SQUARE_SIZE + THICK_LINE_WIDTH / 2);
      ctx.stroke();
    }
  }

  drawLeadLabel(label, rect) {
    this.context.fillText(label, rect.x + 4, rect.y + 25);
  }

  drawSeparator(rect) {
    const ctx = this.context;
    ctx.save();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rect.x + rect.width, rect.y + rect.height / 2 - 20);
    ctx.lineTo(rect.x + rect.width, rect.y + rect.height / 2 - 2);
    ctx.moveTo(rect.x + rect.width, rect.y + rect.height / 2 + 2);
    ctx.lineTo(rect.x + rect.width, rect.y + rect.height / 2 + 20);
    ctx.stroke();
    ctx.restore();
  }

  drawTrace(trace, rect) {
    const ctx = this.context;
    const baseLevel = rect.height / 2;

    ctx.save();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.beginPath();

    if (trace.dashed) {
      ctx.setLineDash([6, 6]);
      ctx.moveTo(rect.x, rect.y + baseLevel);
      ctx.lineTo(rect.x + rect.width, rect.y + baseLevel);
      ctx.stroke();
      ctx.restore();
      return;
    }

    trace.values.forEach((value, x) => {
      const pixelValue = (1 - value / 100) * rect.height;
      const y = rect.y + baseLevel + (pixelValue - baseLevel);
      if (x === 0) {
        ctx.moveTo(rect.x, y);
      } else {
        ctx.lineTo(rect.x + x, y);
      }
    });

    ctx.stroke();
    ctx.restore();
  }

  async buildTrace(group, waveform, state, leadIndex, width, longLead, globalStartX, monitorLayers) {
    const useMonitorFallback = !group;
    if (useMonitorFallback) {
      return this.buildMonitorFallbackTrace(state, leadIndex, width, globalStartX, monitorLayers);
    }

    const lead = useMonitorFallback ? monitorFallbackLead(waveform) : group.leads[leadIndex];
    const connected = isLeadConnected(leadIndex, state.electrodes);
    const imageExists = lead && lead.image !== null && lead.image !== undefined;
    if (!connected || !imageExists) {
      return { dashed: true, values: [] };
    }

    const leadData = lead.image && group
      ? await pixelDataForImage(leadImagePath(group, lead.image), 0, 100)
      : await this.monitorLeadIIData(waveform);
    const baselineData = lead.baseline
      ? await pixelDataForImage(leadImagePath(group, lead.baseline), 0, 100)
      : null;
    const leadII = group?.leads?.[1] || lead;
    const values = [];

    let x = 0;
    let cycleIndex = 0;

    while (x < width) {
      const hr = effectiveHrForCycle(state, waveform, cycleIndex, longLead);
      const beatRatio = (group?.beatRatio || 1) * (waveform.beatRatio || 1);
      const totalWaveSize = Math.max(1, Math.floor(PIXEL_RATE / Math.max(1, hr * beatRatio)));
      const waveDataLength = Math.min(totalWaveSize, 100);
      const heartbeatOffset = longLead ? 0 : heartbeatPixelOffset(lead, leadII, leadData, waveDataLength);

      for (let point = 0; point < totalWaveSize && x < width; point += 1, x += 1) {
        const shiftedPoint = positiveModulo(point + heartbeatOffset, totalWaveSize);
        const scheduleEntry = monitorLayers.ectopicSchedule[Math.floor(globalStartX + x)];
        const baselineOffset = baselineData
          ? (sampleCircular(baselineData, x) - baselineData[0]) * (group.baselineScale || 1)
          : 0;

        let y;
        if (scheduleEntry) {
          const template = monitorLayers.ectopicSource[scheduleEntry.event];
          y = replacementEctopicValue(template, scheduleEntry.point, scheduleEntry.waveDataLength, leadIndex);
        } else {
          y = sampleData(leadData, shiftedPoint, waveDataLength);
        }

        y += baselineOffset;
        y += interferenceAt(monitorLayers.interference, state, Math.floor(globalStartX + x));
        values.push(clamp(y, -30, 130));
      }

      cycleIndex += 1;
    }

    return { dashed: false, values };
  }

  async monitorLeadIIData(waveform) {
    const source = waveform.datasource?.[0] || waveform.dataSources?.[0];
    if (!source?.datafilename) return [DEFAULT_BUFFER_Y];
    return pixelDataForImage(waveformImagePath(source.datafilename), 0, 100);
  }

  buildMonitorFallbackTrace(state, leadIndex, width, globalStartX, monitorLayers) {
    const connected = isLeadConnected(leadIndex, state.electrodes);
    if (!connected) return { dashed: true, values: [] };

    const values = [];
    for (let x = 0; x < width; x += 1) {
      const globalX = Math.floor(globalStartX + x);
      const scheduleEntry = monitorLayers.ectopicSchedule[globalX];
      let y;
      if (scheduleEntry) {
        const template = monitorLayers.ectopicSource[scheduleEntry.event];
        y = replacementEctopicValue(template, scheduleEntry.point, scheduleEntry.waveDataLength, leadIndex);
      } else {
        y = monitorLayers.monitorFallbackBase[globalX] ?? DEFAULT_BUFFER_Y;
      }
      y += interferenceAt(monitorLayers.interference, state, globalX);
      values.push(clamp(y, -30, 130));
    }

    return { dashed: false, values };
  }

  async buildMonitorFallbackBase(waveform, state, width) {
    const sources = waveform.datasource || [];
    if (!sources.length) return new Array(width).fill(DEFAULT_BUFFER_Y);

    const pixelSources = await Promise.all(
      sources.map((source) => pixelDataForImage(waveformImagePath(source.datafilename), 0, 100)),
    );

    if (waveform.type === "fixed" || waveform.type === "fixed-random") {
      return fixedMonitorFallbackValues(waveform, pixelSources, width);
    }

    if (waveform.type === "random") {
      return randomMonitorFallbackValues(waveform, sources, pixelSources, state, width);
    }

    if (waveform.type === "control-random") {
      return controlRandomMonitorFallbackValues(waveform, sources, pixelSources, state, width);
    }

    return normalMonitorFallbackValues(waveform, sources[0], pixelSources[0], state, width);
  }

  async buildEctopicSource(state) {
    if (!state.pac && !state.pvc && !state.pjc) return {};

    const loadFirst = async (type) => {
      const files = ECTOPIC_TEMPLATES[type];
      const index = Math.max(0, Math.min(files.length - 1, Math.ceil((state[type] || 1) / 2) - 1));
      return pixelDataForImage(waveformImagePath(files[index]), 0, 100);
    };

    return {
      pac: state.pac ? await loadFirst("pac") : null,
      pvc: state.pvc ? await loadFirst("pvc") : null,
      pjc: state.pjc ? await loadFirst("pjc") : null,
    };
  }

  async buildInterferenceSource(state) {
    const result = { random: null, multiplier: null };
    if (state.artifact > 0) {
      const [vf1, vf2, vf3, multiplier] = await Promise.all([
        pixelDataForImage(waveformImagePath("w_ecg_vf_med1.png"), -1, 1),
        pixelDataForImage(waveformImagePath("w_ecg_vf_med2.png"), -1, 1),
        pixelDataForImage(waveformImagePath("w_ecg_vf_med3.png"), -1, 1),
        pixelDataForImage(waveformImagePath("w_ecg_infmi.png"), -1, 1),
      ]);
      result.random = vf1.map((value, index) => value + vf2[index % vf2.length] + vf3[index % vf3.length]);
      result.multiplier = multiplier;
    }
    return result;
  }
}

function sampleData(data, point, waveDataLength) {
  if (!data?.length) return DEFAULT_BUFFER_Y;
  if (point <= waveDataLength && waveDataLength > 0) {
    const dataPixel = Math.floor((point / waveDataLength) * (data.length - 1));
    return data[dataPixel] ?? DEFAULT_BUFFER_Y;
  }
  return (data[0] + data[data.length - 1]) / 2;
}

function sampleCircular(data, index) {
  if (!data?.length) return DEFAULT_BUFFER_Y;
  return data[index % data.length];
}

function heartbeatPixelOffset(lead, leadII, leadData, waveDataLength) {
  if (!lead || !leadII || !leadData?.length) return 0;
  if (lead.heartbeat < 0 || leadII.heartbeat < 0) return 0;
  return ((lead.heartbeat - leadII.heartbeat) / leadData.length) * waveDataLength;
}

function chooseEctopicEvent(state, cycleIndex, random) {
  if (!state.pac && !state.pvc && !state.pjc) return null;
  if (cycleIndex === 0) return null;

  const totals = solveEctopicTiers(state);
  if (chance(totals.pac, random)) return "pac";
  if (chance(totals.pvc, random)) return "pvc";
  if (chance(totals.pjc, random)) return "pjc";
  return null;
}

function solveEctopicTiers(state) {
  const totals = { pac: 0, pvc: 0, pjc: 0 };
  for (let tier = 1; tier <= 5; tier += 1) {
    const active = ["pac", "pvc", "pjc"].filter((key) => state[key] >= tier);
    if (!active.length) continue;
    const amount = ECTOPIC_TIER_AMOUNTS[tier] / active.length;
    active.forEach((key) => {
      totals[key] += amount;
    });
  }
  return totals;
}

function buildEctopicSchedule(state, waveform, group, width) {
  const schedule = new Array(width).fill(null);
  if (!state.pac && !state.pvc && !state.pjc) return schedule;

  const random = makeRandom(1337 + Number(state.ecgWaveform));
  let x = 0;
  let cycleIndex = 0;

  while (x < width) {
    const hr = effectiveHrForCycle(state, waveform, cycleIndex, true);
    const beatRatio = (group?.beatRatio || 1) * (waveform.beatRatio || 1);
    const totalWaveSize = Math.max(1, Math.floor(PIXEL_RATE / Math.max(1, hr * beatRatio)));
    const waveDataLength = Math.min(totalWaveSize, 100);
    const event = chooseEctopicEvent(state, cycleIndex, random);

    if (event) {
      for (let point = 0; point <= waveDataLength && x + point < width; point += 1) {
        schedule[x + point] = { event, point, waveDataLength };
      }
    }

    x += totalWaveSize;
    cycleIndex += 1;
  }

  return schedule;
}

function replacementEctopicValue(template, point, waveDataLength, leadIndex) {
  const source = sampleData(template, point, waveDataLength);
  const delta = source - DEFAULT_BUFFER_Y;
  const scale = leadIndex === 1 ? 1 : 0.72;
  return DEFAULT_BUFFER_Y + delta * scale;
}

function interferenceAt(source, state, x) {
  let interference = 0;

  if (state.electrical) {
    interference += Math.sin(50 * ((x % 101) * 0.15)) * 10;
  }

  if (state.artifact > 0 && source.random?.length) {
    const randomValue = source.random[x % source.random.length];
    const multiplier = source.multiplier?.[Math.floor((x * 0.2) % source.multiplier.length)] || 0;
    if (state.artifact === 1) interference += randomValue * 10 + (x % 5);
    if (state.artifact === 2) interference += randomValue * 10 + (x % 5) + multiplier * 10;
    if (state.artifact === 3) interference += randomValue * 20 + (x % 10) + multiplier * 20;
    if (state.artifact === 4) interference += randomValue * 20 + (x % 10) + multiplier * 30;
    if (state.artifact === 5) interference += randomValue * 10 + (x % 5) + Math.sin(x / 45) * 50;
  }

  return interference;
}

function normalMonitorFallbackValues(waveform, source, pixelData, state, width) {
  const values = [];
  let x = 0;
  let cycleIndex = 0;

  while (x < width) {
    const hr = effectiveHrForCycle(state, waveform, cycleIndex, true);
    const beatRatio = (source?.beatratio || 1) * (waveform.beatratio || waveform.beatRatio || 1);
    const totalWaveSize = Math.max(1, Math.floor(PIXEL_RATE / Math.max(1, hr * beatRatio)));
    const waveDataLength = Math.min(totalWaveSize, source?.maxrange || pixelData.length || 100);

    for (let point = 0; point < totalWaveSize && x < width; point += 1, x += 1) {
      values.push(sampleData(pixelData, point, waveDataLength));
    }

    cycleIndex += 1;
  }

  return values;
}

function fixedMonitorFallbackValues(waveform, pixelSources, width) {
  const values = [];
  const random = makeRandom(2027 + Number(waveform.ID || 0));
  let sourceIndex = 0;
  let order = pixelSources.map((_, index) => index);
  if (waveform.type === "fixed-random") order = shuffledOrder(order, random);
  let orderIndex = 0;
  let previousIndex = order[0] ?? 0;

  while (values.length < width) {
    sourceIndex = waveform.type === "fixed-random" ? order[orderIndex] : sourceIndex;
    const data = pixelSources[sourceIndex] || [DEFAULT_BUFFER_Y];
    for (let i = 0; i < data.length && values.length < width; i += 1) {
      values.push(data[i]);
    }

    if (waveform.type === "fixed-random") {
      orderIndex += 1;
      if (orderIndex >= order.length) {
        previousIndex = order[order.length - 1];
        order = shuffledOrder(order, random);
        if (order.length > 1 && order[0] === previousIndex) {
          const swapIndex = 1 + Math.floor(random() * (order.length - 1));
          [order[0], order[swapIndex]] = [order[swapIndex], order[0]];
        }
        orderIndex = 0;
      }
    } else {
      sourceIndex = (sourceIndex + 1) % pixelSources.length;
    }
  }

  return values;
}

function randomMonitorFallbackValues(waveform, sources, pixelSources, state, width) {
  const values = [];
  const random = makeRandom(4049 + Number(waveform.ID || 0));
  let previousSourceIndex = -1;
  let cycleIndex = 0;

  while (values.length < width) {
    let sourceIndex = Math.floor(random() * pixelSources.length);
    if (pixelSources.length > 1) {
      while (sourceIndex === previousSourceIndex) {
        sourceIndex = Math.floor(random() * pixelSources.length);
      }
    }
    previousSourceIndex = sourceIndex;

    const source = sources[sourceIndex];
    const pixelData = pixelSources[sourceIndex];
    const hr = effectiveHrForCycle(state, waveform, cycleIndex, true);
    const totalWaveSize = Math.max(1, Math.floor((PIXEL_RATE / Math.max(1, hr)) * (waveform.beatratio || waveform.beatRatio || 1) - 1));
    const waveDataLength = Math.min(totalWaveSize, source?.maxrange || pixelData.length || 100);

    for (let point = 0; point < totalWaveSize && values.length < width; point += 1) {
      values.push(sampleData(pixelData, point, waveDataLength));
    }

    cycleIndex += 1;
  }

  return values;
}

function controlRandomMonitorFallbackValues(waveform, sources, pixelSources, state, width) {
  const values = [];
  const random = makeRandom(6067 + Number(waveform.ID || 0));
  let currentSourceIndex = 0;
  let timesRepeated = 0;
  let forcedBuffer = 0;
  let changeNextLoop = false;
  let isPremature = false;
  let cycleIndex = 0;

  const measure = () => {
    timesRepeated += 1;
    const source = sources[currentSourceIndex] || {};
    const minPlays = source.minplays ?? source.minPlays ?? 1;
    const maxPlays = source.maxplays ?? source.maxPlays ?? 1;
    const failChance = source.failchance ?? source.failChance ?? 0;

    changeNextLoop = false;
    if (timesRepeated >= maxPlays) {
      changeNextLoop = true;
    } else if (timesRepeated >= minPlays && random() * 100 < failChance) {
      changeNextLoop = true;
    }

    const nextSource = sources[currentSourceIndex + 1];
    isPremature = Boolean(changeNextLoop && nextSource?.premature);
  };

  const advanceSource = () => {
    const source = sources[currentSourceIndex] || {};
    const weighting = source.weighting || 1;
    if (weighting !== 1) {
      const hr = effectiveHrForCycle(state, waveform, cycleIndex, true);
      const beatRatio = waveform.beatratio || waveform.beatRatio || 1;
      forcedBuffer += Math.max(0, Math.floor(((PIXEL_RATE / Math.max(1, hr)) * beatRatio - 1) * (1 - weighting)));
    }

    currentSourceIndex = (currentSourceIndex + 1) % pixelSources.length;
    timesRepeated = 0;
    measure();
  };

  measure();

  while (values.length < width) {
    while (forcedBuffer > 0 && values.length < width) {
      values.push(DEFAULT_BUFFER_Y);
      forcedBuffer -= 1;
    }
    if (values.length >= width) break;

    const source = sources[currentSourceIndex] || {};
    const pixelData = pixelSources[currentSourceIndex] || [DEFAULT_BUFFER_Y];
    const hr = effectiveHrForCycle(state, waveform, cycleIndex, true);
    const beatRatio = waveform.beatratio || waveform.beatRatio || 1;
    const weighting = source.weighting || 1;
    const totalWaveSize = Math.max(1, Math.floor((PIXEL_RATE / Math.max(1, hr)) * beatRatio * weighting - 1));
    const waveDataLength = Math.min(totalWaveSize, source.maxrange || pixelData.length || 100);

    for (let point = 0; point <= waveDataLength && values.length < width; point += 1) {
      values.push(sampleData(pixelData, point, waveDataLength));
    }

    if (isPremature) {
      advanceSource();
      cycleIndex += 1;
      continue;
    }

    for (let point = waveDataLength + 1; point < totalWaveSize && values.length < width; point += 1) {
      values.push(DEFAULT_BUFFER_Y);
    }

    if (changeNextLoop) {
      advanceSource();
    } else {
      measure();
    }
    cycleIndex += 1;
  }

  return values;
}

function shuffledOrder(order, random) {
  const result = [...order];
  for (let i = 0; i < result.length; i += 1) {
    const n = i + Math.floor(random() * (result.length - i));
    [result[i], result[n]] = [result[n], result[i]];
  }
  return result;
}

function effectiveHrForCycle(state, waveform, cycleIndex, longLead) {
  let value = Number(state.hr) || waveform.recommendedRate || 78;
  if (state.sinusArrhythmia > 1 && state.respRate > 0) {
    const phase = (cycleIndex / Math.max(1, Math.round(value / state.respRate))) * Math.PI * 2;
    const positiveRespPhase = (Math.sin(phase) + 1) / 2;
    value += value * (state.sinusArrhythmia - 1) * positiveRespPhase;
  }
  if (waveform.hrVariation > 0) {
    const jitter = Math.sin((cycleIndex + (longLead ? 0 : 7)) * 12.9898) * 43758.5453;
    const unit = jitter - Math.floor(jitter);
    const variation = (unit * 2 - 1) * (waveform.hrVariation / 100);
    value += value * variation;
  }
  return Math.max(1, value);
}

function isLeadConnected(leadIndex, electrodes) {
  if (!electrodes.RA || !electrodes.LA || !electrodes.LL) return false;
  if (leadIndex >= 6) return Boolean(electrodes[LEADS[leadIndex]]);
  return true;
}

function chance(percent, random) {
  return percent > 0 && random() * 100 <= percent;
}

function makeRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function positiveModulo(value, size) {
  return ((value % size) + size) % size;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
