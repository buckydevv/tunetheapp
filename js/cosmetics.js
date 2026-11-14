// Profile cosmetics on the website: the same rings, banner effects, name styles and badges as
// the app (src/lib/cosmetics.ts), and the markup that draws them (styles in /cosmetics.css).
// What you've unlocked comes from the level and streak on your profile; badges are chosen in
// the app (they count things only your PC knows).

export const RINGS = [
  ["none", "Classic", null],
  ["glow", "Glow", { level: 2 }],
  ["pulse", "Pulse", { level: 4 }],
  ["duo", "Duotone", { level: 7 }],
  ["vinyl", "Vinyl", { level: 8 }],
  ["spin", "Spin", { level: 10 }],
  ["wave", "Soundwave", { level: 13 }],
  ["orbit", "Orbit", { level: 15 }],
  ["neon", "Neon tube", { level: 17 }],
  ["rainbow", "Rainbow", { level: 20 }],
  ["galaxy", "Galaxy", { level: 26 }],
  ["fire", "Fire", { streak: 30 }],
  ["gold", "Gold", { level: 30 }],
  ["holo", "Hologram", { level: 35 }],
  ["diamond", "Diamond", { level: 40 }],
].map(([id, name, unlock]) => ({ id, name, unlock }));

export const BANNERS = [
  ["none", "Still", null],
  ["shimmer", "Shimmer", { level: 3 }],
  ["eq", "Equaliser", { level: 6 }],
  ["stars", "Stars", { level: 9 }],
  ["aurora", "Aurora", { level: 12 }],
  ["bubbles", "Bubbles", { level: 14 }],
  ["rain", "Neon rain", { level: 16 }],
  ["embers", "Embers", { streak: 14 }],
  ["waves", "Waves", { level: 18 }],
  ["lasers", "Lasers", { level: 21 }],
  ["confetti", "Confetti", { level: 25 }],
  ["glitch", "Glitch", { level: 28 }],
].map(([id, name, unlock]) => ({ id, name, unlock }));

export const NAMES = [
  ["none", "Plain", null],
  ["gradient", "Gradient", { level: 5 }],
  ["outline", "Outline", { level: 8 }],
  ["glow", "Neon", { level: 11 }],
  ["rainbow", "Rainbow", { level: 16 }],
  ["fire", "Fire", { streak: 21 }],
  ["shine", "Chrome", { level: 22 }],
  ["glitch", "Glitch", { level: 27 }],
  ["holo", "Hologram", { level: 33 }],
].map(([id, name, unlock]) => ({ id, name, unlock }));

export const PARTS = { ring: RINGS, banner: BANNERS, name: NAMES };

/** The diamond version: 15 levels later, or a streak three times as long. */
export const diamondUnlock = (u) => (!u ? null : "level" in u ? { level: u.level + 15 } : { streak: u.streak * 3 });
export const earned = (u, level, streak) => !u || ("level" in u ? level >= u.level : streak >= u.streak);
export const unlockText = (u) => (!u ? "Free" : "level" in u ? `Level ${u.level}` : `${u.streak}-day streak`);

export const TIER_NAMES = ["Bronze", "Silver", "Gold", "Diamond"];
export const TIER_COLOURS = ["#d08a4c", "#cfd6e4", "#ffcf4a", "#9ff3ff"];
const ICON = (d, s = 13) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
export const FLAME = ICON('<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-2.6 1.4-4.6 3.1-6.2.3 1.6 1.1 2.7 2.2 3.3-.2-3.4 1.2-6.1 3.7-8.4.4 2.9 1.7 4.6 3.1 6.2 1.3 1.5 1.9 3.1 1.9 5.1 0 3.6-2.6 6.2-6.5 6.2z"/>');
export const LOCK = ICON('<rect x="5.5" y="10.5" width="13" height="10" rx="2.2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>', 12);
export const BADGE_INFO = {
  streak: [FLAME, "Streak"],
  listener: [ICON('<path d="M4.5 15.5V12a7.5 7.5 0 0 1 15 0v3.5"/><rect x="3.5" y="14" width="4" height="6.5" rx="1.6"/><rect x="16.5" y="14" width="4" height="6.5" rx="1.6"/>'), "Listener"],
  party: [ICON('<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><path d="M15.5 5.6a3.2 3.2 0 0 1 0 5.8M17.5 14.4a5.5 5.5 0 0 1 3 5.1"/>'), "Party"],
  creator: [ICON('<path d="M19.5 4.5 11 13"/><path d="M9.5 12.5c-2.2 0-3.5 1.5-3.5 3.4 0 1.5-.7 2.6-2.5 3.1 3.9 1.3 8.2.2 8.4-3.6z"/>'), "Creator"],
};

/** A profile's saved cosmetics, with anything unknown left out. */
export function readFx(c) {
  c = c && typeof c === "object" ? c : {};
  const known = (list, v) => (list.some((x) => x.id === v) ? v : "none");
  const badges = [];
  for (const b of Array.isArray(c.badges) ? c.badges : []) {
    const m = typeof b === "string" && b.match(/^(streak|listener|party|creator)_([1-4])$/);
    if (m && !badges.some((x) => x.id === m[1])) badges.push({ id: m[1], tier: Number(m[2]) });
  }
  const dia = Array.isArray(c.dia) ? ["ring", "banner", "name"].filter((p) => c.dia.includes(p)) : [];
  return { ring: known(RINGS, c.ring), banner: known(BANNERS, c.banner), name: known(NAMES, c.name), dia, badges: badges.slice(0, 3) };
}
/** The form saved on a profile. */
export const saveForm = (fx) => ({ ring: fx.ring, banner: fx.banner, name: fx.name, dia: fx.dia, badges: fx.badges.map((b) => `${b.id}_${b.tier}`) });

/** A ring around `inner` (the picture). */
export function ringHtml(ring, dia, tint, inner, { gap = 4, width = 4 } = {}) {
  const glints = (dia && ring !== "none") || ring === "diamond" ? '<span class="glints"><i></i><i></i><i></i><i></i></span>' : "";
  return `<span class="fx-ring r-${ring}${dia && ring !== "none" ? " dia" : ""}" style="--rc:${tint};--gap:${gap}px;--rw:${width}px">${inner}${glints}</span>`;
}

/** An effect over a banner (put inside an element with position: relative). */
export function bannerFxHtml(fx, dia, tint) {
  if (fx === "none") return "";
  const spots = Array.from({ length: 28 }, (_, i) => ({ i, x: `${(i * 37) % 100}%`, y: `${(i * 53) % 90}%` }));
  const colours = ["#ff2e88", "#ffd23f", "#22e4ff", "#9dff3c", "#a46bff"];
  let inner = "";
  if (fx === "eq") inner = Array.from({ length: 32 }, (_, i) => `<i style="--i:${i}"></i>`).join("");
  else if (fx === "stars") inner = spots.map((s) => `<i style="--i:${s.i};--x:${s.x};--y:${s.y}"></i>`).join("");
  else if (fx === "embers") inner = spots.slice(0, 18).map((s) => `<i style="--i:${s.i};--x:${s.x}"></i>`).join("");
  else if (fx === "confetti") inner = spots.slice(0, 22).map((s) => `<i style="--i:${s.i};--x:${s.x};--c:${colours[s.i % 5]}"></i>`).join("");
  else if (fx === "rain") inner = spots.slice(0, 24).map((s) => `<i style="--i:${s.i};--x:${s.x}"></i>`).join("");
  else if (fx === "bubbles") inner = spots.slice(0, 16).map((s) => `<i style="--i:${s.i};--x:${s.x};--s:${6 + ((s.i * 7) % 12)}px"></i>`).join("");
  else if (fx === "waves")
    inner =
      '<svg viewBox="0 0 1200 100" preserveAspectRatio="none"><path d="M0 60 Q 75 20 150 60 T 300 60 T 450 60 T 600 60 T 750 60 T 900 60 T 1050 60 T 1200 60 V100 H0Z"/></svg>' +
      '<svg viewBox="0 0 1200 100" preserveAspectRatio="none"><path d="M0 50 Q 100 85 200 50 T 400 50 T 600 50 T 800 50 T 1000 50 T 1200 50 V100 H0Z"/></svg>';
  if (dia) inner += `<span class="dust">${Array.from({ length: 12 }, (_, i) => `<i style="--i:${i};--x:${(i * 29 + 7) % 96}%;--y:${(i * 41 + 11) % 86}%"></i>`).join("")}</span>`;
  return `<div class="fx-banner b-${fx}${dia ? " dia" : ""}" style="--rc:${tint}" aria-hidden="true">${inner}</div>`;
}

/** The name, in its style. */
export const nameHtml = (text, fx, dia, tint) => `<span class="fx-name n-${fx}${dia ? " dia" : ""}" style="--rc:${tint}">${text}</span>`;

/** Level, streak and badges, as chips. */
export function chipsHtml(level, streak, badges) {
  return [
    level > 1 ? `<span class="chip lvl">Lv ${Number(level) || 1}</span>` : "",
    streak > 0 ? `<span class="chip fire">${FLAME} ${Number(streak) || 0}</span>` : "",
    ...badges.map((b) => `<span class="chip badge" style="--tc:${TIER_COLOURS[b.tier - 1]}">${BADGE_INFO[b.id][0]} ${TIER_NAMES[b.tier - 1]} ${BADGE_INFO[b.id][1]}</span>`),
  ].join("");
}
