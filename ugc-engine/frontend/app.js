// UGC Outreach Engine — Premium Neo-Glassmorphism Dashboard
// Vanilla JS, no build step required.
// Features: Animated KPI counters, toast notifications, live activity feed,
// pipeline Kanban, debounced search, and premium micro-interactions.

const state = {
  section: "overview",
  clientId: "",
  activeConversation: null,
};

const CHANNEL_LABELS = {
  instagram_fb: "Instagram/FB",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  linkedin: "LinkedIn",
};
const channelLabel = (ch) => CHANNEL_LABELS[ch] || ch || "—";

// Display-only mirror of lib/phone_capture.py: the latest valid 10-digit Indian
// mobile (leading 6-9, optional +91/91/0) a CREATOR shared in the thread. Used
// only to render the capture banner; the backend does the authoritative store.
const _PHONE_TOKEN = /(\+?\d[\d\s\-.]{8,15}\d)/g;
function extractIndianMobile(text) {
  if (!text) return null;
  const matches = String(text).match(_PHONE_TOKEN) || [];
  for (const raw of matches) {
    let d = raw.replace(/\D/g, "");
    if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
    else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
    if (d.length === 10 && "6789".includes(d[0])) return d;
  }
  return null;
}
function detectWhatsappNumber(messages) {
  for (let i = (messages || []).length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      const num = extractIndianMobile(messages[i].content);
      if (num) return num;
    }
  }
  return null;
}

// The four source platforms an export can come from. WhatsApp is the derived
// final-contact channel, not a source, so it is not in this list.
const PLATFORMS = [
  { key: "instagram", label: "Instagram", icon: "📸", accent: "#e1306c", badge: "badge-critical" },
  { key: "facebook",  label: "Facebook",  icon: "📘", accent: "#1877f2", badge: "badge-info" },
  { key: "youtube",   label: "YouTube",   icon: "▶️", accent: "#ff4d4d", badge: "badge-warning" },
  { key: "linkedin",  label: "LinkedIn",  icon: "💼", accent: "#0a66c2", badge: "badge-info" },
];
const platformBadgeClass = (p) =>
  (PLATFORMS.find((x) => x.key === p) || {}).badge || "badge-neutral";

// Business/shop accounts get an odd "Hi {name} ji!" greeting from the message
// template (see README known limitations) -- flag them so whoever sends the
// DM knows to hand-adjust the opening line. Individual creators show nothing.
function profileTypeTag(r) {
  if (r.profile_type !== "business") return "";
  return '<span class="profile-type-tag" title="Business/shop account — the template\'s \'Hi {name} ji!\' opening may read oddly here; adjust before sending">🏢 Business</span>';
}

const STATUS_OPTIONS = ["Not Sent", "Sent", "Replied", "Converted", "Not Interested"];
const STATUS_BADGE_CLASS = {
  "Not Sent":      "badge-neutral",
  "Sent":          "badge-info",
  "Replied":       "badge-warning",
  "Converted":     "badge-good",
  "Not Interested":"badge-critical",
};

async function api(path, opts) {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// Only allow http(s) URLs in href attributes — anything else (javascript:,
// data:, etc.) collapses to a harmless "#".
function safeUrl(u) {
  try {
    const p = new URL(u, location.href);
    return /^https?:$/.test(p.protocol) ? p.href : "#";
  } catch {
    return "#";
  }
}

function badge(text, cls) {
  return `<span class="badge ${cls}"><span class="badge-dot"></span>${escapeHtml(text)}</span>`;
}

// --- Toast Notification System ──────────────────────────────────────────────

function showToast(message, type = "info", duration = 3500) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-out");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// --- Animated KPI Counter ───────────────────────────────────────────────────

function animateCounter(element, target, duration = 800) {
  const start = 0;
  const startTime = performance.now();
  const targetNum = parseInt(target) || 0;

  // requestAnimationFrame is suspended in hidden/throttled tabs, which would
  // leave the counter stuck at 0 even though the data loaded — set the real
  // value immediately and only animate when the page is actually visible.
  if (document.hidden) {
    element.textContent = targetNum.toLocaleString();
    return;
  }

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (targetNum - start) * eased);
    element.textContent = current.toLocaleString();
    if (progress < 1 && element.isConnected) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// --- Debounce utility ───────────────────────────────────────────────────────

function debounce(fn, delay = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// --- Time formatting ────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const now = new Date();
  // Assume UTC from SQLite unless the timestamp already carries a zone.
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(dateStr);
  const date = new Date(hasZone ? dateStr : dateStr + "Z");
  const diff = Math.max(0, Math.floor((now - date) / 1000));
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// --- Navigation ─────────────────────────────────────────────────────────────

function initNav() {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => switchSection(btn.dataset.section));
  });
}

function switchSection(section) {
  state.section = section;
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.section === section);
  });
  document.querySelectorAll(".section").forEach((el) => {
    el.hidden = el.id !== `section-${section}`;
  });
  const titles = {
    overview: "Overview", upload: "Upload Data", scrape: "Instagram Scraper", analyzer: "Profile Analyzer",
    verify: "Creator Verification", langlab: "Language Lab", translator: "Translator",
    whatsapp: "WhatsApp Contacts", creators: "Creators", conversations: "Conversations",
    spinner: "Message Variations",
    ops: "Ops Pipeline", dealers: "Dealers", actions: "Needs Action", clients: "Clients",
  };
  document.getElementById("section-title").textContent = titles[section] || section;
  loadSection(section);
}

function loadSection(section) {
  if (section === "overview") return loadOverview();
  if (section === "upload") return loadUpload();
  if (section === "scrape") return loadScrape();
  if (section === "analyzer") return loadAnalyzer();
  if (section === "verify") return loadVerify();
  if (section === "langlab") return loadLangLab();
  if (section === "translator") return loadTranslator();
  if (section === "whatsapp") return loadWhatsapp();
  if (section === "creators") return loadCreators();
  if (section === "ops") return loadOpsPipeline();
  if (section === "dealers") return loadDealers();
  if (section === "conversations") return loadConversations();
  if (section === "spinner") return loadSpinner();
  if (section === "actions") return loadActions();
  if (section === "clients") return loadClients();
  if (section === "shops") return loadShops();
}

// --- Client filter ──────────────────────────────────────────────────────────

async function loadClientFilter() {
  const clients = await api("/api/clients").catch(() => []);
  const sel = document.getElementById("client-filter");
  const current = sel.value;
  sel.innerHTML = '<option value="">All clients</option>' + clients.map(
    (c) => `<option value="${c.id}">${escapeHtml(c.brand_display_name || c.client_name)}</option>`
  ).join("");
  sel.value = current;
  return clients;
}

// --- Overview ───────────────────────────────────────────────────────────────

const KPI_DEFS = [
  { key: "total_creators",       label: "Total Creators",     color: "var(--accent)",        glow: "rgba(79,142,247,0.12)",   sub: "in outreach list",       icon: "📋" },
  { key: "whatsapp_ready",       label: "WhatsApp Ready",     color: "var(--accent-green)",  glow: "rgba(45,212,160,0.12)",   sub: "phone numbers found",    icon: "🟢" },
  { key: "active_conversations", label: "Live Chats",         color: "var(--accent-amber)",  glow: "rgba(245,166,35,0.12)",   sub: "AI negotiating now",     icon: "🤖" },
  { key: "deals_agreed",         label: "Deals Closed",       color: "var(--accent-violet)", glow: "rgba(167,139,250,0.12)",  sub: "creators converted",     icon: "🤝" },
  { key: "pending_human_actions",label: "Needs Review",       color: "var(--accent-red)",    glow: "rgba(241,96,101,0.12)",   sub: "human action required",  icon: "🔔" },
];

const PIPELINE_ITEMS = [
  { key: "total_creators",       label: "Total in List",         icon: "📋" },
  { key: "sent_count",           label: "Initial Message Sent",  icon: "📤" },
  { key: "replied_count",        label: "Creators Replied",      icon: "💬" },
  { key: "active_conversations", label: "AI Negotiating",        icon: "🤖" },
  { key: "deals_agreed",         label: "Deals Closed",          icon: "🤝" },
];

async function loadOverview() {
  const qs = state.clientId ? `?client_id=${state.clientId}` : "";
  const [stats, languages, feed] = await Promise.all([
    api(`/api/stats${qs}`).catch(() => ({})),
    api(`/api/language-breakdown${qs}`).catch(() => []),
    api(`/api/activity-feed${qs}`).catch(() => []),
  ]);

  // KPI tiles with animated counters
  document.getElementById("kpi-row").innerHTML = KPI_DEFS.map((k) => `
    <div class="kpi-tile" style="--kpi-color:${k.color}; --kpi-glow:${k.glow}">
      <div class="kpi-accent-bar"></div>
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value" data-target="${stats[k.key] ?? 0}">0</div>
      <div class="kpi-sub">${k.sub}</div>
    </div>
  `).join("");

  // Animate all KPI counters
  document.querySelectorAll(".kpi-value[data-target]").forEach((el) => {
    animateCounter(el, el.dataset.target);
  });

  // Language chart
  const maxCount = Math.max(1, ...languages.map((l) => l.count));
  const chartEl = document.getElementById("language-chart");
  chartEl.innerHTML = languages.length
    ? languages.map((l, i) => `
        <div class="bar-row" style="animation: fadeIn 0.4s ${i * 0.05}s ease backwards">
          <div class="bar-label">${escapeHtml(l.language || "Unknown")}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${(l.count / maxCount) * 100}%"></div></div>
          <div class="bar-count">${l.count}</div>
        </div>
      `).join("")
    : '<div class="empty-state">No language data yet.</div>';

  // Pipeline funnel
  const pipelineEl = document.getElementById("pipeline-chart");
  pipelineEl.innerHTML = PIPELINE_ITEMS.map((p, i) => `
    <div class="pipeline-row" style="animation: slideInLeft 0.3s ${i * 0.06}s ease backwards">
      <span class="pipeline-icon">${p.icon}</span>
      <span class="pipeline-label">${p.label}</span>
      <span class="pipeline-count">${stats[p.key] ?? 0}</span>
    </div>
  `).join("");

  // Activity feed
  renderActivityFeed(feed);
}

// --- Activity Feed ──────────────────────────────────────────────────────────

const ACTIVITY_ICONS = {
  "DEAL_AGREED": "🤝",
  "CEILING_BLOCKED": "⛔",
  "Creator message": "💬",
  "AI message": "🤖",
};

function renderActivityFeed(feed) {
  const container = document.getElementById("activity-feed-list");
  if (!feed || feed.length === 0) {
    container.innerHTML = '<div class="empty-state">No activity yet. Events will appear here as creators interact.</div>';
    return;
  }
  container.innerHTML = feed.slice(0, 20).map((item, i) => {
    const icon = ACTIVITY_ICONS[item.event] || "📌";
    const eventText = item.event === "DEAL_AGREED" ? "Deal agreed"
                    : item.event === "CEILING_BLOCKED" ? "Budget ceiling hit"
                    : item.event;
    return `
      <div class="activity-item" style="animation-delay: ${i * 0.04}s">
        <div class="activity-icon">${icon}</div>
        <div class="activity-text">
          <strong>${escapeHtml(eventText)}</strong> —
          ${escapeHtml(item.contact_id || "Unknown")}
          ${item.channel ? ` via ${channelLabel(item.channel)}` : ""}
          ${item.detail ? `<br><span style="color:var(--text-muted)">${escapeHtml(item.detail.substring(0, 80))}${item.detail.length > 80 ? '…' : ''}</span>` : ""}
        </div>
        <div class="activity-time">${timeAgo(item.created_at)}</div>
      </div>
    `;
  }).join("");
}

// --- Creators ───────────────────────────────────────────────────────────────

async function loadCreators() {
  const params = new URLSearchParams();
  if (state.clientId) params.set("client_id", state.clientId);
  const status = document.getElementById("creator-status-filter").value;
  const platform = document.getElementById("creator-channel-filter").value;
  if (status) params.set("status", status);
  if (platform) params.set("source_platform", platform);

  const rows = await api(`/api/creators?${params.toString()}`).catch(() => []);
  document.getElementById("creators-count").textContent = `${rows.length} creator${rows.length === 1 ? "" : "s"}`;
  document.getElementById("creators-empty").hidden = rows.length > 0;

  document.querySelector("#creators-table tbody").innerHTML = rows.map((r) => `
    <tr>
      <td>
        <div style="font-weight:700">${escapeHtml(r.full_name || "Unknown")} ${profileTypeTag(r)}</div>
        <div style="display:flex; align-items:center; gap:8px; font-size:11.5px;color:var(--text-muted)">
          ${r.profile_link ? `<a href="${escapeHtml(safeUrl(r.profile_link))}" target="_blank" rel="noopener">@${escapeHtml(r.username)}</a>` : `@${escapeHtml(r.username || "")}`}
          ${(r.source_platform === "instagram" || r.channel === "instagram") && r.username ? `<button class="btn btn-small" style="padding: 2px 6px; font-size: 10px; height: 20px" data-analyze data-username="${escapeHtml(r.username)}">🔍 Analyze</button>` : ""}
        </div>
      </td>
      <td>${badge(channelLabel(r.source_platform || r.channel), platformBadgeClass(r.source_platform || r.channel))}</td>
      <td class="muted">${escapeHtml(r.language || "—")}</td>
      <td class="muted">${escapeHtml(r.niche || "—")}</td>
      <td class="muted">${r.phone ? escapeHtml(r.phone) : "—"}</td>
      <td>
        <span class="badge ${STATUS_BADGE_CLASS[r.status] || "badge-neutral"}">
          <span class="badge-dot"></span>
          <select class="status-select" data-id="${r.id}" aria-label="Status for ${escapeHtml(r.username || r.full_name || "creator")}">
            ${STATUS_OPTIONS.map((s) => `<option value="${s}" ${s === r.status ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </span>
      </td>
    </tr>
  `).join("");

  document.querySelectorAll("#creators-table .status-select").forEach((sel) => {
    sel.addEventListener("change", async () => {
      try {
        await api(`/api/creators/${sel.dataset.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: sel.value }),
        });
        showToast(`Status updated to "${sel.value}"`, "success");
      } catch (err) {
        showToast(err.message || "Request failed", "error");
      }
      loadCreators();
    });
  });

  document.querySelectorAll("#creators-table [data-analyze]").forEach((el) => {
    el.addEventListener("click", () => analyzeUser(el.dataset.username));
  });
}

// --- Ops Pipeline (post-deal fulfillment) ───────────────────────────────────

const OPS_STAGES = ["", "Product Purchased", "Content Posted", "Content Verified", "Payout Sent"];
const OPS_STAGE_LABELS = { "": "Not started" };
const OPS_STAGE_BADGE_CLASS = {
  "":                  "badge-neutral",
  "Product Purchased": "badge-info",
  "Content Posted":    "badge-warning",
  "Content Verified":  "badge-active",
  "Payout Sent":       "badge-good",
};

async function loadOpsPipeline() {
  const params = new URLSearchParams();
  if (state.clientId) params.set("client_id", state.clientId);
  const rows = await api(`/api/ops-pipeline?${params.toString()}`).catch(() => []);

  document.getElementById("ops-count").textContent = `${rows.length} converted deal${rows.length === 1 ? "" : "s"}`;
  document.getElementById("ops-empty").hidden = rows.length > 0;

  document.querySelector("#ops-table tbody").innerHTML = rows.map((r) => `
    <tr>
      <td>
        <div style="font-weight:700">${escapeHtml(r.full_name || "Unknown")} ${profileTypeTag(r)}</div>
        <div style="font-size:11.5px;color:var(--text-muted)">@${escapeHtml(r.username || "")}</div>
      </td>
      <td>${badge(channelLabel(r.source_platform || r.channel), platformBadgeClass(r.source_platform || r.channel))}</td>
      <td class="muted">${escapeHtml(r.niche || "—")}</td>
      <td class="muted">${r.phone ? escapeHtml(r.phone) : "—"}</td>
      <td>
        <span class="badge ${OPS_STAGE_BADGE_CLASS[r.ops_stage || ""] || "badge-neutral"}">
          <span class="badge-dot"></span>
          <select class="status-select" data-id="${r.id}" aria-label="Status for ${escapeHtml(r.username || r.full_name || "creator")}">
            ${OPS_STAGES.map((s) => `<option value="${s}" ${s === (r.ops_stage || "") ? "selected" : ""}>${OPS_STAGE_LABELS[s] || s}</option>`).join("")}
          </select>
        </span>
      </td>
      <td>
        ${r.qc_score != null
          ? `<span class="badge ${r.qc_verdict === "Approve" ? "badge-good" : "badge-warning"}" style="cursor:pointer" data-qcbtn="${r.id}" title="Re-run QC">${r.qc_score}/10 · ${escapeHtml(r.qc_verdict || "")}</span>`
          : `<button class="btn btn-small" data-qcbtn="${r.id}">🤖 Run QC</button>`}
      </td>
    </tr>
  `).join("");

  document.querySelectorAll("#ops-table .status-select").forEach((sel) => {
    sel.addEventListener("change", async () => {
      try {
        await api(`/api/creators/${sel.dataset.id}`, {
          method: "PATCH",
          body: JSON.stringify({ ops_stage: sel.value }),
        });
        showToast(`Fulfillment stage updated to "${OPS_STAGE_LABELS[sel.value] || sel.value}"`, "success");
      } catch (err) {
        showToast(err.message || "Request failed", "error");
      }
      loadOpsPipeline();
    });
  });

  document.querySelectorAll("#ops-table [data-qcbtn]").forEach((el) => {
    el.addEventListener("click", () => {
      const row = rows.find((r) => String(r.id) === el.dataset.qcbtn);
      if (row) openQcModal(row);
    });
  });
}

// --- AI Content QC modal ────────────────────────────────────────────────────

let qcPolling = false;
let qcInterval = null;

function setQcStatus(text, cls) {
  const el = document.getElementById("qc-status");
  el.textContent = text;
  el.className = "scrape-status" + (cls ? " " + cls : "");
}

function openQcModal(creator) {
  const modal = document.getElementById("qc-modal");
  const title = document.getElementById("qc-modal-title");
  const urlInput = document.getElementById("qc-content-url");
  const runBtn = document.getElementById("qc-run-btn");
  const cancelBtn = document.getElementById("qc-cancel-btn");
  const closeBtn = document.getElementById("qc-modal-close");
  const resultEl = document.getElementById("qc-result");

  title.textContent = `AI Content QC — @${creator.username || creator.full_name || ""}`;
  urlInput.value = creator.content_url || "";
  setQcStatus("");
  resultEl.style.display = "none";
  runBtn.disabled = false;
  runBtn.textContent = "▶ Run QC";

  if (creator.qc_score != null) {
    renderQcResult({
      score: creator.qc_score, verdict: creator.qc_verdict,
      summary: "", pros: [], cons: [],
    });
  }

  function close() {
    modal.hidden = true;
    qcPolling = false;
    clearInterval(qcInterval);
    qcInterval = null;
    runBtn.onclick = null;
    cancelBtn.onclick = null;
    closeBtn.onclick = null;
  }
  cancelBtn.onclick = close;
  closeBtn.onclick = close;

  runBtn.onclick = async () => {
    if (qcPolling) return;
    const contentUrl = urlInput.value.trim();
    if (!contentUrl) {
      setQcStatus("Enter a content URL first.", "error");
      return;
    }
    qcPolling = true;
    runBtn.disabled = true;
    resultEl.style.display = "none";
    setQcStatus("Fetching content & running AI QC…", "");

    try {
      const start = await api("/api/qc/run", {
        method: "POST",
        body: JSON.stringify({ client_id: state.clientId || creator.client_id, creator_id: creator.id, content_url: contentUrl }),
      });
      const runId = start.run_id;
      const params = new URLSearchParams({ run_id: runId, client_id: state.clientId || creator.client_id, creator_id: creator.id, content_url: contentUrl });
      clearInterval(qcInterval);
      qcInterval = setInterval(async () => {
        try {
          const res = await api(`/api/qc/status?${params.toString()}`);
          if (res.error) {
            clearInterval(qcInterval);
            qcPolling = false;
            runBtn.disabled = false;
            setQcStatus(`QC failed: ${res.error}`, "error");
            return;
          }
          if (res.status === "SUCCEEDED" && res.result) {
            clearInterval(qcInterval);
            qcPolling = false;
            runBtn.disabled = false;
            setQcStatus("");
            renderQcResult(res.result);
            loadOpsPipeline();
            return;
          }
          setQcStatus(`AI is analyzing content… (${res.status})`, "");
        } catch (err) {
          clearInterval(qcInterval);
          qcPolling = false;
          runBtn.disabled = false;
          setQcStatus(err.message, "error");
        }
      }, 4000);
    } catch (err) {
      qcPolling = false;
      runBtn.disabled = false;
      setQcStatus(err.message, "error");
    }
  };

  modal.hidden = false;
}

function renderQcResult(result) {
  const resultEl = document.getElementById("qc-result");
  resultEl.style.display = "block";
  document.getElementById("qc-result-badges").innerHTML = [
    badge(`${result.score ?? "—"}/10`, "badge-info"),
    badge(result.verdict || "—", result.verdict === "Approve" ? "badge-good" : "badge-warning"),
    result.disclosure_present === false ? badge("No disclosure detected", "badge-critical") : "",
  ].join("");
  document.getElementById("qc-result-summary").textContent = result.summary || "";
  document.getElementById("qc-result-pros").innerHTML = (result.pros || []).map((p) => `<li>• ${escapeHtml(p)}</li>`).join("");
  document.getElementById("qc-result-cons").innerHTML = (result.cons || []).map((c) => `<li>• ${escapeHtml(c)}</li>`).join("");
}

async function refreshOpsBadge() {
  const rows = await api("/api/ops-pipeline").catch(() => []);
  const badgeEl = document.getElementById("ops-badge");
  const pending = rows.filter((r) => r.ops_stage !== "Payout Sent").length;
  badgeEl.hidden = pending === 0;
  badgeEl.textContent = pending;
}

// --- Dealers (V2 PIN-code lookup scaffold) ──────────────────────────────────

let dealersFile = null;

function initDealers() {
  document.getElementById("dealers-client-select").addEventListener("change", loadDealers);
  const dropzone = document.getElementById("dealers-dropzone");
  const fileInput = document.getElementById("dealers-fileinput");
  const fileNameEl = document.getElementById("dealers-filename");
  const btn = document.getElementById("dealers-upload-btn");
  const msgEl = document.getElementById("dealers-msg");

  function setFile(file) {
    dealersFile = file || null;
    fileNameEl.hidden = !file;
    fileNameEl.textContent = file ? file.name : "";
    btn.disabled = !file;
  }

  dropzone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => setFile(fileInput.files[0] || null));
  ["dragenter", "dragover"].forEach((evt) => dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  }));
  ["dragleave", "drop"].forEach((evt) => dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
  }));
  dropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    if (file) setFile(file);
  });

  btn.addEventListener("click", async () => {
    msgEl.textContent = "";
    msgEl.className = "form-message";
    const clientId = document.getElementById("dealers-client-select").value;
    if (!clientId) {
      msgEl.textContent = "Pick a client first.";
      msgEl.className = "form-message error";
      return;
    }
    if (!dealersFile) return;

    btn.disabled = true;
    btn.textContent = "Uploading…";
    const formData = new FormData();
    formData.append("client_id", clientId);
    formData.append("file", dealersFile);
    try {
      const res = await fetch("/api/dealers/upload", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Upload failed");
      msgEl.textContent = `✓ ${body.total_dealers} dealers loaded`;
      msgEl.className = "form-message success";
      showToast(`${body.total_dealers} dealers imported`, "success");
      setFile(null);
      fileInput.value = "";
      loadDealers();
    } catch (err) {
      msgEl.textContent = err.message;
      msgEl.className = "form-message error";
      showToast(err.message, "error");
    } finally {
      btn.disabled = !dealersFile;
      btn.textContent = "Upload dealer list";
    }
  });
}

async function loadDealers() {
  const clients = await api("/api/clients").catch(() => []);
  const sel = document.getElementById("dealers-client-select");
  const current = sel.value;
  sel.innerHTML = clients.length
    ? clients.map((c) => `<option value="${c.id}">${escapeHtml(c.brand_display_name || c.client_name)}</option>`).join("")
    : '<option value="">No clients yet — add one in the Clients tab first</option>';
  if (current) sel.value = current;

  const clientId = sel.value;
  const params = new URLSearchParams();
  if (clientId) params.set("client_id", clientId);
  const dealers = await api(`/api/dealers?${params.toString()}`).catch(() => []);

  document.getElementById("dealers-count").textContent = `${dealers.length} dealer${dealers.length === 1 ? "" : "s"} on file`;
  document.getElementById("dealers-empty").hidden = dealers.length > 0;
  document.querySelector("#dealers-table tbody").innerHTML = dealers.map((d) => `
    <tr>
      <td style="font-weight:700">${escapeHtml(d.dealer_name || "—")}</td>
      <td class="muted">${escapeHtml(d.pincode || "—")}</td>
      <td class="muted">${escapeHtml(d.city || "—")}</td>
      <td class="muted">${escapeHtml(d.state || "—")}</td>
      <td class="muted">${escapeHtml(d.phone || "—")}</td>
    </tr>
  `).join("");
}

// --- Conversations ──────────────────────────────────────────────────────────

// Conversation hiding is VIEW-ONLY and server-side: the backend flags rows as
// hidden (persisted in settings, so the hide applies on every browser) and we
// filter them here. Nothing deletes any message; "Show all" restores them.
async function loadConversations() {
  const channelSel = document.getElementById("conv-channel-filter");
  // Re-run the load whenever the channel filter changes (bind once).
  if (channelSel && !channelSel.dataset.bound) {
    channelSel.dataset.bound = "1";
    channelSel.addEventListener("change", loadConversations);
  }
  // Reflect whether auto-capture is active (needs a specific client selected).
  const hintEl = document.getElementById("conv-capture-hint");
  if (hintEl) {
    hintEl.textContent = state.clientId
      ? "🟢 Auto-routing on: any WhatsApp number a creator shares here is added to the WhatsApp section for this client."
      : "Select a client in the sidebar to auto-route any WhatsApp number a creator shares here into the WhatsApp section.";
  }

  const channel = channelSel ? channelSel.value : "";
  const params = new URLSearchParams();
  if (state.clientId) params.set("client_id", state.clientId);
  if (channel) params.set("channel", channel);
  const convs = await api(`/api/conversations?${params.toString()}`).catch(() => []);
  const anyCaptured = convs.some((c) => c.whatsapp_captured);

  // Filter out conversations the operator has hidden (server-flagged, see above).
  const visible = convs.filter((c) => !c.hidden);
  const hiddenCount = convs.length - visible.length;

  const listItemsEl = document.getElementById("conv-list-items");
  const hiddenBar = hiddenCount > 0
    ? `<div class="conv-hidden-bar">${hiddenCount} hidden · <span class="conv-unhide-all" role="button" tabindex="0">Show all</span></div>`
    : "";
  const items = visible.map((c) => `
    <div class="conv-item-wrap">
      <button class="conv-item" data-client="${escapeHtml(c.client_id)}" data-channel="${escapeHtml(c.channel)}" data-contact="${escapeHtml(c.contact_id)}">
        <div class="conv-item-top">
          <span>${escapeHtml(c.contact_id)}</span>
          <span class="conv-item-channel">${channelLabel(c.channel)}</span>
        </div>
        <div class="conv-item-preview">${escapeHtml(c.last_message || "No messages yet")}</div>
        ${c.whatsapp_captured || c.detected_whatsapp ? '<div class="conv-item-captured">🟢 WhatsApp number captured → WhatsApp section</div>' : ""}
      </button>
      <span class="conv-item-hide" role="button" tabindex="0" title="Hide from list" aria-label="Hide conversation" data-channel="${escapeHtml(c.channel)}" data-contact="${escapeHtml(c.contact_id)}">✕</span>
    </div>`).join("");
  listItemsEl.innerHTML = hiddenBar
    + (visible.length ? items : (hiddenCount > 0 ? "" : '<div class="empty-state">No conversations yet.</div>'));

  listItemsEl.querySelectorAll(".conv-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      listItemsEl.querySelectorAll(".conv-item").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      openConversation(btn.dataset.client, btn.dataset.channel, btn.dataset.contact);
    });
  });

  // Hide (✕) removes a row from view only — the DB row is untouched.
  listItemsEl.querySelectorAll(".conv-item-hide").forEach((el) => {
    const hide = async (e) => {
      e.stopPropagation();
      try {
        await api("/api/conversations/hide", {
          method: "POST",
          body: JSON.stringify({ channel: el.dataset.channel, contact_id: el.dataset.contact }),
        });
        loadConversations();
      } catch (err) { showToast(err.message || "Failed to hide", "error"); }
    };
    el.addEventListener("click", hide);
    el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") hide(e); });
  });
  const unhideAll = listItemsEl.querySelector(".conv-unhide-all");
  if (unhideAll) unhideAll.addEventListener("click", async () => {
    try {
      await api("/api/conversations/unhide", { method: "POST", body: JSON.stringify({ all: true }) });
      loadConversations();
    } catch (err) { showToast(err.message || "Failed to unhide", "error"); }
  });

  // A number captured during this list load means the WhatsApp funnel grew.
  if (anyCaptured) refreshWhatsappBadge();

  // Search filter with debounce
  const searchEl = document.getElementById("conv-search");
  searchEl.oninput = debounce(() => {
    const q = searchEl.value.toLowerCase();
    listItemsEl.querySelectorAll(".conv-item").forEach((btn) => {
      btn.style.display = btn.textContent.toLowerCase().includes(q) ? "" : "none";
    });
  }, 200);
}

async function openConversation(clientId, channel, contactId) {
  state.activeConversation = { clientId, channel, contactId };
  const params = new URLSearchParams({ client_id: clientId, channel, contact_id: contactId });
  // Attribute any captured number to the active client (IG/Messenger threads
  // aren't tied to a client themselves). Only sent when a client is selected.
  if (state.clientId) params.set("capture_client_id", state.clientId);
  const messages = await api(`/api/conversations/messages?${params.toString()}`).catch(() => []);

  // Client-side detection mirrors the backend rule (10-digit Indian mobile in a
  // creator message) purely to show the banner; the backend did the storing.
  // The backend now auto-captures to the default client even under "All
  // clients", so a detected number is always added to the WhatsApp section.
  const capturedNumber = detectWhatsappNumber(messages);
  if (capturedNumber) refreshWhatsappBadge();

  const threadEl = document.getElementById("conv-thread");
  const captureBanner = capturedNumber
    ? `<div class="thread-capture-banner">🟢 WhatsApp number <b>+91${escapeHtml(capturedNumber)}</b> captured → added to the WhatsApp section</div>`
    : "";
  const header = `
    <div class="thread-header">
      <h3>${escapeHtml(contactId)}</h3>
      ${badge(channelLabel(channel), "badge-info")}
    </div>
    ${captureBanner}`;
  const body = messages.length
    ? messages.map((m, i) => `
        <div style="animation: msgIn 0.2s ${i * 0.05}s ease backwards">
          <div class="msg-label">${m.role === "user" ? "Creator" : "AI Agent"}</div>
          <div class="msg msg-${m.role === "user" ? "user" : "assistant"}">${escapeHtml(m.content)}</div>
        </div>`).join("")
    : '<div class="empty-state">No messages in this conversation yet.</div>';

  // Instagram threads support human replies (proxied to the chatbot). Other
  // channels are read-only here, so no composer is shown for them.
  const composer = channel === "instagram" ? `
    <div class="thread-composer">
      <input type="text" id="conv-reply-input" placeholder="Reply as a human…" autocomplete="off">
      <button class="btn btn-primary" id="conv-reply-send">Send</button>
    </div>` : "";

  threadEl.innerHTML = header + body + composer;
  threadEl.scrollTop = threadEl.scrollHeight;

  if (channel === "instagram") wireReplyComposer(clientId, contactId);
}

function wireReplyComposer(clientId, contactId) {
  const input = document.getElementById("conv-reply-input");
  const sendBtn = document.getElementById("conv-reply-send");
  if (!input || !sendBtn) return;

  const send = async () => {
    const message = input.value.trim();
    if (!message) return;
    sendBtn.disabled = true;
    input.disabled = true;
    try {
      await api("/api/conversations/instagram/send", {
        method: "POST",
        body: JSON.stringify({ contact_id: contactId, message }),
      });
      input.value = "";
      showToast("Reply sent", "success");
      // Refresh the thread + list so the new message and preview show.
      await openConversation(clientId, "instagram", contactId);
      loadConversations();
    } catch (e) {
      showToast(e.message || "Failed to send reply", "error");
      sendBtn.disabled = false;
      input.disabled = false;
      input.focus();
    }
  };

  sendBtn.addEventListener("click", send);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  input.focus();
}

// --- Message Variations (spam-safe outreach rewrites) ───────────────────────

function loadSpinner() {
  const btn = document.getElementById("spinner-generate-btn");
  // Bind the click handler once (loadSpinner runs on every tab switch).
  if (btn && !btn.dataset.bound) {
    btn.dataset.bound = "1";
    btn.addEventListener("click", generateVariations);
  }
}

async function generateVariations() {
  const input = document.getElementById("spinner-input");
  const countSel = document.getElementById("spinner-count");
  const btn = document.getElementById("spinner-generate-btn");
  const resultsEl = document.getElementById("spinner-results");
  const sentence = (input.value || "").trim();

  if (!sentence) {
    setSpinnerStatus("Type a message first.", "error");
    input.focus();
    return;
  }

  btn.disabled = true;
  setSpinnerStatus("Generating variations…", "");
  resultsEl.innerHTML = "";
  try {
    const data = await api("/api/message-variations", {
      method: "POST",
      body: JSON.stringify({ sentence, count: parseInt(countSel.value, 10) }),
    });
    const variations = data.variations || [];
    if (!variations.length) {
      setSpinnerStatus("No variations returned. Try again.", "error");
      return;
    }
    resultsEl.innerHTML = variations.map((v, i) => `
      <div class="spinner-item">
        <span class="spinner-item-num">${i + 1}</span>
        <span class="spinner-item-text">${escapeHtml(v)}</span>
        <button class="btn btn-small spinner-copy-btn" data-text="${escapeHtml(v)}">Copy</button>
      </div>
    `).join("");
    // Wire copy buttons.
    resultsEl.querySelectorAll(".spinner-copy-btn").forEach((cb) => {
      cb.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(cb.dataset.text);
          cb.textContent = "Copied ✓";
          showToast("Copied to clipboard", "success");
          setTimeout(() => { cb.textContent = "Copy"; }, 1500);
        } catch {
          showToast("Copy failed — select and copy manually", "error");
        }
      });
    });
    setSpinnerStatus(`${variations.length} variations ready. Copy a different one for each creator.`, "success");
  } catch (e) {
    setSpinnerStatus(e.message || "Failed to generate variations", "error");
  } finally {
    btn.disabled = false;
  }
}

function setSpinnerStatus(msg, kind) {
  const el = document.getElementById("spinner-status");
  if (!el) return;
  el.textContent = msg;
  el.style.color = kind === "error" ? "var(--danger, #e5484d)"
    : kind === "success" ? "#16b364" : "var(--text-muted)";
}

// --- Needs Action ───────────────────────────────────────────────────────────

async function loadActions() {
  const showResolved = document.getElementById("show-resolved").checked;
  const rows = await api(`/api/human-actions?resolved=${showResolved ? "" : "0"}`).catch(() => []);
  const filtered = state.clientId ? rows.filter((r) => String(r.client_id) === String(state.clientId)) : rows;

  document.getElementById("actions-empty").hidden = filtered.length > 0;
  document.querySelector("#actions-table tbody").innerHTML = filtered.map((r) => `
    <tr>
      <td class="muted" style="font-size:11.5px">${escapeHtml(r.created_at || "")}</td>
      <td>${badge(r.event === "DEAL_AGREED" ? "Deal Agreed ✓" : "Budget Ceiling", r.event === "DEAL_AGREED" ? "badge-good" : "badge-critical")}</td>
      <td>${badge(channelLabel(r.channel), "badge-info")}</td>
      <td style="font-weight:700">${escapeHtml(r.contact_id)}</td>
      <td class="muted">${escapeHtml(r.detail || "")}</td>
      <td>${r.resolved ? '<span class="muted" style="font-size:12px">✓ Resolved</span>' : `<button class="btn btn-small resolve-btn" data-id="${r.id}">Mark Resolved</button>`}</td>
    </tr>
  `).join("");

  document.querySelectorAll(".resolve-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      try {
        await api(`/api/human-actions/${btn.dataset.id}/resolve`, { method: "POST" });
        showToast("Action marked as resolved", "success");
        refreshActionsBadge();
      } catch (err) {
        showToast(err.message || "Request failed", "error");
      } finally {
        btn.disabled = false;
      }
      loadActions();
    });
  });
}

async function refreshActionsBadge() {
  const pending = await api("/api/human-actions?resolved=0").catch(() => []);
  const badgeEl = document.getElementById("actions-badge");
  badgeEl.hidden = pending.length === 0;
  badgeEl.textContent = pending.length;
}

// --- Upload Data (4 platform cards) ─────────────────────────────────────────

let uploadCardsBuilt = false;
const selectedFiles = {}; // platform -> File

function buildUploadCards() {
  const grid = document.getElementById("upload-grid");
  grid.innerHTML = PLATFORMS.map((p) => `
    <div class="upload-card" data-platform="${p.key}" style="--plat-accent:${p.accent}">
      <div class="upload-card-head">
        <span class="upload-card-icon">${p.icon}</span>
        <div>
          <div class="upload-card-title">${p.label}</div>
          <div class="upload-card-stat" data-stat="${p.key}">No uploads yet</div>
        </div>
      </div>
      <div class="dropzone platform-dropzone" data-platform="${p.key}">
        <div class="dropzone-icon">${p.icon}</div>
        <p>Drop <b>${p.label}</b> .xlsx, or <span class="dropzone-browse">browse</span></p>
        <div class="dropzone-filename muted" data-filename="${p.key}" hidden></div>
        <input type="file" data-fileinput="${p.key}" accept=".xlsx,.xls" hidden>
      </div>
      <button class="btn btn-primary" data-uploadbtn="${p.key}" disabled>Process file</button>
      <div class="form-message" data-msg="${p.key}"></div>
      ${p.key === "instagram"
        ? '<div class="upload-card-note">Or scrape live via the Instagram Scraper tab</div>'
        : '<div class="upload-card-note">Upload / export only — no live API</div>'}
    </div>
  `).join("");

  PLATFORMS.forEach((p) => wireUploadCard(p.key));
  uploadCardsBuilt = true;
}

function wireUploadCard(platform) {
  const card = document.querySelector(`.upload-card[data-platform="${platform}"]`);
  const dropzone = card.querySelector(".dropzone");
  const fileInput = card.querySelector("[data-fileinput]");
  const fileNameEl = card.querySelector("[data-filename]");
  const btn = card.querySelector("[data-uploadbtn]");
  const msgEl = card.querySelector("[data-msg]");

  function setFile(file) {
    selectedFiles[platform] = file || null;
    fileNameEl.hidden = !file;
    fileNameEl.textContent = file ? file.name : "";
    btn.disabled = !file;
  }

  dropzone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => setFile(fileInput.files[0] || null));
  ["dragenter", "dragover"].forEach((evt) => dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  }));
  ["dragleave", "drop"].forEach((evt) => dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
  }));
  dropzone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    if (file) setFile(file);
  });

  btn.addEventListener("click", async () => {
    msgEl.textContent = "";
    msgEl.className = "form-message";
    const clientId = document.getElementById("upload-client-select").value;
    if (!clientId) {
      msgEl.textContent = "Pick a client first.";
      msgEl.className = "form-message error";
      showToast("Select a client before uploading", "error");
      return;
    }
    const file = selectedFiles[platform];
    if (!file) return;

    btn.disabled = true;
    btn.textContent = "Reading file…";
    try {
      const formData = new FormData();
      formData.append("client_id", clientId);
      formData.append("platform", platform);
      formData.append("file", file);
      const res = await fetch("/api/upload/preview", { method: "POST", body: formData });
      const preview = await res.json();
      if (!res.ok) throw new Error(preview.error || "Preview failed");
      openPreviewModal(platform, clientId, file, preview, { setFile, fileInput, msgEl });
    } catch (err) {
      msgEl.textContent = err.message;
      msgEl.className = "form-message error";
      showToast(err.message, "error");
    } finally {
      btn.disabled = !selectedFiles[platform];
      btn.textContent = "Process file";
    }
  });
}

// --- Upload preview modal ───────────────────────────────────────────────────

const PREVIEW_SAMPLE_COLS = [
  { key: "Full Name", label: "Name" },
  { key: "Username", label: "Username" },
  { key: "Phone", label: "Phone" },
  { key: "Niche", label: "Niche" },
  { key: "Location (raw)", label: "Location" },
  { key: "Language", label: "Language" },
];

function renderPreviewBody(preview) {
  const modeLabel = preview.mode === "apify_two_sheet" ? "Apify export (Profiles + Posts sheets)" : "Flat spreadsheet export";

  let mappingHtml = "";
  if (preview.field_mapping) {
    mappingHtml = `
      <div>
        <div class="preview-section-title">Detected column mapping ${preview.header_row != null ? `· header row ${preview.header_row + 1}` : ""}</div>
        <div class="preview-table-wrap">
          <table class="preview-mapping-table">
            <thead><tr><th>Field</th><th>Matched spreadsheet column</th></tr></thead>
            <tbody>
              ${Object.entries(preview.field_mapping).map(([field, col]) => `
                <tr>
                  <td>${escapeHtml(field)}</td>
                  <td>${col ? `<span class="preview-matched">✓ ${escapeHtml(col)}</span>` : '<span class="preview-unmatched">✗ not found</span>'}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  const sampleHtml = preview.sample && preview.sample.length ? `
    <div>
      <div class="preview-section-title">Sample rows (first ${preview.sample.length} of ${preview.total_rows})</div>
      <div class="preview-table-wrap">
        <table class="preview-sample-table">
          <thead><tr>${PREVIEW_SAMPLE_COLS.map((c) => `<th>${c.label}</th>`).join("")}</tr></thead>
          <tbody>
            ${preview.sample.map((row) => `
              <tr>${PREVIEW_SAMPLE_COLS.map((c) => `<td>${escapeHtml(row[c.key] || "—")}</td>`).join("")}</tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </div>` : '<div class="empty-state">No rows detected in this file — check the sheet format.</div>';

  return `
    <div class="preview-stat-row">
      ${badge(modeLabel, "badge-info")}
      ${badge(`${preview.total_rows} row${preview.total_rows === 1 ? "" : "s"}`, "badge-neutral")}
      ${badge(`${preview.phones_found} phone${preview.phones_found === 1 ? "" : "s"} found`, preview.phones_found ? "badge-good" : "badge-neutral")}
    </div>
    ${mappingHtml}
    ${sampleHtml}
  `;
}

function openPreviewModal(platform, clientId, file, preview, cardHandles) {
  const modal = document.getElementById("preview-modal");
  const title = document.getElementById("preview-modal-title");
  const body = document.getElementById("preview-modal-body");
  const confirmBtn = document.getElementById("preview-confirm-btn");
  const cancelBtn = document.getElementById("preview-cancel-btn");
  const closeBtn = document.getElementById("preview-modal-close");

  const platformMeta = PLATFORMS.find((p) => p.key === platform);
  title.textContent = `Preview import — ${platformMeta ? platformMeta.label : platform}`;
  body.innerHTML = renderPreviewBody(preview);

  const noRows = !preview.total_rows;
  confirmBtn.disabled = noRows;
  confirmBtn.textContent = noRows ? "No rows to import" : "✓ Confirm import";

  function close() {
    modal.hidden = true;
    confirmBtn.onclick = null;
    cancelBtn.onclick = null;
    closeBtn.onclick = null;
  }

  cancelBtn.onclick = close;
  closeBtn.onclick = close;
  confirmBtn.onclick = async () => {
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Importing…";
    try {
      const formData = new FormData();
      formData.append("client_id", clientId);
      formData.append("platform", platform);
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");
      cardHandles.msgEl.textContent = `+${result.total_creators} creators · ${result.whatsapp_ready} → WhatsApp`;
      cardHandles.msgEl.className = "form-message success";
      showToast(`${result.total_creators} creators imported from ${platform}`, "success");
      cardHandles.setFile(null);
      cardHandles.fileInput.value = "";
      loadPlatformStats();
      refreshWhatsappBadge();
      close();
    } catch (err) {
      showToast(err.message, "error");
      confirmBtn.disabled = false;
      confirmBtn.textContent = "✓ Confirm import";
    }
  };

  modal.hidden = false;
}

async function loadPlatformStats() {
  const qs = state.clientId ? `?client_id=${state.clientId}` : "";
  const breakdown = await api(`/api/platform-breakdown${qs}`).catch(() => ({}));
  PLATFORMS.forEach((p) => {
    const el = document.querySelector(`[data-stat="${p.key}"]`);
    if (!el) return;
    const b = breakdown[p.key];
    el.innerHTML = b
      ? `${b.total} creator${b.total === 1 ? "" : "s"} · <span class="wa-count">${b.whatsapp_ready} WhatsApp</span>`
      : "No uploads yet";
  });
}

async function loadUpload() {
  const clients = await api("/api/clients").catch(() => []);
  const sel = document.getElementById("upload-client-select");
  const current = sel.value;
  sel.innerHTML = clients.length
    ? clients.map((c) => `<option value="${c.id}">${escapeHtml(c.brand_display_name || c.client_name)}</option>`).join("")
    : '<option value="">No clients yet — add one in the Clients tab first</option>';
  if (current) sel.value = current;
  if (!uploadCardsBuilt) buildUploadCards();
  loadPlatformStats();
}

// --- Instagram Scraper page (Apify) ─────────────────────────────────────────

let scrapePolling = false;

function setScrapeStatus(text, cls) {
  const el = document.getElementById("scrape-status");
  el.textContent = text;
  el.className = "scrape-status" + (cls ? " " + cls : "");
}

function setHashtagStatus(text, cls) {
  const el = document.getElementById("hashtag-status");
  el.textContent = text;
  el.className = "scrape-status" + (cls ? " " + cls : "");
}

function initScrape() {
  document.getElementById("scrape-btn").addEventListener("click", startScrape);
  document.getElementById("hashtag-btn").addEventListener("click", startHashtagScrape);
  document.getElementById("scrape-export-btn").addEventListener("click", () => {
    const params = new URLSearchParams({ source_platform: "instagram" });
    const clientId = document.getElementById("scrape-client-select").value || state.clientId;
    if (clientId) params.set("client_id", clientId);
    window.open(`/api/creators/export?${params.toString()}`, "_blank");
  });
}

function initOpsExport() {
  document.getElementById("ops-export-btn").addEventListener("click", () => {
    const params = new URLSearchParams();
    if (state.clientId) params.set("client_id", state.clientId);
    window.open(`/api/ops-pipeline/export?${params.toString()}`, "_blank");
  });
}

async function loadScrape() {
  const clients = await api("/api/clients").catch(() => []);
  const options = clients.length
    ? clients.map((c) => `<option value="${c.id}">${escapeHtml(c.brand_display_name || c.client_name)}</option>`).join("")
    : '<option value="">No clients yet — add one in the Clients tab first</option>';
  for (const id of ["scrape-client-select", "hashtag-client-select"]) {
    const sel = document.getElementById(id);
    if (!sel) continue;
    const current = sel.value;
    sel.innerHTML = options;
    if (current) sel.value = current;
  }
  renderScrapeStats();
}

async function renderScrapeStats() {
  const qs = state.clientId ? `?client_id=${state.clientId}` : "";
  const breakdown = await api(`/api/platform-breakdown${qs}`).catch(() => ({}));
  const ig = breakdown.instagram || { total: 0, whatsapp_ready: 0 };
  document.getElementById("scrape-stats").innerHTML = `
    <div class="pipeline-row"><span class="pipeline-icon">📸</span><span class="pipeline-label">Instagram creators scraped</span><span class="pipeline-count">${ig.total}</span></div>
    <div class="pipeline-row"><span class="pipeline-icon">🟢</span><span class="pipeline-label">→ Routed to WhatsApp</span><span class="pipeline-count">${ig.whatsapp_ready}</span></div>
  `;
}

async function startScrape() {
  if (scrapePolling) {
    showToast("Another scrape is already running", "error");
    return;
  }
  const clientId = document.getElementById("scrape-client-select").value;
  if (!clientId) {
    setScrapeStatus("Pick a client first.", "error");
    showToast("Select a client before scraping", "error");
    return;
  }

  const targets = document.getElementById("scrape-targets").value
    .split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  if (!targets.length) {
    setScrapeStatus("Enter at least one username or profile/reel URL.", "error");
    return;
  }

  const resultsLimit = Number(document.getElementById("scrape-limit").value) || 25;
  const btn = document.getElementById("scrape-btn");
  btn.disabled = true;
  scrapePolling = true;
  setScrapeStatus(`Starting scrape of ${targets.length} target(s)…`, "");
  showToast(`Scraping ${targets.length} Instagram target(s)…`, "info");

  try {
    const start = await api("/api/scrape", {
      method: "POST",
      body: JSON.stringify({ client_id: clientId, platform: "instagram", targets, results_limit: resultsLimit }),
    });
    await pollScrape(start.run_id, clientId);
  } catch (err) {
    setScrapeStatus(err.message, "error");
    showToast(err.message, "error");
  } finally {
    scrapePolling = false;
    btn.disabled = false;
  }
}

function pollScrape(runId, clientId, setStatus = setScrapeStatus, unit = "reels") {
  const params = new URLSearchParams({ run_id: runId, client_id: clientId, platform: "instagram" });
  let ticks = 0;
  return new Promise((resolve) => {
    const tick = async () => {
      ticks += 1;
      try {
        const res = await api(`/api/scrape/status?${params.toString()}`);
        if (res.error) {
          setStatus(`Error: ${res.error}`, "error");
          return resolve();
        }
        const st = (res.status || "").toUpperCase();
        if (st === "SUCCEEDED" && res.imported) {
          setStatus(
            `Done — scraped ${res.scraped_items ?? 0} ${unit} → ${res.total_creators ?? 0} creators, ${res.whatsapp_ready ?? 0} WhatsApp-ready.`,
            "success",
          );
          showToast(`Scrape complete: ${res.total_creators ?? 0} creators imported`, "success");
          renderScrapeStats();
          refreshWhatsappBadge();
          return resolve();
        }
        // FAILED / ABORTED / TIMED-OUT / unknown statuses are terminal.
        if (st !== "READY" && st !== "RUNNING" && st !== "SUCCEEDED") {
          setStatus(`Scrape ended with status "${st || "UNKNOWN"}" — check the Apify run and try again.`, "error");
          showToast(`Scrape ${st ? st.toLowerCase().replace(/-/g, " ") : "failed"}`, "error");
          return resolve();
        }
        setStatus(`Scraping… (${st.toLowerCase()}, ${ticks * 4}s elapsed) — this can take a few minutes.`, "");
        setTimeout(tick, 4000);
      } catch (err) {
        setStatus(err.message, "error");
        return resolve();
      }
    };
    tick();
  });
}

async function startHashtagScrape() {
  if (scrapePolling) {
    showToast("Another scrape is already running", "error");
    return;
  }
  const clientId = document.getElementById("hashtag-client-select").value;
  if (!clientId) {
    setHashtagStatus("Pick a client first.", "error");
    showToast("Select a client before scraping", "error");
    return;
  }

  const hashtags = document.getElementById("hashtag-targets").value
    .split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  if (!hashtags.length) {
    setHashtagStatus("Enter at least one hashtag.", "error");
    return;
  }

  const contentType = document.getElementById("hashtag-content-type").value || "posts";
  const resultsLimit = Number(document.getElementById("hashtag-limit").value) || 20;
  const btn = document.getElementById("hashtag-btn");
  btn.disabled = true;
  scrapePolling = true;
  setHashtagStatus(`Starting scrape of ${hashtags.length} hashtag(s)…`, "");
  showToast(`Scraping ${hashtags.length} hashtag(s)…`, "info");

  try {
    const start = await api("/api/scrape/hashtag", {
      method: "POST",
      body: JSON.stringify({ client_id: clientId, hashtags, content_type: contentType, results_limit: resultsLimit }),
    });
    await pollScrape(start.run_id, clientId, setHashtagStatus, "results");
  } catch (err) {
    setHashtagStatus(err.message, "error");
    showToast(err.message, "error");
  } finally {
    scrapePolling = false;
    btn.disabled = false;
  }
}

// --- WhatsApp dashboard ─────────────────────────────────────────────────────

let whatsappRows = [];

async function loadWhatsapp() {
  const params = new URLSearchParams();
  if (state.clientId) params.set("client_id", state.clientId);
  const platform = document.getElementById("wa-platform-filter").value;
  const status = document.getElementById("wa-status-filter").value;
  if (platform) params.set("source_platform", platform);
  if (status) params.set("status", status);

  whatsappRows = await api(`/api/whatsapp-ready?${params.toString()}`).catch(() => []);
  renderWhatsapp();
}

function renderWhatsapp() {
  const q = (document.getElementById("wa-search").value || "").toLowerCase();
  const rows = whatsappRows.filter((r) =>
    !q || `${r.full_name} ${r.username} ${r.phone} ${r.niche}`.toLowerCase().includes(q)
  );

  document.getElementById("wa-count").textContent = `${rows.length} contact${rows.length === 1 ? "" : "s"}`;
  document.getElementById("whatsapp-empty").hidden = rows.length > 0;

  document.querySelector("#whatsapp-table tbody").innerHTML = rows.map((r) => `
    <tr>
      <td>
        <div style="font-weight:700">${escapeHtml(r.full_name || "Unknown")} ${profileTypeTag(r)}</div>
        <div style="display:flex; align-items:center; gap:8px; font-size:11.5px;color:var(--text-muted)">
          @${escapeHtml(r.username || "")}
          ${(r.source_platform === "instagram" || r.channel === "instagram") && r.username ? `<button class="btn btn-small" style="padding: 2px 6px; font-size: 10px; height: 20px" data-analyze data-username="${escapeHtml(r.username)}">🔍 Analyze</button>` : ""}
        </div>
      </td>
      <td>${badge(channelLabel(r.source_platform || r.channel), platformBadgeClass(r.source_platform || r.channel))}</td>
      <td class="muted">${escapeHtml(r.language || "—")}</td>
      <td class="muted">${escapeHtml(r.niche || "—")}</td>
      <td class="muted" style="font-variant-numeric:tabular-nums">${escapeHtml(r.phone || "—")}</td>
      <td>
        <span class="badge ${STATUS_BADGE_CLASS[r.status] || "badge-neutral"}">
          <span class="badge-dot"></span>
          <select class="status-select" data-id="${r.id}" aria-label="Status for ${escapeHtml(r.username || r.full_name || "creator")}">
            ${STATUS_OPTIONS.map((s) => `<option value="${s}" ${s === r.status ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </span>
      </td>
      <td>${r.whatsapp_link
        ? `<a class="wa-btn" href="${escapeHtml(safeUrl(r.whatsapp_link))}" target="_blank" rel="noopener">🟢 Chat</a>`
        : '<span class="wa-btn disabled">🟢 Chat</span>'}</td>
    </tr>
  `).join("");

  document.querySelectorAll("#whatsapp-table .status-select").forEach((sel) => {
    sel.addEventListener("change", async () => {
      try {
        await api(`/api/creators/${sel.dataset.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: sel.value }),
        });
        showToast(`Status updated to "${sel.value}"`, "success");
      } catch (err) {
        showToast(err.message || "Request failed", "error");
      }
      loadWhatsapp();
    });
  });

  document.querySelectorAll("#whatsapp-table [data-analyze]").forEach((el) => {
    el.addEventListener("click", () => analyzeUser(el.dataset.username));
  });
}

async function refreshWhatsappBadge() {
  const params = new URLSearchParams();
  if (state.clientId) params.set("client_id", state.clientId);
  const rows = await api(`/api/whatsapp-ready?${params.toString()}`).catch(() => []);
  const badgeEl = document.getElementById("whatsapp-badge");
  badgeEl.hidden = rows.length === 0;
  badgeEl.textContent = rows.length;
}

// --- Clients ────────────────────────────────────────────────────────────────

let _editingClientId = null;
const _clientsById = {};

async function loadClients() {
  const clients = await api("/api/clients").catch(() => []);
  for (const c of clients) _clientsById[c.id] = c;
  const grid = document.getElementById("clients-grid");
  grid.innerHTML = clients.length ? clients.map((c, i) => `
    <div class="client-card" style="animation: fadeIn 0.4s ${i * 0.06}s ease backwards">
      <h3>${escapeHtml(c.brand_display_name || c.client_name)}</h3>
      <div class="muted">${escapeHtml(c.campaign_name || "No campaign name")}</div>
      <div class="voucher-line" style="margin-top:12px; display:flex; gap:6px; flex-wrap:wrap;">
        ${c.whatsapp_enabled ? badge("WhatsApp", "badge-active") : ""}
        ${c.instagram_enabled ? badge("Instagram", "badge-info") : ""}
        ${c.facebook_enabled ? badge("Facebook", "badge-violet") : ""}
      </div>
      <div class="muted" style="margin-top:10px; font-size:11.5px">
        Opens ₹${c.opening_voucher_inr ?? "—"} · Max ₹${c.max_voucher_inr ?? "—"} ${escapeHtml(c.voucher_type || "")}
      </div>
      <button type="button" class="btn full-width" data-edit-client="${c.id}" style="margin-top:12px">Edit</button>
    </div>
  `).join("") : '<div class="empty-state">No clients yet — add one below.</div>';

  // Wire Edit buttons (addEventListener, not inline onclick — avoids XSS).
  grid.querySelectorAll("[data-edit-client]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const client = _clientsById[btn.getAttribute("data-edit-client")];
      if (client) startEditClient(client);
    });
  });
}

// Populate the client form with an existing client's values and switch it into
// edit mode (submits a PATCH). client_key is the identity, so it's locked.
function startEditClient(c) {
  const form = document.getElementById("add-client-form");
  _editingClientId = c.id;
  const set = (name, val) => { if (form.elements[name]) form.elements[name].value = val ?? ""; };
  set("client_key", c.client_key);
  set("client_name", c.client_name);
  set("brand_display_name", c.brand_display_name);
  set("campaign_name", c.campaign_name);
  set("offer_line", c.offer_line);
  set("default_language", c.default_language);
  set("opening_voucher_inr", c.opening_voucher_inr);
  set("max_voucher_inr", c.max_voucher_inr);
  set("voucher_type", c.voucher_type);
  set("reimbursement", c.reimbursement);
  set("deliverables", c.deliverables);
  form.elements["whatsapp_enabled"].checked = !!c.whatsapp_enabled;
  form.elements["instagram_enabled"].checked = !!c.instagram_enabled;
  form.elements["facebook_enabled"].checked = !!c.facebook_enabled;
  form.elements["client_key"].readOnly = true;

  document.getElementById("client-form-title").textContent = `Edit Client — ${c.brand_display_name || c.client_name}`;
  document.getElementById("client-form-submit").textContent = "Save Changes";
  document.getElementById("client-form-cancel").style.display = "";
  const msgEl = document.getElementById("add-client-message");
  msgEl.textContent = ""; msgEl.className = "form-message";
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Reset the client form back to "create" mode.
function resetClientForm() {
  const form = document.getElementById("add-client-form");
  _editingClientId = null;
  form.reset();
  form.elements["client_key"].readOnly = false;
  document.getElementById("client-form-title").textContent = "Add New Client";
  document.getElementById("client-form-submit").textContent = "+ Create Client";
  document.getElementById("client-form-cancel").style.display = "none";
}

function initAddClientForm() {
  const form = document.getElementById("add-client-form");
  const msgEl = document.getElementById("add-client-message");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    msgEl.textContent = "";
    msgEl.className = "form-message";
    const data = new FormData(form);
    const payload = {
      client_key:         data.get("client_key"),
      client_name:        data.get("client_name"),
      brand_display_name: data.get("brand_display_name"),
      campaign_name:      data.get("campaign_name"),
      offer_line:         data.get("offer_line"),
      default_language:   data.get("default_language"),
      opening_voucher_inr: Number(data.get("opening_voucher_inr")) || undefined,
      max_voucher_inr:    Number(data.get("max_voucher_inr")) || undefined,
      voucher_type:       data.get("voucher_type"),
      reimbursement:      data.get("reimbursement"),
      deliverables:       data.get("deliverables"),
      whatsapp_enabled:   form.elements["whatsapp_enabled"].checked,
      instagram_enabled:  form.elements["instagram_enabled"].checked,
      facebook_enabled:   form.elements["facebook_enabled"].checked,
    };
    try {
      if (_editingClientId) {
        await api(`/api/clients/${_editingClientId}`, { method: "PATCH", body: JSON.stringify(payload) });
        msgEl.textContent = `✓ Client "${payload.client_key}" updated!`;
        msgEl.className = "form-message success";
        showToast(`Client "${payload.client_name}" updated!`, "success");
        resetClientForm();
      } else {
        await api("/api/clients", { method: "POST", body: JSON.stringify(payload) });
        msgEl.textContent = `✓ Client "${payload.client_key}" created successfully!`;
        msgEl.className = "form-message success";
        showToast(`Client "${payload.client_name}" created!`, "success");
        form.reset();
      }
      await loadClientFilter();
      loadClients();
    } catch (err) {
      msgEl.textContent = `✗ ${err.message}`;
      msgEl.className = "form-message error";
      showToast(err.message, "error");
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  const cancelBtn = document.getElementById("client-form-cancel");
  if (cancelBtn) cancelBtn.addEventListener("click", resetClientForm);
}

// --- Shop Verify (human-assisted dialer) ─────────────────────────────────────

const SHOP_STATUS_LABEL = {
  pending: "Pending", has_product: "Has product ✓", no_product: "No product",
  no_answer: "No answer", callback: "Call back", sent: "Sent to creator ✓",
};
const BTN_SM = "padding:4px 9px; font-size:11px";

async function loadShops() {
  const clients = await api("/api/clients").catch(() => []);
  const csel = document.getElementById("shops-client-select");
  if (csel) {
    const cur = csel.value;
    csel.innerHTML = '<option value="">— optional —</option>' + clients.map(
      (c) => `<option value="${c.id}">${escapeHtml(c.brand_display_name || c.client_name)}</option>`
    ).join("");
    csel.value = cur;
  }

  // Finalized creators (agreed on WhatsApp = status "Converted"). Each gets a
  // "Find shops" button that auto-sources nearby shops for their location.
  const finals = await api("/api/creators?status=Converted").catch(() => []);
  const fc = document.getElementById("final-creators-list");
  if (fc) {
    fc.innerHTML = finals.length ? finals.map((c) => {
      const loc = c.location_raw || c.matched_state || "";
      const handle = c.username || "";
      return `
      <div class="row-item" style="display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid var(--border,#2222)">
        <div style="flex:1; min-width:0">
          <div style="font-weight:600">${escapeHtml(c.full_name || handle || "Creator")}</div>
          <div class="muted" style="font-size:12px">${handle ? "@" + escapeHtml(handle) : ""}${loc ? " · 📍 " + escapeHtml(loc) : " · no location on file"}</div>
        </div>
        <button class="btn btn-primary" style="${BTN_SM}" data-find-shops="${c.id}"${loc ? "" : " disabled"}>Find shops</button>
      </div>`;
    }).join("") : '<div class="muted">No finalized creators yet — they appear here once a deal is agreed (status "Converted").</div>';

    fc.querySelectorAll("[data-find-shops]").forEach((b) => {
      const c = finals.find((x) => String(x.id) === b.getAttribute("data-find-shops"));
      b.addEventListener("click", () => shopFindNearby(c, b));
    });
  }

  const shops = await api("/api/shops").catch(() => []);
  const tbody = document.getElementById("shops-tbody");
  const countEl = document.getElementById("shops-count");
  const pending = shops.filter((s) => s.status === "pending").length;
  const confirmed = shops.filter((s) => s.status === "has_product").length;
  if (countEl) countEl.textContent = `${shops.length} shops · ${pending} pending · ${confirmed} confirmed`;

  tbody.innerHTML = shops.length ? shops.map((s) => {
    const cls = (s.status === "has_product" || s.status === "sent") ? "badge-active"
      : s.status === "pending" ? "badge-info" : "";
    return `
    <tr data-shop="${s.id}">
      <td>${escapeHtml(s.shop_name || "—")}</td>
      <td>${escapeHtml(s.phone)}</td>
      <td>${escapeHtml(s.area || "—")}</td>
      <td>${s.creator_contact ? "@" + escapeHtml(s.creator_contact) : "—"}</td>
      <td>${badge(SHOP_STATUS_LABEL[s.status] || s.status, cls)}</td>
      <td>
        <div style="display:flex; gap:4px; flex-wrap:wrap">
          <button class="btn" style="${BTN_SM}" data-shop-call="${s.id}">📞 Call</button>
          <button class="btn" style="${BTN_SM}" data-shop-status="${s.id}" data-status="has_product">✓ Has it</button>
          <button class="btn" style="${BTN_SM}" data-shop-status="${s.id}" data-status="no_product">✗ No</button>
          <button class="btn" style="${BTN_SM}" data-shop-status="${s.id}" data-status="no_answer">No answer</button>
          <button class="btn btn-primary" style="${BTN_SM}" data-shop-send="${s.id}" ${s.status === "has_product" ? "" : "disabled"}>Send to creator</button>
        </div>
      </td>
    </tr>`;
  }).join("") : '<tr><td colspan="6" class="muted">No shops yet — add some above.</td></tr>';

  tbody.querySelectorAll("[data-shop-call]").forEach((b) =>
    b.addEventListener("click", () => shopCall(b.getAttribute("data-shop-call"))));
  tbody.querySelectorAll("[data-shop-status]").forEach((b) =>
    b.addEventListener("click", () => shopSetStatus(b.getAttribute("data-shop-status"), b.getAttribute("data-status"))));
  tbody.querySelectorAll("[data-shop-send]").forEach((b) =>
    b.addEventListener("click", () => shopSendToCreator(b.getAttribute("data-shop-send"))));
}

async function shopFindNearby(creator, btn) {
  if (!creator) return;
  const location = creator.location_raw || creator.matched_state;
  if (!location) { showToast("No location on file for this creator", "error"); return; }
  if (btn) { btn.disabled = true; btn.textContent = "Finding…"; }
  try {
    const res = await api("/api/shops/nearby", {
      method: "POST",
      body: JSON.stringify({
        location,
        creator_contact: creator.username,
        client_id: creator.client_id,
      }),
    });
    if (res.imported > 0) {
      showToast(`Added ${res.imported} nearby shop(s) for ${creator.username || "creator"}`, "success");
    } else {
      showToast(res.message || "No shops found for that location", "info");
    }
    loadShops();
  } catch (err) {
    // 501 = Google not configured; guide the user to manual paste.
    showToast(err.message, "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Find shops"; }
  }
}

async function shopCall(id) {
  try {
    const agent_phone = (document.getElementById("shops-agent-phone")?.value || "").trim();
    const res = await api(`/api/shops/${id}/call`, { method: "POST", body: JSON.stringify({ agent_phone }) });
    if (res.mode === "tel" && res.tel_url) {
      window.location.href = res.tel_url; // opens the agent's dialer / softphone
    } else if (res.mode === "provider") {
      showToast(res.message || "Connecting call…", "success");
    }
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function shopSetStatus(id, status) {
  try {
    await api(`/api/shops/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    showToast("Status updated", "success");
    loadShops();
  } catch (err) { showToast(err.message, "error"); }
}

async function shopSendToCreator(id) {
  try {
    const res = await api(`/api/shops/${id}/send-to-creator`, { method: "POST", body: JSON.stringify({}) });
    showToast("Sent to creator ✓", "success");
    loadShops();
  } catch (err) { showToast(err.message, "error"); }
}

function initShopsForm() {
  const form = document.getElementById("shops-import-form");
  if (!form) return;
  const msgEl = document.getElementById("shops-import-message");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    msgEl.textContent = ""; msgEl.className = "form-message";
    const data = new FormData(form);
    const payload = {
      client_id: Number(data.get("client_id")) || undefined,
      creator_contact: data.get("creator_contact"),
      area: data.get("area"),
      numbers: data.get("numbers"),
    };
    try {
      const res = await api("/api/shops/import", { method: "POST", body: JSON.stringify(payload) });
      msgEl.textContent = `✓ Added ${res.imported} shop(s) to the queue.`;
      msgEl.className = "form-message success";
      form.elements["numbers"].value = "";
      loadShops();
    } catch (err) {
      msgEl.textContent = `✗ ${err.message}`;
      msgEl.className = "form-message error";
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

// --- Negotiator kill switch ──────────────────────────────────────────────────

async function refreshNegotiatorStatus() {
  const { paused } = await api("/api/negotiator/status").catch(() => ({ paused: false }));
  const dot = document.getElementById("ai-dot");
  const label = document.getElementById("ai-label");
  const toggle = document.getElementById("negotiator-toggle");

  dot.className = `pulse-dot ${paused ? "paused" : ""}`;
  label.textContent = paused ? "AI Paused" : "AI Negotiator";
  toggle.textContent = paused ? "▶ Resume AI" : "⏸ Pause AI";
  toggle.dataset.paused = paused ? "true" : "false";
}

function initNegotiatorToggle() {
  document.getElementById("negotiator-toggle").addEventListener("click", async (e) => {
    const isPaused = e.target.dataset.paused === "true";
    try {
      await api(`/api/negotiator/${isPaused ? "resume" : "pause"}`, { method: "POST" });
      showToast(isPaused ? "AI Negotiator resumed" : "AI Negotiator paused", isPaused ? "success" : "info");
    } catch (err) {
      showToast(err.message || "Request failed", "error");
    }
    refreshNegotiatorStatus();
  });
}

// --- Refresh button ──────────────────────────────────────────────────────────

function initRefreshButton() {
  const btn = document.getElementById("refresh-btn");
  btn.addEventListener("click", () => {
    btn.classList.add("spinning");
    Promise.all([
      loadSection(state.section),
      refreshNegotiatorStatus(),
      refreshActionsBadge(),
    ]).finally(() => {
      setTimeout(() => btn.classList.remove("spinning"), 600);
    });
  });
}

// --- Profile Analyzer ───────────────────────────────────────────────────────

let analyzerPolling = false;
let analyzerInterval = null;

function setAnalyzerStatus(text, cls) {
  const el = document.getElementById("analyzer-status");
  el.textContent = text;
  el.className = "scrape-status" + (cls ? " " + cls : "");
}

function initAnalyzer() {
  document.getElementById("analyzer-btn").addEventListener("click", startAnalyzer);
}

async function loadAnalyzer() {
  const clients = await api("/api/clients").catch(() => []);
  const sel = document.getElementById("analyzer-client-select");
  const current = sel.value;
  sel.innerHTML = clients.length
    ? clients.map((c) => `<option value="${c.id}">${escapeHtml(c.brand_display_name || c.client_name)}</option>`).join("")
    : '<option value="">No clients yet — add one in the Clients tab first</option>';
  if (current) sel.value = current;
}

async function startAnalyzer(username = null) {
  if (analyzerPolling) return;
  const clientId = document.getElementById("analyzer-client-select").value;
  if (!clientId) {
    setAnalyzerStatus("Pick a client first.", "error");
    return;
  }

  const target = typeof username === "string" ? username : document.getElementById("analyzer-target").value.trim();
  if (!target) {
    setAnalyzerStatus("Enter an Instagram username.", "error");
    return;
  }
  
  if (typeof username === "string") {
    document.getElementById("analyzer-target").value = target;
  }

  const btn = document.getElementById("analyzer-btn");
  btn.disabled = true;
  document.getElementById("analyzer-result").style.display = "none";
  setAnalyzerStatus("Starting profile analysis...", "");

  try {
    const res = await api("/api/analyze-profile", {
      method: "POST",
      body: JSON.stringify({ client_id: clientId, username: target })
    });

    if (res.status === "CACHED" && res.result) {
      renderAnalyzerResult(target, res.result);
      setAnalyzerStatus("");
      btn.disabled = false;
      return;
    }

    const runId = res.run_id;
    analyzerPolling = true;
    setAnalyzerStatus("Scraping profile data & analyzing with AI...", "");
    
    clearInterval(analyzerInterval);
    analyzerInterval = setInterval(async () => {
      try {
        const pRes = await api(`/api/analyze-profile/status?run_id=${runId}&client_id=${clientId}&username=${encodeURIComponent(target)}`);
        if (pRes.status === "SUCCEEDED" && pRes.result) {
          clearInterval(analyzerInterval);
          analyzerPolling = false;
          btn.disabled = false;
          setAnalyzerStatus("");
          renderAnalyzerResult(target, pRes.result);
        } else if (pRes.error) {
          clearInterval(analyzerInterval);
          analyzerPolling = false;
          btn.disabled = false;
          setAnalyzerStatus(`Analysis failed: ${pRes.error}`, "error");
        } else {
          setAnalyzerStatus(`AI is analyzing profile... (${pRes.status})`);
        }
      } catch (err) {
        clearInterval(analyzerInterval);
        analyzerPolling = false;
        btn.disabled = false;
        setAnalyzerStatus(`Error checking status: ${err.message}`, "error");
      }
    }, 4000);
  } catch (err) {
    btn.disabled = false;
    setAnalyzerStatus(err.message, "error");
  }
}

function renderAnalyzerResult(username, result) {
  const resultDiv = document.getElementById("analyzer-result");
  resultDiv.style.display = "block";
  
  document.getElementById("analyzer-res-username").textContent = `@${username}`;
  
  const scoreBadge = document.getElementById("analyzer-res-verdict");
  scoreBadge.textContent = result.verdict || "Reviewed";
  scoreBadge.className = `badge ${result.verdict === 'Recommended' ? 'badge-good' : 'badge-critical'}`;
  
  document.getElementById("analyzer-res-score").textContent = result.score || "0";
  document.getElementById("analyzer-res-summary").textContent = result.summary || "";
  
  document.getElementById("analyzer-res-pros").innerHTML = (result.pros || []).map(p => `<li>• ${escapeHtml(p)}</li>`).join("");
  document.getElementById("analyzer-res-cons").innerHTML = (result.cons || []).map(c => `<li>• ${escapeHtml(c)}</li>`).join("");
}

window.analyzeUser = async function(username) {
  switchSection("analyzer");
  await loadAnalyzer();
  startAnalyzer(username);
}

// --- Creator Verification (points 46-50) ─────────────────────────────────────

let verifyPolling = false;
let verifyInterval = null;
let verifyCurrentUser = null;

function setVerifyStatus(text, cls) {
  const el = document.getElementById("verify-status");
  el.textContent = text;
  el.className = "scrape-status" + (cls ? " " + cls : "");
}

// Fill a <select> with the client list (shared shape used across tabs).
async function fillClientSelect(selId) {
  const clients = await api("/api/clients").catch(() => []);
  const sel = document.getElementById(selId);
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = clients.length
    ? clients.map((c) => `<option value="${c.id}">${escapeHtml(c.brand_display_name || c.client_name)}</option>`).join("")
    : '<option value="">No clients yet — add one in the Clients tab first</option>';
  if (current) sel.value = current;
}

function initVerify() {
  document.getElementById("verify-btn").addEventListener("click", () => startVerify());
  document.getElementById("verify-target").addEventListener("keydown", (e) => {
    if (e.key === "Enter") startVerify();
  });
  document.getElementById("rep-add-btn").addEventListener("click", addReputation);
}

async function loadVerify() {
  await fillClientSelect("verify-client-select");
}

async function startVerify(username = null) {
  if (verifyPolling) return;
  const clientId = document.getElementById("verify-client-select").value;
  if (!clientId) { setVerifyStatus("Pick a client first.", "error"); return; }

  const target = (typeof username === "string" ? username : document.getElementById("verify-target").value)
    .trim().replace(/^@/, "");
  if (!target) { setVerifyStatus("Enter an Instagram username.", "error"); return; }
  document.getElementById("verify-target").value = target;

  const btn = document.getElementById("verify-btn");
  btn.disabled = true;
  document.getElementById("verify-result").style.display = "none";
  setVerifyStatus("Scraping profile & running trust checks…", "");

  try {
    const res = await api("/api/verify-creator", {
      method: "POST",
      body: JSON.stringify({ client_id: clientId, username: target }),
    });
    const runId = res.run_id;
    verifyPolling = true;
    clearInterval(verifyInterval);
    verifyInterval = setInterval(async () => {
      try {
        const p = await api(`/api/verify-creator/status?run_id=${runId}&client_id=${clientId}&username=${encodeURIComponent(target)}`);
        if (p.status === "SUCCEEDED" && p.result) {
          clearInterval(verifyInterval); verifyPolling = false; btn.disabled = false;
          setVerifyStatus("");
          renderVerifyResult(p.result);
        } else if (p.error) {
          clearInterval(verifyInterval); verifyPolling = false; btn.disabled = false;
          setVerifyStatus(`Verification failed: ${p.error}`, "error");
        } else {
          setVerifyStatus(`Working… (${p.status})`, "");
        }
      } catch (err) {
        clearInterval(verifyInterval); verifyPolling = false; btn.disabled = false;
        setVerifyStatus(err.message, "error");
      }
    }, 4000);
  } catch (err) {
    btn.disabled = false;
    setVerifyStatus(err.message, "error");
  }
}

const VERDICT_BADGE = { trusted: "badge-good", review: "badge-warning", avoid: "badge-critical" };
const SUBCHECK_BADGE = {
  clean: "badge-good", healthy: "badge-good", safe: "badge-good", good: "badge-good",
  watch: "badge-warning", review: "badge-warning", caution: "badge-warning", neutral: "badge-neutral",
  suspicious: "badge-critical", unsafe: "badge-critical", avoid: "badge-critical",
  unknown: "badge-neutral", no_history: "badge-neutral",
};

function renderVerifyResult(r) {
  verifyCurrentUser = r.username;
  document.getElementById("verify-result").style.display = "block";
  document.getElementById("verify-res-username").textContent = `@${r.username}`;

  const vb = document.getElementById("verify-res-verdict");
  vb.textContent = r.verdict;
  vb.className = `badge ${VERDICT_BADGE[r.verdict] || "badge-neutral"}`;

  animateCounter(document.getElementById("verify-res-trust"), r.trust_score);
  document.getElementById("verify-res-meta").textContent =
    `${(r.followers || 0).toLocaleString()} followers · ${(r.following || 0).toLocaleString()} following · ${(r.posts_count || 0).toLocaleString()} posts · tier: ${r.engagement?.tier || "—"}`;

  const eng = r.engagement || {};
  const safety = r.brand_safety || {};
  const fake = r.fake_account || {};
  const checks = [
    {
      title: "🕵️ Fake-account check", verdict: fake.verdict,
      lines: fake.flags && fake.flags.length ? fake.flags : ["No fake-account red flags"],
    },
    {
      title: "📊 Audience authenticity", verdict: eng.audience_authenticity,
      lines: [
        eng.engagement_rate != null ? `Engagement rate: ${eng.engagement_rate}% (healthy band ${eng.expected_band?.[0]}–${eng.expected_band?.[1]}%)` : "Not enough post data",
        eng.avg_likes != null && eng.avg_comments != null ? `Avg ${eng.avg_likes.toLocaleString()} likes · ${eng.avg_comments.toLocaleString()} comments` : "",
      ].filter(Boolean),
    },
    {
      title: "💬 Engagement authenticity", verdict: eng.engagement_authenticity,
      lines: (eng.notes || []).filter((n) => n.toLowerCase().includes("comment") || n.toLowerCase().includes("like")).length
        ? (eng.notes || []).filter((n) => n.toLowerCase().includes("comment") || n.toLowerCase().includes("like"))
        : [eng.comment_like_ratio != null ? `Comment/like ratio: ${(eng.comment_like_ratio * 100).toFixed(2)}%` : "No engagement data"],
    },
    {
      title: "🛡️ Brand safety", verdict: safety.verdict,
      lines: (safety.flags && safety.flags.length ? safety.flags : [safety.note || "No brand-safety concerns"]),
    },
    {
      title: "📓 Reputation", verdict: r.reputation?.verdict,
      lines: r.reputation?.records?.length
        ? r.reputation.records.map((x) => `${x.event}: ${x.detail || "—"}`)
        : ["No recorded history yet"],
    },
  ];

  document.getElementById("verify-checks").innerHTML = checks.map((c) => `
    <div class="verify-check">
      <div class="verify-check-head">
        <span class="verify-check-title">${c.title}</span>
        <span class="badge ${SUBCHECK_BADGE[c.verdict] || "badge-neutral"}"><span class="badge-dot"></span>${escapeHtml(c.verdict || "—")}</span>
      </div>
      <ul class="verify-check-lines">${c.lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>
    </div>
  `).join("");

  renderReputation(r.reputation?.records || []);
}

function renderReputation(records) {
  const el = document.getElementById("rep-list");
  el.innerHTML = records.length
    ? records.map((x) => `
        <div class="rep-item">
          <span class="badge ${SUBCHECK_BADGE[x.event] || "badge-neutral"}">${escapeHtml(x.event)}</span>
          <span class="rep-item-detail">${escapeHtml(x.detail || "—")}</span>
          <span class="rep-item-time muted">${timeAgo(x.created_at)}</span>
        </div>`).join("")
    : '<div class="empty-state">No reputation records for this creator yet.</div>';
}

async function addReputation() {
  if (!verifyCurrentUser) { showToast("Verify a creator first", "error"); return; }
  const event = document.getElementById("rep-event").value;
  const detail = document.getElementById("rep-detail").value.trim();
  const btn = document.getElementById("rep-add-btn");
  btn.disabled = true;
  try {
    const res = await api("/api/reputation", {
      method: "POST",
      body: JSON.stringify({ username: verifyCurrentUser, event, detail, client_id: state.clientId || undefined }),
    });
    document.getElementById("rep-detail").value = "";
    renderReputation(res.records || []);
    showToast("Reputation record added", "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
  }
}

// Jump to verify from other tables (mirrors analyzeUser).
window.verifyUser = async function (username) {
  switchSection("verify");
  await loadVerify();
  startVerify(username);
};

// --- Language Lab (points 42-45) ─────────────────────────────────────────────

let langLabInit = false;

async function loadLangLab() {
  // Populate language dropdowns once from the backend's supported list.
  if (!langLabInit) {
    const { languages } = await api("/api/language/supported").catch(() => ({ languages: [] }));
    const opts = (languages || []).map((l) => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join("");
    const trSel = document.getElementById("ll-tr-lang");
    const sensSel = document.getElementById("ll-sens-lang");
    if (trSel) trSel.innerHTML = opts;
    if (sensSel) sensSel.innerHTML = '<option value="">Any / general</option>' + opts;

    // Sub-tab switching
    document.querySelectorAll(".langlab-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".langlab-tab").forEach((t) => t.classList.toggle("active", t === tab));
        document.querySelectorAll(".langlab-pane").forEach((p) => {
          p.hidden = p.dataset.llpane !== tab.dataset.lltab;
        });
      });
    });

    document.getElementById("ll-style-btn").addEventListener("click", llDetectStyle);
    document.getElementById("ll-tr-btn").addEventListener("click", llTranslate);
    document.getElementById("ll-sens-btn").addEventListener("click", llSensitivity);
    langLabInit = true;
  }
}

function setLL(id, msg, kind) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.color = kind === "error" ? "var(--danger, #e5484d)"
    : kind === "success" ? "#16b364" : "var(--text-muted)";
}

async function llDetectStyle() {
  const text = document.getElementById("ll-style-input").value.trim();
  const out = document.getElementById("ll-style-result");
  if (!text) { setLL("ll-style-status", "Paste a message first.", "error"); return; }
  setLL("ll-style-status", "Analyzing…", ""); out.innerHTML = "";
  try {
    const r = await api("/api/language/detect-style", { method: "POST", body: JSON.stringify({ text }) });
    out.innerHTML = `
      <div class="ll-grid">
        <div><span class="ll-k">Language</span><span class="ll-v">${escapeHtml(r.language)}${r.romanized ? " (romanized)" : ""}</span></div>
        <div><span class="ll-k">Register</span><span class="ll-v">${escapeHtml(r.register)}</span></div>
        <div><span class="ll-k">Dialect</span><span class="ll-v">${escapeHtml(r.dialect)}</span></div>
      </div>
      <div class="ll-tip">💡 <b>How to reply:</b> ${escapeHtml(r.mirror_tip || "—")}</div>`;
    setLL("ll-style-status", "", "");
  } catch (e) { setLL("ll-style-status", e.message, "error"); }
}

async function llTranslate() {
  const text = document.getElementById("ll-tr-input").value.trim();
  const target = document.getElementById("ll-tr-lang").value;
  const romanized = document.getElementById("ll-tr-romanized").checked;
  const out = document.getElementById("ll-tr-result");
  if (!text) { setLL("ll-tr-status", "Type a message first.", "error"); return; }
  setLL("ll-tr-status", "Translating…", ""); out.innerHTML = "";
  try {
    const r = await api("/api/language/translate", { method: "POST", body: JSON.stringify({ text, target_language: target, romanized }) });
    out.innerHTML = `
      <div class="ll-translation">
        <div class="ll-translation-head">${escapeHtml(r.target_language)}${r.romanized ? " · romanized" : ""}</div>
        <div class="ll-translation-text" id="ll-tr-text">${escapeHtml(r.translation)}</div>
        <button class="btn btn-small" id="ll-tr-copy">Copy</button>
      </div>`;
    document.getElementById("ll-tr-copy").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(r.translation); showToast("Copied", "success"); }
      catch { showToast("Copy failed", "error"); }
    });
    setLL("ll-tr-status", "", "");
  } catch (e) { setLL("ll-tr-status", e.message, "error"); }
}

const SENS_BADGE = { ok: "badge-good", caution: "badge-warning", revise: "badge-critical" };

async function llSensitivity() {
  const text = document.getElementById("ll-sens-input").value.trim();
  const lang = document.getElementById("ll-sens-lang").value;
  const region = document.getElementById("ll-sens-region").value.trim();
  const out = document.getElementById("ll-sens-result");
  if (!text) { setLL("ll-sens-status", "Type a message first.", "error"); return; }
  setLL("ll-sens-status", "Checking…", ""); out.innerHTML = "";
  try {
    const r = await api("/api/language/check-sensitivity", {
      method: "POST",
      body: JSON.stringify({ text, target_language: lang || undefined, region: region || undefined }),
    });
    const rewrite = r.suggested_rewrite
      ? `<div class="ll-tip">✏️ <b>Safer rewrite:</b> ${escapeHtml(r.suggested_rewrite)}</div>` : "";
    out.innerHTML = `
      <div style="margin-bottom:10px"><span class="badge ${SENS_BADGE[r.verdict] || "badge-neutral"}"><span class="badge-dot"></span>${escapeHtml(r.verdict)}</span></div>
      ${r.issues && r.issues.length
        ? `<ul class="verify-check-lines">${r.issues.map((i) => `<li>⚠️ ${escapeHtml(i)}</li>`).join("")}</ul>`
        : '<div class="muted" style="font-size:12.5px">No cultural-sensitivity issues detected.</div>'}
      ${rewrite}`;
    setLL("ll-sens-status", "", "");
  } catch (e) { setLL("ll-sens-status", e.message, "error"); }
}

// --- Translator (dedicated messaging translator) ─────────────────────────────

let translatorInit = false;
// Quick-pick chips for the languages most common in this dataset, in order.
const TR_QUICK_LANGS = ["Hindi", "Bengali", "Tamil", "Telugu", "Marathi", "Gujarati", "Kannada", "Punjabi"];

async function loadTranslator() {
  if (translatorInit) return;
  const { languages } = await api("/api/language/supported").catch(() => ({ languages: [] }));
  const list = languages || [];
  const opts = list.map((l) => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join("");

  const sel = document.getElementById("tr-compose-lang");
  if (sel) {
    sel.innerHTML = opts;
    if (list.includes("Hindi")) sel.value = "Hindi"; // sensible default
  }

  // Quick-pick chips: only show the ones the backend actually supports.
  const quick = document.getElementById("tr-quicklang");
  if (quick) {
    quick.innerHTML = TR_QUICK_LANGS.filter((l) => list.includes(l))
      .map((l) => `<button type="button" class="tr-chip${l === "Hindi" ? " active" : ""}" data-lang="${escapeHtml(l)}">${escapeHtml(l)}</button>`)
      .join("");
    quick.querySelectorAll(".tr-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        if (sel) sel.value = chip.dataset.lang;
        quick.querySelectorAll(".tr-chip").forEach((c) => c.classList.toggle("active", c === chip));
      });
    });
  }
  // Keep the chips in sync if the operator changes the dropdown directly.
  if (sel && quick) {
    sel.addEventListener("change", () => {
      quick.querySelectorAll(".tr-chip").forEach((c) => c.classList.toggle("active", c.dataset.lang === sel.value));
    });
  }

  // Tab switching (scoped to tr-* so it can't collide with Language Lab tabs).
  document.querySelectorAll(".tr-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tr-tab").forEach((t) => t.classList.toggle("active", t === tab));
      document.querySelectorAll(".tr-pane").forEach((p) => { p.hidden = p.dataset.trpane !== tab.dataset.trtab; });
    });
  });

  document.getElementById("tr-compose-btn").addEventListener("click", trCompose);
  document.getElementById("tr-understand-btn").addEventListener("click", trUnderstand);
  translatorInit = true;
}

async function trCompose() {
  const text = document.getElementById("tr-compose-input").value.trim();
  const target = document.getElementById("tr-compose-lang").value;
  const romanized = document.getElementById("tr-compose-romanized").checked;
  const out = document.getElementById("tr-compose-result");
  if (!text) { setLL("tr-compose-status", "Type a message first.", "error"); return; }
  setLL("tr-compose-status", "Translating…", ""); out.innerHTML = "";
  try {
    const r = await api("/api/language/translate", {
      method: "POST",
      body: JSON.stringify({ text, target_language: target, romanized }),
    });
    out.innerHTML = `
      <div class="ll-translation">
        <div class="ll-translation-head">${escapeHtml(r.target_language)}${r.romanized ? " · romanized" : ""}</div>
        <div class="ll-translation-text">${escapeHtml(r.translation)}</div>
        <button class="btn btn-small" id="tr-compose-copy">📋 Copy</button>
      </div>`;
    document.getElementById("tr-compose-copy").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(r.translation); showToast("Copied — paste into the DM", "success"); }
      catch { showToast("Copy failed — select and copy manually", "error"); }
    });
    setLL("tr-compose-status", "", "");
  } catch (e) { setLL("tr-compose-status", e.message, "error"); }
}

async function trUnderstand() {
  const text = document.getElementById("tr-understand-input").value.trim();
  const out = document.getElementById("tr-understand-result");
  if (!text) { setLL("tr-understand-status", "Paste their message first.", "error"); return; }
  setLL("tr-understand-status", "Translating…", ""); out.innerHTML = "";
  try {
    // Translate to English and read their writing style in parallel; the style
    // read is best-effort (null on failure) so a hiccup there still shows the
    // English meaning.
    const [tr, style] = await Promise.all([
      api("/api/language/translate", { method: "POST", body: JSON.stringify({ text, target_language: "English", romanized: false }) }),
      api("/api/language/detect-style", { method: "POST", body: JSON.stringify({ text }) }).catch(() => null),
    ]);
    const styleBlock = style ? `
      <div class="ll-grid">
        <div><span class="ll-k">Language</span><span class="ll-v">${escapeHtml(style.language)}${style.romanized ? " (romanized)" : ""}</span></div>
        <div><span class="ll-k">Register</span><span class="ll-v">${escapeHtml(style.register)}</span></div>
        <div><span class="ll-k">Dialect</span><span class="ll-v">${escapeHtml(style.dialect)}</span></div>
      </div>
      <div class="ll-tip">💡 <b>How to reply:</b> ${escapeHtml(style.mirror_tip || "—")}</div>` : "";
    out.innerHTML = `
      <div class="ll-translation">
        <div class="ll-translation-head">English meaning</div>
        <div class="ll-translation-text">${escapeHtml(tr.translation)}</div>
      </div>
      ${styleBlock}`;
    setLL("tr-understand-status", "", "");
  } catch (e) { setLL("tr-understand-status", e.message, "error"); }
}

// --- Init ───────────────────────────────────────────────────────────────────

function initFilters() {
  document.getElementById("client-filter").addEventListener("change", (e) => {
    state.clientId = e.target.value;
    refreshWhatsappBadge();
    loadSection(state.section);
  });
  document.getElementById("creator-status-filter").addEventListener("change", loadCreators);
  document.getElementById("creator-channel-filter").addEventListener("change", loadCreators);
  document.getElementById("show-resolved").addEventListener("change", loadActions);
  document.getElementById("wa-platform-filter").addEventListener("change", loadWhatsapp);
  document.getElementById("wa-status-filter").addEventListener("change", loadWhatsapp);
  document.getElementById("wa-search").addEventListener("input", debounce(renderWhatsapp, 200));
}

async function init() {
  initNav();
  initFilters();
  initAddClientForm();
  initShopsForm();
  initScrape();
  initAnalyzer();
  initVerify();
  initDealers();
  initOpsExport();
  initNegotiatorToggle();
  initRefreshButton();

  await loadClientFilter();
  await refreshNegotiatorStatus();
  await refreshActionsBadge();
  await refreshWhatsappBadge();
  await refreshOpsBadge();
  loadSection(state.section);

  // Auto-refresh every 10 seconds
  setInterval(() => {
    refreshNegotiatorStatus();
    refreshActionsBadge();
    refreshWhatsappBadge();
    refreshOpsBadge();
    // Skip the section re-render while a modal is open or the user is typing /
    // picking in a form control — re-rendering would snap dropdowns shut and
    // wipe search filters mid-use.
    const modalOpen = document.querySelector(".modal-overlay:not([hidden])");
    const ae = document.activeElement;
    const editing = ae && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName) && ae.closest("main.content");
    if (modalOpen || editing) return;
    loadSection(state.section);
  }, 10000);
}

init();
