/* ===== STATE ===== */
let state = {
  sortKey: "massEarth",
  sortDir: -1, // -1 = descending
  filters: new Set(["Planet", "Moon", "Dwarf Planet", "Candidate"]),
  compareBody: null,
  activeModal: null,
};

/* ===== HELPERS ===== */
const fmtMass = v => v >= 1 ? `${v.toFixed(2)}× Earth` : v >= 0.001 ? `${(v * 1000).toFixed(3)}×10⁻³ M⊕` : `${v.toExponential(2)} M⊕`;
const fmtDiam = v => v >= 0.01 ? `${(v * 12756).toFixed(0)} km` : `${(v * 12756).toFixed(0)} km`;
const fmtGrav = v => `${v.toFixed(3)} g`;
const fmtAU   = v => v >= 10 ? `${v.toFixed(1)} AU` : `${v.toFixed(2)} AU`;
const fmtBar  = v => v === 0 ? "None" : v < 0.0001 ? "Trace" : `${v} bar`;

const badgeClass = c => ({
  Planet: "badge-planet",
  Moon: "badge-moon",
  "Dwarf Planet": "badge-dwarf",
  Candidate: "badge-candidate",
}[c] || "badge-candidate");

// AU bar scale: log scale, max out at ~950 AU (Sedna aphelion)
const MAX_LOG_AU = Math.log10(100); // display cap at 100 AU for mini bars
const auPct = (au, cap = 100) => {
  const pct = Math.log10(Math.max(au, 0.3)) / Math.log10(cap);
  return Math.min(Math.max(pct, 0), 1) * 100;
};

const bodyColor = body => body.color || "#888";

/* ===== RENDER WORLD GRID ===== */
function renderGrid() {
  const grid = document.getElementById("world-grid");
  let bodies = BODIES.filter(b => state.filters.has(b.classification));

  bodies.sort((a, b) => state.sortDir * (b[state.sortKey] - a[state.sortKey]));

  if (bodies.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;padding:3rem;text-align:center;color:var(--text3);font-family:var(--font-mono)">No bodies match the current filter.</div>`;
    return;
  }

  grid.innerHTML = bodies.map(body => `
    <article class="world-card" data-id="${body.id}" tabindex="0" role="button" aria-label="View details for ${body.name}">
      <img class="card-image" src="${body.image}" alt="${body.name}" loading="lazy" onerror="this.style.background='var(--bg3)';this.removeAttribute('src')">
      <div class="card-body">
        <div class="card-header">
          <div class="card-name">${body.name}</div>
          <div class="classification-badge ${badgeClass(body.classification)}">${body.classification}</div>
        </div>
        <div class="card-stats">
          <div class="card-stat">
            <span class="label">Mass</span>
            <span class="card-stat-value mono">${body.massEarth >= 1 ? body.massEarth.toFixed(1) : body.massEarth.toExponential(2)} M⊕</span>
          </div>
          <div class="card-stat">
            <span class="label">Gravity</span>
            <span class="card-stat-value mono">${fmtGrav(body.gravityG)}</span>
          </div>
          <div class="card-stat">
            <span class="label">Diameter</span>
            <span class="card-stat-value mono">${fmtDiam(body.diameterEarth)}</span>
          </div>
          <div class="card-stat">
            <span class="label">Distance</span>
            <span class="card-stat-value mono">${fmtAU(body.distanceAU)}</span>
          </div>
        </div>
        ${body.parent !== "Sun" ? `<div class="label" style="margin-bottom:0.25rem">Moon of ${body.parent}</div>` : ""}
        <div class="au-bar-mini" title="${fmtAU(body.distanceAU)} from Sun">
          <div class="au-bar-fill" style="width:${auPct(body.distanceAU)}%"></div>
        </div>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll(".world-card").forEach(card => {
    card.addEventListener("click", () => openModal(card.dataset.id));
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") openModal(card.dataset.id); });
  });
}

/* ===== MODAL ===== */
function openModal(id) {
  const body = BODIES.find(b => b.id === id);
  if (!body) return;
  state.activeModal = id;

  const MAX_AU_MODAL = 100;
  const earthPct = auPct(1, MAX_AU_MODAL);
  const bodyPct  = auPct(body.distanceAU, MAX_AU_MODAL);
  const clampedBodyPct = Math.min(bodyPct, 100);

  document.getElementById("modal-image").src = body.image;
  document.getElementById("modal-image").alt = body.name;
  document.getElementById("modal-title").textContent = body.name;
  document.getElementById("modal-subtitle").textContent =
    `${body.classification}${body.parent !== "Sun" ? " · Moon of " + body.parent : " · Orbits the Sun"}`;

  document.getElementById("modal-stat-mass").textContent = `${body.massEarth >= 0.001 ? body.massEarth.toPrecision(3) : body.massEarth.toExponential(3)} M⊕`;
  document.getElementById("modal-stat-diam").textContent = `${fmtDiam(body.diameterEarth)} (${body.diameterEarth.toPrecision(3)} D⊕)`;
  document.getElementById("modal-stat-grav").textContent = `${fmtGrav(body.gravityG)} (${(body.gravityG * 9.80).toFixed(2)} m/s²)`;
  document.getElementById("modal-stat-dist").textContent = fmtAU(body.distanceAU);
  document.getElementById("modal-stat-atm").textContent  = fmtBar(body.atmosphereBar);
  document.getElementById("modal-stat-class").textContent = body.classification;

  document.getElementById("modal-narrative").textContent = body.standingThere;

  // AU bar
  const fill = document.getElementById("au-fill");
  const marker = document.getElementById("au-body-marker");
  const earthMarker = document.getElementById("au-earth-marker");
  fill.style.width = `${clampedBodyPct}%`;
  marker.style.left = `${clampedBodyPct}%`;
  earthMarker.style.left = `${earthPct}%`;

  const distLabel = document.getElementById("au-dist-label");
  if (body.distanceAU > MAX_AU_MODAL) {
    distLabel.textContent = `→ ${fmtAU(body.distanceAU)} (off scale)`;
  } else {
    distLabel.textContent = `${fmtAU(body.distanceAU)}`;
  }

  document.getElementById("modal-overlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("modal-overlay").classList.remove("open");
  document.body.style.overflow = "";
  state.activeModal = null;
}

/* ===== COMPARISON ENGINE ===== */
const EARTH_PX = 200; // Earth display diameter in px

function renderComparison() {
  const id = document.getElementById("compare-select").value;
  const body = BODIES.find(b => b.id === id);
  if (!body) return;

  const earth = BODIES.find(b => b.id === "earth");

  // Scale relative to Earth
  const earthPx = EARTH_PX;
  const bodyPx  = Math.max(body.diameterEarth * earthPx, 4);

  const earthEl = document.getElementById("compare-earth");
  const bodyEl  = document.getElementById("compare-body");

  const earthCircle = earthEl.querySelector(".scale-circle");
  const bodyCircle  = bodyEl.querySelector(".scale-circle");

  earthCircle.style.width  = `${earthPx}px`;
  earthCircle.style.height = `${earthPx}px`;
  earthCircle.style.background = `radial-gradient(circle at 38% 35%, ${earth.color}, #1a3a5c)`;

  bodyCircle.style.width  = `${Math.min(bodyPx, 600)}px`;
  bodyCircle.style.height = `${Math.min(bodyPx, 600)}px`;
  bodyCircle.style.background = `radial-gradient(circle at 38% 35%, ${body.color}, #111)`;

  earthEl.querySelector(".scale-name").textContent = "Earth";
  earthEl.querySelector(".scale-diam").textContent = `12,756 km`;
  bodyEl.querySelector(".scale-name").textContent  = body.name;
  bodyEl.querySelector(".scale-diam").textContent  = `${fmtDiam(body.diameterEarth)}`;

  // Info panel
  const ratio = body.diameterEarth;
  document.getElementById("compare-ratio").textContent =
    ratio >= 1 ? `${ratio.toFixed(2)}× Earth's diameter`
               : `${(1 / ratio).toFixed(1)}× smaller than Earth`;
  document.getElementById("compare-gravity-text").textContent =
    `${fmtGrav(body.gravityG)} — you would weigh ${Math.round(body.gravityG * 70)} kg`;
  document.getElementById("compare-mass-text").textContent =
    body.massEarth >= 1 ? `${body.massEarth.toFixed(2)}× Earth's mass`
                        : `${(body.massEarth * 100).toPrecision(3)}% of Earth's mass`;
  document.getElementById("compare-dist-text").textContent =
    body.distanceAU === 1 ? "1.0 AU — same orbit as Earth"
    : body.distanceAU < 1 ? `${fmtAU(body.distanceAU)} — ${(1 / body.distanceAU).toFixed(1)}× closer to Sun`
                          : `${fmtAU(body.distanceAU)} — ${body.distanceAU.toFixed(1)}× farther from Sun than Earth`;
}

/* ===== CONTROLS SETUP ===== */
function setupControls() {
  // Sort buttons
  document.querySelectorAll("[data-sort]").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.sort;
      if (state.sortKey === key) {
        state.sortDir *= -1;
      } else {
        state.sortKey = key;
        state.sortDir = -1;
      }
      document.querySelectorAll("[data-sort]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderGrid();
    });
  });

  // Filter buttons
  document.querySelectorAll("[data-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      const f = btn.dataset.filter;
      if (f === "All") {
        state.filters = new Set(["Planet", "Moon", "Dwarf Planet", "Candidate"]);
        document.querySelectorAll("[data-filter]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      } else {
        // Remove "All" active state
        document.querySelector("[data-filter='All']").classList.remove("active");
        if (state.filters.has(f)) {
          state.filters.delete(f);
          btn.classList.remove("active");
        } else {
          state.filters.add(f);
          btn.classList.add("active");
        }
        // If all 4 are active, switch back to "All"
        if (state.filters.size === 4) {
          document.querySelector("[data-filter='All']").classList.add("active");
        }
      }
      renderGrid();
    });
  });

  // Activate default sort
  document.querySelector("[data-sort='massEarth']").classList.add("active");
  document.querySelector("[data-filter='All']").classList.add("active");

  // Modal close
  document.getElementById("close-modal").addEventListener("click", closeModal);
  document.getElementById("modal-overlay").addEventListener("click", e => {
    if (e.target === document.getElementById("modal-overlay")) closeModal();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && state.activeModal) closeModal(); });

  // Comparison select
  const sel = document.getElementById("compare-select");
  BODIES.forEach(b => {
    const opt = document.createElement("option");
    opt.value = b.id;
    opt.textContent = `${b.name} (${b.classification})`;
    sel.appendChild(opt);
  });
  sel.value = "jupiter";
  sel.addEventListener("change", renderComparison);

  // Compare from modal button
  document.getElementById("compare-from-modal").addEventListener("click", () => {
    const id = state.activeModal;
    closeModal();
    document.getElementById("compare-select").value = id;
    renderComparison();
    document.getElementById("comparison-section").scrollIntoView({ behavior: "smooth" });
  });
}

/* ===== POPULATE COMPARE SELECT & INIT ===== */
function init() {
  setupControls();
  renderGrid();
  renderComparison();
}

document.addEventListener("DOMContentLoaded", init);
