// ---------- Lanyard: woven band simulation + click to flip ----------
// Change this to your real Facebook profile link.
const FACEBOOK_URL = "https://www.facebook.com/alexander.monfiel.7/";

const strapSvg = document.getElementById("strapSvg");
const badge = document.getElementById("badge");
const card = document.getElementById("card");
const link = document.getElementById("link");
const hanger = document.getElementById("hanger");
const cardPivot = document.getElementById("cardPivot");
const cardInner = document.getElementById("cardInner");
// hook parts redrawn from the card's turn angle (see drawHook)
const hookLegs = ["hookA", "hookB"].map((id) => {
  const el = document.getElementById(id);
  return {
    el,
    cast: el.querySelector(".hk-cast"),
    castTight: el.querySelector(".hk-cast-tight"),
    body: el.querySelectorAll(".hk-body"),
    spec: el.querySelector(".hk-spec"),
  };
});
const steelH = document.getElementById("ln-steelH");
const sv = (id) => document.getElementById(id);
const ribbonEl = sv("ribbon"),
  ribbonClipEl = sv("ribbonClip"),
  centerEl = sv("centerPath"),
  shadeLEl = sv("shadeL"),
  shadeREl = sv("shadeR"),
  hiliteEl = sv("hilite"),
  sheenEl = sv("sheenPath"),
  stitchLEl = sv("stitchL"),
  stitchREl = sv("stitchR"),
  threadEl = sv("redThread"),
  creasesEl = sv("creases"),
  gatherEl = sv("gather"),
  endShadeEl = sv("endShade"),
  textPathEl = sv("strapTextPath"),
  weaveEl = sv("ln-weave"),
  sheenGrad = sv("ln-sheen"),
  fiberEl = sv("fiberRect"),
  hkSlotO = sv("hkSlotO"),
  hkSlot = sv("hkSlot"),
  hkSlotFar = sv("hkSlotFar"),
  hkContact = sv("hkContact"),
  hkGateO = sv("hkGateO"),
  hkGate = sv("hkGate"),
  ringPatch = sv("ringPatch"),
  eyePatch = sv("eyePatch"),
  textFade = sv("ln-textFade"),
  textFadeStops = textFade.querySelectorAll("stop");
const CRIMP_HALF = 10.2; // the band is gathered to the crimp's width where it enters it

// QR code on the back of the card
(function buildQR() {
  const box = document.getElementById("qr");
  const urlText = document.getElementById("fbUrlText");
  urlText.textContent = FACEBOOK_URL.replace(/^https?:\/\/(www\.)?/, "");
  if (typeof QRCode === "undefined") {
    box.innerHTML = `<a href="${FACEBOOK_URL}" target="_blank" rel="noopener" style="color:#0b1022;font-size:.7rem">${FACEBOOK_URL}</a>`;
    return;
  }
  new QRCode(box, {
    text: FACEBOOK_URL,
    width: 150,
    height: 150,
    colorDark: "#0b1022",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M,
  });
})();

// --- rope simulation (verlet chain, anchor pinned at the top, card hanging on the end) ---
const N = 18; // rope points
const STRAP_W = 40; // band width (px)
const GRAVITY = 0.5; // px / frame^2 at 60fps
const GIVE = 14; // px the woven band can stretch beyond its rest length
const CARD_ARM = 150; // hook contact -> card centre of mass (px), sets the swing period
const HOOK_ARM = 18; // swivel eye -> hook centre of mass (px): short, quick pendulum
const LINK_ARM = 6; // crimp eyelet -> connecting ring centre (px): tiny, jittery pendulum
const SLIDE = 16; // how far the slot can slide along the hook (px): keeps the wire inside the 46px slot
let L0 = 0, // resting strap length
  seg = 0; // rest length of one rope segment
const P = Array.from({ length: N }, () => ({ x: 0, y: 0, px: 0, py: 0 }));
let dragging = false;
let idle = 1; // 1 = faint idle sway on, 0 = off
let t = 0;
let acc = 0; // sim time accumulator (60fps steps)
let last = performance.now();
const grab = { px: 0, py: 0, x0: 0, y0: 0, moved: 0 };
const target = { x: 0, y: 0 }; // where the pointer wants the rope end
let evx = 0,
  evy = 0, // rope-end velocity (px / frame)
  evxS = 0,
  evyS = 0, // smoothed
  axS = 0,
  ayS = 0; // smoothed rope-end acceleration
let psi = 0,
  psiV = 0; // card swing angle about the hook contact (rad) + angular velocity
let theta = 0,
  thetaV = 0; // hook swing angle about the swivel eye (rad)
let alpha = 0,
  alphaV = 0; // connecting ring swing angle about the crimp eyelet (rad)
let sx = 0,
  sxV = 0; // card slid along its slot relative to the hook (px)
let twist = 0, // band twist at the free end (rad)
  twistV = 0;
let yaw = 0, // card turn about the vertical axis through the hook (deg): 0 = front, 180 = back
  yawV = 0,
  yawTarget = 0;
let swivel = 0; // hook rotation around its vertical axis (deg)
let textScroll = 0,
  textPeriod = 0;

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

function measure() {
  const prev = L0;
  L0 = strapSvg.getBoundingClientRect().height;
  seg = L0 / (N - 1);
  const k = prev ? L0 / prev : 0;
  for (let i = 0; i < N; i++) {
    const p = P[i];
    if (k) {
      p.x *= k; p.y *= k; p.px *= k; p.py *= k;
    } else {
      p.x = p.px = 0;
      p.y = p.py = i * seg;
    }
  }
  fiberEl.setAttribute("y", -30);
  fiberEl.setAttribute("height", L0 * 1.3 + 80);
}
measure();
window.addEventListener("resize", measure);

function measureText() {
  textPeriod = textPathEl.getComputedTextLength() / 2; // lettering is repeated twice
}
measureText();
document.fonts?.ready.then(measureText);

function rubber(v, limit) {
  // soft limit: gets harder to pull the further you go
  const s = Math.sign(v),
    a = Math.abs(v);
  return s * (limit * (1 - 1 / (1 + a / limit)));
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function onDown(e) {
  dragging = true;
  badge.classList.add("dragging");
  badge.setPointerCapture(e.pointerId);
  const end = P[N - 1];
  grab.px = e.clientX;
  grab.py = e.clientY;
  grab.x0 = end.x;
  grab.y0 = end.y;
  grab.moved = 0;
  target.x = end.x;
  target.y = end.y;
}
function onMove(e) {
  if (!dragging) return;
  const dx = e.clientX - grab.px,
    dy = e.clientY - grab.py;
  grab.moved = Math.max(grab.moved, Math.hypot(dx, dy));
  let tx = grab.x0 + dx,
    ty = grab.y0 + dy;
  // woven band: swings freely in any direction, gives only ~GIVE px when pulled taut
  const d = Math.hypot(tx, ty);
  if (d > L0) {
    const r = (L0 + rubber(d - L0, GIVE)) / d;
    tx *= r;
    ty *= r;
  }
  target.x = tx;
  target.y = Math.max(ty, -L0 * 0.7);
}
function onUp(e) {
  if (!dragging) return;
  dragging = false;
  badge.classList.remove("dragging");
  try {
    badge.releasePointerCapture(e.pointerId);
  } catch (_) {}
  if (grab.moved < 6) flip(); // a tap/click flips the card
}

// a flick of the hand: spins the card on the hook and sets the whole lanyard swinging
function flip() {
  card.classList.toggle("flipped");
  yawTarget = card.classList.contains("flipped") ? 180 : 0;
  if (reduceMotion) return;
  const dir = yawTarget ? 1 : -1;
  yawV += dir * 2.5;
  P[N - 1].px += dir * 1.6; // sideways jolt at the rope end
  psiV += dir * 0.006;
}

badge.addEventListener("pointerdown", onDown);
badge.addEventListener("pointermove", onMove);
badge.addEventListener("pointerup", onUp);
badge.addEventListener("pointercancel", onUp);
badge.addEventListener("dragstart", (e) => e.preventDefault());

// one 60fps physics step
function step() {
  const end = P[N - 1];
  const pevx = evx,
    pevy = evy;

  // integrate (verlet). The card on the end is heavy: less air drag, more momentum.
  for (let i = 1; i < N; i++) {
    const p = P[i];
    const heavy = i === N - 1;
    const damp = heavy ? 0.992 : 0.975;
    const vx = (p.x - p.px) * damp,
      vy = (p.y - p.py) * damp;
    p.px = p.x;
    p.py = p.y;
    p.x += vx;
    p.y += vy + GRAVITY;
  }
  // faint draught so the badge never hangs perfectly still
  if (!dragging) end.x += Math.sin(t / 70) * 0.012 * idle;
  if (dragging) {
    end.x = target.x;
    end.y = target.y;
  }
  P[0].x = P[0].y = 0;

  // constraints: fixed segment length + a little bending stiffness
  for (let it = 0; it < 14; it++) {
    for (let i = 0; i < N - 1; i++) {
      const a = P[i],
        b = P[i + 1];
      const dx = b.x - a.x,
        dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1e-6;
      const diff = (d - seg) / d;
      const bEnd = i + 1 === N - 1;
      const wa = i === 0 ? 0 : bEnd ? (dragging ? 1 : 0.85) : 0.5;
      const wb = bEnd ? (dragging ? 0 : 0.15) : i === 0 ? 1 : 0.5;
      a.x += dx * diff * wa;
      a.y += dy * diff * wa;
      b.x -= dx * diff * wb;
      b.y -= dy * diff * wb;
    }
    // the band resists sharp kinks: push every second point apart when it folds
    for (let i = 0; i < N - 2; i++) {
      const a = P[i],
        b = P[i + 2];
      const dx = b.x - a.x,
        dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1e-6;
      const rest = 2 * seg;
      if (d < rest * 0.995) {
        const diff = ((d - rest) / d) * 0.12;
        const wa = i === 0 ? 0 : 0.5;
        const wb = i + 2 === N - 1 && dragging ? 0 : 0.5;
        a.x += dx * diff * wa;
        a.y += dy * diff * wa;
        b.x -= dx * diff * wb;
        b.y -= dy * diff * wb;
      }
    }
    P[0].x = P[0].y = 0;
    if (dragging) {
      end.x = target.x;
      end.y = target.y;
    }
  }

  // rope-end motion feeds the card swing, the band twist and the ring swivel
  evx = end.x - end.px;
  evy = end.y - end.py;
  evxS += (evx - evxS) * 0.25;
  evyS += (evy - evyS) * 0.25;
  axS += (evx - pevx - axS) * 0.5;
  ayS += (evy - pevy - ayS) * 0.5;

  // connecting ring: tiny pendulum in the crimp eyelet, yanked by the hook below it
  alphaV +=
    (-(GRAVITY - ayS) * Math.sin(alpha) + axS * Math.cos(alpha)) / LINK_ARM +
    (theta - alpha) * 0.35;
  alphaV *= 0.8;
  alpha = clamp(alpha + alphaV, -1.3, 1.3);

  // hook: short pendulum on the swivel eye, dragged around by the card hanging on it
  thetaV +=
    (-(GRAVITY - ayS) * Math.sin(theta) + axS * Math.cos(theta)) / HOOK_ARM +
    (psi - theta) * 0.2;
  thetaV *= 0.88;
  theta = clamp(theta + thetaV, -1.2, 1.2);

  // card: pendulum on the hook contact; an off-centre slot shifts its balance
  const g = GRAVITY - ayS;
  const L2 = CARD_ARM * CARD_ARM + sx * sx;
  psiV +=
    (-g * (CARD_ARM * Math.sin(psi) + sx * Math.cos(psi)) +
      axS * CARD_ARM * Math.cos(psi)) /
    L2;
  if (dragging) psiV += -psi * 0.08; // a hand holding the card keeps it steady
  psiV *= dragging ? 0.85 : 0.972;
  psi = clamp(psi + psiV, -1, 1);

  // slot slides on the hook: downhill when the card tilts, thrown by sideways jolts
  sxV += (Math.sin(psi) * SLIDE - sx) * 0.05 - axS * 0.12;
  sxV *= 0.8;
  sx = clamp(sx + sxV, -SLIDE, SLIDE);

  // card turn: spring toward the flip target, with inertia and a little overshoot
  if (reduceMotion) {
    yaw = yawTarget;
    yawV = 0;
  } else {
    yawV += (yawTarget - yaw) * 0.005;
    yawV *= 0.915;
    yaw += yawV;
  }

  // band twist: torsion spring with inertia; a spinning card winds the band up, then it unwinds
  const twistTarget =
    clamp(evxS * 0.05, -0.55, 0.55) +
    Math.sin(t / 90) * 0.14 * idle +
    clamp(yawV * 0.12, -1.1, 1.1);
  twistV += (twistTarget - twist) * 0.03;
  twistV *= 0.84;
  twist += twistV;
  // swivel: jolts spin it, at rest it slowly turns on its axis, and it lags behind the card's turn
  const swivelTarget =
    clamp(evxS * 4, -40, 40) + Math.sin(t / 140) * 24 * idle + yaw * 0.5;
  swivel += (swivelTarget - swivel) * 0.12;

  if (!reduceMotion && textPeriod > 0)
    textScroll = (textScroll + 0.4) % textPeriod;
}

// --- drawing ---
const f = (v) => v.toFixed(1);
const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
// fixed per-point randomness so wrinkles stay put instead of flickering
const R = Array.from({ length: N }, (_, i) => ({
  a: hash(i * 3 + 1),
  b: hash(i * 3 + 2),
  c: hash(i * 3 + 3),
}));
const tx = new Float32Array(N),
  ty = new Float32Array(N),
  nx = new Float32Array(N),
  ny = new Float32Array(N),
  kap = new Float32Array(N),
  halfW = new Float32Array(N),
  twI = new Float32Array(N);

function line(x1, y1, x2, y2, stroke, w) {
  return `<path d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}" stroke="${stroke}" stroke-width="${w}"/>`;
}
// a fold: dark line + light line one pixel apart, so it reads as a ridge
function fold(x1, y1, x2, y2, ox, oy, o, w) {
  return (
    line(x1 + ox, y1 + oy, x2 + ox, y2 + oy, `rgba(0,0,0,${f(0.55 * o)})`, w) +
    line(x1 - ox, y1 - oy, x2 - ox, y2 - oy, `rgba(255,255,255,${f(0.32 * o)})`, w * 0.75)
  );
}

function render() {
  const end = P[N - 1];
  let ropeLen = 0;
  for (let i = 0; i < N; i++) {
    const a = P[Math.max(0, i - 1)],
      b = P[Math.min(N - 1, i + 1)];
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    tx[i] = dx / d;
    ty[i] = dy / d;
    nx[i] = -ty[i];
    ny[i] = tx[i];
    if (i) ropeLen += Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y);
  }
  for (let i = 1; i < N - 1; i++) {
    const ax = P[i].x - P[i - 1].x,
      ay = P[i].y - P[i - 1].y,
      bx = P[i + 1].x - P[i].x,
      by = P[i + 1].y - P[i].y;
    kap[i] = Math.atan2(ax * by - ay * bx, ax * bx + ay * by); // bend angle at this point
  }
  kap[0] = kap[N - 1] = 0;
  const tension = clamp((ropeLen - L0) / GIVE, 0, 1);

  // width: a twisted ribbon looks narrower; the clamp gathers the last few cm
  for (let i = 0; i < N; i++) {
    const s = i / (N - 1);
    twI[i] = twist * s * s * (3 - 2 * s);
    const gather = Math.max(0, 1 - (N - 1 - i) / 3.5);
    const w = i === N - 1 ? CRIMP_HALF : (STRAP_W / 2) * (1 - 0.18 * tension * gather);
    halfW[i] = w * Math.max(0.12, Math.abs(Math.cos(twI[i])));
  }
  // lettering: fade it where the band turns edge-on, and over the last segment where it narrows into the crimp
  textFadeStops.forEach((st) => {
    const o = +st.getAttribute("offset");
    const tw = twist * o * o * (3 - 2 * o);
    let a = clamp((Math.abs(Math.cos(tw)) - 0.35) / 0.45, 0, 1);
    a *= clamp(((1 - o) * (N - 1) - 0.6) / 0.9, 0, 1);
    st.setAttribute("stop-opacity", f(a));
  });
  textFade.setAttribute("y2", f(Math.max(1, end.y)));

  let left = "",
    center = "",
    stL = "",
    stR = "",
    thr = "",
    hi = "";
  const rightPts = [];
  for (let i = 0; i < N; i++) {
    const p = P[i],
      h = halfW[i],
      n0 = nx[i],
      n1 = ny[i];
    const c = i ? "L" : "M";
    left += `${c}${f(p.x + n0 * h)} ${f(p.y + n1 * h)}`;
    rightPts.push(`${f(p.x - n0 * h)} ${f(p.y - n1 * h)}`);
    center += `${c}${f(p.x)} ${f(p.y)}`;
    stL += `${c}${f(p.x + n0 * (h - 4))} ${f(p.y + n1 * (h - 4))}`;
    stR += `${c}${f(p.x - n0 * (h - 4))} ${f(p.y - n1 * (h - 4))}`;
    thr += `${c}${f(p.x + n0 * (h - 7))} ${f(p.y + n1 * (h - 7))}`;
    const sh = Math.sin(twI[i]) * h * 0.5; // highlight slides to the side that faces the light
    hi += `${c}${f(p.x + n0 * sh)} ${f(p.y + n1 * sh)}`;
  }
  const right = "M" + rightPts.join("L");
  const ribbon = left + "L" + rightPts.slice().reverse().join("L") + "Z";
  ribbonEl.setAttribute("d", ribbon);
  ribbonClipEl.setAttribute("d", ribbon);
  centerEl.setAttribute("d", center);
  shadeLEl.setAttribute("d", left);
  shadeREl.setAttribute("d", right);
  hiliteEl.setAttribute("d", hi);
  sheenEl.setAttribute("d", center);
  stitchLEl.setAttribute("d", stL);
  stitchREl.setAttribute("d", stR);
  threadEl.setAttribute("d", thr);

  // creases: faint permanent micro-wrinkles + folds wherever the band bends
  let cre = "";
  for (let i = 1; i < N - 1; i++) {
    const p = P[i],
      h = halfW[i],
      n0 = nx[i],
      n1 = ny[i],
      t0 = tx[i],
      t1 = ty[i],
      r = R[i];
    if (r.a < 0.4) {
      const side = r.b < 0.5 ? 1 : -1;
      const len = h * (0.45 + r.c * 0.4);
      const sx = p.x + n0 * side * h + t0 * (r.c - 0.5) * seg * 0.6,
        sy = p.y + n1 * side * h + t1 * (r.c - 0.5) * seg * 0.6;
      cre += fold(sx, sy, sx - n0 * side * len + t0 * (r.b - 0.5) * 3, sy - n1 * side * len + t1 * (r.b - 0.5) * 3, t0 * 0.7, t1 * 0.7, 0.42, 0.8);
    }
    const ak = Math.abs(kap[i]);
    if (ak > 0.045) {
      const o = Math.min(0.95, (ak - 0.045) * 7);
      const inside =
        Math.sign((tx[i + 1] - tx[i - 1]) * n0 + (ty[i + 1] - ty[i - 1]) * n1) || 1;
      // main fold across the whole width, bowed toward the inside of the bend
      const lx = p.x + n0 * h,
        ly = p.y + n1 * h,
        rx = p.x - n0 * h,
        ry = p.y - n1 * h;
      const cx = p.x + t0 * 2.5 * inside,
        cy = p.y + t1 * 2.5 * inside;
      const d = `M${f(lx)} ${f(ly)}Q${f(cx)} ${f(cy)} ${f(rx)} ${f(ry)}`;
      cre += `<path d="${d}" stroke="rgba(0,0,0,${f(0.6 * o)})" stroke-width="1.2" transform="translate(${f(t0 * 0.9)} ${f(t1 * 0.9)})"/>`;
      cre += `<path d="${d}" stroke="rgba(255,255,255,${f(0.38 * o)})" stroke-width=".9" transform="translate(${f(-t0 * 0.9)} ${f(-t1 * 0.9)})"/>`;
      // the compressed edge puckers into smaller wrinkles
      for (let j = 0; j < 2; j++) {
        const jr = j ? r.b : r.c;
        const ex = p.x + n0 * inside * h + t0 * (jr - 0.5) * seg * 0.9,
          ey = p.y + n1 * inside * h + t1 * (jr - 0.5) * seg * 0.9;
        const len = h * (0.45 + 0.4 * (j ? r.c : r.b));
        const sk = (j ? 1 : -1) * 1.6;
        cre += fold(ex, ey, ex - n0 * inside * len + t0 * sk, ey - n1 * inside * len + t1 * sk, t0 * 0.7, t1 * 0.7, o * 0.75, 0.8);
      }
    }
  }
  creasesEl.innerHTML = cre;

  // fabric gathering into the crimp: always a little, a lot under tension
  {
    const e = end,
      n0 = nx[N - 1],
      n1 = ny[N - 1],
      t0 = tx[N - 1],
      t1 = ty[N - 1],
      h = halfW[N - 1];
    const o = 0.25 + 0.7 * tension;
    const reach = 16 + 14 * tension;
    let g = "";
    for (const s of [-0.6, -0.25, 0.25, 0.6]) {
      const x1 = e.x - t0 * reach + n0 * s * h,
        y1 = e.y - t1 * reach + n1 * s * h;
      const x2 = e.x - t0 * 2 + n0 * s * h * 0.45,
        y2 = e.y - t1 * 2 + n1 * s * h * 0.45;
      g += fold(x1, y1, x2, y2, n0 * 0.8, n1 * 0.8, o, 1);
    }
    // the band is folded back on itself and bar-tacked before it enters the crimp
    const fx = e.x - t0 * 15,
      fy = e.y - t1 * 15;
    g += fold(fx + n0 * h, fy + n1 * h, fx - n0 * h, fy - n1 * h, t0 * 0.9, t1 * 0.9, 0.7, 1.1);
    g += `<path d="M${f(fx + n0 * h)} ${f(fy + n1 * h)}L${f(e.x + n0 * h)} ${f(e.y + n1 * h)}L${f(e.x - n0 * h)} ${f(e.y - n1 * h)}L${f(fx - n0 * h)} ${f(fy - n1 * h)}Z" fill="rgba(0,0,0,.18)" stroke="none"/>`;
    for (const d of [6, 9, 12]) {
      const bx = e.x - t0 * d,
        by = e.y - t1 * d;
      g += `<path d="M${f(bx + n0 * h * 0.7)} ${f(by + n1 * h * 0.7)}L${f(bx - n0 * h * 0.7)} ${f(by - n1 * h * 0.7)}" stroke="rgba(220,220,235,.55)" stroke-width=".9" stroke-dasharray="1.4 1.4" stroke-linecap="butt"/>`;
    }
    gatherEl.innerHTML = g;
    endShadeEl.setAttribute(
      "d",
      `M${f(P[N - 3].x)} ${f(P[N - 3].y)}L${f(e.x)} ${f(e.y)}`,
    );
    endShadeEl.setAttribute("stroke-opacity", f(0.3 + 0.35 * tension));
  }

  // texture + sheen follow the band's overall lean
  const lean = (-Math.atan2(end.x, end.y) * 180) / Math.PI;
  weaveEl.setAttribute("patternTransform", `rotate(${f(lean)})`);
  fiberEl.setAttribute("transform", `rotate(${f(lean)})`);
  const sPos = ((t * 0.9) % (L0 + 240)) - 120;
  sheenGrad.setAttribute("y1", f(sPos - 50));
  sheenGrad.setAttribute("y2", f(sPos + 50));
  if (textPeriod > 0) textPathEl.setAttribute("startOffset", f(-textScroll));

  // crimp follows the last bit of band; hook swings from its eyelet; card rocks on the hook
  const phi = Math.atan2(end.x - P[N - 2].x, end.y - P[N - 2].y);
  badge.style.transform = `translate(calc(-50% + ${f(end.x)}px), ${f(end.y)}px) rotate(${-phi}rad)`;
  link.style.transform = `rotate(${alpha + phi}rad)`;
  hanger.style.transform = `rotate(${theta - alpha}rad)`;
  // interlocking crossings: each piece follows the part it belongs to (ring vs crimp, eye vs ring)
  const deg = 180 / Math.PI;
  ringPatch.setAttribute("transform", `rotate(${f((alpha + phi) * deg)} 11 18.3)`);
  eyePatch.setAttribute("transform", `rotate(${f((theta - alpha) * deg)} 7 12.3)`);
  // the hook is locked to the card by the slot; only the swivel barrel turns, shown by its sliding reflections
  steelH.setAttribute("gradientTransform", `translate(${f(-swivel / 160)} 0)`);
  cardPivot.style.transform = `rotate(${psi - theta}rad)`;
  const tiltY = clamp(evxS * 2, -22, 22);
  const tiltX = clamp(-evyS * 1.1, -10, 10);
  card.style.transform = `translateX(${f(sx)}px) perspective(1200px) rotateX(${f(tiltX)}deg) rotateY(${f(tiltY)}deg)`;
  // the card turns about the hook (it hangs on it), not about its own centre
  cardInner.style.transformOrigin = `calc(50% - ${f(sx)}px) 50%`;
  cardInner.style.transform = `rotateY(${f(yaw)}deg)`;
  drawHook(((yaw + tiltY) * Math.PI) / 180);
}

// Hook through the slot, seen from the front. Its plane stands square to the card, turned HOOK_PHI0 off
// the card's normal, so the legs (HOOK_D apart) look HOOK_D*sin(HOOK_PHI0 - turn) apart on screen.
// Coordinates are the hook SVG's: axis x=11, legs from y~19 down to the curve, slot top edge at y=33.
const HOOK_D = 12.6,
  HOOK_PHI0 = 0.46;
function drawHook(turn) {
  const s = HOOK_D * Math.sin(HOOK_PHI0 - turn);
  const xa = 11 - s / 2, // leg A: card-front side
    xb = 11 + s / 2; // leg B: card-back side
  const rx = f(Math.max(Math.abs(s) / 2, 0.01));
  const swA = s > 0 ? 0 : 1, // arc sweep, leg A down to the bottom of the curve
    swB = s > 0 ? 1 : 0; // leg B down to the bottom of the curve
  const bottom = "11 34.7";
  const halfA = `A${rx} 5.7 0 0 ${swA} ${bottom}`;
  const halfB = `A${rx} 5.7 0 0 ${swB} ${bottom}`;
  const front = Math.cos(turn) > 0; // viewer sees the card's front, so leg A is the near one
  const legs = [
    { leg: hookLegs[0], x: xa, d: `M11 16.2L${f(xa)} 19V29${halfA}`, near: front },
    { leg: hookLegs[1], x: xb, d: `M${f(xb)} 19.6V29${halfB}`, near: !front },
  ];
  for (const { leg, x, d, near } of legs) {
    leg.el.classList.toggle("near", near);
    for (const b of leg.body) b.setAttribute("d", d);
    leg.spec.setAttribute("d", `M${f(x - 0.8)} 19.8V28.6`);
    // shadow the near leg casts on the card face: soft up top, tight where it meets the slot
    leg.cast.setAttribute("d", `M${f(x + 2.2)} 21.4L${f(x + 1)} 33`);
    leg.castTight.setAttribute("d", `M${f(x + 1.4)} 29.5L${f(x + 1)} 33`);
  }
  // curve inside the slot: A side down to the bottom, then back up toward B
  const slot = `M${f(xa)} 29${halfA}A${rx} 5.7 0 0 ${1 - swB} ${f(xb)} 29`;
  hkSlotO.setAttribute("d", slot);
  hkSlot.setAttribute("d", slot);
  hkSlotFar.setAttribute(
    "d",
    front ? `M${bottom}A${rx} 5.7 0 0 ${1 - swB} ${f(xb)} 29` : `M${bottom}A${rx} 5.7 0 0 ${1 - swA} ${f(xa)} 29`,
  );
  const k = Math.min(1.5, Math.abs(s) * 0.27 + 0.3);
  hkContact.setAttribute("d", `M${f(11 - k)} 32.7Q11 33.5 ${f(11 + k)} 32.7`);
  const gate = `M${f(xb)} 19.6L${f(xa)} 18.6`;
  hkGateO.setAttribute("d", gate);
  hkGate.setAttribute("d", gate);
}

function frame(now) {
  const dt = Math.min((now - last) / (1000 / 60), 3);
  last = now;
  t += dt;

  // fade the idle sway out while the card is moving, back in when it settles
  const end = P[N - 1];
  const active =
    dragging ||
    Math.hypot(evx, evy) > 0.3 ||
    Math.hypot(end.x, end.y - L0) > 6;
  idle += ((active || reduceMotion ? 0 : 1) - idle) * 0.03 * dt;

  acc += dt;
  let n = 0;
  while (acc >= 1 && n < 3) {
    step();
    acc -= 1;
    n++;
  }
  if (acc >= 1) acc = 0;

  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

