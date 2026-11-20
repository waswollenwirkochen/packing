/* =========================================================
   Urlaubsplanung: Urlaube · Planung · Unterwegs · Kosten · Einstellungen
   plus Synchronisierung, Einladungen, Tickets, Excel-Export/-Import
   ========================================================= */
(() => {
  "use strict";
  const PL = window.PL;
  const C = PL.core, S = PL.sync;
  const { state, $, $$, esc, uid, clone, fmtDate, addDays, ICON, trip, tripName, person, pname, toast, openModal, closeModal, armed } = C;

  const ICONS = {
    lock: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="9" width="12" height="8" rx="2"/><path d="M7 9V6.5a3 3 0 0 1 6 0V9"/></svg>',
    cloud: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 15h8.5a3.5 3.5 0 0 0 .4-7A5 5 0 0 0 5.2 9 3 3 0 0 0 6 15z"/></svg>',
    file: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 2.5h6.5L15 6v11.5H5z"/><path d="M11 2.5V6.5h4"/></svg>',
    clip: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M14.5 9.5l-5 5a3 3 0 0 1-4.2-4.2l6-6a2 2 0 0 1 2.8 2.8l-6 6a1 1 0 0 1-1.4-1.4l5-5"/></svg>',
    excel: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="3" width="14" height="14" rx="2"/><path d="M7 7l6 6M13 7l-6 6"/></svg>',
    users: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="7.5" cy="7" r="2.8"/><path d="M2.5 16.5c.6-3 2.6-4.5 5-4.5s4.4 1.5 5 4.5"/><circle cx="14" cy="7.5" r="2.2"/><path d="M13.5 12c2 .1 3.4 1.4 4 4"/></svg>',
    map: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M10 17.5s5.5-5 5.5-9.5a5.5 5.5 0 0 0-11 0c0 4.5 5.5 9.5 5.5 9.5z"/><circle cx="10" cy="8" r="2"/></svg>',
    trash: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h12M8 6V4h4v2M6 6l1 11h6l1-11"/></svg>',
    expand: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M11 3h6v6M9 17H3v-6M17 3l-6 6M3 17l6-6"/></svg>'
  };

  const TYPEN = [
    { id: "", name: "–" },
    { id: "fahrt", name: "Fahrtag" },
    { id: "wandern", name: "Wanderung" },
    { id: "stadt", name: "Stadt" },
    { id: "strand", name: "Strand" },
    { id: "aktiv", name: "Aktivität" },
    { id: "ruhe", name: "Ruhetag" },
    { id: "sonst", name: "Sonstiges" }
  ];
  const typName = (id) => (TYPEN.find((x) => x.id === id) || TYPEN[0]).name;
  const KATEGORIEN = ["Unterkunft", "Transport", "Essen", "Aktivitäten", "Tickets", "Sonstiges"];
  const FIELDS = [
    { k: "titel", h: "Programm", ph: "Was machen wir?", w: 15 },
    { k: "von", h: "Von", ph: "Start", w: 9 },
    { k: "nach", h: "Nach", ph: "Ziel", w: 9 },
    { k: "km", h: "km", ph: "", w: 4, num: true },
    { k: "dauer", h: "Dauer", ph: "5:30 h", w: 5 },
    { k: "hoch", h: "↑ m", ph: "", w: 4.5, num: true },
    { k: "runter", h: "↓ m", ph: "", w: 4.5, num: true },
    { k: "highlights", h: "Highlights", ph: "", w: 12 },
    { k: "unterkunft", h: "Unterkunft", ph: "", w: 11 },
    { k: "hinweise", h: "Hinweise", ph: "", w: 12 },
    { k: "sonstiges", h: "Sonstiges", ph: "", w: 9 }
  ];

  const num = (v) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return isNaN(n) ? 0 : n; };
  const fmtNum = (n, d = 0) => n.toLocaleString("de-DE", { maximumFractionDigits: d });
  const money = (t, n) => (n || 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + (t.waehrung || "€");
  // "5:30h", "5h30", "5,5 h", "6h" → Minuten
  function durMin(s) {
    s = String(s || "").toLowerCase().replace(",", ".");
    let m = s.match(/(\d+)\s*[:h]\s*(\d{1,2})/); if (m) return +m[1] * 60 + +m[2];
    m = s.match(/(\d+(?:\.\d+)?)\s*h/); if (m) return Math.round(+m[1] * 60);
    m = s.match(/(\d+)\s*min/); if (m) return +m[1];
    m = s.match(/^\s*(\d+(?:\.\d+)?)\s*$/); if (m) return Math.round(+m[1] * 60);
    return 0;
  }
  const fmtDur = (min) => (min ? `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")} h` : "–");
  const dateOf = (t, i) => (t.von ? addDays(t.von, i) : "");
  const dayLabel = (t, i, long) => {
    const iso = dateOf(t, i);
    if (!iso) return `Tag ${i + 1}`;
    return fmtDate(iso, long ? { weekday: "long", day: "numeric", month: "long" } : { weekday: "short", day: "2-digit", month: "2-digit" });
  };

  // ---------- Tagesplan an Reisedauer anpassen ----------
  const rowEmpty = (r) => !FIELDS.some((f) => String(r[f.k] ?? "").trim()) && !r.typ;
  function ensurePlan(t) {
    t.plan ||= [];
    while (t.plan.length < t.tage) t.plan.push({ id: uid() + uid(), typ: "" });
    while (t.plan.length > t.tage && rowEmpty(t.plan[t.plan.length - 1])) t.plan.pop();
  }

  // =========================================================
  //  SYNCHRONISIERUNG
  // =========================================================
  const sync = { status: "off", msg: "", at: null, queue: Promise.resolve(), timer: null };
  const online = () => navigator.onLine !== false;
  function cfgFor(id) {
    const k = state.keys[id]; if (!k) return null;
    if (k.o && k.r && k.t) return { o: k.o, r: k.r, t: k.t };
    if (k.owner && state.syncCfg) return { o: state.syncCfg.o, r: state.syncCfg.r, t: state.syncCfg.t };
    return null;
  }
  const isShared = (id) => !!cfgFor(id);
  function setStatus(st, msg = "") {
    sync.status = st; sync.msg = msg; if (st === "ok") sync.at = new Date();
    renderHeader();
  }
  const enqueue = (fn) => (sync.queue = sync.queue.then(fn, fn).catch((e) => { console.error(e); }));

  async function pullTrip(id) {
    const cfg = cfgFor(id), key = state.keys[id] && state.keys[id].k; if (!cfg || !key) return;
    const remote = await S.getFile(cfg, `trips/${id}.enc`);
    const base = state.base[id];
    if (!remote) {
      if (!state.keys[id].owner && !state.trips[id]) throw new Error("Dieser Urlaub existiert im Daten-Repo nicht (mehr).");
      return; // wird beim nächsten Speichern angelegt
    }
    if (base && base.sha === remote.sha) return;
    let remoteDoc;
    try { remoteDoc = await S.decJSON(key, remote.content); }
    catch { throw new Error("Urlaub konnte nicht entschlüsselt werden – Schlüssel passt nicht."); }
    const local = state.trips[id];
    const merged = local ? S.merge3(base && base.doc, local, remoteDoc) : remoteDoc;
    // eigene Kopien – der Basisstand darf nie dasselbe Objekt wie der lokale Urlaub sein
    state.trips[id] = C.migrate(clone(merged));
    state.base[id] = { sha: remote.sha, doc: clone(remoteDoc) };
  }
  async function pushTrip(id, retry = true) {
    const cfg = cfgFor(id), key = state.keys[id] && state.keys[id].k, t = state.trips[id];
    if (!cfg || !key || !t) return;
    const base = state.base[id];
    if (base && base.sha && S.eq(base.doc, t)) return;
    const doc = clone(t);
    try {
      const res = await S.putFile(cfg, `trips/${id}.enc`, await S.encJSON(key, doc), base && base.sha, `Urlaub ${id.slice(0, 6)} aktualisiert`);
      state.base[id] = { sha: res.content.sha, doc };
    } catch (e) {
      if (retry && (e.status === 409 || e.status === 422)) { await pullTrip(id); return pushTrip(id, false); }
      throw e;
    }
  }

  // eigener Schlüsselbund (welche Urlaube gehören mir) – mit Passwort verschlüsselt
  async function pullKeyring() {
    const cfg = state.syncCfg; if (!cfg) return;
    const f = await S.getFile(cfg, "keys/keyring.enc");
    if (!f) return;
    const wrap = JSON.parse(atob(f.content));
    let ring;
    try { ring = await S.decJSON(cfg.mk, wrap.data); } catch { throw new Error("Passwort passt nicht zum Schlüsselbund im Daten-Repo."); }
    cfg.ringSha = f.sha;
    Object.entries(ring.trips || {}).forEach(([id, e]) => {
      if ((ring.deleted || []).includes(id)) return;
      if (!state.keys[id]) state.keys[id] = { k: e.k, owner: true };
    });
    (ring.deleted || []).forEach((id) => {
      if (state.keys[id] && state.keys[id].owner) { delete state.trips[id]; delete state.keys[id]; delete state.base[id]; }
    });
    cfg.ringDeleted = ring.deleted || [];
  }
  async function pushKeyring() {
    const cfg = state.syncCfg; if (!cfg) return;
    const trips = {};
    Object.entries(state.keys).forEach(([id, k]) => { if (k.owner && state.trips[id]) trips[id] = { k: k.k }; });
    const deleted = [...new Set([...(cfg.ringDeleted || []), ...state.deleted])];
    const ring = { v: 1, trips, deleted };
    if (cfg.ringCache && S.eq(cfg.ringCache, ring)) return;
    const content = btoa(JSON.stringify({ v: 1, salt: cfg.salt, data: await S.encJSON(cfg.mk, ring) }));
    try {
      const res = await S.putFile(cfg, "keys/keyring.enc", content, cfg.ringSha, "Schlüsselbund aktualisiert");
      cfg.ringSha = res.content.sha; cfg.ringCache = ring; cfg.ringDeleted = deleted;
    } catch (e) {
      if (e.status === 409 || e.status === 422) { await pullKeyring(); return pushKeyring(); }
      throw e;
    }
  }

  async function uploadFiles(t) {
    const key = state.keys[t.id] && state.keys[t.id].k, cfg = cfgFor(t.id); if (!cfg || !key) return;
    for (const f of t.tickets || []) {
      if (f.up) continue;
      const bytes = await S.cacheGet(`${t.id}/${f.id}`);
      if (!bytes) continue;
      await S.putFile(cfg, `files/${t.id}/${f.id}.enc`, S.bytesToB64(bytes), null, "Datei hinzugefügt");
      f.up = true;
    }
  }
  async function processDeletes() {
    for (const d of [...(state.fileDeletes || [])]) {
      const cfg = d.cfg; if (!cfg) continue;
      await S.delFile(cfg, d.path, "Gelöscht");
      state.fileDeletes = state.fileDeletes.filter((x) => x !== d);
    }
    for (const id of [...state.deleted]) {
      if (!state.syncCfg) break;
      await S.delFile(state.syncCfg, `trips/${id}.enc`, "Urlaub gelöscht");
      state.deleted = state.deleted.filter((x) => x !== id);
      if (state.syncCfg.ringDeleted && !state.syncCfg.ringDeleted.includes(id)) state.syncCfg.ringDeleted.push(id);
    }
  }

  function syncAll(opts = {}) {
    if (!S.available) return Promise.resolve();
    const ids = Object.keys(state.trips).filter(isShared).concat(Object.keys(state.keys).filter((id) => !state.trips[id] && cfgFor(id)));
    if (!state.syncCfg && !ids.length) { setStatus("off"); return Promise.resolve(); }
    if (!online()) { setStatus("offline", "Offline – Änderungen werden später synchronisiert."); return Promise.resolve(); }
    return enqueue(async () => {
      setStatus("busy");
      try {
        const before = JSON.stringify(state.trips);
        if (state.syncCfg) await pullKeyring();
        const all = new Set([...Object.keys(state.trips), ...Object.keys(state.keys)]);
        const only = opts.only ? [opts.only] : [...all];
        for (const id of only) {
          if (!cfgFor(id)) continue;
          if (!opts.pushOnly) await pullTrip(id);
          if (state.trips[id]) { await uploadFiles(state.trips[id]); await pushTrip(id); }
        }
        await processDeletes();
        if (state.syncCfg) await pushKeyring();
        C.store.save();
        setStatus("ok");
        if (JSON.stringify(state.trips) !== before) C.render();
        prefetchFiles();
      } catch (e) {
        console.error(e);
        if (!online() || e.status === 0) setStatus("offline", "Offline – Änderungen werden später synchronisiert.");
        else setStatus("error", e.message || String(e));
      }
    });
  }
  // nach jeder Änderung: kurz warten, dann den aktuellen Urlaub hochladen
  PL.afterCommit = () => {
    const t = trip(); if (!t || !isShared(t.id)) return;
    const base = state.base[t.id];
    if (base && S.eq(base.doc, t)) return;
    clearTimeout(sync.timer);
    setStatus(online() ? "pending" : "offline", online() ? "" : "Offline – Änderungen werden später synchronisiert.");
    sync.timer = setTimeout(() => syncAll({ only: t.id, pushOnly: false }), 1500);
  };
  setInterval(() => { if (document.visibilityState === "visible" && trip() && isShared(trip().id)) syncAll({ only: trip().id }); }, 60000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") syncAll(); });
  window.addEventListener("online", () => syncAll());
  window.addEventListener("offline", () => setStatus("offline", "Offline – Änderungen werden später synchronisiert."));

  // Dateien eines Urlaubs im Hintergrund offline verfügbar machen
  let prefetching = false;
  async function prefetchFiles() {
    const t = trip(); if (!t || prefetching || !online()) return;
    const cfg = cfgFor(t.id); if (!cfg) return;
    prefetching = true;
    try {
      for (const f of t.tickets || []) {
        if (!f.up) continue;
        const k = `${t.id}/${f.id}`;
        if (await S.cacheGet(k)) continue;
        const bytes = await S.getRawBytes(cfg, `files/${t.id}/${f.id}.enc`);
        if (bytes) await S.cachePut(k, bytes);
      }
    } catch (e) { console.warn(e); }
    prefetching = false;
    if (state.ui.tab === "unterwegs") C.render();
  }

  // =========================================================
  //  KOPFZEILE (Urlaubs-Auswahl & Sync-Status)
  // =========================================================
  function renderHeader() {
    const sel = $("#tripSwitch"); if (!sel) return;
    const t = trip();
    const list = Object.values(state.trips).sort((a, b) => (a.von || "9999").localeCompare(b.von || "9999"));
    sel.innerHTML = (list.length ? list.map((x) => `<option value="${x.id}" ${t && x.id === t.id ? "selected" : ""}>${esc(tripName(x))}</option>`).join("") : `<option value="">Noch kein Urlaub</option>`)
      + `<option value="__new">+ Neuer Urlaub …</option>`;
    const dot = $("#syncState");
    const map = {
      off: ["", "Nur auf diesem Gerät gespeichert"],
      ok: ["ok", "Synchronisiert" + (sync.at ? " um " + sync.at.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "")],
      busy: ["busy", "Synchronisiere …"],
      pending: ["busy", "Änderungen werden gespeichert …"],
      offline: ["offline", sync.msg || "Offline"],
      error: ["error", "Sync-Fehler: " + sync.msg]
    };
    const [cls, title] = map[sync.status] || map.off;
    if (dot) { dot.className = "sync-dot " + cls; dot.title = title; dot.setAttribute("aria-label", title); $(".sync-label", dot.parentElement).textContent = cls === "ok" ? "sync" : cls === "busy" ? "…" : cls === "offline" ? "offline" : cls === "error" ? "Fehler" : "lokal"; }
  }
  PL.renderHeader = renderHeader;

  // =========================================================
  //  URLAUBE (Startseite)
  // =========================================================
  function daysUntil(iso) { return iso ? Math.round((new Date(iso + "T12:00:00") - new Date(C.todayISO() + "T12:00:00")) / 864e5) : null; }
  function tripBadge(t) {
    const k = state.keys[t.id] || {};
    if (!k.owner) return `<span class="badge shared">${ICONS.users} eingeladen</span>`;
    if (isShared(t.id)) return `<span class="badge vegan">${ICONS.lock} verschlüsselt synchronisiert</span>`;
    return `<span class="badge">nur auf diesem Gerät</span>`;
  }
  function renderUrlaube() {
    const el = $("#view-urlaube");
    const list = Object.values(state.trips);
    const today = C.todayISO();
    const upcoming = list.filter((t) => !t.bis || t.bis >= today).sort((a, b) => (a.von || "9999").localeCompare(b.von || "9999"));
    const past = list.filter((t) => t.bis && t.bis < today).sort((a, b) => b.von.localeCompare(a.von));
    const card = (t) => {
      const d = daysUntil(t.von), running = t.von && t.von <= today && t.bis >= today;
      const when = !t.von ? `${t.tage} Tage · Datum offen` : `${fmtDate(t.von, { day: "numeric", month: "short" })} – ${fmtDate(t.bis, { day: "numeric", month: "short", year: "numeric" })} · ${t.tage} Tage`;
      const countdown = running ? `<span class="countdown live">läuft gerade · Tag ${C.dayDiff(t.von, today) + 1}</span>` : d > 0 ? `<span class="countdown">in ${d} ${d === 1 ? "Tag" : "Tagen"}</span>` : "";
      const people = t.personen.map((p) => pname(t, p)).join(", ");
      return `<button class="card trip-tile" data-open="${t.id}">
        <div class="row" style="justify-content:space-between">${tripBadge(t)}${countdown}</div>
        <h3>${esc(tripName(t))}</h3>
        ${t.ziel && t.name ? `<div class="muted">${esc(t.ziel)}</div>` : ""}
        <div class="small muted">${when}</div>
        <div class="small">${ICONS.users} ${esc(people)}</div>
      </button>`;
    };
    el.innerHTML = `
      <div class="hero card card-pad">
        <div>
          <h1>Urlaubsplanung</h1>
          <p class="muted">Tage planen, Kosten teilen, Tickets griffbereit haben – gemeinsam mit allen, die mitkommen.</p>
        </div>
        <div class="row">
          <button class="btn primary" data-act="new">${ICON.plus} Neuer Urlaub</button>
          <label class="btn">${ICONS.excel} Aus Excel importieren<input type="file" accept=".xlsx" data-act="import" hidden></label>
        </div>
      </div>
      ${!state.syncCfg && S.available ? `<div class="card card-pad hint-card"><b>Noch nicht synchronisiert.</b> Deine Urlaube liegen nur in diesem Browser. Richte das verschlüsselte Daten-Repo ein, um Urlaube mit anderen zu teilen und auf mehreren Geräten zu nutzen. <a href="#einstellungen">Jetzt einrichten →</a></div>` : ""}
      <h2 class="list-h">Anstehend</h2>
      <div class="trip-grid-list">${upcoming.map(card).join("") || `<div class="card empty">Noch kein Urlaub geplant. Leg los mit „Neuer Urlaub“.</div>`}</div>
      ${past.length ? `<h2 class="list-h">Vergangen</h2><div class="trip-grid-list past">${past.map(card).join("")}</div>` : ""}`;
  }
  function onUrlaubeClick(e) {
    const o = e.target.closest("[data-open]");
    if (o) { state.current = o.dataset.open; state.ui.viewPerson = "alle"; C.store.save(); location.hash = "plan"; syncAll({ only: o.dataset.open }); return; }
    const a = e.target.closest("[data-act]"); if (!a) return;
    if (a.dataset.act === "new") openNewUrlaub();
  }

  // ----- Neuer Urlaub -----
  function openNewUrlaub() {
    const P = C.PACK();
    openModal({
      title: "Neuer Urlaub",
      body: `<form id="nuForm" class="form-grid">
        <label class="field c6">Wo geht’s hin?<input name="ziel" placeholder="z. B. Queyras & Ligurien" required></label>
        <label class="field c6">Name <span class="muted" style="font-weight:400">– optional</span><input name="name" placeholder="z. B. Roadtrip Sommer 2027"></label>
        <label class="field c2">Von<input name="von" placeholder="TT.MM.JJJJ" inputmode="numeric"></label>
        <label class="field c2">Bis<input name="bis" placeholder="TT.MM.JJJJ" inputmode="numeric"></label>
        <label class="field c2">oder: Tage<input type="number" name="tage" min="1" max="60" value="7"></label>
        <label class="field c2">Wer kommt mit?<input type="number" name="anzahl" min="1" max="12" value="2"></label>
        <label class="field c4">Namen <span class="muted" style="font-weight:400">– optional, Komma-getrennt, du zuerst</span><input name="namen" placeholder="z. B. Eric, Jenny"></label>
        <div class="field c6">Reiseart (kombinierbar)
          <div class="row">${P.arten.map((a, i) => `<label class="check"><input type="checkbox" name="art" value="${a.id}" ${i === 0 ? "checked" : ""}> ${esc(a.name)}</label>`).join("")}</div></div>
      </form>`,
      foot: `<button class="btn" data-close>Abbrechen</button><button class="btn primary" form="nuForm">Urlaub anlegen</button>`,
      onMount: (m) => $("#nuForm", m).addEventListener("submit", (e) => {
        e.preventDefault(); const f = e.target;
        const von = C.parseDE(f.von.value), bis = C.parseDE(f.bis.value);
        if (von === null || bis === null) return toast("Datum nicht erkannt – bitte als TT.MM.JJJJ eingeben.");
        const arten = $$("input[name=art]:checked", f).map((x) => x.value);
        const t = C.newTrip(arten.length ? arten : [P.arten[0].id]);
        t.ziel = f.ziel.value.trim(); t.name = f.name.value.trim();
        t.tage = Math.max(1, Math.min(60, parseInt(f.tage.value) || 7));
        if (von) C.setRange(t, von, bis && bis >= von ? bis : addDays(von, t.tage - 1));
        const names = f.namen.value.split(",").map((x) => x.trim()).filter(Boolean);
        C.setPersonCount(t, Math.max(parseInt(f.anzahl.value) || 1, names.length));
        names.forEach((n, i) => { if (t.personen[i]) t.personen[i].name = n; });
        C.setMe(t, t.personen[0].id);
        ensurePlan(t);
        state.trips[t.id] = t; state.current = t.id;
        closeModal(); C.store.save(); location.hash = "plan"; C.render();
        toast(`„${tripName(t)}“ angelegt.`);
        syncAll({ only: t.id });
      })
    });
  }
  PL.openNewUrlaub = openNewUrlaub;

  // =========================================================
  //  PLANUNG (Excel-artiger Tagesplan)
  // =========================================================
  function planStats(t) {
    const rows = t.plan.slice(0, t.tage);
    const w = rows.filter((r) => r.typ === "wandern");
    return {
      wTage: w.length,
      wKm: w.reduce((s, r) => s + num(r.km), 0),
      wMin: w.reduce((s, r) => s + durMin(r.dauer), 0),
      hoch: rows.reduce((s, r) => s + num(r.hoch), 0),
      runter: rows.reduce((s, r) => s + num(r.runter), 0),
      fKm: rows.filter((r) => r.typ === "fahrt").reduce((s, r) => s + num(r.km), 0),
      kosten: (t.kosten || []).reduce((s, k) => s + num(k.betrag), 0),
      files: (t.tickets || []).length
    };
  }
  function statsHtml(t) {
    const s = planStats(t);
    const kpi = (v, l) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`;
    return `<div class="plan-kpis">
      ${kpi(t.tage, t.tage === 1 ? "Tag" : "Tage")}
      ${s.wTage ? kpi(s.wTage, "Wandertage") : ""}
      ${s.wKm ? kpi(fmtNum(s.wKm, 1) + " km", "zu Fuß") : ""}
      ${s.wMin ? kpi(fmtDur(s.wMin), "Gehzeit") : ""}
      ${s.hoch ? kpi(fmtNum(s.hoch) + " m", "Aufstieg") : ""}
      ${s.fKm ? kpi(fmtNum(s.fKm) + " km", "Fahrstrecke") : ""}
      ${kpi(money(t, s.kosten), `<a href="#kosten">Kosten</a>`)}
      ${kpi(s.files, `<a href="#unterwegs">Unterlagen</a>`)}
    </div>`;
  }
  function whoAmI(t) {
    if (t.personen.length < 2 || C.myId(t)) return "";
    return `<div class="whoami card card-pad"><b>Wer bist du?</b> Damit deine Haken in der Packliste und deine Kosten richtig zugeordnet werden:
      <div class="row" style="margin-top:.5rem">${t.personen.map((p) => `<button class="btn sm" data-me="${p.id}">${esc(pname(t, p))}</button>`).join("")}</div></div>`;
  }

  function renderPlan() {
    const t = trip(); const el = $("#view-plan");
    ensurePlan(t);
    const cards = state.ui.planView === "karten" || (state.ui.planView == null && window.innerWidth < 760);
    const fileCount = (rowId) => (t.tickets || []).filter((f) => f.tag === rowId).length;
    const extra = t.plan.length > t.tage;
    const head = `<div class="card card-pad plan-head">
        <div class="row plan-title">
          <div style="min-width:0">
            <h2>${esc(tripName(t))}</h2>
            <div class="muted small">${t.ziel && t.name ? esc(t.ziel) + " · " : ""}${t.von ? fmtDate(t.von, { day: "numeric", month: "short" }) + " – " + fmtDate(t.bis, { day: "numeric", month: "short", year: "numeric" }) : "Datum offen"} · ${t.personen.map((p) => esc(pname(t, p))).join(", ")}</div>
          </div>
          <span class="spacer"></span>
          ${tripBadge(t)}
          <button class="btn sm" data-act="invite">${ICONS.users} Einladen</button>
          <button class="btn sm" data-act="export">${ICONS.excel} Excel</button>
          <button class="btn sm ghost" data-act="toggle-meta" aria-expanded="${!!state.ui.metaOpen}">${ICON.edit} Eckdaten</button>
        </div>
        ${state.ui.metaOpen || !t.von ? `<div class="meta-box">${C.metaFields(t)}
          <div class="row" style="margin-top:.8rem">
            <button class="btn sm" data-act="dup">Duplizieren</button>
            ${state.keys[t.id] && state.keys[t.id].owner === false ? `<button class="btn sm danger" data-act="leave">Urlaub verlassen</button>` : `<button class="btn sm danger" data-act="delete">${ICONS.trash} Urlaub löschen</button>`}
          </div></div>` : ""}
      </div>`;

    let body;
    if (cards) {
      body = `<div class="day-cards">${t.plan.map((r, i) => {
        const out = i >= t.tage;
        // auf dem Handy nur das Wichtigste – der Rest steckt in „Details“ (oder erscheint, sobald ausgefüllt)
        const show = (k) => String(r[k] ?? "").trim() !== "" || ["titel", "von", "nach", "unterkunft"].includes(k)
          || (["km", "dauer"].includes(k) && (r.typ === "wandern" || r.typ === "fahrt")) || (["hoch", "runter"].includes(k) && r.typ === "wandern");
        return `<div class="card day-card typ-${r.typ || "none"} ${out ? "out" : ""}" data-row="${r.id}">
          <div class="dc-head">
            <div><b>${out ? "nach Reiseende" : esc(dayLabel(t, i))}</b><small>Tag ${i + 1}</small></div>
            <select data-cell="${r.id}:typ" aria-label="Art des Tages">${TYPEN.map((x) => `<option value="${x.id}" ${x.id === (r.typ || "") ? "selected" : ""}>${x.name}</option>`).join("")}</select>
            <button class="icon-btn" data-act="day" data-id="${r.id}" title="Details & Unterlagen" aria-label="Details & Unterlagen">${ICONS.clip}${fileCount(r.id) ? `<span class="count-badge">${fileCount(r.id)}</span>` : ""}</button>
            ${out ? `<button class="icon-btn" data-act="delrow" data-id="${r.id}" aria-label="Zeile löschen">${ICONS.trash}</button>` : ""}
          </div>
          <div class="dc-grid">${FIELDS.filter((f) => show(f.k)).map((f) => `<label class="dc-f ${f.num ? "n" : ""} f-${f.k}"><span>${f.h}</span><input data-cell="${r.id}:${f.k}" value="${esc(r[f.k] ?? "")}" placeholder="${f.ph}" ${f.num ? 'inputmode="decimal"' : ""}></label>`).join("")}</div>
        </div>`;
      }).join("")}</div>`;
    } else {
      const s = planStats(t);
      body = `<div class="card sheet-wrap"><table class="sheet">
        <colgroup><col style="width:7.5em"><col style="width:8.8em">${FIELDS.map((f) => `<col style="width:${f.w}em">`).join("")}<col style="width:3em"></colgroup>
        <thead><tr><th class="sticky-col">Datum</th><th>Art</th>${FIELDS.map((f) => `<th class="${f.num ? "n" : ""}">${f.h}</th>`).join("")}<th aria-label="Unterlagen">${ICONS.clip}</th></tr></thead>
        <tbody>${t.plan.map((r, i) => {
          const out = i >= t.tage;
          return `<tr class="typ-${r.typ || "none"} ${out ? "out" : ""}" data-row="${r.id}">
            <th class="sticky-col day-th">${out ? "<small>nach Ende</small>" : esc(dayLabel(t, i))}</th>
            <td><select data-cell="${r.id}:typ" aria-label="Art des Tages">${TYPEN.map((x) => `<option value="${x.id}" ${x.id === (r.typ || "") ? "selected" : ""}>${x.name}</option>`).join("")}</select></td>
            ${FIELDS.map((f) => `<td class="${f.num ? "n" : ""}"><input data-cell="${r.id}:${f.k}" value="${esc(r[f.k] ?? "")}" ${f.num ? 'inputmode="decimal"' : ""} aria-label="${f.h} – ${esc(dayLabel(t, i))}" title="${esc(r[f.k] ?? "")}"></td>`).join("")}
            <td class="c"><button class="icon-btn" data-act="day" data-id="${r.id}" title="Details & Unterlagen" aria-label="Details & Unterlagen">${fileCount(r.id) ? `<span class="count-badge solo">${fileCount(r.id)}</span>` : ICONS.expand}</button>
              ${out ? `<button class="icon-btn" data-act="delrow" data-id="${r.id}" aria-label="Zeile löschen">${ICONS.trash}</button>` : ""}</td>
          </tr>`;
        }).join("")}</tbody>
        <tfoot><tr><th class="sticky-col">Summe</th><td></td><td colspan="3" class="muted small">${s.wTage} Wandertage · ${fmtDur(s.wMin)} Gehzeit</td>
          <td class="n" data-sum="km">${fmtNum(s.wKm + s.fKm, 1)}</td><td></td><td class="n" data-sum="hoch">${fmtNum(s.hoch)}</td><td class="n" data-sum="runter">${fmtNum(s.runter)}</td><td colspan="5"></td></tr></tfoot>
      </table></div>`;
    }
    el.innerHTML = head + whoAmI(t) + statsHtml(t) + `
      <div class="row plan-tools no-print">
        <div class="seg"><button data-act="view" data-id="tabelle" class="${cards ? "" : "on"}">Tabelle</button><button data-act="view" data-id="karten" class="${cards ? "on" : ""}">Karten</button></div>
        <span class="muted small">${cards ? "" : "Tab = nächste Zelle · Enter = Zeile darunter · Änderungen werden automatisch gespeichert"}</span>
        <span class="spacer"></span>
        <button class="btn sm" data-act="print">${ICON.print} Drucken</button>
      </div>
      ${extra ? `<p class="hint">Der Zeitraum ist kürzer als der Plan – Tage nach Reiseende sind grau markiert und können gelöscht werden.</p>` : ""}
      ${body}`;
  }

  function onPlanClick(e) {
    const t = trip();
    const me = e.target.closest("[data-me]");
    if (me) { C.setMe(t, me.dataset.me); state.ui.viewPerson = me.dataset.me; return C.commit(); }
    const a = e.target.closest("[data-act]");
    if (!a) return;
    // Eckdaten (Kalender, Reiseart …) übernimmt die gemeinsame Logik
    if (a.closest(".meta-box") && !["dup", "delete", "leave"].includes(a.dataset.act)) return C.onPackClick(e);
    switch (a.dataset.act) {
      case "toggle-meta": state.ui.metaOpen = !state.ui.metaOpen; return C.commit();
      case "view": state.ui.planView = a.dataset.id; return C.commit();
      case "day": return openDay(t, a.dataset.id);
      case "delrow": t.plan = t.plan.filter((r) => r.id !== a.dataset.id); return C.commit();
      case "invite": return openInvite(t);
      case "export": return exportExcel(t);
      case "print": return C.doPrint();
      case "dup": {
        const c = clone(t); c.id = uid() + uid(); c.name = tripName(t) + " (Kopie)"; c.status = {}; c.tickets = [];
        state.keys[c.id] = { k: S.randomKey(), owner: true }; state.me[c.id] = C.myId(t);
        state.trips[c.id] = c; state.current = c.id; toast("Urlaub dupliziert (ohne Unterlagen und Haken)."); C.commit(); return syncAll({ only: c.id });
      }
      case "delete": {
        if (!armed(a, "Wirklich endgültig löschen?")) return;
        const id = t.id;
        if (isShared(id) && state.keys[id].owner) state.deleted.push(id);
        (t.tickets || []).forEach((f) => S.cacheDel(`${id}/${f.id}`));
        delete state.trips[id]; delete state.keys[id]; delete state.base[id]; state.current = null;
        toast("Urlaub gelöscht."); location.hash = "urlaube"; C.commit(); return syncAll();
      }
      case "leave": {
        if (!armed(a, "Wirklich verlassen?")) return;
        delete state.trips[t.id]; delete state.keys[t.id]; delete state.base[t.id]; state.current = null;
        toast("Urlaub auf diesem Gerät entfernt."); location.hash = "urlaube"; return C.commit();
      }
      default: return;
    }
  }
  function onPlanChange(e) {
    const el = e.target;
    if (el.closest(".meta-box")) { C.onPackChange(e); ensurePlan(trip()); return; }
    const c = el.dataset.cell; if (!c) return;
    const t = trip(); const [rid, k] = c.split(":");
    const r = t.plan.find((x) => x.id === rid); if (!r) return;
    const v = el.value.trim();
    if (v) r[k] = v; else delete r[k];
    if (k === "typ") return C.commit();
    el.title = v;
    C.save();
    // Summen & Kennzahlen aktualisieren, ohne die Tabelle neu zu zeichnen
    const s = planStats(t);
    const set = (sel, val) => { const x = $(sel); if (x) x.textContent = val; };
    set('[data-sum="km"]', fmtNum(s.wKm + s.fKm, 1)); set('[data-sum="hoch"]', fmtNum(s.hoch)); set('[data-sum="runter"]', fmtNum(s.runter));
    const kp = $(".plan-kpis"); if (kp) kp.outerHTML = statsHtml(t);
  }
  function onPlanKey(e) {
    if (e.key !== "Enter" || !e.target.dataset.cell || e.target.tagName !== "INPUT") return;
    e.preventDefault();
    const [rid, k] = e.target.dataset.cell.split(":"); const t = trip();
    const i = t.plan.findIndex((r) => r.id === rid);
    const next = t.plan[i + (e.shiftKey ? -1 : 1)];
    e.target.blur();
    if (next) { const n = $(`[data-cell="${next.id}:${k}"]`); if (n) { n.focus(); n.select(); } }
  }

  // ----- Tagesdetails (alle Felder + Unterlagen) -----
  function openDay(t, rid) {
    const i = t.plan.findIndex((r) => r.id === rid); const r = t.plan[i]; if (!r) return;
    openModal({
      title: `${dayLabel(t, i, true)} · Tag ${i + 1}`, wide: true,
      body: `<form id="dayForm" class="form-grid">
        <label class="field c2">Art<select name="typ">${TYPEN.map((x) => `<option value="${x.id}" ${x.id === (r.typ || "") ? "selected" : ""}>${x.name}</option>`).join("")}</select></label>
        <label class="field c4">Programm<input name="titel" value="${esc(r.titel || "")}"></label>
        <label class="field c3">Von<input name="von" value="${esc(r.von || "")}"></label>
        <label class="field c3">Nach<input name="nach" value="${esc(r.nach || "")}"></label>
        <label class="field c2">km<input name="km" value="${esc(r.km || "")}" inputmode="decimal"></label>
        <label class="field c2">Dauer<input name="dauer" value="${esc(r.dauer || "")}" placeholder="5:30 h"></label>
        <label class="field c1x">↑ m<input name="hoch" value="${esc(r.hoch || "")}" inputmode="numeric"></label>
        <label class="field c1x">↓ m<input name="runter" value="${esc(r.runter || "")}" inputmode="numeric"></label>
        <label class="field c6">Highlights<textarea name="highlights" rows="2">${esc(r.highlights || "")}</textarea></label>
        <label class="field c6">Unterkunft<input name="unterkunft" value="${esc(r.unterkunft || "")}"></label>
        <label class="field c6">Hinweise<textarea name="hinweise" rows="2">${esc(r.hinweise || "")}</textarea></label>
        <label class="field c6">Sonstiges<textarea name="sonstiges" rows="2">${esc(r.sonstiges || "")}</textarea></label>
      </form>
      <h4 class="form-sub" style="margin-top:1rem">Tickets & Unterlagen für diesen Tag</h4>
      <div id="dayFiles">${filesHtml(t, rid)}</div>`,
      foot: `<button class="btn" data-close>Abbrechen</button><button class="btn primary" form="dayForm">Speichern</button>`,
      onMount: (m) => {
        $("#dayForm", m).addEventListener("submit", (e) => {
          e.preventDefault(); const f = e.target;
          ["typ", ...FIELDS.map((x) => x.k)].forEach((k) => { const v = (f[k].value || "").trim(); if (v) r[k] = v; else delete r[k]; });
          closeModal(); C.commit();
        });
        bindFiles(m, t, rid, () => { $("#dayFiles", m).innerHTML = filesHtml(t, rid); });
      }
    });
  }

  // =========================================================
  //  TICKETS & UNTERLAGEN
  // =========================================================
  const fmtSize = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB");
  const offlineState = {}; // Datei-id → true, wenn lokal vorhanden
  async function refreshOffline(t) {
    for (const f of t.tickets || []) offlineState[f.id] = !!(await S.cacheGet(`${t.id}/${f.id}`));
  }
  function filesHtml(t, tag) {
    const list = (t.tickets || []).filter((f) => tag === undefined || (f.tag || "") === tag);
    return `<ul class="files">${list.map((f) => `<li>
        <button class="file-open" data-fopen="${f.id}">${ICONS.file}<span><b>${esc(f.name)}</b><small>${fmtSize(f.size || 0)}${f.notiz ? " · " + esc(f.notiz) : ""}${offlineState[f.id] ? " · offline verfügbar" : f.up ? "" : " · wird hochgeladen …"}</small></span></button>
        <button class="icon-btn" data-fdel="${f.id}" title="Löschen" aria-label="${esc(f.name)} löschen">${ICONS.trash}</button>
      </li>`).join("") || `<li class="muted small">Noch keine Unterlagen.</li>`}</ul>
      <label class="btn sm">${ICON.plus} Ticket / Datei hinzufügen<input type="file" data-fadd="${tag ?? ""}" multiple hidden></label>
      <p class="hint" style="margin-top:.5rem">Dateien werden im Browser verschlüsselt, bevor sie hochgeladen werden, und auf diesem Gerät auch offline gespeichert. Max. 25 MB pro Datei.</p>`;
  }
  function bindFiles(root, t, tag, refresh) {
    root.addEventListener("change", async (e) => {
      const inp = e.target.closest("[data-fadd]"); if (!inp || !inp.files.length) return;
      for (const file of inp.files) await addFile(t, file, inp.dataset.fadd);
      refresh();
    });
    root.addEventListener("click", async (e) => {
      const o = e.target.closest("[data-fopen]"); if (o) return openFile(t, o.dataset.fopen);
      const d = e.target.closest("[data-fdel]");
      if (d) { if (!armed(d, "Löschen?")) return; await deleteFile(t, d.dataset.fdel); refresh(); }
    });
  }
  async function addFile(t, file, tag) {
    if (!S.available) return toast("Dieser Browser unterstützt keine Verschlüsselung (bitte über https öffnen).");
    if (file.size > 25 * 1048576) return toast(`„${file.name}“ ist größer als 25 MB.`);
    const key = state.keys[t.id] && state.keys[t.id].k;
    if (!key) return toast("Für diesen Urlaub fehlt der Schlüssel.");
    const id = uid() + uid();
    const enc = await S.encBytes(key, new Uint8Array(await file.arrayBuffer()));
    await S.cachePut(`${t.id}/${id}`, enc);
    offlineState[id] = true;
    t.tickets ||= [];
    t.tickets.push({ id, tag: tag || "", name: file.name, mime: file.type || "application/octet-stream", size: file.size, up: false, am: new Date().toISOString() });
    C.save(); toast(`„${file.name}“ hinzugefügt.`);
    if (isShared(t.id)) syncAll({ only: t.id });
  }
  async function deleteFile(t, id) {
    const f = (t.tickets || []).find((x) => x.id === id); if (!f) return;
    t.tickets = t.tickets.filter((x) => x.id !== id);
    await S.cacheDel(`${t.id}/${id}`);
    const cfg = cfgFor(t.id);
    if (f.up && cfg) { state.fileDeletes ||= []; state.fileDeletes.push({ cfg, path: `files/${t.id}/${id}.enc` }); }
    C.save(); if (isShared(t.id)) syncAll({ only: t.id });
  }
  async function getFileBlob(t, f) {
    const key = state.keys[t.id] && state.keys[t.id].k;
    let bytes = await S.cacheGet(`${t.id}/${f.id}`);
    if (!bytes) {
      const cfg = cfgFor(t.id);
      if (!cfg || !online()) throw new Error("Datei ist noch nicht offline gespeichert und gerade nicht erreichbar.");
      bytes = await S.getRawBytes(cfg, `files/${t.id}/${f.id}.enc`);
      if (!bytes) throw new Error("Datei nicht gefunden – wurde sie schon hochgeladen?");
      await S.cachePut(`${t.id}/${f.id}`, bytes); offlineState[f.id] = true;
    }
    return new Blob([await S.decBytes(key, bytes)], { type: f.mime });
  }
  async function openFile(t, id) {
    const f = (t.tickets || []).find((x) => x.id === id); if (!f) return;
    let blob;
    try { blob = await getFileBlob(t, f); } catch (e) { return toast(e.message); }
    const url = URL.createObjectURL(blob);
    const isImg = f.mime.startsWith("image/"), isPdf = f.mime === "application/pdf";
    openModal({
      title: f.name, wide: true,
      body: isImg ? `<img src="${url}" alt="${esc(f.name)}" class="file-view-img">`
        : isPdf ? `<iframe src="${url}" class="file-view-pdf" title="${esc(f.name)}"></iframe>`
          : `<p class="muted">Vorschau für diesen Dateityp nicht möglich.</p>`,
      foot: `<a class="btn" href="${url}" target="_blank" rel="noopener">In neuem Tab öffnen</a><a class="btn" href="${url}" download="${esc(f.name)}">Herunterladen</a><span class="spacer"></span><button class="btn primary" data-close>Schließen</button>`
    });
  }

  // =========================================================
  //  UNTERWEGS (Durchführung: der heutige Tag mit Tickets)
  // =========================================================
  function currentIdx(t) {
    const today = C.todayISO();
    state.ui.dayIdx ||= {};
    if (state.ui.dayIdx[t.id] != null && state.ui.dayIdx[t.id] < t.tage && state.ui.dayPinned) return state.ui.dayIdx[t.id];
    if (!t.von) return state.ui.dayIdx[t.id] ?? 0;
    const d = C.dayDiff(t.von, today);
    return Math.max(0, Math.min(t.tage - 1, d));
  }
  function renderUnterwegs() {
    const t = trip(); const el = $("#view-unterwegs");
    ensurePlan(t);
    const i = currentIdx(t); const r = t.plan[i] || {};
    const today = C.todayISO(); const isToday = dateOf(t, i) === today;
    const before = t.von && today < t.von;
    const next = t.plan[i + 1];
    const route = [r.von, r.nach].filter(Boolean).join(" → ");
    const facts = [r.km && `${r.km} km`, r.dauer && r.dauer, r.hoch && `↑ ${r.hoch} m`, r.runter && `↓ ${r.runter} m`].filter(Boolean);
    const maps = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    const files = (t.tickets || []);
    const offline = files.filter((f) => offlineState[f.id]).length;
    el.innerHTML = `
      ${whoAmI(t)}
      ${before ? `<div class="card card-pad countdown-card"><b>Noch ${C.dayDiff(today, t.von)} ${C.dayDiff(today, t.von) === 1 ? "Tag" : "Tage"}</b> bis „${esc(tripName(t))}“ losgeht. Hier siehst du unterwegs jeden Tag auf einen Blick – mit Tickets, auch offline.</div>` : ""}
      <div class="day-nav">
        <button class="btn" data-act="prev" ${i === 0 ? "disabled" : ""} aria-label="Vorheriger Tag">‹</button>
        <div class="day-nav-title"><b>${esc(dayLabel(t, i, true))}</b><small>Tag ${i + 1} von ${t.tage}${isToday ? " · heute" : ""}</small></div>
        <button class="btn" data-act="next" ${i >= t.tage - 1 ? "disabled" : ""} aria-label="Nächster Tag">›</button>
        ${!isToday && t.von && today >= t.von && today <= t.bis ? `<button class="btn sm" data-act="today">Heute</button>` : ""}
      </div>
      <div class="card today-card typ-${r.typ || "none"}">
        <div class="tc-top">${r.typ ? `<span class="badge typ-badge">${typName(r.typ)}</span>` : ""}<h2>${esc(r.titel || (r.typ ? typName(r.typ) : "Noch nichts geplant"))}</h2></div>
        ${route ? `<div class="tc-route">${esc(route)}</div>` : ""}
        ${facts.length ? `<div class="tc-facts">${facts.map((x) => `<span>${esc(x)}</span>`).join("")}</div>` : ""}
        ${r.highlights ? `<div class="tc-sec"><h4>Highlights</h4><p>${esc(r.highlights)}</p></div>` : ""}
        ${r.unterkunft ? `<div class="tc-sec"><h4>Unterkunft</h4><p>${esc(r.unterkunft)} <a class="map-link" href="${maps(r.unterkunft + " " + (r.nach || t.ziel || ""))}" target="_blank" rel="noopener">${ICONS.map} Karte</a></p></div>` : ""}
        ${r.hinweise ? `<div class="tc-sec"><h4>Hinweise</h4><p>${esc(r.hinweise)}</p></div>` : ""}
        ${r.sonstiges ? `<div class="tc-sec"><h4>Sonstiges</h4><p>${esc(r.sonstiges)}</p></div>` : ""}
        <div class="tc-sec"><h4>Tickets & Unterlagen</h4><div data-files="${r.id}">${filesHtml(t, r.id)}</div></div>
        <div class="row" style="margin-top:.6rem"><button class="btn sm" data-act="edit" data-id="${r.id}">${ICON.edit} Tag bearbeiten</button></div>
      </div>
      ${next ? `<button class="card next-card" data-act="next"><small>${isToday ? "Morgen" : "Nächster Tag"} · ${esc(dayLabel(t, i + 1))}</small><b>${esc(next.titel || typName(next.typ) || "–")}</b>${next.unterkunft ? `<span class="muted small">Unterkunft: ${esc(next.unterkunft)}</span>` : ""}</button>` : ""}
      <details class="card card-pad all-files" ${state.ui.allFilesOpen ? "open" : ""}>
        <summary><b>Alle Unterlagen</b> <span class="muted small" data-offcount>· ${files.length} ${files.length === 1 ? "Datei" : "Dateien"}${files.length ? ` · ${offline} offline verfügbar` : ""}</span></summary>
        ${t.plan.slice(0, t.tage).map((row, j) => { const fl = files.filter((f) => f.tag === row.id); return fl.length ? `<h4 class="form-sub">${esc(dayLabel(t, j))} · ${esc(row.titel || "")}</h4>${filesHtmlList(fl)}` : ""; }).join("")}
        <h4 class="form-sub">Ohne bestimmten Tag (z. B. Versicherung, Mietwagen)</h4>
        <div data-files="">${filesHtml(t, "")}</div>
      </details>`;
    refreshOffline(t).then(() => {
      const oc = $("[data-offcount]", el); if (oc && files.length) oc.textContent = `· ${files.length} ${files.length === 1 ? "Datei" : "Dateien"} · ${files.filter((f) => offlineState[f.id]).length} offline verfügbar`;
      // Offline-Kennzeichnung nachtragen, ohne neu zu zeichnen
      $$("[data-fopen]", el).forEach((b) => { const f = files.find((x) => x.id === b.dataset.fopen); if (f && offlineState[f.id] && !b.querySelector("small").textContent.includes("offline")) b.querySelector("small").textContent += " · offline verfügbar"; });
    });
  }
  const filesHtmlList = (fl) => `<ul class="files">${fl.map((f) => `<li><button class="file-open" data-fopen="${f.id}">${ICONS.file}<span><b>${esc(f.name)}</b><small>${fmtSize(f.size || 0)}</small></span></button></li>`).join("")}</ul>`;
  function onUnterwegsClick(e) {
    const t = trip();
    const me = e.target.closest("[data-me]");
    if (me) { C.setMe(t, me.dataset.me); return C.commit(); }
    const o = e.target.closest("[data-fopen]"); if (o) return openFile(t, o.dataset.fopen);
    const d = e.target.closest("[data-fdel]");
    if (d) { if (!armed(d, "Löschen?")) return; return deleteFile(t, d.dataset.fdel).then(() => C.render()); }
    const a = e.target.closest("[data-act]"); if (!a) return;
    const i = currentIdx(t);
    state.ui.dayIdx ||= {};
    if (a.dataset.act === "prev") { state.ui.dayIdx[t.id] = Math.max(0, i - 1); state.ui.dayPinned = true; }
    if (a.dataset.act === "next") { state.ui.dayIdx[t.id] = Math.min(t.tage - 1, i + 1); state.ui.dayPinned = true; }
    if (a.dataset.act === "today") { state.ui.dayPinned = false; }
    if (a.dataset.act === "edit") return openDay(t, a.dataset.id);
    C.commit(); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function onUnterwegsChange(e) {
    const inp = e.target.closest("[data-fadd]"); if (!inp || !inp.files.length) return;
    const t = trip();
    for (const file of inp.files) await addFile(t, file, inp.dataset.fadd);
    C.render();
  }

  // =========================================================
  //  KOSTEN & AUFTEILUNG
  // =========================================================
  function balances(t) {
    const ids = t.personen.map((p) => p.id);
    const paid = {}, share = {}; ids.forEach((id) => { paid[id] = 0; share[id] = 0; });
    (t.kosten || []).forEach((k) => {
      const b = num(k.betrag); if (!b) return;
      const fuer = (k.fuer && k.fuer.length ? k.fuer : ids).filter((x) => ids.includes(x));
      if (k.von && paid[k.von] != null) paid[k.von] += b;
      fuer.forEach((x) => { share[x] += b / (fuer.length || 1); });
    });
    const saldo = {}; ids.forEach((id) => { saldo[id] = paid[id] - share[id]; });
    // möglichst wenige Überweisungen
    const deb = ids.filter((id) => saldo[id] < -0.005).map((id) => ({ id, v: -saldo[id] })).sort((a, b) => b.v - a.v);
    const cre = ids.filter((id) => saldo[id] > 0.005).map((id) => ({ id, v: saldo[id] })).sort((a, b) => b.v - a.v);
    const transfers = [];
    let di = 0, ci = 0;
    while (di < deb.length && ci < cre.length) {
      const x = Math.min(deb[di].v, cre[ci].v);
      transfers.push({ von: deb[di].id, an: cre[ci].id, betrag: x });
      deb[di].v -= x; cre[ci].v -= x;
      if (deb[di].v < 0.005) di++;
      if (cre[ci].v < 0.005) ci++;
    }
    return { paid, share, saldo, transfers };
  }
  function renderKosten() {
    const t = trip(); const el = $("#view-kosten");
    const ids = t.personen.map((p) => p.id);
    const total = (t.kosten || []).reduce((s, k) => s + num(k.betrag), 0);
    const b = balances(t);
    const byKat = {}; (t.kosten || []).forEach((k) => { const kat = k.kat || "Sonstiges"; byKat[kat] = (byKat[kat] || 0) + num(k.betrag); });
    const sorted = [...(t.kosten || [])].sort((a, c) => (a.datum || "9999").localeCompare(c.datum || "9999"));
    el.innerHTML = `
      ${whoAmI(t)}
      <div class="kosten-layout">
        <div class="card sheet-wrap">
          <table class="sheet kosten">
            <thead><tr><th style="width:8.6em">Datum</th><th class="n" style="width:6.5em">Betrag</th><th>Wofür</th><th style="width:9.5em">Kategorie</th><th style="width:8em">Bezahlt von</th><th style="width:11em">Für wen</th><th style="width:2.5em"></th></tr></thead>
            <tbody>${sorted.map((k) => `<tr data-k="${k.id}">
              <td><input data-kc="${k.id}:datum" value="${C.toDE(k.datum || "")}" placeholder="TT.MM.JJJJ" inputmode="numeric"></td>
              <td class="n"><input data-kc="${k.id}:betrag" value="${k.betrag != null && k.betrag !== "" ? String(k.betrag).replace(".", ",") : ""}" inputmode="decimal" placeholder="0,00"></td>
              <td><input data-kc="${k.id}:grund" value="${esc(k.grund || "")}" placeholder="z. B. Hotel Lyon"></td>
              <td><select data-kc="${k.id}:kat">${KATEGORIEN.map((x) => `<option ${x === (k.kat || "Sonstiges") ? "selected" : ""}>${x}</option>`).join("")}</select></td>
              <td><select data-kc="${k.id}:von"><option value="">–</option>${t.personen.map((p) => `<option value="${p.id}" ${p.id === k.von ? "selected" : ""}>${esc(pname(t, p))}</option>`).join("")}</select></td>
              <td><div class="fuer">${t.personen.map((p) => { const on = !k.fuer || !k.fuer.length || k.fuer.includes(p.id); return `<button class="chip chip-s ${on ? "on" : ""}" data-fuer="${k.id}:${p.id}" aria-pressed="${on}">${esc(pname(t, p))}</button>`; }).join("")}</div></td>
              <td class="c"><button class="icon-btn" data-kdel="${k.id}" aria-label="Ausgabe löschen">${ICONS.trash}</button></td>
            </tr>`).join("") || `<tr><td colspan="7" class="muted" style="padding:1rem">Noch keine Ausgaben eingetragen.</td></tr>`}</tbody>
            <tfoot><tr><th>Summe</th><td class="n"><b>${money(t, total)}</b></td><td colspan="5"></td></tr></tfoot>
          </table>
          <div class="row" style="padding:.7rem"><button class="btn primary sm" data-act="add">${ICON.plus} Ausgabe</button>
            <label class="check small">Währung <input class="input" style="width:4em;padding:.2rem .4rem" data-act="waehrung" value="${esc(t.waehrung || "€")}"></label></div>
        </div>
        <aside class="stack">
          <div class="card card-pad">
            <h3 class="section-title">Aufteilung</h3>
            <table class="bal">
              <thead><tr><th></th><th class="n">bezahlt</th><th class="n">Anteil</th><th class="n">Saldo</th></tr></thead>
              <tbody>${ids.map((id) => `<tr><td>${esc(pname(t, person(t, id)))}</td><td class="n">${money(t, b.paid[id])}</td><td class="n">${money(t, b.share[id])}</td><td class="n ${b.saldo[id] > 0.005 ? "pos" : b.saldo[id] < -0.005 ? "neg" : ""}">${b.saldo[id] > 0 ? "+" : ""}${money(t, b.saldo[id])}</td></tr>`).join("")}</tbody>
            </table>
            <h4 class="form-sub" style="margin-top:1rem">Ausgleich</h4>
            ${b.transfers.length ? `<ul class="transfers">${b.transfers.map((x) => `<li><b>${esc(pname(t, person(t, x.von)))}</b> → <b>${esc(pname(t, person(t, x.an)))}</b><span>${money(t, x.betrag)}</span></li>`).join("")}</ul>` : `<p class="muted small">Alles ausgeglichen.</p>`}
            <p class="hint" style="margin-top:.6rem">Jede Ausgabe wird gleichmäßig auf die Personen unter „Für wen“ verteilt.</p>
          </div>
          ${Object.keys(byKat).length ? `<div class="card card-pad"><h3 class="section-title">Nach Kategorie</h3>
            <ul class="katlist">${Object.entries(byKat).sort((a, c) => c[1] - a[1]).map(([k, v]) => `<li><span>${esc(k)}</span><span class="bar"><i style="width:${total ? (v / total) * 100 : 0}%"></i></span><b>${money(t, v)}</b></li>`).join("")}</ul></div>` : ""}
        </aside>
      </div>`;
  }
  function onKostenClick(e) {
    const t = trip(); t.kosten ||= [];
    const me = e.target.closest("[data-me]");
    if (me) { C.setMe(t, me.dataset.me); return C.commit(); }
    const f = e.target.closest("[data-fuer]");
    if (f) {
      const [kid, pid] = f.dataset.fuer.split(":"); const k = t.kosten.find((x) => x.id === kid);
      const all = t.personen.map((p) => p.id);
      let cur = k.fuer && k.fuer.length ? [...k.fuer] : [...all];
      cur = cur.includes(pid) ? cur.filter((x) => x !== pid) : [...cur, pid];
      if (!cur.length) return toast("Mindestens eine Person muss beteiligt sein.");
      k.fuer = cur.length === all.length ? [] : cur;
      return C.commit();
    }
    const d = e.target.closest("[data-kdel]");
    if (d) { if (!armed(d, "×?")) return; t.kosten = t.kosten.filter((x) => x.id !== d.dataset.kdel); return C.commit(); }
    const a = e.target.closest("[data-act]");
    if (a && a.dataset.act === "add") {
      t.kosten.push({ id: uid() + uid(), datum: C.todayISO(), betrag: "", grund: "", kat: "Sonstiges", von: C.myId(t) || t.personen[0].id, fuer: [] });
      C.commit();
      const rows = $$("[data-kc$=':grund']"); const k = t.kosten[t.kosten.length - 1];
      const inp = $(`[data-kc="${k.id}:betrag"]`); if (inp) inp.focus();
      return rows;
    }
  }
  function onKostenChange(e) {
    const t = trip(); const el = e.target;
    if (el.dataset.act === "waehrung") { t.waehrung = el.value.trim() || "€"; return C.commit(); }
    const c = el.dataset.kc; if (!c) return;
    const [kid, f] = c.split(":"); const k = t.kosten.find((x) => x.id === kid); if (!k) return;
    let v = el.value.trim();
    if (f === "datum") { const d = C.parseDE(v); if (d === null) { toast("Datum nicht erkannt – TT.MM.JJJJ"); return C.render(); } v = d; }
    if (f === "betrag") { v = v ? Math.round(num(v) * 100) / 100 : ""; }
    k[f] = v;
    C.commit();
  }

  // =========================================================
  //  EINLADEN & BEITRETEN
  // =========================================================
  function inviteCode(t) {
    const cfg = cfgFor(t.id); const k = state.keys[t.id];
    return S.b64url(btoa(unescape(encodeURIComponent(JSON.stringify({ v: 1, o: cfg.o, r: cfg.r, t: cfg.t, id: t.id, k: k.k, n: tripName(t) })))));
  }
  function openInvite(t) {
    if (!isShared(t.id)) {
      return openModal({
        title: "Mitreisende einladen",
        body: `<p>Zum Einladen muss der Urlaub verschlüsselt synchronisiert werden. Dafür brauchst du einmalig ein privates Daten-Repo auf GitHub.</p>
          <p class="hint">Danach bekommt jede eingeladene Person einen Link, mit dem sie genau diesen Urlaub sehen und bearbeiten kann – auf jedem Gerät, auch offline.</p>`,
        foot: `<button class="btn" data-close>Später</button><a class="btn primary" href="#einstellungen" data-close>Jetzt einrichten</a>`
      });
    }
    const link = location.href.split("#")[0] + "#join=" + inviteCode(t);
    openModal({
      title: "Mitreisende einladen",
      body: `<p>Schick diesen Link an die Personen, die mitkommen. Wer ihn öffnet, kann <b>„${esc(tripName(t))}“</b> sehen und bearbeiten – Tagesplan, Kosten, Packliste und Tickets.</p>
        <label class="field">Einladungs-Link<textarea class="export-text" style="min-height:110px" readonly>${esc(link)}</textarea></label>
        <div class="hint" style="margin-top:.6rem;line-height:1.5"><b>Wichtig:</b> Der Link ist der Schlüssel. Verschicke ihn nur direkt (z. B. Signal, WhatsApp) und nicht öffentlich.
          Er enthält auch den Zugang zum Daten-Repo – andere Urlaube bleiben trotzdem verschlüsselt und unlesbar.
          Zugang entziehen: in GitHub einen neuen Token erstellen und den alten löschen.</div>
        ${t.personen.length < 2 ? `<p class="hint">Tipp: Lege vorher in den Eckdaten die Anzahl der Teilnehmenden fest, damit die Person sich auswählen kann.</p>` : ""}`,
      foot: `<button class="btn" data-close>Schließen</button><button class="btn primary" data-copy>Link kopieren</button>`,
      onMount: (m) => $("[data-copy]", m).addEventListener("click", () => C.copyText(link, "Link kopiert."))
    });
  }
  PL.openInvite = openInvite;

  function handleHash() {
    const m = location.hash.match(/^#join=([\w-]+)/);
    if (!m) return false;
    let inv;
    try { inv = JSON.parse(decodeURIComponent(escape(atob(S.unb64url(m[1]))))); } catch { toast("Der Einladungs-Link ist ungültig."); }
    history.replaceState(null, "", location.pathname + location.search + "#urlaube");
    if (!inv) return true;
    setTimeout(() => openModal({
      title: "Einladung",
      body: `<p>Du wurdest zu <b>„${esc(inv.n || "Urlaub")}“</b> eingeladen.</p><p class="muted small">Die Daten werden verschlüsselt aus dem Daten-Repo geladen und auf diesem Gerät gespeichert, damit du sie auch offline hast.</p>`,
      foot: `<button class="btn" data-close>Ablehnen</button><button class="btn primary" data-join>Annehmen</button>`,
      onMount: (mo) => $("[data-join]", mo).addEventListener("click", async () => {
        if (state.keys[inv.id] && state.keys[inv.id].owner) { closeModal(); state.current = inv.id; location.hash = "plan"; return; }
        state.keys[inv.id] = { k: inv.k, o: inv.o, r: inv.r, t: inv.t, owner: false };
        closeModal(); toast("Lade Urlaub …");
        await syncAll({ only: inv.id });
        if (state.trips[inv.id]) { state.current = inv.id; C.store.save(); location.hash = "plan"; C.render(); toast(`„${inv.n}“ hinzugefügt.`); }
        else toast("Urlaub konnte nicht geladen werden: " + (sync.msg || "unbekannter Fehler"));
      })
    }), 50);
    return true;
  }
  PL.handleHash = handleHash;

  // =========================================================
  //  EINSTELLUNGEN (Daten-Repo einrichten)
  // =========================================================
  function renderSettings() {
    const el = $("#view-einstellungen");
    const cfg = state.syncCfg;
    const invited = Object.entries(state.keys).filter(([, k]) => k.owner === false);
    el.innerHTML = `<div class="settings">
      <div class="card card-pad stack">
        <h2>Synchronisierung</h2>
        ${!S.available ? `<p class="badge warn">Verschlüsselung ist in diesem Browser nicht verfügbar – die Seite muss über https geöffnet werden.</p>` : ""}
        ${cfg ? `
          <p>${ICONS.lock} Verbunden mit <b>${esc(cfg.o)}/${esc(cfg.r)}</b> (privat). Alles wird vor dem Hochladen verschlüsselt.</p>
          <p class="small muted">Status: ${esc(({ ok: "synchronisiert", busy: "synchronisiere …", pending: "speichere …", offline: "offline", error: "Fehler – " + sync.msg, off: "–" })[sync.status] || sync.status)}</p>
          <div class="row"><button class="btn primary sm" data-act="syncnow">Jetzt synchronisieren</button><button class="btn sm danger" data-act="logout">Auf diesem Gerät abmelden</button></div>
          <p class="hint">Abmelden entfernt Token und Passwort nur von diesem Gerät. Deine Urlaube bleiben im Daten-Repo.</p>`
        : `
          <p>Damit nur du und eingeladene Personen einen Urlaub sehen, werden die Daten <b>verschlüsselt</b> in einem <b>privaten</b> GitHub-Repo gespeichert. GitHub selbst sieht nur unlesbaren Zeichensalat.</p>
          <ol class="setup-steps">
            <li>Auf GitHub ein <b>neues, privates Repository</b> anlegen, z. B. <code>packing-data</code>. Mit „Add a README file“ – dann ist es nicht leer.</li>
            <li><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Fine-grained Token erstellen</a>: Name z. B. „Urlaubsplanung“, Ablauf 1 Jahr, <b>Repository access → Only select repositories → packing-data</b>, <b>Permissions → Contents: Read and write</b>. Token kopieren.</li>
            <li>Unten eintragen und ein Passwort wählen. Das Passwort schützt deinen Schlüsselbund – ohne es lassen sich deine Urlaube auf neuen Geräten nicht öffnen. Gut merken!</li>
          </ol>
          <form id="syncForm" class="form-grid">
            <label class="field c3">Daten-Repo<input name="repo" placeholder="benutzername/packing-data" required></label>
            <label class="field c3">Token<input name="token" type="password" placeholder="github_pat_…" required autocomplete="off"></label>
            <label class="field c3">Passwort<input name="pass" type="password" required minlength="8" autocomplete="new-password"></label>
            <label class="field c3">Passwort wiederholen <span class="muted" style="font-weight:400">– nur beim ersten Mal</span><input name="pass2" type="password" autocomplete="new-password"></label>
            <div class="c6 row"><button class="btn primary">Verbinden</button><span class="small muted" id="syncMsg"></span></div>
          </form>`}
      </div>
      ${invited.length ? `<div class="card card-pad"><h3 class="section-title">Urlaube, zu denen du eingeladen bist</h3><ul class="plain">${invited.map(([id]) => `<li>${esc(state.trips[id] ? tripName(state.trips[id]) : id)}</li>`).join("")}</ul></div>` : ""}
      <div class="card card-pad stack">
        <h3 class="section-title">Sicherung</h3>
        <p class="small muted">Alle Urlaube dieses Browsers als Datei sichern oder wiederherstellen (unverschlüsselt – sicher aufbewahren). Tickets sind nicht enthalten.</p>
        <div class="row"><button class="btn sm" data-act="backup">Sicherung herunterladen</button><label class="btn sm">Sicherung einspielen<input type="file" accept=".json" data-act="restore" hidden></label></div>
      </div>
      <div class="card card-pad stack">
        <h3 class="section-title">Packliste & Rezepte bearbeiten</h3>
        <p class="small muted">Der Schalter „Bearbeiten“ oben rechts schaltet den Bearbeiten-Modus für Items, Module und Wandergerichte ein.</p>
      </div>
    </div>`;
  }
  async function connect(f) {
    const msg = $("#syncMsg"); const say = (x) => { if (msg) msg.textContent = x; };
    const [o, r] = f.repo.value.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "").split("/");
    if (!o || !r) return say("Bitte als benutzername/repo angeben.");
    const cfg = { o, r, t: f.token.value.trim() };
    try {
      say("Prüfe Zugang …");
      await S.testRepo(cfg);
      const ring = await S.getFile(cfg, "keys/keyring.enc");
      let salt;
      if (ring) { salt = JSON.parse(atob(ring.content)).salt; }
      else {
        if (f.pass.value !== f.pass2.value) return say("Die Passwörter stimmen nicht überein.");
        salt = S.bytesToB64(crypto.getRandomValues(new Uint8Array(16)));
      }
      say("Leite Schlüssel ab …");
      cfg.salt = salt; cfg.mk = await S.deriveMaster(f.pass.value, salt);
      if (ring) { try { await S.decJSON(cfg.mk, JSON.parse(atob(ring.content)).data); } catch { return say("Passwort falsch – es passt nicht zum vorhandenen Schlüsselbund."); } }
      state.syncCfg = cfg;
      Object.values(state.keys).forEach((k) => { if (k.owner === undefined) k.owner = true; });
      C.store.save();
      say("Verbunden – synchronisiere …");
      await syncAll();
      toast("Daten-Repo verbunden."); C.render();
    } catch (e) { say(e.message || String(e)); }
  }
  function onSettingsClick(e) {
    const a = e.target.closest("[data-act]"); if (!a) return;
    if (a.dataset.act === "syncnow") return syncAll().then(() => C.render());
    if (a.dataset.act === "logout") {
      if (!armed(a, "Wirklich abmelden?")) return;
      state.syncCfg = null; C.store.save(); setStatus("off"); return C.render();
    }
    if (a.dataset.act === "backup") {
      const data = JSON.stringify({ v: 1, trips: state.trips, me: state.me, keys: state.keys }, null, 2);
      try {
        const url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
        const l = document.createElement("a"); l.href = url; l.download = `urlaubsplanung-sicherung-${C.todayISO()}.json`; document.body.appendChild(l); l.click(); l.remove();
      } catch { toast("Download blockiert."); }
    }
  }
  function onSettingsChange(e) {
    const a = e.target.closest("[data-act=restore]"); if (!a || !a.files[0]) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const d = JSON.parse(rd.result);
        Object.entries(d.trips || {}).forEach(([id, t]) => { state.trips[id] = C.migrate(t); });
        Object.assign(state.me, d.me || {});
        Object.entries(d.keys || {}).forEach(([id, k]) => { if (!state.keys[id]) state.keys[id] = k; });
        C.commit(); toast("Sicherung eingespielt."); syncAll();
      } catch { toast("Datei nicht erkannt."); }
    };
    rd.readAsText(a.files[0]);
  }

  // =========================================================
  //  EXCEL-EXPORT & -IMPORT (ExcelJS, wird erst bei Bedarf geladen)
  // =========================================================
  let excelP = null;
  function loadExcel() {
    if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
    if (!excelP) excelP = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js";
      s.onload = () => resolve(window.ExcelJS); s.onerror = () => { excelP = null; reject(new Error("Excel-Bibliothek konnte nicht geladen werden (offline?).")); };
      document.head.appendChild(s);
    });
    return excelP;
  }
  const isoToDate = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
  async function exportExcel(t) {
    let ExcelJS;
    try { toast("Erstelle Excel-Datei …"); ExcelJS = await loadExcel(); } catch (e) { return toast(e.message); }
    const wb = new ExcelJS.Workbook(); wb.creator = "Urlaubsplanung"; wb.created = new Date();
    const GREEN = "FF2F5241", PAPER = "FFF4EEE1";
    const headStyle = (row) => { row.eachCell((c) => { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } }; c.alignment = { vertical: "middle", wrapText: true }; }); row.height = 22; };
    const typFill = { fahrt: "FFEDE3EE", wandern: "FFDCE8DF", stadt: "FFDDE8EE", strand: "FFF6EAD2", ruhe: "FFEDEFEE", aktiv: "FFF5DFD2" };
    const people = t.personen.map((p) => pname(t, p)).join(", ");

    // --- Tagesplan ---
    const ws = wb.addWorksheet("Tagesplan", { views: [{ state: "frozen", ySplit: 4, xSplit: 2 }] });
    ws.mergeCells("A1:H1"); ws.getCell("A1").value = tripName(t); ws.getCell("A1").font = { bold: true, size: 16, color: { argb: GREEN } };
    ws.mergeCells("A2:H2"); ws.getCell("A2").value = [t.ziel, t.von ? `${C.toDE(t.von)} – ${C.toDE(t.bis)}` : "", `${t.tage} Tage`, people].filter(Boolean).join("  ·  ");
    ws.getCell("A2").font = { color: { argb: "FF56645B" } };
    const cols = [["Datum", 12], ["Wochentag", 11], ["Art", 11], ["Programm", 28], ["Von", 18], ["Nach", 18], ["km", 7], ["Dauer", 8], ["Aufstieg (m)", 10], ["Abstieg (m)", 10], ["Highlights", 28], ["Unterkunft", 24], ["Hinweise", 28], ["Sonstiges", 20], ["Unterlagen", 20]];
    ws.columns = cols.map(([h, w]) => ({ width: w }));
    const hr = ws.getRow(4); hr.values = cols.map((c) => c[0]); headStyle(hr);
    t.plan.slice(0, t.tage).forEach((r, i) => {
      const iso = dateOf(t, i);
      const row = ws.addRow([iso ? isoToDate(iso) : `Tag ${i + 1}`, iso ? fmtDate(iso, { weekday: "long" }) : "", typName(r.typ || "").replace("–", ""), r.titel || "", r.von || "", r.nach || "",
        r.km ? num(r.km) : null, r.dauer || "", r.hoch ? num(r.hoch) : null, r.runter ? num(r.runter) : null, r.highlights || "", r.unterkunft || "", r.hinweise || "", r.sonstiges || "",
        (t.tickets || []).filter((f) => f.tag === r.id).map((f) => f.name).join(", ")]);
      if (iso) row.getCell(1).numFmt = "dd.mm.yyyy";
      row.alignment = { vertical: "top", wrapText: true };
      if (typFill[r.typ]) row.eachCell({ includeEmpty: true }, (c, n) => { if (n <= cols.length) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: typFill[r.typ] } }; });
    });
    const last = 4 + t.tage;
    const sum = ws.addRow(["Summe", "", "", "", "", "", { formula: `SUM(G5:G${last})` }, "", { formula: `SUM(I5:I${last})` }, { formula: `SUM(J5:J${last})` }]);
    sum.font = { bold: true }; sum.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PAPER } }; });
    ws.autoFilter = { from: "A4", to: `O${last}` };

    // --- Kosten ---
    const wk = wb.addWorksheet("Kosten", { views: [{ state: "frozen", ySplit: 1 }] });
    wk.columns = [{ header: "Datum", width: 12 }, { header: "Betrag", width: 12 }, { header: "Wofür", width: 34 }, { header: "Kategorie", width: 14 }, { header: "Bezahlt von", width: 16 }, { header: "Für wen", width: 28 }];
    headStyle(wk.getRow(1));
    const cur = t.waehrung === "€" ? '#,##0.00 "€"' : `#,##0.00 "${t.waehrung}"`;
    [...(t.kosten || [])].sort((a, c) => (a.datum || "").localeCompare(c.datum || "")).forEach((k) => {
      const row = wk.addRow([k.datum ? isoToDate(k.datum) : "", num(k.betrag), k.grund || "", k.kat || "", pname(t, person(t, k.von)) || "",
        (k.fuer && k.fuer.length ? k.fuer : t.personen.map((p) => p.id)).map((id) => pname(t, person(t, id))).join(", ")]);
      row.getCell(1).numFmt = "dd.mm.yyyy"; row.getCell(2).numFmt = cur;
    });
    const kl = wk.rowCount;
    const ks = wk.addRow(["Gesamt", { formula: `SUM(B2:B${Math.max(2, kl)})` }]); ks.font = { bold: true }; ks.getCell(2).numFmt = cur;

    // --- Abrechnung ---
    const wa = wb.addWorksheet("Abrechnung");
    const b = balances(t);
    wa.columns = [{ width: 18 }, { width: 14 }, { width: 14 }, { width: 14 }];
    headStyle(wa.addRow(["Person", "Bezahlt", "Anteil", "Saldo"]));
    t.personen.forEach((p) => { const row = wa.addRow([pname(t, p), b.paid[p.id], b.share[p.id], b.saldo[p.id]]); [2, 3, 4].forEach((n) => { row.getCell(n).numFmt = cur; }); });
    wa.addRow([]);
    headStyle(wa.addRow(["Ausgleich: von", "an", "Betrag"]));
    b.transfers.forEach((x) => { const row = wa.addRow([pname(t, person(t, x.von)), pname(t, person(t, x.an)), x.betrag]); row.getCell(3).numFmt = cur; });

    // --- Packliste ---
    const wp = wb.addWorksheet("Packliste", { views: [{ state: "frozen", ySplit: 1 }] });
    wp.columns = [{ header: "Modul", width: 20 }, { header: "Item", width: 32 }, { header: "Menge", width: 10 }, { header: "Tags", width: 22 }, { header: "Phase", width: 16 }, { header: "Notiz", width: 30 }, { header: "Erledigt", width: 10 }];
    headStyle(wp.getRow(1));
    const P = C.PACK(); const st = C.ST(t);
    const modIdx = (m) => P.module.findIndex((x) => x.id === m);
    [...C.tripItems(t)].sort((x, y) => modIdx(x.modul) - modIdx(y.modul)).forEach((it) => {
      const tags = C.tagsOf(t, it).map((x) => (x === "gemeinsam" ? "gemeinsam" : pname(t, person(t, x)))).join(", ");
      wp.addRow([(P.module.find((m) => m.id === it.modul) || {}).name || it.modul, it.name, it.aufgabe ? "To-do" : `${C.qtyOf(t, it)}${it.einheit ? " " + it.einheit : ""}`, tags,
        (P.phasen.find((p) => p.id === (it.phase || "packen")) || {}).name || "", it.notiz || "", st[it.id] === "gepackt" ? "✓" : st[it.id] === "weg" ? "–" : ""]);
    });

    // --- Essensplan ---
    if (t.essen && t.essen.plan && t.essen.plan.some((d) => d.f || d.d || d.s.some(Boolean))) {
      const we = wb.addWorksheet("Essensplan");
      we.columns = [{ header: "Tag", width: 10 }, { header: "Frühstück", width: 30 }, { header: "Snacks", width: 40 }, { header: "Dinner", width: 30 }];
      headStyle(we.getRow(1));
      const nm = (id) => (id ? (C.rez(id) || {}).name || "" : "");
      t.essen.plan.forEach((d, i) => we.addRow([`Tag ${i + 1}`, nm(d.f), d.s.map(nm).filter(Boolean).join(", "), nm(d.d)]));
    }

    const buf = await wb.xlsx.writeBuffer();
    const fname = `${(t.von || C.todayISO()).replace(/-/g, "_")}_${C.slug(tripName(t))}.xlsx`;
    try {
      const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      const l = document.createElement("a"); l.href = url; l.download = fname; document.body.appendChild(l); l.click(); l.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast(`„${fname}“ heruntergeladen.`);
    } catch { toast("Download blockiert – bitte die Seite direkt im Browser öffnen."); }
  }

  // Import im Format deiner bisherigen Tabelle (Datum | Wochentag | What do | Strecke | Unterkunft | Hinweise | Sonstiges + Kostenblock)
  function cellText(v) {
    if (v == null) return "";
    if (v instanceof Date) return v;
    if (typeof v === "object") { if (v.richText) return v.richText.map((x) => x.text).join(""); if ("result" in v) return v.result ?? ""; if (v.text) return v.text; return ""; }
    return v;
  }
  const dToIso = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  function parseStrecke(s) {
    s = String(s || ""); const out = {};
    const km = s.match(/(\d+(?:[.,]\d+)?)\s*km/i); if (km) out.km = km[1].replace(".", ",");
    const h = s.match(/(\d+(?::\d{2})?)\s*h\b/i); if (h) out.dauer = h[1].includes(":") ? h[1] + " h" : h[1] + " h";
    const hm = s.match(/(?:^|[;\s])(\d{2,4})\s*\/\s*(\d{2,4})(?=\s|;|$)/); if (hm) { out.hoch = hm[1]; out.runter = hm[2]; }
    return out;
  }
  async function importExcel(file) {
    let ExcelJS;
    try { toast("Lese Excel-Datei …"); ExcelJS = await loadExcel(); } catch (e) { return toast(e.message); }
    const wb = new ExcelJS.Workbook();
    try { await wb.xlsx.load(await file.arrayBuffer()); } catch { return toast("Datei konnte nicht gelesen werden (nur .xlsx)."); }
    const days = []; const costs = []; const names = new Set();
    wb.eachSheet((ws) => {
      let mode = null, map = {}, blank = 0;
      ws.eachRow({ includeEmpty: true }, (row) => {
        const vals = []; for (let c = 1; c <= Math.max(ws.columnCount, 12); c++) vals[c] = cellText(row.getCell(c).value);
        const low = vals.map((v) => (typeof v === "string" ? v.trim().toLowerCase() : ""));
        const find = (re) => low.findIndex((v) => v && re.test(v));
        if (find(/^datum$|^date$/) > 0 && find(/kosten|betrag/) > 0) { mode = "cost"; map = { datum: find(/^datum$|^date$/), betrag: find(/^kosten$|betrag/), grund: find(/grund|wofür|beschreibung/), wer: find(/wer|bezahlt/) }; blank = 0; return; }
        if (find(/^datum$|^date$/) > 0) {
          mode = "day"; blank = 0;
          map = { datum: find(/^datum$|^date$/), titel: find(/what do|programm|aktivit|^was$/), strecke: find(/strecke|route|distanz/), unterkunft: find(/unterkunft|übernacht|hotel/), hinweise: find(/hinweis|notiz/), sonstiges: find(/sonstig/) };
          return;
        }
        if (!mode) return;
        if (!vals.some((v) => v !== "" && v != null)) { if (++blank > 1) mode = null; return; }
        blank = 0;
        if (mode === "day") {
          let dc = -1; for (let c = 1; c <= 6; c++) if (vals[c] instanceof Date) { dc = c; break; }
          if (dc < 0) return;
          const off = dc - map.datum; const g = (k) => (map[k] > 0 ? String(vals[map[k] + off] ?? "").trim() : "");
          const titel = g("titel"), strecke = g("strecke"), hinweise = g("hinweise");
          const r = { iso: dToIso(vals[dc]), titel, unterkunft: g("unterkunft"), hinweise, sonstiges: g("sonstiges"), ...parseStrecke(strecke) };
          const parts = titel.split(/\s*(?:->|→|–>)\s*/);
          if (parts.length === 2) { r.von = parts[0]; r.nach = parts[1]; }
          if (r.hoch) r.typ = "wandern";
          else if (/fahrtag/i.test(hinweise) || (num(r.km) >= 80)) { r.typ = "fahrt"; if (strecke && !/^\d/.test(r.km || "")) r.sonstiges = [strecke, r.sonstiges].filter(Boolean).join(" · "); }
          else if (/ruhetag/i.test(titel)) r.typ = "ruhe";
          else if (/beach|strand/i.test(titel)) r.typ = "strand";
          if (r.typ === "fahrt" && /oder/i.test(strecke)) r.hinweise = [hinweise, "Strecke: " + strecke].filter(Boolean).join(" · ");
          days.push(r);
        } else if (mode === "cost") {
          const betrag = vals[map.betrag];
          if (typeof betrag !== "number") return;
          const wer = String(vals[map.wer] || "").trim();
          const ppl = wer.split(/\s*(?:\/|,|&|\bund\b)\s*/).map((x) => x.trim()).filter(Boolean);
          ppl.forEach((n) => names.add(n));
          costs.push({ datum: vals[map.datum] instanceof Date ? dToIso(vals[map.datum]) : "", betrag, grund: String(vals[map.grund] || "").trim(), wer: ppl });
        }
      });
    });
    if (!days.length && !costs.length) return toast("Keine Tagesplanung gefunden – erwartet wird eine Spalte „Datum“.");
    days.sort((a, b) => a.iso.localeCompare(b.iso));
    const t = C.newTrip(days.some((d) => d.typ === "wandern") ? ["wandern", "stadt"] : ["stadt"]);
    t.name = file.name.replace(/\.xlsx$/i, "").replace(/^[0-9a-f]{8}-/i, "").replace(/^\d{4}[_-]\d{2}[_-]\d{2}[_-]?/, "").replace(/[_-]+/g, " ").trim();
    if (days.length) { C.setRange(t, days[0].iso, days[days.length - 1].iso); }
    const nameList = [...names];
    C.setPersonCount(t, Math.max(1, nameList.length));
    nameList.forEach((n, i) => { t.personen[i].name = n; });
    C.setMe(t, t.personen[0].id);
    ensurePlan(t);
    days.forEach((d) => {
      const i = t.von ? C.dayDiff(t.von, d.iso) : -1; const r = t.plan[i]; if (!r) return;
      ["typ", "titel", "von", "nach", "km", "dauer", "hoch", "runter", "unterkunft", "hinweise", "sonstiges"].forEach((k) => { if (d[k]) r[k] = d[k]; });
    });
    const pid = (n) => (t.personen.find((p) => p.name.toLowerCase() === n.toLowerCase()) || {}).id;
    t.kosten = costs.map((k) => {
      const ids = k.wer.map(pid).filter(Boolean);
      const kat = /hotel|airbnb|studio|unterkunft|camping|deposit|hütte|refuge/i.test(k.grund) ? "Unterkunft" : /auto|miete|benzin|zug|flug|bahn|maut/i.test(k.grund) ? "Transport" : "Sonstiges";
      return { id: uid() + uid(), datum: k.datum, betrag: k.betrag, grund: k.grund, kat, von: ids[0] || "", fuer: [] };
    });
    state.trips[t.id] = t; state.current = t.id;
    C.store.save(); location.hash = "plan"; C.render();
    toast(`Importiert: ${days.length} Tage, ${costs.length} Ausgaben. Bitte Tagesarten und „Bezahlt von“ kurz prüfen.`);
    syncAll({ only: t.id });
  }

  // =========================================================
  //  Registrierung & Ereignisse
  // =========================================================
  PL.views = { urlaube: renderUrlaube, plan: renderPlan, unterwegs: renderUnterwegs, kosten: renderKosten, einstellungen: renderSettings };
  PL.init = () => {
    // vorhandene Urlaube auf den neuen Stand bringen
    Object.values(state.trips).forEach(ensurePlan);
    const on = (id, ev, fn) => { const el = $("#view-" + id); if (el) el.addEventListener(ev, fn); };
    on("urlaube", "click", onUrlaubeClick);
    on("urlaube", "change", (e) => { const f = e.target.closest("[data-act=import]"); if (f && f.files[0]) importExcel(f.files[0]); f && (f.value = ""); });
    on("plan", "click", onPlanClick);
    on("plan", "change", onPlanChange);
    on("plan", "keydown", onPlanKey);
    on("unterwegs", "click", onUnterwegsClick);
    on("unterwegs", "change", onUnterwegsChange);
    on("unterwegs", "toggle", (e) => { if (e.target.classList && e.target.classList.contains("all-files")) { state.ui.allFilesOpen = e.target.open; C.store.save(); } });
    on("kosten", "click", onKostenClick);
    on("kosten", "change", onKostenChange);
    on("einstellungen", "click", onSettingsClick);
    on("einstellungen", "change", onSettingsChange);
    on("einstellungen", "submit", (e) => { if (e.target.id === "syncForm") { e.preventDefault(); connect(e.target); } });
    const sw = $("#tripSwitch");
    if (sw) sw.addEventListener("change", () => {
      if (sw.value === "__new") { renderHeader(); return openNewUrlaub(); }
      state.current = sw.value; state.ui.viewPerson = "alle"; C.cal.open = false; C.store.save();
      if (["urlaube", "einstellungen", "rezepte"].includes(state.ui.tab)) location.hash = "plan"; else C.render();
      syncAll({ only: sw.value });
    });
    setStatus(state.syncCfg || Object.values(state.keys).some((k) => k.o) ? "pending" : "off");
    setTimeout(() => syncAll(), 300);
    // Offline-App
    if ("serviceWorker" in navigator && location.protocol === "https:") {
      navigator.serviceWorker.register("sw.js").catch(() => { /* in der Vorschau nicht erlaubt */ });
    }
  };
})();
