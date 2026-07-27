/**
 * Lightweight canvas confetti engine — no external dependency.
 * Renders bursts of colored particles with gravity & rotation.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  size: number;
  color: string;
  shape: "rect" | "circle";
  life: number;
  maxLife: number;
}

const CONFETTI_COLORS = [
  "#059669",
  "#34D399",
  "#F59E0B",
  "#FBBF24",
  "#0d9488",
  "#7c3aed",
  "#db2777",
  "#f43f5e",
];

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let particles: Particle[] = [];
let rafId: number | null = null;
let lastTs = 0;

function getCanvas(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  if (canvas && document.body.contains(canvas)) return canvas;
  canvas = document.createElement("canvas");
  canvas.style.cssText =
    "position:fixed;inset:0;pointer-events:none;z-index:9999;";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  ctx = canvas.getContext("2d");
  window.addEventListener("resize", resize);
  return canvas;
}

function resize() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function spawn(originX: number, originY: number, count: number) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const speed = 4 + Math.random() * 6;
    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.4,
      size: 6 + Math.random() * 6,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      shape: Math.random() > 0.4 ? "rect" : "circle",
      life: 0,
      maxLife: 90 + Math.random() * 40,
    });
  }
}

function tick(ts: number) {
  if (!ctx || !canvas) return;
  const dt = lastTs ? (ts - lastTs) / 16.67 : 1;
  lastTs = ts;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life += dt;
    if (p.life >= p.maxLife) {
      particles.splice(i, 1);
      continue;
    }
    p.vy += 0.18 * dt; // gravity
    p.vx *= 0.992;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vrot * dt;

    const alpha = 1 - p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    if (p.shape === "rect") {
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  if (particles.length > 0) {
    rafId = requestAnimationFrame(tick);
  } else {
    rafId = null;
    lastTs = 0;
    // tear down canvas
    if (canvas) {
      canvas.remove();
      canvas = null;
      ctx = null;
    }
  }
}

export interface ConfettiOptions {
  /** number of particles per burst */
  count?: number;
  /** origin x in px (default: center) */
  x?: number;
  /** origin y in px (default: top-center) */
  y?: number;
  /** fire multiple bursts staggered over ms */
  duration?: number;
}

/** Fire a confetti burst. Safe to call from anywhere (no-op on server). */
export function fireConfetti(opts: ConfettiOptions = {}) {
  if (typeof document === "undefined") return;
  const c = getCanvas();
  if (!c) return;
  const count = opts.count ?? 80;
  const x = opts.x ?? window.innerWidth / 2;
  const y = opts.y ?? window.innerHeight * 0.3;

  if (opts.duration && opts.duration > 0) {
    const bursts = 3;
    for (let i = 0; i < bursts; i++) {
      setTimeout(() => {
        spawn(x + (Math.random() - 0.5) * 120, y, Math.floor(count / bursts));
        startLoop();
      }, (opts.duration / bursts) * i);
    }
  } else {
    spawn(x, y, count);
    startLoop();
  }
}

function startLoop() {
  if (rafId === null) {
    rafId = requestAnimationFrame(tick);
  }
}

/** Fire from a specific element's bounding box (great for button presses). */
export function fireFromElement(el: HTMLElement, count = 60) {
  const r = el.getBoundingClientRect();
  fireConfetti({
    count,
    x: r.left + r.width / 2,
    y: r.top + r.height / 2,
    duration: 600,
  });
}
