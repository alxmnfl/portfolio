// ---------- Hero portrait: fine black & white dither effect ----------
// Redraws the photo in a canvas with Floyd–Steinberg error diffusion on a few gray
// levels, sized to the screen's real pixels so the grain stays crisp and detailed.
// The photo is a transparent cut-out: transparent pixels stay page background.
const portrait = document.querySelector("img[data-dither]");

const CELL_CSS = 1.25; // dither cell size in CSS px (smaller = more detail)
const LEVELS = [0.04, 0.36, 0.66, 0.93]; // gray levels the image is reduced to
const SHARPEN = 0.7; // unsharp-mask amount, brings out hair and face detail

function render(img, canvas) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = img.parentElement.clientWidth;
  if (!cssW) return;
  const cellPx = Math.max(1, Math.round(CELL_CSS * dpr)); // device px per cell
  const w = Math.round((cssW * dpr) / cellPx);
  const h = Math.round((w * img.naturalHeight) / img.naturalWidth);

  const src = document.createElement("canvas");
  src.width = w;
  src.height = h;
  const sctx = src.getContext("2d", { willReadFrequently: true });
  sctx.imageSmoothingQuality = "high";
  sctx.drawImage(img, 0, 0, w, h);
  const px = sctx.getImageData(0, 0, w, h).data; // throws if the image is cross-origin / file://

  const n = w * h;
  const lum = new Float32Array(n);
  const bg = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    lum[i] = (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
    bg[i] = px[i * 4 + 3] < 220 ? 1 : 0; // transparent + the light fringe of the cut-out
  }

  // unsharp mask (3x3 box blur) + tone curve
  const val = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0, cnt = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          sum += lum[yy * w + xx];
          cnt++;
        }
      }
      const i = y * w + x;
      const sharp = lum[i] + SHARPEN * (lum[i] - sum / cnt);
      const lifted = Math.pow(Math.min(1, Math.max(0, sharp)), 0.8); // open up the shadows a bit
      val[i] = Math.min(1, Math.max(0, (lifted - 0.5) * 1.15 + 0.5)); // a little extra contrast
    }
  }

  // Floyd–Steinberg error diffusion onto LEVELS (skips background pixels)
  const out = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (bg[i]) continue;
      const old = val[i];
      let q = LEVELS[0];
      for (const l of LEVELS) if (Math.abs(l - old) < Math.abs(q - old)) q = l;
      out[i] = q;
      const err = old - q;
      if (x + 1 < w) val[i + 1] += (err * 7) / 16;
      if (y + 1 < h) {
        if (x > 0) val[i + w - 1] += (err * 3) / 16;
        val[i + w] += (err * 5) / 16;
        if (x + 1 < w) val[i + w + 1] += err / 16;
      }
    }
  }

  // paint: one cell = cellPx device pixels, written straight into an ImageData
  canvas.width = w * cellPx;
  canvas.height = h * cellPx;
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(canvas.width, canvas.height);
  const d = image.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (bg[i]) continue;
      const g = Math.round(out[i] * 235);
      for (let cy = 0; cy < cellPx; cy++) {
        let o = ((y * cellPx + cy) * canvas.width + x * cellPx) * 4;
        for (let cx = 0; cx < cellPx; cx++, o += 4) {
          d[o] = d[o + 1] = d[o + 2] = g;
          d[o + 3] = 255;
        }
      }
    }
  }
  ctx.putImageData(image, 0, 0);
}

if (portrait) {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", portrait.alt);

  const run = () => {
    try {
      render(portrait, canvas);
      if (!canvas.isConnected) {
        portrait.after(canvas);
        portrait.hidden = true; // kept in the DOM as the source for re-renders
      }
    } catch {
      // canvas is tainted (e.g. opened via file://): keep the grayscale <img> fallback
    }
  };

  if (portrait.complete && portrait.naturalWidth) run();
  else portrait.addEventListener("load", run, { once: true });

  let timer;
  window.addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(run, 150);
  });
}
