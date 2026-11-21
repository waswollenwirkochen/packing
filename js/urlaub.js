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
    { id: "anreise", name: "Anreise" },
    { id: "abreise", name: "Abreise" },
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
  const sync = { status: "off", msg: "", at: null, queue: Promise.resolve(), timer: null, locked: new Set() };
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
    // Schlüssel probieren: eigener, dann der aus dem Schlüsselbund (falls zwei Geräte verschiedene erzeugt haben)
    const sc = state.syncCfg || {};
    const cands = [...new Set([key, sc.ringKeys && sc.ringKeys[id], ...((sc.altKeys && sc.altKeys[id]) || [])].filter(Boolean))];
    for (const k of cands) {
      try { remoteDoc = await S.decJSON(k, remote.content); if (k !== key) { state.keys[id].k = k; delete state.base[id]; } break; } catch { /* nächster */ }
    }
    if (!remoteDoc) {
      if (state.keys[id].owner && state.trips[id]) {
        // Niemand hier kann die Datei lesen – mit dem eigenen Schlüssel neu schreiben, damit alle Geräte wieder zusammenfinden
        state.base[id] = { sha: remote.sha, doc: null };
        return;
      }
      // kein Fehler mehr für alle Urlaube – nur vormerken; ein anderes Gerät mit dem passenden Schlüssel repariert es
      sync.locked.add(id);
      return;
    }
    sync.locked.delete(id);
    const local = state.trips[id];
    const merged = local ? S.merge3(base && base.doc, local, remoteDoc) : remoteDoc;
    // eigene Kopien – der Basisstand darf nie dasselbe Objekt wie der lokale Urlaub sein
    state.trips[id] = C.migrate(clone(merged));
    state.base[id] = { sha: remote.sha, doc: clone(remoteDoc) };
    autoMe(state.trips[id]);
  }
  async function pushTrip(id, retry = true) {
    const cfg = cfgFor(id), key = state.keys[id] && state.keys[id].k, t = state.trips[id];
    if (!cfg || !key || !t) return;
    const base = state.base[id];
    if (base && base.sha && base.doc && S.eq(base.doc, t)) return;
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
  const ringPath = (cfg) => cfg.ring || "keys/keyring.enc";
  async function pullKeyring() {
    const cfg = state.syncCfg; if (!cfg) return;
    const f = await S.getFile(cfg, ringPath(cfg));
    if (!f) return;
    const wrap = JSON.parse(atob(f.content));
    let ring;
    try { ring = await S.decJSON(cfg.mk, wrap.data); } catch { throw new Error("Passwort passt nicht zum Schlüsselbund im Daten-Repo."); }
    cfg.ringSha = f.sha; cfg.ringCache = ring;
    cfg.ringKeys = Object.fromEntries(Object.entries(ring.trips || {}).map(([id, e]) => [id, e.k]));
    Object.entries(ring.trips || {}).forEach(([id, e]) => {
      if ((ring.deleted || []).includes(id) || state.deleted.includes(id)) return;
      if (!state.keys[id]) state.keys[id] = { k: e.k, owner: true };
    });
    (ring.contacts || []).forEach((c) => { if (!state.contacts.some((x) => x.id === c.id)) state.contacts.push(c); });
    if (ring.profile && ring.profile.name && !state.profile.name) state.profile.name = ring.profile.name;
    (ring.deleted || []).forEach((id) => {
      if (state.keys[id] && state.keys[id].owner) { delete state.trips[id]; delete state.keys[id]; delete state.base[id]; }
    });
    cfg.ringDeleted = ring.deleted || [];
  }
  async function pushKeyring() {
    const cfg = state.syncCfg; if (!cfg) return;
    const trips = {};
    const deleted = [...new Set([...(cfg.ringDeleted || []), ...state.deleted])];
    // auch Urlaube behalten, die dieses Gerät (noch) nicht laden konnte – sonst gehen sie anderen verloren
    Object.entries(cfg.ringKeys || {}).forEach(([id, k]) => { if (!deleted.includes(id)) trips[id] = { k }; });
    Object.entries(state.keys).forEach(([id, k]) => {
      if (!k.owner || deleted.includes(id)) return;
      if (state.trips[id]) trips[id] = { k: k.k };
      else if (!trips[id]) trips[id] = { k: k.k };
    });
    const ring = { v: 1, trips, deleted, contacts: state.contacts, profile: { name: state.profile.name || "" } };
    if (cfg.ringCache && S.eq(cfg.ringCache, ring)) return;
    const content = btoa(JSON.stringify({ v: 1, salt: cfg.salt, data: await S.encJSON(cfg.mk, ring) }));
    try {
      const res = await S.putFile(cfg, ringPath(cfg), content, cfg.ringSha, "Schlüsselbund aktualisiert");
      cfg.ringSha = res.content.sha; cfg.ringCache = ring; cfg.ringDeleted = deleted;
      cfg.ringKeys = Object.fromEntries(Object.entries(trips).map(([id, e]) => [id, e.k]));
    } catch (e) {
      if (e.status === 409 || e.status === 422) { await pullKeyring(); return pushKeyring(); }
      throw e;
    }
  }

  // ---------- Verbundene Mitreisende ----------
  // Pro Verbindung gibt es ein Postfach inbox/<id>.enc, verschlüsselt mit einem gemeinsamen Schlüssel.
  // Darin: alle Urlaube, an denen beide beteiligt sind (Urlaub-id → Schlüssel). Beide Seiten lesen und ergänzen es.
  const norm = (x) => C.normName(x);
  const tripHas = (t, name) => !!name && (t.personen || []).some((p) => norm(p.name) === norm(name));
  const contactsOf = (t) => state.contacts.filter((c) => tripHas(t, c.name));
  function autoMe(t) {
    if (state.me[t.id] || !state.profile.name) return;
    const p = (t.personen || []).find((x) => norm(x.name) === norm(state.profile.name));
    if (p) state.me[t.id] = p.id;
  }
  const isRemoved = (id) => state.deleted.includes(id) || ((state.syncCfg && state.syncCfg.ringDeleted) || []).includes(id);
  async function readInbox(c) {
    const cfg = state.syncCfg; cfg.inbox ||= {};
    const f = await S.getFile(cfg, `inbox/${c.id}.enc`);
    let trips = {};
    if (f) { try { trips = (await S.decJSON(c.k, f.content)).trips || {}; } catch { throw new Error(`Verbindung mit ${c.name}: Schlüssel passt nicht.`); } }
    cfg.inbox[c.id] = { sha: f ? f.sha : null, trips };
    return cfg.inbox[c.id];
  }
  async function pullInboxes() {
    const cfg = state.syncCfg; cfg.altKeys ||= {};
    for (const c of state.contacts) {
      const box = await readInbox(c);
      Object.entries(box.trips).forEach(([id, k]) => {
        if (isRemoved(id)) return;
        if (!state.keys[id]) state.keys[id] = { k, owner: true };
        else if (state.keys[id].k !== k) cfg.altKeys[id] = [...new Set([...(cfg.altKeys[id] || []), k])];
      });
    }
  }
  async function pushInboxes() {
    const cfg = state.syncCfg; cfg.inbox ||= {};
    for (const c of state.contacts) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const box = cfg.inbox[c.id] || await readInbox(c);
        const want = { ...box.trips };
        Object.values(state.trips).forEach((t) => { if (tripHas(t, c.name) && state.keys[t.id] && !isRemoved(t.id) && !want[t.id]) want[t.id] = state.keys[t.id].k; });
        if (box.sha && S.eq(want, box.trips)) break;
        try {
          const res = await S.putFile(cfg, `inbox/${c.id}.enc`, await S.encJSON(c.k, { v: 1, trips: want }), box.sha, "Gemeinsame Urlaube aktualisiert");
          cfg.inbox[c.id] = { sha: res.content.sha, trips: want };
          break;
        } catch (e) {
          if (e.status !== 409 && e.status !== 422) throw e;
          await readInbox(c); // jemand anderes war schneller – neu lesen und zusammenführen
        }
      }
    }
  }

  // ---------- Dateien (verschlüsselte Blobs: Tickets, Fotos, GPX) ----------
  const tripKey = (t) => state.keys[t.id] && state.keys[t.id].k;
  async function putBlob(t, fid, bytes) {
    const key = tripKey(t); if (!key) throw new Error("Für diesen Urlaub fehlt der Schlüssel.");
    const enc = await S.encBytes(key, bytes);
    await S.cachePut(`${t.id}/${fid}`, enc);
    offlineState[fid] = true;
    state.pendingUploads ||= [];
    state.pendingUploads.push({ trip: t.id, fid });
    return enc.length;
  }
  async function getBlob(t, fid) {
    let bytes = await S.cacheGet(`${t.id}/${fid}`);
    if (!bytes) {
      const cfg = cfgFor(t.id);
      if (!cfg || !online()) throw new Error("Datei ist noch nicht auf diesem Gerät gespeichert und gerade nicht erreichbar.");
      bytes = await S.getRawBytes(cfg, `files/${t.id}/${fid}.enc`);
      if (!bytes) throw new Error("Datei noch nicht verfügbar – sie wird evtl. gerade noch hochgeladen.");
      await S.cachePut(`${t.id}/${fid}`, bytes);
    }
    offlineState[fid] = true;
    return S.decBytes(tripKey(t), bytes);
  }
  function dropBlob(t, fid) {
    S.cacheDel(`${t.id}/${fid}`); delete offlineState[fid];
    const wasPending = (state.pendingUploads || []).some((p) => p.trip === t.id && p.fid === fid);
    state.pendingUploads = (state.pendingUploads || []).filter((p) => !(p.trip === t.id && p.fid === fid));
    const cfg = cfgFor(t.id);
    if (cfg && !wasPending) { state.fileDeletes ||= []; state.fileDeletes.push({ cfg, path: `files/${t.id}/${fid}.enc` }); }
  }
  async function uploadFiles(t) {
    const cfg = cfgFor(t.id); if (!cfg) return;
    state.pendingUploads ||= [];
    for (const f of t.tickets || []) { // ältere Tickets
      if (f.up === false && !state.pendingUploads.some((p) => p.fid === f.id)) state.pendingUploads.push({ trip: t.id, fid: f.id });
      if (f.up === false) delete f.up;
    }
    for (const p of state.pendingUploads.filter((x) => x.trip === t.id)) {
      const bytes = await S.cacheGet(`${t.id}/${p.fid}`);
      if (bytes) {
        try { await S.putFile(cfg, `files/${t.id}/${p.fid}.enc`, S.bytesToB64(bytes), null, "Datei hinzugefügt"); }
        catch (e) { if (e.status !== 422) throw e; } // existiert schon
      }
      state.pendingUploads = state.pendingUploads.filter((x) => x !== p);
      C.store.save();
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

  // Reisen ohne eigenen Schlüssel (z. B. aus einer Importdatei) gehören mir – Schlüssel anlegen
  function ensureKeys() {
    let added = 0;
    Object.keys(state.trips).forEach((id) => { if (!state.keys[id]) { state.keys[id] = { k: S.randomKey(), owner: true }; added++; } });
    if (added) C.store.save();
    return added;
  }
  PL.ensureKeys = ensureKeys;

  function syncAll(opts = {}) {
    if (!S.available) return Promise.resolve();
    ensureKeys();
    const ids = Object.keys(state.trips).filter(isShared).concat(Object.keys(state.keys).filter((id) => !state.trips[id] && cfgFor(id)));
    if (!state.syncCfg && !ids.length) { setStatus("off"); return Promise.resolve(); }
    if (!online()) { setStatus("offline", "Offline – Änderungen werden später synchronisiert."); return Promise.resolve(); }
    return enqueue(async () => {
      setStatus("busy");
      try {
        const before = JSON.stringify(state.trips);
        if (state.syncCfg) await pullKeyring();
        if (state.syncCfg && !opts.only) await pullInboxes();
        const all = new Set([...Object.keys(state.trips), ...Object.keys(state.keys)]);
        const only = opts.only ? [opts.only] : [...all];
        const errs = [];
        for (const id of only) {
          if (!cfgFor(id)) continue;
          try {
            if (!opts.pushOnly) await pullTrip(id);
            if (state.trips[id]) { await uploadFiles(state.trips[id]); await pushTrip(id); }
          } catch (e) {
            if (!online() || e.status === 0) throw e;
            console.error(id, e);
            errs.push(`„${state.trips[id] ? tripName(state.trips[id]) : id.slice(0, 6)}“: ${e.message || e}`);
          }
        }
        await processDeletes();
        if (state.syncCfg) await pushInboxes();
        if (state.syncCfg) await pushKeyring();
        C.store.save();
        if (errs.length) setStatus("error", errs.join(" · "));
        else setStatus("ok");
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
    const t = trip(); if (!t || prefetching || !online() || !cfgFor(t.id)) return;
    prefetching = true;
    const want = [...(t.tickets || []).map((f) => f.id), ...(t.fotos || []).map((f) => f.id + "_t")];
    let got = 0;
    try {
      for (const fid of want) {
        const k = `${t.id}/${fid}`;
        if (await S.cacheGet(k)) { offlineState[fid] = true; continue; }
        const bytes = await S.getRawBytes(cfgFor(t.id), `files/${t.id}/${fid}.enc`);
        if (bytes) { await S.cachePut(k, bytes); offlineState[fid] = true; got++; }
      }
    } catch (e) { console.warn(e); }
    prefetching = false;
    if (got && ["unterwegs", "karte"].includes(state.ui.tab)) C.render();
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
  // Tippen auf den Sync-Status zeigt, was los ist
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".sync-wrap")) return;
    const dot = $("#syncState"); const title = (dot && dot.title) || "";
    if (sync.status !== "error") return toast(title || "Nur auf diesem Gerät gespeichert");
    openModal({
      title: "Synchronisierung",
      body: `<p>${esc(title)}</p><p class="hint">Die übrigen Urlaube wurden trotzdem abgeglichen.</p>`,
      foot: `<button class="btn" data-close>Schließen</button><button class="btn primary" data-resync>Erneut versuchen</button>`,
      onMount: (m) => $("[data-resync]", m).addEventListener("click", () => { closeModal(); syncAll().then(() => C.render()); })
    });
  });

  // =========================================================
  //  URLAUBE (Startseite)
  // =========================================================
  function daysUntil(iso) { return iso ? Math.round((new Date(iso + "T12:00:00") - new Date(C.todayISO() + "T12:00:00")) / 864e5) : null; }
  function tripBadge(t) {
    const k = state.keys[t.id] || { owner: true };
    if (k.owner === false) return `<span class="badge shared">${ICONS.users} eingeladen</span>`;
    const mit = contactsOf(t).filter((c) => norm(c.name) !== norm(state.profile.name));
    if (isShared(t.id) && mit.length) return `<span class="badge vegan">${ICONS.users} geteilt mit ${esc(mit.map((c) => c.name).join(", "))}</span>`;
    if (isShared(t.id)) return `<span class="badge vegan">${ICONS.lock} verschlüsselt synchronisiert</span>`;
    return `<span class="badge">nur auf diesem Gerät</span>`;
  }
  function renderUrlaube() {
    const el = $("#view-urlaube");
    const list = Object.values(state.trips);
    const today = C.todayISO();
    const upcoming = list.filter((t) => !C.isPast(t, today)).sort((a, b) => (a.von || "9999").localeCompare(b.von || "9999"));
    const past = list.filter((t) => C.isPast(t, today)).sort((a, b) => C.sortKey(b).localeCompare(C.sortKey(a)));
    const card = (t) => {
      const d = daysUntil(t.von), running = t.von && t.von <= today && t.bis >= today;
      const when = !t.von ? (t.vergangen ? (t.jahr ? t.jahr : "Datum unbekannt") : `${t.tage} Tage · Datum offen`) : `${fmtDate(t.von, { day: "numeric", month: "short" })} – ${fmtDate(t.bis, { day: "numeric", month: "short", year: "numeric" })} · ${t.tage} Tage`;
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
          <label class="btn" title="Excel-Tabelle (.xlsx) oder Reisen-/Sicherungsdatei (.json)">${ICONS.excel} Importieren<input type="file" accept=".xlsx,.json" data-act="import" hidden></label>
          <a class="btn" href="#einstellungen" data-act="people">${ICONS.users} Mitreisende</a>
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
    if (a.dataset.act === "people") state.ui.scrollPeople = true;
  }

  // ----- Neuer Urlaub -----
  function openNewUrlaub(opts = {}) {
    const P = C.PACK();
    openModal({
      title: opts.nachtragen ? "Reise nachtragen" : "Neuer Urlaub",
      body: `<form id="nuForm" class="form-grid">
        <label class="field c6">Wo geht’s hin?<input name="ziel" placeholder="z. B. Queyras & Ligurien" required></label>
        <label class="field c6">Name <span class="muted" style="font-weight:400">– optional</span><input name="name" placeholder="z. B. Roadtrip Sommer 2027"></label>
        <label class="field c2">Von<input name="von" placeholder="TT.MM.JJJJ" inputmode="numeric"></label>
        <label class="field c2">Bis<input name="bis" placeholder="TT.MM.JJJJ" inputmode="numeric"></label>
        <label class="field c2">oder: Tage<input type="number" name="tage" min="1" max="60" value="7"></label>
        <label class="field c2">Wer kommt mit?<input type="number" name="anzahl" min="1" max="12" value="2"></label>
        <label class="field c4">Namen <span class="muted" style="font-weight:400">– optional, Komma-getrennt, du zuerst</span><input name="namen" placeholder="z. B. Eric, Jenny" value="${state.profile.name ? esc(state.profile.name) + ", " : ""}"></label>
        <div class="field c6 row" style="gap:.8rem;flex-direction:row;align-items:center">
          <label class="check"><input type="checkbox" name="vergangen" ${opts.nachtragen ? "checked" : ""}> Reise liegt schon zurück</label>
          <input class="input" name="jahr" placeholder="Jahr (falls kein Datum), z. B. 2019" style="flex:1;max-width:16em">
        </div>
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
        if (f.vergangen.checked && !von) { t.vergangen = true; t.jahr = f.jahr.value.trim(); }
        t.tage = Math.max(1, Math.min(60, parseInt(f.tage.value) || 7));
        if (von) C.setRange(t, von, bis && bis >= von ? bis : addDays(von, t.tage - 1));
        const names = f.namen.value.split(",").map((x) => x.trim()).filter(Boolean);
        C.setPersonCount(t, Math.max(parseInt(f.anzahl.value) || 1, names.length));
        names.forEach((n, i) => { if (t.personen[i]) t.personen[i].name = C.niceName(n); });
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
      fKm: rows.filter((r) => ["fahrt", "anreise", "abreise"].includes(r.typ)).reduce((s, r) => s + num(r.km), 0),
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
            <div class="muted small">${t.ziel && t.name ? esc(t.ziel) + " · " : ""}${t.von ? fmtDate(t.von, { day: "numeric", month: "short" }) + " – " + fmtDate(t.bis, { day: "numeric", month: "short", year: "numeric" }) : t.jahr || (t.vergangen ? "Datum unbekannt" : "Datum offen")} · ${t.personen.map((p) => esc(pname(t, p))).join(", ")}</div>
          </div>
          <span class="spacer"></span>
          ${tripBadge(t)}
          <button class="btn sm" data-act="invite">${ICONS.users} Einladen</button>
          <button class="btn sm" data-act="export">${ICONS.excel} Excel</button>
          <button class="btn sm" data-act="map">${ICONS.map} Karte</button>
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
          || (["km", "dauer"].includes(k) && (r.typ === "wandern" || ["fahrt", "anreise", "abreise"].includes(r.typ))) || (["hoch", "runter"].includes(k) && r.typ === "wandern");
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
      case "map": state.ui.mapTrip = t.id; state.ui.mapDetail = "route"; C.store.save(); location.hash = "karte"; return;
      case "print": return C.doPrint();
      case "dup": {
        const c = clone(t); c.id = uid() + uid(); c.name = tripName(t) + " (Kopie)"; c.status = {}; c.tickets = [];
        state.keys[c.id] = { k: S.randomKey(), owner: true }; state.me[c.id] = C.myId(t);
        state.trips[c.id] = c; state.current = c.id; toast("Urlaub dupliziert (ohne Unterlagen und Haken)."); C.commit(); return syncAll({ only: c.id });
      }
      case "delete": {
        const others = contactsOf(t).filter((c) => norm(c.name) !== norm(state.profile.name));
        if (!armed(a, others.length ? "Nur für dich entfernen?" : "Wirklich endgültig löschen?")) return;
        const id = t.id;
        if (others.length && state.syncCfg) { state.syncCfg.ringDeleted ||= []; state.syncCfg.ringDeleted.push(id); }
        else if (isShared(id) && state.keys[id].owner) state.deleted.push(id);
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
      <div id="dayFiles" data-drop="${rid}">${filesHtml(t, rid)}</div>
      ${PL.gpx ? `<h4 class="form-sub" style="margin-top:1rem">GPX-Track (z. B. aus Outdooractive)</h4><div id="dayGpx">${PL.gpx.rowHtml(t, rid)}</div>` : ""}`,
      foot: `<button class="btn" data-close>Abbrechen</button><button class="btn primary" form="dayForm">Speichern</button>`,
      onMount: (m) => {
        $("#dayForm", m).addEventListener("submit", (e) => {
          e.preventDefault(); const f = e.target;
          ["typ", ...FIELDS.map((x) => x.k)].forEach((k) => { const v = (f[k].value || "").trim(); if (v) r[k] = v; else delete r[k]; });
          closeModal(); C.commit();
        });
        bindFiles($("#dayFiles", m), t, rid, () => { $("#dayFiles", m).innerHTML = filesHtml(t, rid); });
        if (PL.gpx) PL.gpx.bindRow($("#dayGpx", m), t, rid, () => {
          $("#dayGpx", m).innerHTML = PL.gpx.rowHtml(t, rid);
          ["km", "dauer", "hoch", "runter"].forEach((k) => { const f = $("#dayForm", m)[k]; if (f && !f.value && r[k]) f.value = r[k]; });
        });
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
  const fileLi = (f) => `<li draggable="true" data-fid="${f.id}" title="Zum Verschieben auf einen anderen Tag ziehen">
      <button class="file-open" data-fopen="${f.id}">${ICONS.file}<span><b>${esc(f.name)}</b><small>${fmtSize(f.size || 0)}${f.notiz ? " · " + esc(f.notiz) : ""}${offlineState[f.id] ? " · offline verfügbar" : ""}</small></span></button>
      <button class="icon-btn" data-fdel="${f.id}" title="Löschen" aria-label="${esc(f.name)} löschen">${ICONS.trash}</button>
    </li>`;
  function filesHtml(t, tag, opts = {}) {
    const list = (t.tickets || []).filter((f) => (f.tag || "") === tag);
    return `<ul class="files">${list.map(fileLi).join("") || (opts.quiet ? "" : `<li class="muted small drop-hint">Noch keine Unterlagen – Datei hierher ziehen oder hinzufügen.</li>`)}</ul>
      <label class="btn sm">${ICON.plus} Ticket / Datei<input type="file" data-fadd="${tag}" multiple hidden></label>`;
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
    const id = uid() + uid();
    try { await putBlob(t, id, new Uint8Array(await file.arrayBuffer())); } catch (e) { return toast(e.message); }
    t.tickets ||= [];
    t.tickets.push({ id, tag: tag || "", name: file.name, mime: file.type || "application/octet-stream", size: file.size, am: new Date().toISOString(), von: C.myId(t) || "" });
    C.save(); toast(`„${file.name}“ hinzugefügt.`);
    if (isShared(t.id)) syncAll({ only: t.id });
  }
  async function deleteFile(t, id) {
    if (!(t.tickets || []).some((x) => x.id === id)) return;
    t.tickets = t.tickets.filter((x) => x.id !== id);
    dropBlob(t, id);
    C.save(); if (isShared(t.id)) syncAll({ only: t.id });
  }
  const tagOptions = (t, sel) => `<option value="" ${!sel ? "selected" : ""}>Allgemein (ohne Tag)</option>` +
    t.plan.slice(0, t.tage).map((r, i) => `<option value="${r.id}" ${r.id === sel ? "selected" : ""}>${esc(dayLabel(t, i))}${r.titel ? " · " + esc(r.titel) : ""}</option>`).join("");
  async function openFile(t, id) {
    const f = (t.tickets || []).find((x) => x.id === id); if (!f) return;
    let blob;
    try { blob = new Blob([await getBlob(t, f.id)], { type: f.mime }); } catch (e) { return toast(e.message); }
    const url = URL.createObjectURL(blob);
    const isImg = f.mime.startsWith("image/"), isPdf = f.mime === "application/pdf";
    openModal({
      title: f.name, wide: true,
      body: (isImg ? `<img src="${url}" alt="${esc(f.name)}" class="file-view-img">`
        : isPdf ? `<iframe src="${url}" class="file-view-pdf" title="${esc(f.name)}"></iframe>`
          : `<p class="muted">Vorschau für diesen Dateityp nicht möglich.</p>`)
        + `<label class="field" style="margin-top:.8rem">Gehört zu<select data-retag>${tagOptions(t, f.tag)}</select></label>`,
      foot: `<a class="btn" href="${url}" target="_blank" rel="noopener">In neuem Tab öffnen</a><a class="btn" href="${url}" download="${esc(f.name)}">Herunterladen</a><span class="spacer"></span><button class="btn primary" data-close>Schließen</button>`,
      onMount: (m) => $("[data-retag]", m).addEventListener("change", (e) => { f.tag = e.target.value; C.commit(); toast("Zugeordnet."); })
    });
  }

  // =========================================================
  //  UNTERWEGS (alle Tage mit Tickets; Dateien per Drag & Drop)
  // =========================================================
  const uwOpen = {}; // Urlaub-id → Set geöffneter Tage
  let uwScrolled = null;
  function todayIdx(t) {
    const today = C.todayISO();
    if (!t.von || today < t.von || today > t.bis) return -1;
    return C.dayDiff(t.von, today);
  }
  function dayBody(t, r) {
    const route = [r.von, r.nach].filter(Boolean).join(" → ");
    const facts = [r.km && `${r.km} km`, r.dauer, r.hoch && `↑ ${r.hoch} m`, r.runter && `↓ ${r.runter} m`].filter(Boolean);
    const maps = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
    const track = (t.tracks || []).find((x) => x.tag === r.id);
    return `<div class="uw-body">
      ${route ? `<div class="tc-route">${esc(route)}</div>` : ""}
      ${facts.length ? `<div class="tc-facts">${facts.map((x) => `<span>${esc(x)}</span>`).join("")}</div>` : ""}
      ${track ? `<p class="small muted" style="margin:.5rem 0 0">GPX-Track: ${esc(track.name)} · <a href="#karte" data-mapday="${r.id}">auf der Karte</a></p>` : ""}
      ${r.highlights ? `<div class="tc-sec"><h4>Highlights</h4><p>${esc(r.highlights)}</p></div>` : ""}
      ${r.unterkunft ? `<div class="tc-sec"><h4>Unterkunft</h4><p>${esc(r.unterkunft)} <a class="map-link" href="${maps(r.unterkunft + " " + (r.nach || t.ziel || ""))}" target="_blank" rel="noopener">${ICONS.map} Karte</a></p></div>` : ""}
      ${r.hinweise ? `<div class="tc-sec"><h4>Hinweise</h4><p>${esc(r.hinweise)}</p></div>` : ""}
      ${r.sonstiges ? `<div class="tc-sec"><h4>Sonstiges</h4><p>${esc(r.sonstiges)}</p></div>` : ""}
      <div class="tc-sec"><h4>Tickets & Unterlagen</h4>${filesHtml(t, r.id)}</div>
      <div class="row" style="margin-top:.6rem"><button class="btn sm" data-act="edit" data-id="${r.id}">${ICON.edit} Tag bearbeiten</button></div>
    </div>`;
  }
  function renderUnterwegs() {
    const t = trip(); const el = $("#view-unterwegs");
    ensurePlan(t);
    const ti = todayIdx(t); const today = C.todayISO();
    const before = t.von && today < t.von;
    if (!uwOpen[t.id]) uwOpen[t.id] = new Set([t.plan[ti >= 0 ? ti : 0].id]);
    const open = uwOpen[t.id];
    const files = t.tickets || [];
    el.innerHTML = `
      ${whoAmI(t)}
      ${before ? `<div class="card card-pad countdown-card"><b>Noch ${C.dayDiff(today, t.von)} ${C.dayDiff(today, t.von) === 1 ? "Tag" : "Tage"}</b> bis „${esc(tripName(t))}“ losgeht.</div>` : ""}
      <section class="card card-pad uw-allg" data-drop="">
        <div class="row" style="justify-content:space-between"><h3 class="section-title">Allgemein</h3><span class="muted small">nicht an einen Tag gebunden</span></div>
        <textarea class="input uw-notes" data-allg rows="3" placeholder="Notizen für die ganze Reise – z. B. Notfallnummern, WLAN, Mietwagen-Abholung …">${esc(t.allgemein || "")}</textarea>
        <h4 class="form-sub" style="margin:.7rem 0 .35rem">Dateien – z. B. Offline-Karten, Versicherung, Mietvertrag</h4>
        ${filesHtml(t, "")}
      </section>
      <p class="muted small uw-hint">${ICONS.clip} Dateien einfach auf einen Tag ziehen – oder vorhandene Dateien zwischen Tagen verschieben.</p>
      <div class="uw-days">${t.plan.slice(0, t.tage).map((r, i) => {
        const isOpen = open.has(r.id); const n = files.filter((f) => f.tag === r.id).length;
        return `<section class="card uw-day typ-${r.typ || "none"} ${isOpen ? "open" : ""} ${i === ti ? "is-today" : ""}" data-drop="${r.id}" id="uw-${r.id}">
          <button class="uw-head" data-toggle="${r.id}" aria-expanded="${isOpen}">
            <span class="uw-date"><b>${esc(dayLabel(t, i))}</b><small>Tag ${i + 1}${i === ti ? " · heute" : ""}</small></span>
            <span class="uw-title">${r.typ ? `<span class="badge typ-badge">${typName(r.typ)}</span>` : ""}<span>${esc(r.titel || (r.typ ? "" : "–"))}</span></span>
            <span class="uw-meta">${n ? `<span class="file-count">${ICONS.clip}${n}</span>` : ""}<span class="chev">${isOpen ? "▴" : "▾"}</span></span>
          </button>
          ${isOpen ? dayBody(t, r) : n ? `<ul class="files mini-files">${files.filter((f) => f.tag === r.id).map(fileLi).join("")}</ul>` : ""}
        </section>`;
      }).join("")}</div>`;
    refreshOffline(t);
    if (ti >= 0 && uwScrolled !== t.id) {
      uwScrolled = t.id;
      setTimeout(() => { const x = document.getElementById("uw-" + t.plan[ti].id); if (x) x.scrollIntoView({ behavior: "smooth", block: "start" }); }, 80);
    }
  }
  function onUnterwegsClick(e) {
    const t = trip();
    const me = e.target.closest("[data-me]");
    if (me) { C.setMe(t, me.dataset.me); return C.commit(); }
    const o = e.target.closest("[data-fopen]"); if (o) return openFile(t, o.dataset.fopen);
    const d = e.target.closest("[data-fdel]");
    if (d) { if (!armed(d, "Löschen?")) return; return deleteFile(t, d.dataset.fdel).then(() => C.render()); }
    const tg = e.target.closest("[data-toggle]");
    if (tg) { const s = uwOpen[t.id]; s.has(tg.dataset.toggle) ? s.delete(tg.dataset.toggle) : s.add(tg.dataset.toggle); return C.render(); }
    const md = e.target.closest("[data-mapday]");
    if (md) { state.ui.mapTrip = t.id; state.ui.mapDetail = "route"; return; }
    const a = e.target.closest("[data-act]"); if (!a) return;
    if (a.dataset.act === "edit") return openDay(t, a.dataset.id);
  }
  async function onUnterwegsChange(e) {
    const t = trip();
    if (e.target.dataset.allg != null) { t.allgemein = e.target.value; return C.save(); }
    const inp = e.target.closest("[data-fadd]"); if (!inp || !inp.files.length) return;
    for (const file of inp.files) await addFile(t, file, inp.dataset.fadd);
    C.render();
  }
  // Drag & Drop: neue Dateien vom Computer oder vorhandene Dateien zwischen Tagen
  function bindDrops(el) {
    el.addEventListener("dragstart", (e) => {
      const li = e.target.closest("[data-fid]"); if (!li) return;
      e.dataTransfer.setData("text/x-fid", li.dataset.fid); e.dataTransfer.effectAllowed = "move";
      li.classList.add("dragging");
    });
    el.addEventListener("dragend", (e) => { const li = e.target.closest("[data-fid]"); if (li) li.classList.remove("dragging"); });
    el.addEventListener("dragover", (e) => {
      const z = e.target.closest("[data-drop]"); if (!z) return;
      e.preventDefault(); e.dataTransfer.dropEffect = [...e.dataTransfer.types].includes("Files") ? "copy" : "move";
      $$(".drag-over", el).forEach((x) => { if (x !== z) x.classList.remove("drag-over"); });
      z.classList.add("drag-over");
    });
    el.addEventListener("dragleave", (e) => {
      const z = e.target.closest("[data-drop]"); if (z && !z.contains(e.relatedTarget)) z.classList.remove("drag-over");
    });
    el.addEventListener("drop", async (e) => {
      const z = e.target.closest("[data-drop]"); if (!z) return;
      e.preventDefault(); z.classList.remove("drag-over");
      const t = trip(); const tag = z.dataset.drop;
      const fid = e.dataTransfer.getData("text/x-fid");
      if (fid) {
        const f = (t.tickets || []).find((x) => x.id === fid);
        if (f && (f.tag || "") !== tag) { f.tag = tag; C.commit(); toast("Verschoben."); }
        return;
      }
      if (e.dataTransfer.files.length) {
        for (const file of e.dataTransfer.files) await addFile(t, file, tag);
        if (tag) uwOpen[t.id].add(tag);
        C.render();
      }
    });
  }
  // Dateien, die daneben fallen gelassen werden, nicht im Browser öffnen
  document.addEventListener("dragover", (e) => { if (e.dataTransfer && [...e.dataTransfer.types].includes("Files")) e.preventDefault(); });
  document.addEventListener("drop", (e) => { if (e.dataTransfer && e.dataTransfer.files.length && !e.target.closest("[data-drop]")) e.preventDefault(); });

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

  // ----- Verbindung mit einer Person (alle gemeinsamen Urlaube + eigene Nutzung) -----
  const enc64 = (o) => S.b64url(btoa(unescape(encodeURIComponent(JSON.stringify(o)))));
  const dec64 = (x) => JSON.parse(decodeURIComponent(escape(atob(S.unb64url(x)))));
  const baseUrl = () => location.href.split("#")[0];
  function connectLink(c) {
    const cfg = state.syncCfg;
    return baseUrl() + "#connect=" + enc64({ v: 1, o: cfg.o, r: cfg.r, t: cfg.t, c: c.id, k: c.k, n: c.name, f: state.profile.name || "" });
  }
  function peopleList() {
    const groups = new Map();
    Object.values(state.trips).forEach((t) => {
      const seen = new Set();
      (t.personen || []).forEach((p) => {
        const n = norm(p.name); if (!n || seen.has(n)) return; seen.add(n);
        const g = groups.get(n) || { n, variants: {}, trips: 0 };
        const v = C.niceName(p.name); g.variants[v] = (g.variants[v] || 0) + 1; g.trips++;
        groups.set(n, g);
      });
    });
    state.contacts.forEach((c) => { if (!groups.has(norm(c.name))) groups.set(norm(c.name), { n: norm(c.name), variants: { [c.name]: 1 }, trips: 0 }); });
    return [...groups.values()].map((g) => ({ ...g, name: Object.entries(g.variants).sort((a, b) => b[1] - a[1])[0][0], contact: state.contacts.find((c) => norm(c.name) === g.n) }))
      .sort((a, b) => b.trips - a.trips || a.name.localeCompare(b.name));
  }
  function guessMe() {
    if (state.profile.name) return state.profile.name;
    const top = peopleList()[0];
    return top && top.trips > 1 ? top.name : "";
  }
  function renderPeople() {
    if (!state.syncCfg) return `<div class="card card-pad stack" id="people"><h3 class="section-title">Mitreisende verbinden</h3>
      <p class="small muted">Richte zuerst oben die Synchronisierung ein. Danach kannst du hier allen, mit denen du unterwegs warst, ihre gemeinsamen Reisen auf einmal schicken.</p></div>`;
    const me = state.profile.name || guessMe();
    const list = peopleList().filter((g) => g.n !== norm(me));
    return `<div class="card card-pad stack" id="people">
      <h3 class="section-title">${ICONS.users} Mitreisende verbinden</h3>
      <p class="small muted">Verbundene Personen bekommen <b>alle Reisen, in denen ihr Name steht</b> – vergangene und anstehende. Neue Urlaube mit diesem Namen kommen automatisch dazu, auch in die andere Richtung. Ihre eigenen Urlaube ohne dich sehen nur sie selbst. Groß-/Kleinschreibung spielt keine Rolle.</p>
      <label class="field" style="max-width:280px">So heißt du in den Reisen<input class="input" data-act="profile-name" value="${esc(me)}" placeholder="z. B. Eric"></label>
      ${list.length ? `<div class="people-list">${list.map((g) => `<div class="people-row">
          <div class="people-name"><b>${esc(g.name)}</b><span class="small muted">${g.trips ? g.trips + (g.trips === 1 ? " gemeinsame Reise" : " gemeinsame Reisen") : "noch keine gemeinsame Reise"}${Object.keys(g.variants).length > 1 ? " · Schreibweisen: " + esc(Object.keys(g.variants).join(", ")) : ""}</span></div>
          ${g.contact ? `<span class="badge vegan">verbunden</span><button class="btn sm" data-act="plink" data-id="${g.contact.id}">Link</button>`
            : `<button class="btn sm primary" data-act="pconnect" data-name="${esc(g.name)}">Verbinden</button>`}
        </div>`).join("")}</div>` : `<p class="small muted">In deinen Reisen stehen noch keine weiteren Namen.</p>`}
      ${state.syncCfg.invite ? `<p class="hint">Auf deinen anderen Geräten öffnest du einfach wieder deinen Einladungslink und gibst dein Passwort ein. <button class="btn sm" data-act="mylink">Meinen Link kopieren</button></p>` : ""}
    </div>`;
  }
  function showConnectLink(c) {
    const link = connectLink(c);
    const n = Object.values(state.trips).filter((t) => tripHas(t, c.name)).length;
    openModal({
      title: `Mit ${c.name} verbinden`,
      body: `<p>Schick ${esc(c.name)} diesen Link. Damit bekommt ${esc(c.name)} ${n === 1 ? "eure gemeinsame Reise" : `alle ${n} gemeinsamen Reisen`} und kann die App danach auch für eigene Urlaube nutzen. Neue Urlaube, in denen „${esc(c.name)}“ steht, erscheinen automatisch bei ${esc(c.name)}.</p>
        <label class="field">Verbindungs-Link<textarea class="export-text" style="min-height:110px" readonly>${esc(link)}</textarea></label>
        <div class="hint" style="margin-top:.6rem;line-height:1.5"><b>Wichtig:</b> Der Link ist ein Schlüssel – nur direkt verschicken (z. B. Signal, WhatsApp). ${esc(c.name)} wählt beim Öffnen ein eigenes Passwort. Eure Reisen liegen verschlüsselt in deinem Daten-Repo; was ${esc(c.name)} alleine plant, kannst du nicht lesen.</div>`,
      foot: `<button class="btn" data-close>Schließen</button><button class="btn primary" data-copy>Link kopieren</button>`,
      onMount: (m) => $("[data-copy]", m).addEventListener("click", () => C.copyText(link, "Link kopiert."))
    });
  }
  function onPeopleClick(a) {
    if (a.dataset.act === "pconnect") {
      if (!state.profile.name) state.profile.name = guessMe();
      const c = { id: uid() + uid(), name: a.dataset.name, k: S.randomKey() };
      state.contacts.push(c); C.store.save();
      toast(`Teile Reisen mit ${c.name} …`);
      syncAll().then(() => { C.render(); showConnectLink(c); });
      return true;
    }
    if (a.dataset.act === "plink") { const c = state.contacts.find((x) => x.id === a.dataset.id); if (c) showConnectLink(c); return true; }
    if (a.dataset.act === "mylink") { C.copyText(baseUrl() + "#connect=" + state.syncCfg.invite, "Link kopiert."); return true; }
    return false;
  }
  function handleConnect(code) {
    let inv;
    try { inv = dec64(code); if (!inv.c || !inv.k || !inv.o) throw new Error(); } catch { toast("Der Verbindungs-Link ist ungültig."); return; }
    const ring = `keys/c_${inv.c}.enc`;
    if (state.syncCfg) {
      if (state.syncCfg.ring === ring) { toast("Dieses Gerät ist schon verbunden."); return; }
      if (state.contacts.some((c) => c.id === inv.c)) { toast(`Das ist der Link, den du an ${inv.n} geschickt hast.`); return; }
      return openModal({ title: "Schon angemeldet", body: `<p>Auf diesem Gerät ist bereits ein anderes Konto verbunden. Öffne den Link auf dem Gerät von ${esc(inv.n)}.</p>`, foot: `<button class="btn primary" data-close>OK</button>` });
    }
    const cfg = { o: inv.o, r: inv.r, t: inv.t, ring, invite: code };
    openModal({
      title: `Willkommen${inv.n ? ", " + esc(inv.n) : ""}!`,
      body: `<p>${esc(inv.f || "Jemand")} hat dich mit der Urlaubsplanung verbunden. Eure gemeinsamen Reisen erscheinen gleich hier. Du kannst die App auch für eigene Urlaube nutzen – die siehst nur du und wen du in einen Urlaub einträgst.</p>
        <form id="connForm" class="form-grid">
          <label class="field c6">Dein Name in den Reisen<input name="name" value="${esc(inv.n || "")}" required></label>
          <label class="field c3">Passwort<input name="pass" type="password" minlength="8" required autocomplete="new-password"></label>
          <label class="field c3" data-p2>Passwort wiederholen<input name="pass2" type="password" autocomplete="new-password"></label>
          <p class="small muted c6" id="connMsg">Das Passwort schützt deine Schlüssel. Auf weiteren Geräten öffnest du einfach diesen Link wieder und gibst es ein.</p>
        </form>`,
      foot: `<button class="btn" data-close>Abbrechen</button><button class="btn primary" type="submit" form="connForm">Verbinden</button>`,
      onMount: async (m) => {
        const say = (x) => { $("#connMsg", m).textContent = x; };
        let existing = null;
        try { existing = await S.getFile(cfg, ring); } catch (e) { say(e.message || String(e)); }
        if (existing) { $("[data-p2]", m).remove(); say("Willkommen zurück – gib dein Passwort ein."); }
        $("#connForm", m).addEventListener("submit", async (e) => {
          e.preventDefault(); const f = e.target;
          try {
            let salt;
            if (existing) salt = JSON.parse(atob(existing.content)).salt;
            else { if (f.pass.value !== f.pass2.value) return say("Die Passwörter stimmen nicht überein."); salt = S.bytesToB64(crypto.getRandomValues(new Uint8Array(16))); }
            say("Leite Schlüssel ab …");
            cfg.salt = salt; cfg.mk = await S.deriveMaster(f.pass.value, salt);
            if (existing) { try { await S.decJSON(cfg.mk, JSON.parse(atob(existing.content)).data); } catch { return say("Passwort falsch."); } }
            state.syncCfg = cfg;
            state.profile.name = C.niceName(f.name.value) || inv.n || "";
            if (!state.contacts.some((c) => c.id === inv.c)) state.contacts.push({ id: inv.c, name: C.niceName(inv.f || "Mitreisende Person"), k: inv.k });
            Object.values(state.keys).forEach((k) => { if (k.owner === undefined) k.owner = true; });
            C.store.save(); closeModal(); toast("Verbunden – lade eure Reisen …");
            await syncAll(); location.hash = "urlaube"; C.render();
            const n = Object.keys(state.trips).length;
            toast(n ? `${n} ${n === 1 ? "Reise" : "Reisen"} geladen.` : "Verbunden.");
          } catch (err) { say(err.message || String(err)); }
        });
      }
    });
  }

  function handleHash() {
    const mc = location.hash.match(/^#connect=([\w-]+)/);
    if (mc) { history.replaceState(null, "", location.pathname + location.search + "#urlaube"); setTimeout(() => handleConnect(mc[1]), 50); return true; }
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
  const lockedList = () => [...sync.locked].filter((id) => !state.trips[id] && !(state.ui.ignoreLocked || []).includes(id));
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
      ${lockedList().length ? `<div class="card card-pad stack"><h3 class="section-title">Wartet auf Schlüssel</h3>
        <p class="small muted">${lockedList().length} Urlaub(e) liegen im Daten-Repo, lassen sich auf diesem Gerät aber noch nicht öffnen (Kennung: ${lockedList().map((id) => esc(id.slice(0, 8))).join(", ")}). Öffne die Urlaubsplanung auf dem Gerät, auf dem du die Reise angelegt oder importiert hast, und synchronisiere dort – danach erscheint sie hier automatisch.</p>
        <div class="row"><button class="btn sm" data-act="unlock-forget">Hier nicht mehr anzeigen</button></div></div>` : ""}
      ${renderPeople()}
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
    if (state.ui.scrollPeople) { state.ui.scrollPeople = false; setTimeout(() => { const p = $("#people"); if (p) p.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60); }
  }
  async function connect(f) {
    const msg = $("#syncMsg"); const say = (x) => { if (msg) msg.textContent = x; };
    const [o, r] = f.repo.value.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "").split("/");
    if (!o || !r) return say("Bitte als benutzername/repo angeben.");
    const cfg = { o, r, t: f.token.value.trim() };
    try {
      say("Prüfe Zugang …");
      await S.testRepo(cfg);
      const ring = await S.getFile(cfg, ringPath(cfg));
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
    if (onPeopleClick(a)) return;
    if (a.dataset.act === "unlock-forget") {
      state.ui.ignoreLocked = [...new Set([...(state.ui.ignoreLocked || []), ...sync.locked])];
      C.store.save(); return C.render();
    }
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
    if (e.target.dataset.act === "profile-name") {
      state.profile.name = C.niceName(e.target.value);
      Object.values(state.trips).forEach(autoMe);
      C.store.save(); syncAll(); return C.render();
    }
    const a = e.target.closest("[data-act=restore]"); if (!a || !a.files[0]) return;
    restoreFile(a.files[0]); a.value = "";
  }
  // Reisen aus einer Sicherungs-/Importdatei übernehmen (gleiche Urlaub-ID = wird ersetzt)
  function restoreFile(file) {
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const d = JSON.parse(rd.result);
        const n = Object.keys(d.trips || {}).length;
        if (!n) throw new Error();
        Object.assign(state.me, d.me || {});
        Object.entries(d.keys || {}).forEach(([id, k]) => { if (!state.keys[id]) state.keys[id] = k; });
        Object.entries(d.trips || {}).forEach(([id, t]) => { state.trips[id] = C.migrate(t); ensurePlan(state.trips[id]); });
        C.commit(); toast(`${n} ${n === 1 ? "Reise" : "Reisen"} übernommen.`); syncAll();
      } catch { toast("Datei nicht erkannt."); }
    };
    rd.readAsText(file);
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
  PL.U = { cfgFor, isShared, syncAll, putBlob, getBlob, dropBlob, offlineState, whoAmI, planStats, TYPEN, typName, dayLabel, dateOf,
    ensurePlan, durMin, fmtDur, num, fmtNum, money, ICONS, online, openDay, tripBadge, fmtSize };
  PL.init = () => {
    // leere, unbenannte Urlaube (z. B. automatisch angelegt von der alten Packliste) entfernen
    const isEmpty = (t) => !(t.name || "").trim() && !(t.ziel || "").trim() && !t.von && !(t.kosten || []).length && !(t.tickets || []).length
      && !(t.fotos || []).length && !(t.orte || []).length && (t.plan || []).every(rowEmpty);
    Object.values(state.trips).forEach((t) => {
      if (!isEmpty(t)) return;
      if (state.keys[t.id] && state.keys[t.id].owner && state.base[t.id] && !state.deleted.includes(t.id)) state.deleted.push(t.id);
      delete state.trips[t.id]; delete state.keys[t.id]; delete state.base[t.id];
      if (state.current === t.id) state.current = null;
    });
    // vorhandene Urlaube auf den neuen Stand bringen
    Object.values(state.trips).forEach(ensurePlan);
    const on = (id, ev, fn) => { const el = $("#view-" + id); if (el) el.addEventListener(ev, fn); };
    on("urlaube", "click", onUrlaubeClick);
    on("urlaube", "change", (e) => {
      const f = e.target.closest("[data-act=import]"); if (!f || !f.files[0]) return;
      const file = f.files[0]; f.value = "";
      if (/\.json$/i.test(file.name)) restoreFile(file); else importExcel(file);
    });
    on("plan", "click", onPlanClick);
    on("plan", "change", onPlanChange);
    on("plan", "keydown", onPlanKey);
    on("unterwegs", "click", onUnterwegsClick);
    on("unterwegs", "change", onUnterwegsChange);
    bindDrops($("#view-unterwegs"));
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
