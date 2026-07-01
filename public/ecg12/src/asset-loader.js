const imageCache = new Map();
const pixelCache = new Map();

function encodeAssetPath(path) {
  return path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Unable to load ${path}: ${response.status}`);
  }
  return response.json();
}

const ASSET_BASE = "/ecg12/assets";

export function waveformImagePath(name) {
  const filename = name.endsWith(".png") ? name : `${name}.png`;
  return `${ASSET_BASE}/WaveformData/${encodeAssetPath(filename)}`;
}

export function leadImagePath(group, image) {
  return `${ASSET_BASE}/12LeadData/${encodeAssetPath(group.path)}/${encodeAssetPath(image)}`;
}

export async function loadImage(path) {
  if (imageCache.has(path)) return imageCache.get(path);

  const promise = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Unable to load image ${path}`));
    image.src = path;
  });

  imageCache.set(path, promise);
  return promise;
}

export async function pixelDataForImage(path, min = 0, max = 100) {
  const key = `${path}|${min}|${max}`;
  if (pixelCache.has(key)) return pixelCache.get(key);

  const promise = loadImage(path).then((image) => imageToPixelData(image, min, max));
  pixelCache.set(key, promise);
  return promise;
}

function imageToPixelData(image, min, max) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);

  const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
  const minYArray = [];
  const maxYArray = [];
  const pixelYArray = [];
  let previousY = -1;

  for (let x = 0; x < width; x += 1) {
    let minY = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
      const offset = (y * width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const a = data[offset + 3];
      const alpha = a / 255;
      const luma = r * 0.2126 + g * 0.7152 + b * 0.0722;
      const isBlackDot = alpha > 0.3 && luma < 50;

      if (isBlackDot) {
        if (minY === -1) minY = y;
        maxY = y;
      }
    }

    if (minY === -1) {
      minY = previousY;
      maxY = minY;
    } else if (previousY === -1 && x > 0) {
      for (let i = 0; i < x; i += 1) {
        minYArray[i] = minY;
        maxYArray[i] = minY;
      }
    }

    minYArray.push(minY);
    maxYArray.push(maxY);
    previousY = minY;
  }

  const baseline = Math.round((minYArray[0] + minYArray[minYArray.length - 1]) / 2);
  previousY = -1;

  for (let i = 0; i < minYArray.length; i += 1) {
    const currentMinY = minYArray[i];
    let currentY;

    if (i === 0 || currentMinY < baseline) {
      currentY = currentMinY;
    } else {
      const previousMinY = minYArray[i - 1];
      const currentMaxY = maxYArray[i];
      if (currentMinY > previousMinY) {
        currentY = currentMaxY;
      } else if (currentMinY < previousMinY) {
        currentY = currentMinY;
      } else if (currentMaxY < maxYArray[i - 1]) {
        currentY = currentMinY;
      } else if (currentMaxY > maxYArray[i - 1]) {
        currentY = currentMaxY;
      } else {
        currentY = previousY;
      }
    }

    pixelYArray.push(currentY);
    previousY = currentY;
  }

  const range = max - min;
  return pixelYArray.map((y) => max - (y / height) * range);
}
