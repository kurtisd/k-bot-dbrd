/** Visible diagnostics when something is wrong with DOM or data. */
function showDashboardErrors(message) {
  const el = document.getElementById("dashboardErrors");
  if (!el) {
    console.error("[dashboard]", message);
    return;
  }
  el.classList.remove("hidden");
  el.textContent = message;
}

function clearDashboardErrors() {
  const el = document.getElementById("dashboardErrors");
  if (!el) {
    return;
  }
  el.classList.add("hidden");
  el.textContent = "";
}

const REQUIRED_DOM_IDS = [
  "updatedAt",
  "freshnessBadge",
  "predictionMeta",
  "individualTop10",
  "pairsTop10",
  "tripletsTop3",
  "quadsTop3",
  "pairHitsTotal",
  "tripletHitsTotal",
  "quadHitsTotal",
  "reconciliationPoints",
  "last20Sequences",
];

function validateDashboardDom() {
  const missing = REQUIRED_DOM_IDS.filter((id) => !document.getElementById(id));
  if (missing.length) {
    return (
      `Missing HTML elements (is index.html out of date?): ${missing.join(", ")}\n\n` +
      `Page URL: ${window.location.href}`
    );
  }
  return null;
}

function renderRankedRows(container, items, valueFn) {
  if (!container) {
    return;
  }
  container.innerHTML = "";
  if (!items || !items.length) {
    container.innerHTML = '<div class="muted">No data</div>';
    return;
  }
  items.forEach((item, idx) => {
    const row = document.createElement("div");
    row.className = "row";
    const rank = item.rank ?? idx + 1;
    row.innerHTML = `
      <div class="rank">#${rank}</div>
      <div class="value">${valueFn(item)}</div>
      <div class="score">${Number(item.score ?? 0).toFixed(4)}</div>
    `;
    container.appendChild(row);
  });
}

function renderPredictionChips(container, items, valueFn) {
  if (!container) {
    return;
  }
  container.innerHTML = "";
  if (!items || !items.length) {
    container.innerHTML = '<div class="muted">No data</div>';
    return;
  }
  items.forEach((item, idx) => {
    const chip = document.createElement("span");
    chip.className = "combo-chip";
    const rank = Number(item.rank ?? idx + 1);
    chip.innerHTML = `
      <span class="chip-rank">#${rank}</span>
      <span>${valueFn(item)}</span>
      <span class="chip-score">${Number(item.score ?? 0).toFixed(3)}</span>
    `;
    container.appendChild(chip);
  });
}

function renderHotSingles(items) {
  const container = document.getElementById("hotSingles");
  if (!container) {
    return;
  }
  container.innerHTML = "";
  (items || []).slice(0, 5).forEach((it) => {
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = `${it.number} · ${Number(it.score ?? 0).toFixed(3)}`;
    container.appendChild(pill);
  });
}

function renderValidDrawIds(drawIds) {
  const summary = document.getElementById("validDrawSummary");
  const rangeRow = document.getElementById("validDrawRange");
  if (!summary) {
    return;
  }
  if (rangeRow) {
    rangeRow.innerHTML = "";
  }
  if (!drawIds || !drawIds.length) {
    summary.textContent = "Valid external draw IDs";
    if (rangeRow) {
      const chip = document.createElement("span");
      chip.className = "draw-chip";
      chip.textContent = "n/a";
      rangeRow.appendChild(chip);
    }
    return;
  }
  const first = drawIds[0];
  const last = drawIds[drawIds.length - 1];
  summary.textContent = "Valid external draw IDs";
  if (rangeRow) {
    const startChip = document.createElement("span");
    startChip.className = "draw-chip";
    startChip.textContent = `${first}`;
    const endChip = document.createElement("span");
    endChip.className = "draw-chip";
    endChip.textContent = `${last}`;
    const spanChip = document.createElement("span");
    spanChip.className = "draw-chip";
    spanChip.textContent = `${drawIds.length} draws`;
    rangeRow.appendChild(startChip);
    rangeRow.appendChild(endChip);
    rangeRow.appendChild(spanChip);
  } else {
    summary.textContent = `Valid external draw IDs: ${first} - ${last}`;
  }
}

/** HTML string: same draw-chip styling as Predictions tab (start, end, count). */
function externalDrawScopeChipsHtml(drawIds) {
  if (!drawIds || !drawIds.length) {
    return '<span class="draw-chip">n/a</span>';
  }
  const first = drawIds[0];
  const last = drawIds[drawIds.length - 1];
  return `<span class="draw-chip">${first}</span><span class="draw-chip">${last}</span><span class="draw-chip">${drawIds.length} draws</span>`;
}

function applyPredictionSnapshot(point) {
  const domErr = validateDashboardDom();
  if (domErr) {
    showDashboardErrors(domErr);
    return;
  }
  const snapshot = point?.prediction_snapshot || {};
  renderPredictionChips(
    document.getElementById("individualTop10"),
    snapshot.individual_top10 || [],
    (it) => `${it.number}`
  );
  renderPredictionChips(
    document.getElementById("pairsTop10"),
    snapshot.pairs_top10 || [],
    (it) => (it.values || []).join(", ")
  );
  renderPredictionChips(
    document.getElementById("tripletsTop3"),
    snapshot.triplets_top3 || [],
    (it) => (it.values || []).join(", ")
  );
  renderPredictionChips(
    document.getElementById("quadsTop3"),
    snapshot.quads_top3_non_overlapping_triplets || [],
    (it) => (it.values || []).join(", ")
  );
  const meta = document.getElementById("predictionMeta");
  if (meta) {
    meta.textContent = `Focused: ${point.prediction_label || "Prediction"}`;
  }
  renderValidDrawIds(snapshot.valid_for_external_draw_ids || []);
  setTab("predictions");
}

function renderReconciliationPoints(container, points) {
  if (!container) {
    return;
  }
  container.innerHTML = "";
  if (!points || !points.length) {
    container.innerHTML = '<div class="muted">No reconciliation history yet.</div>';
    return;
  }
  points.forEach((point) => {
    const item = document.createElement("div");
    item.className = "recon-item";
    const snap = point.prediction_snapshot || {};
    const scopeIds = Array.isArray(snap.valid_for_external_draw_ids) ? snap.valid_for_external_draw_ids : [];
    const scopeHtml = externalDrawScopeChipsHtml(scopeIds);
    const pairHits = Array.isArray(point.pair_hit_instances) ? point.pair_hit_instances : [];
    const tripletHits = Array.isArray(point.triplet_hit_instances) ? point.triplet_hit_instances : [];
    const quadHits = Array.isArray(point.quad_hit_instances) ? point.quad_hit_instances : [];
    const pairChips =
      pairHits.length > 0
        ? pairHits
            .map((h) => `<span class="hit-chip">${(h.values || []).join("-")} · x${Number(h.hit_count || 0)}</span>`)
            .join("")
        : '<span class="muted tiny">No predicted pairs have hit.</span>';
    const tripletChips =
      tripletHits.length > 0
        ? tripletHits
            .map((h) => `<span class="hit-chip">${(h.values || []).join("-")} · x${Number(h.hit_count || 0)}</span>`)
            .join("")
        : '<span class="muted tiny">No predicted triplets have hit.</span>';
    const quadChips =
      quadHits.length > 0
        ? quadHits
            .map((h) => `<span class="hit-chip">${(h.values || []).join("-")} · x${Number(h.hit_count || 0)}</span>`)
            .join("")
        : '<span class="muted tiny">No predicted quads have hit.</span>';
    item.innerHTML = `
      <div class="recon-topline">
        <div class="recon-title">${point.prediction_label || `Prediction #${point.prediction_id}`}</div>
        <div class="recon-sub">Draws: ${Number(point.actual_draws_analyzed || 0)}</div>
      </div>
      <div class="recon-scope">
        <div class="recon-sub">External draw scope</div>
        <div class="draw-range-row">${scopeHtml}</div>
      </div>
      <div class="recon-sub">
        Pair hits: ${Number(point.pair_hits || 0)} | Triplet hits: ${Number(point.triplet_hits || 0)} |
        Quad hits: ${Number(point.quad_hits || 0)} | Pair instances: ${Number(point.pair_hit_instances_total || 0)} |
        Triplet instances: ${Number(point.triplet_hit_instances_total || 0)} | Quad instances: ${Number(point.quad_hit_instances_total || 0)}
      </div>
      <div class="recon-sub">Pairs</div>
      <div class="hits-list">${pairChips}</div>
      <div class="recon-sub">Triplets</div>
      <div class="hits-list">${tripletChips}</div>
      <div class="recon-sub">Quads</div>
      <div class="hits-list">${quadChips}</div>
      <div class="recon-actions">
        <button class="mini-btn" type="button">View Prediction</button>
      </div>
    `;
    const button = item.querySelector(".mini-btn");
    if (button) {
      button.addEventListener("click", () => applyPredictionSnapshot(point));
    }
    container.appendChild(item);
  });
}


function renderSequenceCards(container, items) {
  if (!container) {
    return;
  }
  container.innerHTML = "";
  if (!items || !items.length) {
    container.innerHTML = '<div class="muted">No sequence data.</div>';
    return;
  }
  items.forEach((it, idx) => {
    const card = document.createElement("div");
    card.className = "sequence-card";
    const extId = Number(it.external_draw_id || 0);
    const drawLabel = extId > 0 ? extId : (it.sequence_id || `draw_${it.draw_id || idx + 1}`);
    const nums = Array.isArray(it.values) ? it.values : [];
    const numChips = nums.map((n) => `<span class="seq-num-chip">${n}</span>`).join("");
    card.innerHTML = `
      <div class="sequence-head">
        <span class="seq-rank-chip">#${idx + 1}</span>
        <span class="draw-chip">${drawLabel}</span>
      </div>
      <div class="seq-chip-grid">${numChips}</div>
    `;
    container.appendChild(card);
  });
}

function setTab(tabName) {
  ["predictions", "reconciliation", "sequences"].forEach((name) => {
    const section = document.getElementById(`tab-${name}`);
    const button = document.querySelector(`button[data-tab="${name}"]`);
    if (!section || !button) {
      console.warn("[dashboard] setTab skipped: missing tab-", name);
      return;
    }
    const active = name === tabName;
    section.classList.toggle("active", active);
    button.classList.toggle("active", active);
  });
}

async function loadDashboard() {
  const pathPrefix = window.location.pathname.includes("/dashboard/")
    ? window.location.pathname.split("/dashboard/")[0]
    : "";
  const candidates = [
    new URL("../dashboard-data/latest.json", window.location.href).toString(),
    new URL("dashboard-data/latest.json", window.location.href).toString(),
    `${window.location.origin}${pathPrefix}/dashboard-data/latest.json`,
  ];

  let lastStatus = "no-response";
  for (const url of [...new Set(candidates)]) {
    try {
      const resp = await fetch(url, { cache: "no-store" });
      if (resp.ok) {
        return resp.json();
      }
      lastStatus = `${resp.status} @ ${url}`;
    } catch (err) {
      lastStatus = `network-error @ ${url}`;
    }
  }
  throw new Error(`Failed to load dashboard data (${lastStatus})`);
}

function render(data) {
  clearDashboardErrors();
  const domErr = validateDashboardDom();
  if (domErr) {
    showDashboardErrors(domErr);
    return;
  }
  try {
    doRenderDashboard(data);
  } catch (err) {
    const msg =
      `[Render error] ${String(err?.message ?? err)}\n\n` +
      (err?.stack ? `${err.stack}\n\n` : "") +
      `Page URL: ${window.location.href}\n` +
      `If schema changed, regenerate: ./scripts/start_local_dashboard.sh`;
    showDashboardErrors(msg);
    console.error("[dashboard] render failed", err);
    const ua = document.getElementById("updatedAt");
    if (ua) {
      ua.textContent = `Render failed — see red box below`;
    }
  }
}

function doRenderDashboard(data) {
  const updatedAt = data.generated_at_utc || "unknown";
  const freshness = Number(data.meta?.freshness_seconds ?? 0);
  const ua = document.getElementById("updatedAt");
  const fb = document.getElementById("freshnessBadge");
  const pm = document.getElementById("predictionMeta");
  if (ua) {
    ua.textContent = `Updated: ${updatedAt}`;
  }
  if (fb) {
    fb.textContent = `${freshness}s old`;
  }
  if (pm) {
    pm.textContent = `Window: ${data.meta?.window_label ?? "-"}`;
  }

  const p = data.predictions || {};
  renderValidDrawIds(data.source?.valid_for_external_draw_ids || []);
  renderPredictionChips(
    document.getElementById("individualTop10"),
    p.individual_top10 || [],
    (it) => `${it.number}`
  );
  renderPredictionChips(
    document.getElementById("pairsTop10"),
    p.pairs_top10 || [],
    (it) => (it.values || []).join(", ")
  );
  renderPredictionChips(
    document.getElementById("tripletsTop3"),
    p.triplets_top3 || [],
    (it) => (it.values || []).join(", ")
  );
  renderPredictionChips(
    document.getElementById("quadsTop3"),
    p.quads_top3_non_overlapping_triplets || [],
    (it) => (it.values || []).join(", ")
  );

  const recon = data.reconciliation || {};
  const pht = document.getElementById("pairHitsTotal");
  const tht = document.getElementById("tripletHitsTotal");
  const qht = document.getElementById("quadHitsTotal");
  if (pht) {
    pht.textContent = String(recon.totals?.pair_hits ?? 0);
  }
  if (tht) {
    tht.textContent = String(recon.totals?.triplet_hits ?? 0);
  }
  if (qht) {
    qht.textContent = String(recon.totals?.quad_hits ?? 0);
  }
  renderReconciliationPoints(document.getElementById("reconciliationPoints"), recon.recent_points || []);

  renderSequenceCards(
    document.getElementById("last20Sequences"),
    data.sequences?.last_20_full || []
  );
}

function setupAccordions() {
  document.querySelectorAll(".accordion-trigger").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.accordionTarget;
      const panel = document.getElementById(targetId);
      if (!panel) {
        console.warn("[dashboard] accordion missing panel:", targetId);
        return;
      }
      const isOpen = panel.classList.contains("open");
      panel.classList.toggle("open", !isOpen);
      button.setAttribute("aria-expanded", String(!isOpen));
      const chev = button.querySelector(".chevron");
      if (chev) {
        chev.textContent = !isOpen ? "▾" : "▸";
      }
    });
  });
}

document.querySelectorAll(".tab-button").forEach((button) => {
  button.addEventListener("click", () => setTab(button.dataset.tab));
});
setupAccordions();

loadDashboard()
  .then(render)
  .catch((err) => {
    const hint =
      "Could not fetch dashboard-data/latest.json.\n\n" +
      "• Run from repo root: ./scripts/start_local_dashboard.sh\n" +
      "• Or export only: YOUR_VENV/bin/python combinatorial_prediction_engine.py \\\n    --export-dashboard-json dashboard-data/latest.json\n" +
      "• Serve repo root so /dashboard-data/latest.json resolves (not only /dashboard/).";
    showDashboardErrors(
      `[Fetch error] ${String(err?.message ?? err)}\n\n${hint}\n\nPage URL: ${window.location.href}`
    );
    const ua = document.getElementById("updatedAt");
    if (ua) {
      ua.textContent = "Failed to load dashboard data — see below";
    }
    console.error("[dashboard] load failed", err);
  });
