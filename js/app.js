/* =========================================================
   Packliste · Essensplaner · Wandergerichte
   Reines JavaScript, keine Abhängigkeiten.
   ========================================================= */
(() => {
  "use strict";

  // ---------- Hilfsfunktionen ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const slug = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || uid();
  const fmtG = (g) => (g >= 1000 ? (g / 1000).toLocaleString("de-DE", { maximumFractionDigits: 2 }) + " kg" : Math.round(g) + " g");
  const fmtDate = (iso, opts = { day: "2-digit", month: "2-digit" }) => {
    if (!iso) return "";
    const d = new Date(iso + "T12:00:00");
    return isNaN(d) ? "" : d.toLocaleDateString("de-DE", opts);
  };
  const addDays = (iso, n) => {
    const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const dayDiff = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5);

  const ICON = {
    check: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3L13 4.5"/></svg>',
    skip: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10" cy="10" r="7"/><path d="M5 15L15 5"/></svg>',
    edit: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M13.5 3.5l3 3L7 16H4v-3z"/></svg>',
    close: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 5l10 10M15 5L5 15"/></svg>',
    share: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="15" cy="4.5" r="2.2"/><circle cx="5" cy="10" r="2.2"/><circle cx="15" cy="15.5" r="2.2"/><path d="M7 9l6-3.2M7 11l6 3.2"/></svg>',
    print: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 7V3h10v4M5 14H3V8h14v6h-2"/><path d="M5 11h10v6H5z"/></svg>',
    reset: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 10a6.5 6.5 0 1 0 2-4.7"/><path d="M3 3v4h4"/></svg>',
    plus: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 4v12M4 10h12"/></svg>',
    tag: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 3h7l7 7-7 7-7-7z"/><circle cx="7" cy="7" r="1.3" fill="currentColor"/></svg>',
    calendar: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="4.5" width="14" height="12.5" rx="2"/><path d="M3 8.5h14M7 2.5v4M13 2.5v4"/></svg>',
    wand: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 16L13 7M12 3v2M16 7h2M15 4l1.5-1.5M10 2l.5 1"/></svg>'
  };

  // ---------- Speicher ----------
  const KEY = "packliste.v1";
  const store = {
    load() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } },
    save() {
      try {
        localStorage.setItem(KEY, JSON.stringify({ trips: state.trips, current: state.current, ui: state.ui, data: state.data,
          me: state.me, keys: state.keys, syncCfg: state.syncCfg, base: state.base, deleted: state.deleted, fileDeletes: state.fileDeletes, pendingUploads: state.pendingUploads, geo: state.geo, profile: state.profile, contacts: state.contacts }));
      }
      catch { /* Speicher nicht verfügbar – Seite funktioniert trotzdem */ }
    }
  };

  // ---------- Zustand ----------
  const saved = store.load() || {};
  const state = {
    trips: saved.trips || {},
    current: saved.current || null,
    me: saved.me || {},            // wer bin ich – pro Urlaub, nur auf diesem Gerät
    keys: saved.keys || {},        // Urlaub-id → { k: Schlüssel, o/r/t: Daten-Repo }, nur auf diesem Gerät
    syncCfg: saved.syncCfg || null, // eigenes Daten-Repo + Passwort-Schlüssel
    base: saved.base || {},        // zuletzt synchronisierter Stand je Urlaub (für den 3-Wege-Abgleich)
    deleted: saved.deleted || [],  // gelöschte Urlaube, die noch im Daten-Repo entfernt werden müssen
    fileDeletes: saved.fileDeletes || [],
    pendingUploads: saved.pendingUploads || [], // Dateien, die noch hochgeladen werden müssen
    profile: saved.profile || { name: "" },      // wie ich in den Reisen heiße
    contacts: saved.contacts || [],             // verbundene Mitreisende: { id, name, k }
    geo: saved.geo || {},                       // Zwischenspeicher für gefundene Orte (Name → Koordinaten)
    ui: Object.assign({ tab: "urlaube", groupBy: "modul", hidePacked: false, hideOptional: false, viewPerson: "alle",
      rFilter: { mahlzeit: "alle", basis: "alle", diaet: "alle", q: "" }, rSub: "gerichte" }, saved.ui || {}),
    data: saved.data || null, // lokale Kopie der Stammdaten, falls bearbeitet
    edit: false
  };

  const PACK = () => (state.data && state.data.pack) || window.PACK_DATA;
  const REZ = () => (state.data && state.data.rezept) || window.REZEPT_DATA;
  function editable(which) {
    if (!state.data) state.data = {};
    if (!state.data[which]) state.data[which] = clone(which === "pack" ? window.PACK_DATA : window.REZEPT_DATA);
    return state.data[which];
  }

  // ---------- Trips ----------
  function presetModules(arten) {
    const P = PACK(); const set = new Set();
    arten.forEach((a) => (P.arten.find((x) => x.id === a)?.module || []).forEach((m) => set.add(m)));
    return P.module.map((m) => m.id).filter((id) => set.has(id));
  }
  function newTrip(arten = ["wandern"]) {
    const first = { id: uid(), name: "" };
    const t = {
      id: uid() + uid(), name: "", ziel: "", arten: [...arten], von: "", bis: "", tage: 5,
      personen: [first], module: presetModules(arten),
      plan: [], kosten: [], tickets: [], waehrung: "€", orte: [], tracks: [], fotos: [], reviews: {},
      tags: {}, status: {}, menge: {}, essen: null, erstellt: new Date().toISOString()
    };
    state.me[t.id] = first.id;
    state.keys[t.id] = { k: window.PL.sync.randomKey(), owner: true };
    return t;
  }
  // Namen vergleichen: Groß-/Kleinschreibung, Akzente und Leerzeichen egal
  const normName = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
  // komplett klein geschriebene Namen ("jakob") einheitlich groß schreiben
  const niceName = (s) => { const v = String(s || "").replace(/\s+/g, " ").trim(); return v && (v === v.toLowerCase() || (v.length > 2 && v === v.toUpperCase())) ? v.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()) : v; };
  // ältere gespeicherte Trips auf das neue Format bringen
  function migrate(t) {
    if (!t.arten) t.arten = [t.art || "wandern"];
    delete t.art;
    if (!t.tags) {
      t.tags = {};
      Object.entries(t.zuweisung || {}).forEach(([k, pid]) => { t.tags[k] = ["gemeinsam", pid]; });
    }
    delete t.zuweisung;
    const ren = { "kleidung-stadt": "kleidung", "kleidung-wandern": "kleidung" };
    t.module = [...new Set((t.module || []).map((m) => ren[m] || m))];
    t.personen = (t.personen || []).map((p) => ({ id: p.id, name: niceName(p.name === "Ich" ? "" : p.name || "") }));
    if (!t.personen.length) t.personen = [{ id: uid(), name: "" }];
    t.menge ||= {}; t.status ||= {};
    t.plan ||= []; t.kosten ||= []; t.tickets ||= []; t.ziel ??= ""; t.waehrung ||= "€";
    t.orte ||= []; t.tracks ||= []; t.fotos ||= []; t.reviews ||= {};
    if (t.ich) { if (!state.me[t.id]) state.me[t.id] = t.ich; delete t.ich; }
    // Haken früher pro Gerät, jetzt pro Person
    const vals = Object.values(t.status);
    if (vals.length && vals.some((v) => typeof v === "string")) t.status = { [state.me[t.id] || "_"]: t.status };
    if (!state.keys[t.id] && window.PL.sync.available) state.keys[t.id] = { k: window.PL.sync.randomKey(), owner: true };
    return t;
  }
  Object.values(state.trips).forEach(migrate);

  function trip() {
    if (!state.current || !state.trips[state.current]) {
      const ids = Object.keys(state.trips);
      state.current = ids.length ? ids[0] : null;
    }
    return state.current ? state.trips[state.current] : null;
  }
  // Reise liegt in der Vergangenheit (auch ohne genaues Datum)
  const isPast = (t, today = todayISO2()) => (t.bis ? t.bis < today : !!t.vergangen);
  function todayISO2() { return new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10); }
  const sortKey = (t) => t.von || (t.jahr ? t.jahr + "-00-00" : "0000");
  const tripName = (t) => (t.name || "").trim() || (t.ziel || "").trim() || "Unbenannter Urlaub";
  // wer bin ich in diesem Urlaub (nur auf diesem Gerät gespeichert)
  const myId = (t) => (state.me[t.id] && t.personen.some((p) => p.id === state.me[t.id]) ? state.me[t.id] : (t.personen.length === 1 ? t.personen[0].id : null));
  const setMe = (t, id) => { if (id) state.me[t.id] = id; else delete state.me[t.id]; };
  // Haken der Packliste – pro Person
  const ST = (t) => { t.status ||= {}; const k = myId(t) || "_"; return (t.status[k] ||= {}); };
  const person = (t, id) => t.personen.find((p) => p.id === id);
  const pname = (t, p) => (p && p.name && p.name.trim()) || (p ? `Person ${t.personen.indexOf(p) + 1}` : "");
  const artNames = (t) => t.arten.map((a) => PACK().arten.find((x) => x.id === a)?.name || a).join(" + ");

  // ---------- Mengen ----------
  function ruleQty(m, tage) {
    m = m || {};
    const basis = m.basis ?? 1;
    if (!m.proTag) return basis;
    let q = Math.ceil(basis + m.proTag * tage - 1e-9);
    if (m.max != null && m.max !== "") q = Math.min(q, +m.max);
    return Math.max(q, 0);
  }
  // Tage je Reiseart (Kombi-Urlaub): t.tagArt = ["wandern", "stadt", …] pro Reisetag
  function dayArts(t) {
    if (t.arten.length < 2) return Array(t.tage).fill(t.arten[0]);
    let src = t.tagArt || [];
    if (!t.tagArtManual && (t.plan || []).some((r) => r.typ)) {
      // aus der Tagesplanung ableiten: Wanderung → Wandern, Stadt/Strand → Stadt
      // Fahrt-, Stadt- und Strandtage zählen als „Stadt“ (Alltagskleidung), Ruhetage übernehmen den Vortag
      const alt = t.arten.find((a) => a !== "wandern") || t.arten[0];
      let last = alt;
      src = Array.from({ length: t.tage }, (_, i) => {
        const typ = t.plan[i] && t.plan[i].typ;
        if (typ === "wandern" && t.arten.includes("wandern")) last = "wandern";
        else if (["stadt", "strand", "fahrt", "anreise", "abreise"].includes(typ)) last = alt;
        return last;
      });
    }
    const arr = src.slice(0, t.tage);
    while (arr.length < t.tage) arr.push(arr.length ? arr[arr.length - 1] : t.arten[0]);
    return arr.map((a) => (t.arten.includes(a) ? a : t.arten[0]));
  }
  function daysPer(t) {
    const c = {}; t.arten.forEach((a) => { c[a] = 0; });
    dayArts(t).forEach((a) => { c[a]++; });
    return c;
  }
  // Menge: größte Basis + Summe(proTag × Tage der jeweiligen Reiseart), gedeckelt durch die größte Obergrenze
  function calcQty(item, tage, arten, days) {
    let rel = (arten && arten.length ? arten : [null]).filter((a) => !a || !item.arten || !item.arten.length || item.arten.includes(a));
    if (!rel.length) rel = [null];
    let rules = rel.map((a) => ({ m: (a && item.mengeJe && item.mengeJe[a]) || item.menge || {}, d: days && a ? (days[a] ?? 0) : tage }));
    if (days && rules.some((r) => r.d > 0)) rules = rules.filter((r) => r.d > 0); // Reisearten ohne Tage zählen nicht
    const basis = Math.max(...rules.map((r) => r.m.basis ?? 1));
    if (!rules.some((r) => r.m.proTag)) return basis;
    let q = Math.ceil(basis + rules.reduce((sum, r) => sum + (r.m.proTag || 0) * r.d, 0) - 1e-9);
    const caps = rules.filter((r) => r.m.proTag).map((r) => r.m.max);
    if (caps.every((c) => c != null && c !== "")) q = Math.min(q, Math.max(...caps.map(Number)));
    return Math.max(q, 0);
  }
  const autoQty = (t, item) => calcQty(item, t.tage, t.arten, t.arten.length > 1 ? daysPer(t) : null);
  const qtyOf = (t, item) => (t.menge[item.id] != null ? t.menge[item.id] : autoQty(t, item));
  const ruleText = (m) => {
    m = m || {};
    if (!m.proTag) return `fest ${m.basis ?? 1}`;
    const per = m.proTag >= 1 ? `${m.proTag} pro Tag` : `1 pro ${Math.round(1 / m.proTag * 10) / 10} Tage`;
    return `${m.basis ? m.basis + " + " : ""}${per}${m.max ? ", max. " + m.max : ""}`;
  };

  // ---------- Tags ----------
  // keine Tags = jede Person packt ihr eigenes · Person-Tag = nur diese Person braucht/bringt es
  // "gemeinsam" = eins für alle; zusätzlich ein Person-Tag = diese Person bringt es mit
  function tagsOf(t, item) {
    const raw = t.tags[item.id] ?? (item.geteilt ? ["gemeinsam"] : []);
    return raw.filter((x) => x === "gemeinsam" || person(t, x));
  }
  const bringers = (t, item) => tagsOf(t, item).filter((x) => x !== "gemeinsam");
  const isShared = (t, item) => tagsOf(t, item).includes("gemeinsam");

  function tripItems(t) {
    const P = PACK();
    const per = t.arten.length > 1 ? daysPer(t) : null;
    return P.items.filter((it) => t.module.includes(it.modul) && (!it.arten || !it.arten.length || it.arten.some((a) => t.arten.includes(a) && (!per || per[a] > 0))));
  }
  function visibleItems(t) {
    let items = tripItems(t);
    const vp = state.ui.viewPerson;
    if (t.personen.length > 1 && vp !== "alle" && person(t, vp)) {
      items = items.filter((it) => { const b = bringers(t, it); return !b.length || b.includes(vp); });
    }
    if (state.ui.hideOptional) items = items.filter((it) => !it.optional || ST(t)[it.id] === "gepackt");
    return items;
  }
  // ---------- Toast & Modal ----------
  let toastTimer;
  function toast(msg) {
    const el = $("#toast"); el.textContent = msg; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }
  function openModal({ title, body, foot = "", wide = false, onMount }) {
    const root = $("#modalRoot");
    root.innerHTML = `<div class="overlay" data-overlay><div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-head"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Schließen">${ICON.close}</button></div>
      <div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ""}</div></div>`;
    const ov = $(".overlay", root);
    ov.addEventListener("mousedown", (e) => { if (e.target === ov) closeModal(); });
    $$("[data-close]", root).forEach((b) => b.addEventListener("click", closeModal));
    if (onMount) onMount($(".modal", root));
    const first = $("input, select, textarea", $(".modal-body", root));
    if (first) setTimeout(() => first.focus(), 30);
  }
  function closeModal() { $("#modalRoot").innerHTML = ""; }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  // Zwei-Klick-Bestätigung statt confirm()
  function armed(btn, label = "Wirklich?") {
    if (btn.classList.contains("armed")) return true;
    const old = btn.innerHTML; btn.classList.add("armed"); btn.textContent = label;
    setTimeout(() => { btn.classList.remove("armed"); btn.innerHTML = old; }, 2500);
    return false;
  }

  // =========================================================
  //  PACKLISTE
  // =========================================================
  const cal = { open: false, month: null, pick: "von" };
  const todayISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const toDE = (iso) => (iso ? iso.split("-").reverse().join(".") : "");
  function parseDE(s) {
    s = String(s || "").trim(); if (!s) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})[.\/\- ](\d{1,2})(?:[.\/\- ](\d{2,4}))?\.?$/);
    if (!m) return null;
    let [, d, mo, y] = m; d = +d; mo = +mo;
    const now = new Date();
    if (!y) { y = now.getFullYear(); if (new Date(y, mo - 1, d) < new Date(now.getFullYear(), now.getMonth(), now.getDate())) y++; }
    else if (String(y).length === 2) y = 2000 + +y;
    const dt = new Date(+y, mo - 1, d);
    if (dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  function setRange(t, von, bis) {
    t.von = von || ""; t.bis = bis || "";
    if (t.von && t.bis && t.bis < t.von) [t.von, t.bis] = [t.bis, t.von];
    if (t.von && t.bis) t.tage = dayDiff(t.von, t.bis) + 1;
  }

  function renderCal(t) {
    const month = cal.month || (t.von || todayISO()).slice(0, 7);
    const [y, m] = month.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const offset = (first.getDay() + 6) % 7; // Montag zuerst
    const start = new Date(y, m - 1, 1 - offset);
    const today = todayISO();
    let cells = "";
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const cls = [
        d.getMonth() !== m - 1 ? "other" : "",
        iso === today ? "today" : "",
        iso === t.von ? "start" : "",
        iso === t.bis ? "end" : "",
        t.von && t.bis && iso > t.von && iso < t.bis ? "in" : ""
      ].join(" ");
      cells += `<button type="button" class="cal-day ${cls}" data-act="cal-day" data-d="${iso}" aria-label="${fmtDate(iso, { day: "numeric", month: "long", year: "numeric" })}">${d.getDate()}</button>`;
      if (i === 34 && new Date(start.getFullYear(), start.getMonth(), start.getDate() + 35).getMonth() !== m - 1) break;
    }
    const title = first.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    return `<div class="cal" role="dialog" aria-label="Reisezeitraum wählen">
      <div class="cal-head">
        <button type="button" class="icon-btn" data-act="cal-nav" data-d="-1" aria-label="Vorheriger Monat">‹</button>
        <b>${title}</b>
        <button type="button" class="icon-btn" data-act="cal-nav" data-d="1" aria-label="Nächster Monat">›</button>
      </div>
      <div class="cal-grid">${["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((w) => `<span class="cal-wd">${w}</span>`).join("")}${cells}</div>
      <div class="cal-foot"><span class="muted small">${cal.pick === "von" ? "Anreisetag wählen" : "Jetzt Abreisetag wählen"}</span>
        <button type="button" class="btn sm" data-act="cal-close">Fertig</button></div>
    </div>`;
  }

  // Bearbeitbare Eckdaten eines Urlaubs (Name, Ziel, Reiseart, Zeitraum, Teilnehmende)
  function metaFields(t) {
    const P = PACK();
    return `<div class="meta-grid">
        <label class="field m-name">Name des Urlaubs<input data-bind="name" value="${esc(t.name)}" placeholder="z. B. Roadtrip Alpen 2027"></label>
        <label class="field m-ziel">Wo geht’s hin?<input data-bind="ziel" value="${esc(t.ziel || "")}" placeholder="z. B. Queyras, Lyon, Genua"></label>
        <div class="field m-art"><span>Reiseart <span class="muted" style="font-weight:400">– kombinierbar</span></span>
          <div class="row" style="gap:.35rem">
            ${P.arten.map((a) => `<button class="chip ${t.arten.includes(a.id) ? "on" : ""}" data-act="toggle-art" data-id="${a.id}" aria-pressed="${t.arten.includes(a.id)}">${esc(a.name)}</button>`).join("")}
          </div>
        </div>
        <div class="field m-date">Reisezeitraum
          <div class="date-row">
            <input class="input" data-bind="von" value="${toDE(t.von)}" placeholder="TT.MM.JJJJ" inputmode="numeric" aria-label="Von">
            <span class="muted">–</span>
            <input class="input" data-bind="bis" value="${toDE(t.bis)}" placeholder="TT.MM.JJJJ" inputmode="numeric" aria-label="Bis">
            <button class="btn cal-btn ${cal.open ? "on" : ""}" data-act="cal-toggle" title="Kalender öffnen" aria-label="Kalender öffnen" aria-expanded="${cal.open}">${ICON.calendar}</button>
          </div>
          ${cal.open ? renderCal(t) : ""}
        </div>
        ${!t.von ? `<div class="field m-past"><span>Ohne genaues Datum</span>
          <div class="row" style="gap:.6rem"><label class="check"><input type="checkbox" data-bind="vergangen" ${t.vergangen ? "checked" : ""}> schon gemacht</label>
          <input class="input" data-bind="jahr" value="${esc(t.jahr || "")}" placeholder="Jahr, z. B. 2019" style="width:9em"></div></div>` : ""}
        <div class="trip-grid m-count">
          <label class="field">Tage<input type="number" min="1" max="60" data-bind="tage" value="${t.tage}"></label>
          <label class="field">Teilnehmende<input type="number" min="1" max="12" data-bind="anzahl" value="${t.personen.length}"></label>
        </div>
        <div class="field m-names"><span>Namen <span class="muted" style="font-weight:400">– optional</span></span>
          <div class="names">
            ${t.personen.map((p, i) => `<input class="input" data-pname="${p.id}" value="${esc(p.name)}" placeholder="Person ${i + 1}" maxlength="30" aria-label="Name Person ${i + 1}">`).join("")}
          </div>
        </div>
      </div>`;
  }

  let brush = null; // aktuell gewählte Reiseart zum Markieren der Tage
  function renderTimeline(t) {
    const P = PACK();
    const arts = dayArts(t); const per = daysPer(t); const combo = t.arten.length > 1;
    if (!combo || !t.arten.includes(brush)) brush = t.arten[t.arten.length - 1];
    const cells = arts.map((a, i) => {
      const iso = t.von ? addDays(t.von, i) : "";
      const d = iso ? new Date(iso + "T12:00:00") : null;
      const top = d ? d.toLocaleDateString("de-DE", { weekday: "short" }) : "Tag";
      const num = d ? d.getDate() : i + 1;
      const mon = d && (i === 0 || d.getDate() === 1) ? d.toLocaleDateString("de-DE", { month: "short" }) : "";
      return `<button type="button" class="day-cell art-${a}" data-day="${i}" aria-label="Tag ${i + 1}${iso ? ", " + fmtDate(iso, { weekday: "long", day: "numeric", month: "long" }) : ""}: ${esc(P.arten.find((x) => x.id === a)?.name || a)}"><small>${top}</small><b>${num}</b><small class="mon">${mon || "&nbsp;"}</small></button>`;
    }).join("");
    return `<div class="card card-pad timeline">
      <div class="row" style="margin-bottom:.6rem">
        <h3 class="section-title">Reiseverlauf</h3>
        <span class="muted small" data-tl-summary>${t.tage} ${t.tage === 1 ? "Tag" : "Tage"}${combo ? " · " + t.arten.map((a) => `${per[a]} × ${esc(P.arten.find((x) => x.id === a)?.name || a)}`).join(" · ") : ""}</span>
      </div>
      ${combo ? `<div class="row no-print" style="margin-bottom:.6rem;gap:.4rem"><span class="small muted">Markieren als:</span>
        ${t.arten.map((a) => `<button type="button" class="chip brush art-${a} ${brush === a ? "on" : ""}" data-act="brush" data-id="${a}"><span class="swatch"></span>${esc(P.arten.find((x) => x.id === a)?.name || a)}</button>`).join("")}
        <span class="small muted">– dann auf die Tage tippen oder darüberziehen</span></div>` : ""}
      <div class="days ${combo ? "paintable" : ""}">${cells}</div>
      ${combo ? `<p class="small muted" style="margin:.5rem 0 0">Die Mengen werden je nach Anzahl der Wander- bzw. Stadttage berechnet.</p>`
        : `<p class="small muted no-print" style="margin:.5rem 0 0">Für Kombi-Urlaube eine zweite Reiseart wählen – dann lassen sich die Tage aufteilen.</p>`}
    </div>`;
  }

  function renderPack() {
    const t = trip();
    const P = PACK();
    const el = $("#view-packliste");
    const multi = t.personen.length > 1;
    if (multi && state.ui.viewPerson !== "alle" && !person(t, state.ui.viewPerson)) state.ui.viewPerson = "alle";

    const all = tripItems(t);
    const done = all.filter((i) => ST(t)[i.id] === "gepackt").length;
    const skip = all.filter((i) => ST(t)[i.id] === "weg").length;
    const total = all.length;
    const openShared = multi ? all.filter((i) => isShared(t, i) && !bringers(t, i).length && ST(t)[i.id] !== "weg").length : 0;
    const weight = all.reduce((s, i) => s + (ST(t)[i.id] !== "weg" && i.gewicht && !i.aufgabe ? i.gewicht * qtyOf(t, i) : 0), 0);

    const me = person(t, myId(t));
    const range = t.von ? fmtDate(t.von, { day: "numeric", month: "short", year: "numeric" }) + (t.bis ? " – " + fmtDate(t.bis, { day: "numeric", month: "short", year: "numeric" }) : "") : "";

    el.innerHTML = `
    <div class="pack-layout">
      <aside class="card card-pad trip-card stack">
        <div>
          <div class="print-only small muted">Packliste</div>
          <h2>${esc(tripName(t))}</h2>
          <div class="muted small">${esc(artNames(t))}${range ? " · " + range : ""} · ${t.tage} ${t.tage === 1 ? "Tag" : "Tage"}${multi ? " · " + t.personen.length + " Personen" : ""}</div>
        </div>
        <div class="field"><span>Reiseart <span class="muted" style="font-weight:400">– kombinierbar</span></span>
          <div class="row" style="gap:.35rem">
            ${P.arten.map((a) => `<button class="chip ${t.arten.includes(a.id) ? "on" : ""}" data-act="toggle-art" data-id="${a.id}" aria-pressed="${t.arten.includes(a.id)}">${esc(a.name)}</button>`).join("")}
          </div>
        </div>
        <button class="btn sm no-print" data-act="open-meta" style="align-self:flex-start">${ICON.edit} Zeitraum &amp; Teilnehmende bearbeiten</button>
        ${multi ? `<label class="field no-print">Ich bin
          <select class="input" data-act="set-me"><option value="">– bitte wählen –</option>${t.personen.map((p) => `<option value="${p.id}" ${p.id === myId(t) ? "selected" : ""}>${esc(pname(t, p))}</option>`).join("")}</select></label>` : ""}
        ${multi && !me ? `<div class="whoami no-print">Wähle bei „Ich bin“, wer du bist. Dann siehst du, was du selbst mitbringen musst.</div>` : ""}
      </aside>

      <div class="stack">
        ${renderTimeline(t)}
        <div class="card modules no-print" aria-label="Module">
          ${P.module.map((m) => `<button class="chip ${t.module.includes(m.id) ? "on" : ""}" data-act="toggle-mod" data-id="${m.id}" aria-pressed="${t.module.includes(m.id)}">${esc(m.name)}</button>`).join("")}
          ${state.edit ? `<button class="chip add" data-act="add-mod">${ICON.plus} Modul</button>` : ""}
        </div>

        <div class="card progress-wrap">
          <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${done}">
            <div class="p-done" style="width:${total ? (done / total) * 100 : 0}%"></div>
            <div class="p-skip" style="width:${total ? (skip / total) * 100 : 0}%"></div>
          </div>
          <div class="progress-stats">
            <span><b>${done}</b> von ${total - skip} erledigt</span>
            ${skip ? `<span><b>${skip}</b> bleiben zu Hause</span>` : ""}
            ${openShared ? `<span class="badge warn">${openShared} gemeinsame Items: noch niemand bringt sie mit</span>` : ""}
            ${weight ? `<span>Gewicht ca. <b>${fmtG(weight)}</b></span>` : ""}
            ${total && done === total - skip ? `<span class="badge vegan">Alles gepackt – gute Reise!</span>` : ""}
          </div>
        </div>

        <div class="card toolbar no-print">
          <div class="seg" role="group" aria-label="Gruppieren nach">
            <button data-act="group" data-id="modul" class="${state.ui.groupBy === "modul" ? "on" : ""}">Nach Modul</button>
            <button data-act="group" data-id="phase" class="${state.ui.groupBy === "phase" ? "on" : ""}">Nach Packphase</button>
          </div>
          ${multi ? `<label class="check">Ansicht
            <select class="input" data-act="view-person"><option value="alle">Alle Items</option>${t.personen.map((p) => `<option value="${p.id}" ${state.ui.viewPerson === p.id ? "selected" : ""}>Was bringt ${esc(pname(t, p))} mit?</option>`).join("")}</select></label>` : ""}
          <label class="check"><input type="checkbox" data-act="hide-packed" ${state.ui.hidePacked ? "checked" : ""}> Gepacktes ausblenden</label>
          <label class="check"><input type="checkbox" data-act="hide-opt" ${state.ui.hideOptional ? "checked" : ""}> Optionales ausblenden</label>
          <span class="spacer"></span>
          <button class="btn sm" data-act="share">${ICON.share} Teilen</button>
          <button class="btn sm" data-act="print">${ICON.print} Drucken</button>
          <button class="btn sm danger" data-act="reset">${ICON.reset} Zurücksetzen</button>
        </div>

        <div class="groups">${renderGroups(t)}</div>
      </div>
    </div>`;
  }

  function renderGroups(t) {
    const P = PACK();
    const items = visibleItems(t);
    const groups = [];
    if (state.ui.groupBy === "phase") {
      P.phasen.forEach((ph) => groups.push({ name: ph.name, info: ph.info, items: items.filter((i) => (i.phase || "packen") === ph.id), all: tripItems(t).filter((i) => (i.phase || "packen") === ph.id) }));
    } else {
      P.module.filter((m) => t.module.includes(m.id)).forEach((m) => groups.push({ name: m.name, modul: m.id, items: items.filter((i) => i.modul === m.id), all: tripItems(t).filter((i) => i.modul === m.id) }));
    }
    const html = groups.filter((g) => g.all.length || (state.edit && g.modul)).map((g) => {
      const d = g.all.filter((i) => ST(t)[i.id] === "gepackt").length;
      const s = g.all.filter((i) => ST(t)[i.id] === "weg").length;
      const n = g.all.length - s;
      let list = g.items;
      if (state.ui.hidePacked) list = list.filter((i) => !ST(t)[i.id]);
      let rows = "", lastGrp = null;
      list.forEach((i) => {
        if (state.ui.groupBy === "modul" && i.gruppe && i.gruppe !== lastGrp) { rows += `<li class="subgroup">${esc(i.gruppe)}</li>`; lastGrp = i.gruppe; }
        rows += itemRow(t, i);
      });
      if (!rows && g.all.length) rows = `<li class="item muted small" style="cursor:default">Alles erledigt ✓</li>`;
      return `<section class="card group">
        <div class="group-head"><h3>${esc(g.name)}</h3>${g.info ? `<span class="muted small">${esc(g.info)}</span>` : ""}
          <span class="count">${d}/${n}</span><span class="mini"><i style="width:${n ? (d / n) * 100 : 0}%"></i></span>
          ${state.edit && g.modul ? `<button class="icon-btn" data-act="add-item" data-mod="${g.modul}" title="Item hinzufügen" aria-label="Item hinzufügen">${ICON.plus}</button>` : ""}
        </div>
        <ul class="items">${rows}</ul></section>`;
    }).join("");
    return html || `<div class="card empty">Keine Module gewählt. Wähle oben aus, was auf diese Reise mitkommt.</div>`;
  }

  function itemRow(t, i) {
    const st = ST(t)[i.id];
    const custom = t.menge[i.id] != null;
    const tags = tagsOf(t, i);
    const shared = tags.includes("gemeinsam");
    const who = tags.filter((x) => x !== "gemeinsam");
    const unit = i.einheit ? " " + i.einheit : "×";
    const open = shared && !who.length && t.personen.length > 1;
    const tagHtml = (shared ? `<span class="badge ${open ? "warn" : "shared"}" ${open ? 'title="Noch niemand bringt das mit – über das Tag-Symbol eine Person wählen"' : ""}>gemeinsam${open ? " · wer?" : ""}</span>` : "")
      + who.map((pid) => `<span class="badge person">${esc(pname(t, person(t, pid)))}</span>`).join("");
    const qtyHtml = i.aufgabe ? `<span class="badge todo">To-do</span>`
      : `<span class="qty ${custom ? "custom" : ""}" title="Regel: ${esc(ruleText(i.menge))}${custom ? " · manuell angepasst (Doppelklick = zurück)" : ""}">
          <button data-act="qty" data-id="${i.id}" data-d="-1" aria-label="weniger">−</button><span data-act="qty-reset" data-id="${i.id}">${qtyOf(t, i)}${esc(unit)}</span><button data-act="qty" data-id="${i.id}" data-d="1" aria-label="mehr">+</button>
        </span>`;
    return `<li class="item ${st === "gepackt" ? "done" : ""} ${st === "weg" ? "skip" : ""}" data-act="tick" data-id="${i.id}">
      <span class="tick" role="checkbox" aria-checked="${st === "gepackt"}" tabindex="0" aria-label="${esc(i.name)} erledigt">${ICON.check}</span>
      <div class="i-main">
        <div class="i-name">${esc(i.name)} ${i.optional ? '<span class="badge optional">optional</span>' : ""}</div>
        ${tagHtml ? `<div class="i-tags">${tagHtml}</div>` : ""}
        ${i.notiz ? `<div class="i-note">${esc(i.notiz)}</div>` : ""}
      </div>
      <div class="i-side">
        ${qtyHtml}
        <button class="icon-btn tag-btn ${tags.length ? "has" : ""}" data-act="tags" data-id="${i.id}" title="Tags: gemeinsam / Personen" aria-label="Tags für ${esc(i.name)}">${ICON.tag}</button>
        <button class="icon-btn skip-btn" data-act="skip" data-id="${i.id}" title="${st === "weg" ? "Doch mitnehmen" : "Bleibt diesmal zu Hause"}" aria-label="Bleibt zu Hause">${ICON.skip}</button>
        ${state.edit ? `<button class="icon-btn" data-act="edit-item" data-id="${i.id}" title="Bearbeiten" aria-label="Bearbeiten">${ICON.edit}</button>` : ""}
      </div></li>`;
  }

  // ----- Tags setzen -----
  function openTags(id) {
    const t = trip(); const it = PACK().items.find((x) => x.id === id); if (!it) return;
    const body = () => {
      const tags = tagsOf(t, it);
      const chip = (val, label) => `<button type="button" class="chip ${tags.includes(val) ? "on" : ""}" data-tag="${val}" aria-pressed="${tags.includes(val)}">${esc(label)}</button>`;
      return `<div class="row" style="gap:.4rem">${chip("gemeinsam", "gemeinsam")}${t.personen.map((p) => chip(p.id, pname(t, p))).join("")}</div>
        <div class="hint" style="margin-top:.9rem;line-height:1.5">
          <b>Kein Tag:</b> jede Person packt ihr eigenes.<br>
          <b>Person:</b> nur diese Person braucht bzw. bringt es.<br>
          <b>gemeinsam + Person:</b> eins für alle – diese Person bringt es mit.</div>
        ${t.personen.length < 2 ? `<p class="hint">Unter „Teilnehmende“ weitere Personen hinzufügen, um Items zuzuweisen.</p>` : ""}`;
    };
    openModal({
      title: "Tags · " + it.name,
      body: `<div id="tagBody">${body()}</div>`,
      foot: `<button class="btn" data-tagreset>Standard</button><span class="spacer"></span><button class="btn primary" data-close>Fertig</button>`,
      onMount: (m) => {
        const box = $("#tagBody", m);
        box.addEventListener("click", (e) => {
          const b = e.target.closest("[data-tag]"); if (!b) return;
          const cur = tagsOf(t, it); const v = b.dataset.tag;
          t.tags[id] = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
          box.innerHTML = body(); commit();
        });
        $("[data-tagreset]", m).addEventListener("click", () => { delete t.tags[id]; box.innerHTML = body(); commit(); });
      }
    });
  }

  // ----- Packliste: Ereignisse -----
  function setPersonCount(t, n) {
    n = Math.max(1, Math.min(12, n || 1));
    while (t.personen.length < n) t.personen.push({ id: uid(), name: "" });
    if (t.personen.length > n) {
      const removed = t.personen.slice(n).map((p) => p.id);
      t.personen = t.personen.slice(0, n);
      Object.keys(t.tags).forEach((k) => { t.tags[k] = t.tags[k].filter((x) => !removed.includes(x)); });
      if (removed.includes(state.me[t.id])) setMe(t, n === 1 ? t.personen[0].id : null);
    }
    if (n === 1) setMe(t, t.personen[0].id);
  }

  function onPackClick(e) {
    const a = e.target.closest("[data-act]"); if (!a) return;
    const t = trip(); const id = a.dataset.id; const act = a.dataset.act;
    if (a.tagName === "SELECT" || (a.tagName === "INPUT" && a.type !== "button")) return;
    switch (act) {
      case "tick": if (ST(t)[id] === "gepackt") delete ST(t)[id]; else ST(t)[id] = "gepackt"; break;
      case "skip": e.stopPropagation(); if (ST(t)[id] === "weg") delete ST(t)[id]; else ST(t)[id] = "weg"; break;
      case "tags": e.stopPropagation(); return openTags(id);
      case "qty": {
        e.stopPropagation();
        const it = PACK().items.find((x) => x.id === id);
        t.menge[id] = Math.max(0, qtyOf(t, it) + (+a.dataset.d));
        if (t.menge[id] === autoQty(t, it)) delete t.menge[id];
        break;
      }
      case "qty-reset": e.stopPropagation(); return;
      case "toggle-art": {
        const P = PACK();
        if (t.arten.includes(id)) {
          if (t.arten.length === 1) return toast("Mindestens eine Reiseart muss gewählt sein.");
          t.arten = t.arten.filter((x) => x !== id);
          const keep = new Set(presetModules(t.arten));
          const drop = new Set((P.arten.find((x) => x.id === id)?.module || []).filter((m) => !keep.has(m)));
          t.module = t.module.filter((m) => !drop.has(m));
        } else {
          t.arten = P.arten.map((x) => x.id).filter((x) => x === id || t.arten.includes(x));
          const add = presetModules([id]);
          t.module = P.module.map((m) => m.id).filter((m) => t.module.includes(m) || add.includes(m));
        }
        break;
      }
      case "cal-toggle":
        cal.open = !cal.open;
        if (cal.open) { cal.pick = t.von && !t.bis ? "bis" : "von"; cal.month = (t.von || todayISO()).slice(0, 7); }
        break;
      case "cal-nav": {
        const [y, m] = (cal.month || todayISO().slice(0, 7)).split("-").map(Number);
        const d = new Date(y, m - 1 + (+a.dataset.d), 1);
        cal.month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return render();
      }
      case "cal-day": {
        const d = a.dataset.d;
        if (cal.pick === "von") { setRange(t, d, ""); cal.pick = "bis"; }
        else if (d < t.von) { setRange(t, d, ""); cal.pick = "bis"; }
        else { setRange(t, t.von, d); cal.open = false; cal.pick = "von"; }
        break;
      }
      case "cal-close":
        cal.open = false;
        if (t.von && !t.bis) t.bis = addDays(t.von, t.tage - 1);
        break;
      case "brush": brush = id; break;
      case "open-meta": state.ui.metaOpen = true; location.hash = "plan"; return;
      case "toggle-mod": t.module = t.module.includes(id) ? t.module.filter((m) => m !== id) : [...t.module, id]; break;
      case "group": state.ui.groupBy = id; break;
      case "new-trip": return window.PL.openNewUrlaub ? window.PL.openNewUrlaub() : null;
      case "dup-trip": { const c = clone(t); c.id = uid(); c.name = tripName(t) + " (Kopie)"; c.status = {}; state.trips[c.id] = c; state.current = c.id; toast("Trip dupliziert – Haken sind zurückgesetzt."); break; }
      case "del-trip": if (!armed(a, "Wirklich löschen?")) return; delete state.trips[t.id]; state.current = null; toast("Trip gelöscht."); break;
      case "reset": if (!armed(a, "Alle Haken entfernen?")) return; t.status[myId(t) || "_"] = {}; toast("Alle Haken zurückgesetzt."); break;
      case "print": doPrint(); return;
      case "share": return window.PL.openInvite ? window.PL.openInvite(t) : null;
      case "add-item": return openItemEditor(null, a.dataset.mod);
      case "edit-item": e.stopPropagation(); return openItemEditor(id);
      case "add-mod": return askName("Neues Modul", "", (name) => {
        const P = editable("pack"); const mid = slug(name);
        if (!P.module.find((m) => m.id === mid)) P.module.push({ id: mid, name });
        if (!t.module.includes(mid)) t.module.push(mid); commit();
      });
      default: return;
    }
    commit();
  }
  function onPackChange(e) {
    const t = trip(); const a = e.target;
    if (a.dataset.pname) { const p = person(t, a.dataset.pname); if (p) p.name = niceName(a.value); return commit(); }
    if (a.dataset.bind) {
      const k = a.dataset.bind;
      if (k === "name") t.name = a.value.trim();
      if (k === "ziel") t.ziel = a.value.trim();
      if (k === "vergangen") t.vergangen = a.checked;
      if (k === "jahr") t.jahr = a.value.trim();
      if (k === "tage") { t.tage = Math.max(1, Math.min(60, parseInt(a.value) || 1)); if (t.von) t.bis = addDays(t.von, t.tage - 1); }
      if (k === "anzahl") setPersonCount(t, parseInt(a.value));
      if (k === "von" || k === "bis") {
        const v = parseDE(a.value);
        if (v === null) { toast("Datum nicht erkannt – bitte als TT.MM.JJJJ eingeben."); return render(); }
        if (k === "von") { const bis = t.bis && v && t.bis >= v ? t.bis : (v ? addDays(v, t.tage - 1) : t.bis); setRange(t, v, bis); }
        else setRange(t, t.von, v);
        if (t.von) cal.month = t.von.slice(0, 7);
      }
      return commit();
    }
    switch (a.dataset.act) {
      case "switch-trip": state.current = a.value; state.ui.viewPerson = "alle"; cal.open = false; break;
      case "set-me": setMe(t, a.value || null); if (a.value) state.ui.viewPerson = a.value; break;
      case "view-person": state.ui.viewPerson = a.value; break;
      case "hide-packed": state.ui.hidePacked = a.checked; break;
      case "hide-opt": state.ui.hideOptional = a.checked; break;
      default: return;
    }
    commit();
  }
  // Kalender schließen, wenn außerhalb geklickt wird
  document.addEventListener("click", (e) => {
    if (!cal.open || !document.body.contains(e.target)) return;
    if (e.target.closest(".cal, [data-act=cal-toggle], .date-row")) return;
    cal.open = false; const t = trip(); if (t.von && !t.bis) { t.bis = addDays(t.von, t.tage - 1); store.save(); }
    render();
  });

  function askName(title, value, cb) {
    openModal({
      title,
      body: `<form id="nameForm"><label class="field">Name<input name="n" value="${esc(value)}" required maxlength="40"></label></form>`,
      foot: `<button class="btn" data-close>Abbrechen</button><button class="btn primary" form="nameForm">Speichern</button>`,
      onMount: (m) => $("#nameForm", m).addEventListener("submit", (e) => {
        e.preventDefault(); const v = e.target.n.value.trim(); if (!v) return; closeModal(); cb(v);
      })
    });
  }

  function openNewTrip() {
    const P = PACK();
    openModal({
      title: "Neuer Trip",
      body: `<form id="tripForm" class="form-grid">
        <label class="field c6">Tripname<input name="name" placeholder="z. B. West Highland Way"></label>
        <div class="field c4">Reiseart (kombinierbar)
          <div class="row">${P.arten.map((a, i) => `<label class="check"><input type="checkbox" name="art" value="${a.id}" ${i === 0 ? "checked" : ""}> ${esc(a.name)}</label>`).join("")}</div></div>
        <label class="field c2">Teilnehmende<input type="number" name="anzahl" min="1" max="12" value="1"></label>
        <p class="hint c6">Zeitraum, Namen und Module stellst du danach direkt in der Packliste ein.</p>
      </form>`,
      foot: `<button class="btn" data-close>Abbrechen</button><button class="btn primary" form="tripForm">Anlegen</button>`,
      onMount: (m) => $("#tripForm", m).addEventListener("submit", (e) => {
        e.preventDefault(); const f = e.target;
        const arten = $$("input[name=art]:checked", f).map((x) => x.value);
        const t = newTrip(arten.length ? arten : [P.arten[0].id]);
        t.name = f.name.value.trim();
        setPersonCount(t, parseInt(f.anzahl.value));
        state.trips[t.id] = t; state.current = t.id; state.ui.viewPerson = "alle";
        closeModal(); commit(); toast(`„${tripName(t)}“ angelegt.`);
      })
    });
  }

  // ----- Kopieren -----
  async function copyText(text, ok) {
    try { await navigator.clipboard.writeText(text); toast(ok); }
    catch { const ta = $("#modalRoot textarea"); if (ta) ta.select(); toast("Kopieren nicht erlaubt – Text ist markiert, bitte Strg/Cmd + C."); }
  }
  function doPrint() {
    try { window.print(); } catch { toast("Drucken ist hier blockiert – öffne die Seite direkt im Browser."); }
  }

  // ----- Item-Editor -----
  function openItemEditor(id, modul) {
    const P = PACK();
    const it = id ? P.items.find((x) => x.id === id) : { name: "", modul, phase: "packen", menge: { basis: 1 } };
    const m = it.menge || {};
    const ruleFields = (prefix, r, ph) => `
      <label class="field c2">Basis-Menge<input type="number" step="1" min="0" name="${prefix}basis" value="${r ? r.basis ?? "" : ""}" placeholder="${ph ? "wie oben" : ""}"></label>
      <label class="field c2">pro Reisetag<input type="number" step="any" min="0" name="${prefix}proTag" value="${r ? r.proTag ?? "" : ""}" placeholder="${ph ? "wie oben" : "0 = fest"}"></label>
      <label class="field c2">Obergrenze<input type="number" step="1" min="0" name="${prefix}max" value="${r ? r.max ?? "" : ""}" placeholder="${ph ? "wie oben" : "keine"}"></label>`;
    openModal({
      title: id ? "Item bearbeiten" : "Neues Item", wide: true,
      body: `<form id="itemForm" class="form-grid">
        <label class="field c4">Name<input name="name" value="${esc(it.name)}" required></label>
        <label class="field c2">Einheit<input name="einheit" value="${esc(it.einheit || "")}" placeholder="Paar, Pack …"></label>
        <label class="field c3">Modul<select name="modul">${P.module.map((x) => `<option value="${x.id}" ${x.id === it.modul ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>
        <label class="field c3">Unterüberschrift<input name="gruppe" value="${esc(it.gruppe || "")}" placeholder="z. B. Campoutfit"></label>
        <div class="c6 row"><label class="check"><input type="checkbox" name="aufgabe" ${it.aufgabe ? "checked" : ""}> To-do statt Gegenstand (ohne Menge)</label></div>
        <h4 class="c6 form-sub">Menge (Standard)</h4>
        ${ruleFields("", m, false)}
        ${P.arten.map((a) => `<h4 class="c6 form-sub">Abweichend bei ${esc(a.name)} <span class="muted" style="font-weight:400;text-transform:none;letter-spacing:0">– leer lassen = Standard</span></h4>${ruleFields(a.id + "_", it.mengeJe && it.mengeJe[a.id], true)}`).join("")}
        <p class="hint c6" id="qtyPreview"></p>
        <label class="field c2">Packphase<select name="phase">${P.phasen.map((p) => `<option value="${p.id}" ${p.id === (it.phase || "packen") ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>
        <label class="field c2">Gewicht (g/Stück)<input type="number" min="0" name="gewicht" value="${it.gewicht ?? ""}"></label>
        <div class="field c2">Nur bei Reiseart<div class="row">${P.arten.map((a) => `<label class="check"><input type="checkbox" name="arten" value="${a.id}" ${it.arten && it.arten.includes(a.id) ? "checked" : ""}> ${esc(a.name)}</label>`).join("")}</div><span class="muted" style="font-weight:400">nichts gewählt = bei allen</span></div>
        <label class="field c6">Notiz<input name="notiz" value="${esc(it.notiz || "")}"></label>
        <div class="c6 row">
          <label class="check"><input type="checkbox" name="geteilt" ${it.geteilt ? "checked" : ""}> Standardmäßig Tag „gemeinsam“</label>
          <label class="check"><input type="checkbox" name="optional" ${it.optional ? "checked" : ""}> Optional</label>
        </div>
      </form>`,
      foot: `${id ? `<button class="btn danger" data-del>Löschen</button><span class="spacer"></span>` : ""}<button class="btn" data-close>Abbrechen</button><button class="btn primary" form="itemForm">Speichern</button>`,
      onMount: (mod) => {
        const f = $("#itemForm", mod);
        const readRule = (prefix) => {
          const b = f[prefix + "basis"].value, p = f[prefix + "proTag"].value, x = f[prefix + "max"].value;
          if (prefix && b === "" && p === "" && x === "") return null;
          const r = { basis: b === "" ? 1 : +b };
          if (+p) { r.proTag = +p; if (x !== "") r.max = +x; }
          return r;
        };
        const build = () => {
          const tmp = { menge: readRule(""), mengeJe: {} };
          P.arten.forEach((a) => { const r = readRule(a.id + "_"); if (r) tmp.mengeJe[a.id] = r; });
          return tmp;
        };
        const prev = () => {
          const tmp = build();
          $("#qtyPreview", mod).innerHTML = "Vorschau: " + P.arten.map((a) => `<b>${esc(a.name)}</b> ` + [1, 3, 5, 7, 10, 14].map((d) => `${d} T → ${calcQty(tmp, d, [a.id])}`).join(" · ")).join("<br>");
        };
        f.addEventListener("input", prev); prev();
        f.addEventListener("submit", (e) => {
          e.preventDefault();
          const D = editable("pack");
          const item = id ? D.items.find((x) => x.id === id) : { id: slug(f.name.value) + "-" + uid().slice(0, 3) };
          const tmp = build();
          item.name = f.name.value.trim(); item.modul = f.modul.value;
          const set = (k, v) => { if (v === "" || v == null || v === false || (Array.isArray(v) && !v.length)) delete item[k]; else item[k] = v; };
          set("einheit", f.einheit.value.trim()); set("gruppe", f.gruppe.value.trim()); set("notiz", f.notiz.value.trim());
          set("phase", f.phase.value); set("geteilt", f.geteilt.checked); set("optional", f.optional.checked); set("aufgabe", f.aufgabe.checked);
          set("gewicht", f.gewicht.value === "" ? "" : +f.gewicht.value);
          set("arten", $$("input[name=arten]:checked", f).map((x) => x.value));
          item.menge = tmp.menge;
          set("mengeJe", Object.keys(tmp.mengeJe).length ? tmp.mengeJe : "");
          if (!id) D.items.push(item);
          closeModal(); commit(); toast("Gespeichert (nur in diesem Browser).");
        });
        const del = $("[data-del]", mod);
        if (del) del.addEventListener("click", () => {
          if (!armed(del, "Wirklich löschen?")) return;
          const D = editable("pack"); D.items = D.items.filter((x) => x.id !== id);
          closeModal(); commit(); toast("Item gelöscht.");
        });
      }
    });
  }
  // =========================================================
  //  ESSENSPLANER
  // =========================================================
  const MEALS = [
    { k: "f", id: "fruehstueck", name: "Frühstück" },
    { k: "s", id: "snack", name: "Snacks" },
    { k: "d", id: "dinner", name: "Dinner" }
  ];
  const DIAET_RANK = { vegan: 0, vegetarisch: 1, fisch: 2, fleisch: 3 };
  const DIAET_LABEL = { vegan: "vegan", vegetarisch: "vegetarisch", fisch: "mit Fisch", fleisch: "mit Fleisch" };
  const zut = (id) => REZ().zutaten.find((z) => z.id === id);
  const rez = (id) => REZ().rezepte.find((r) => r.id === id);
  function recipeInfo(r) {
    let g = 0, kcal = 0, rank = 0;
    r.zutaten.forEach(({ z, g: gr }) => { const Z = zut(z); g += gr; if (Z) { kcal += (Z.kcal || 0) * gr / 100; rank = Math.max(rank, DIAET_RANK[Z.diaet] ?? 0); } });
    return { g, kcal: Math.round(kcal), diaet: Object.keys(DIAET_RANK)[rank] };
  }
  const diaetOk = (r, filter) => filter === "alle" || DIAET_RANK[recipeInfo(r).diaet] <= ({ vegan: 0, vegetarisch: 1, pesce: 2 }[filter] ?? 3);

  const wanderTage = (t) => (t.arten.includes("wandern") ? (t.arten.length > 1 ? daysPer(t).wandern : t.tage) || 1 : t.tage);
  function essen() {
    const t = trip();
    if (!t.essen) t.essen = { tage: wanderTage(t), personen: t.personen.length, snacks: 2, ohneStart: true, ohneEnde: true, diaet: "alle", plan: [] };
    const e = t.essen;
    while (e.plan.length < e.tage) e.plan.push({ f: "", s: Array(e.snacks).fill(""), d: "" });
    e.plan.length = e.tage;
    return e;
  }
  const slotOff = (e, i, k) => (k === "f" && i === 0 && e.ohneStart) || (k === "d" && i === e.tage - 1 && e.ohneEnde);

  function renderEssen() {
    const t = trip(); const e = essen();
    const el = $("#view-essen");
    const R = REZ().rezepte.filter((r) => diaetOk(r, e.diaet));
    const opts = (type, sel) => `<option value="">– Gericht wählen –</option>` + R.filter((r) => r.mahlzeit === type).map((r) => `<option value="${r.id}" ${r.id === sel ? "selected" : ""}>${esc(r.name)}</option>`).join("");

    const rows = e.plan.map((day, i) => {
      const date = t.von ? fmtDate(addDays(t.von, i), { weekday: "short", day: "2-digit", month: "2-digit" }) : "";
      const cell = (k, type, label) => {
        if (slotOff(e, i, k)) return `<span class="slot-auto">${i === 0 ? "Anreise – kein Frühstück" : "Abreise – kein Dinner"}</span>`;
        const v = day[k];
        if (v === null) return `<button class="slot-off" data-act="slot-on" data-i="${i}" data-k="${k}">${ICON.plus} ${label}</button>`;
        return `<div class="slot"><select data-act="pick" data-i="${i}" data-k="${k}" class="${v ? "" : "empty-sel"}" aria-label="${label} Tag ${i + 1}">${opts(type, v)}</select>
          <button class="icon-btn" data-act="slot-off" data-i="${i}" data-k="${k}" title="Mahlzeit entfernen" aria-label="${label} entfernen">${ICON.close}</button></div>`;
      };
      const snacks = day.s.map((v, j) => `<div class="slot"><select data-act="pick-s" data-i="${i}" data-j="${j}" class="${v ? "" : "empty-sel"}" aria-label="Snack ${j + 1} Tag ${i + 1}">${opts("snack", v)}</select>
          <button class="icon-btn" data-act="snack-del" data-i="${i}" data-j="${j}" title="Snack entfernen" aria-label="Snack entfernen">${ICON.close}</button></div>`).join("")
        + `<button class="slot-off" data-act="snack-add" data-i="${i}">${ICON.plus} Snack</button>`;
      return `<tr><td><div class="day-label">Tag ${i + 1}<small>${date}</small></div></td>
        <td data-label="Frühstück">${cell("f", "fruehstueck", "Frühstück")}</td>
        <td data-label="Snacks">${snacks}</td>
        <td data-label="Dinner">${cell("d", "dinner", "Dinner")}</td></tr>`;
    }).join("");

    el.innerHTML = `
      <div class="card card-pad" style="margin-bottom:1rem">
        <div class="row" style="margin-bottom:.8rem"><h2 class="section-title">Essensplaner <span class="muted small" style="font-family:var(--font-body);font-weight:400">für „${esc(tripName(t))}“</span></h2></div>
        <div class="essen-settings">
          <label class="field">Wandertage<input type="number" min="1" max="30" data-e="tage" value="${e.tage}"></label>
          <label class="field">Personen<input type="number" min="1" max="12" data-e="personen" value="${e.personen}"></label>
          <label class="field">Snacks pro Tag<input type="number" min="0" max="5" data-e="snacks" value="${e.snacks}"></label>
          <label class="field">Ernährung<select data-e="diaet">
            ${[["alle", "alles"], ["pesce", "pescetarisch"], ["vegetarisch", "vegetarisch"], ["vegan", "vegan"]].map(([v, l]) => `<option value="${v}" ${e.diaet === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
          ${wanderTage(t) !== e.tage ? `<button class="btn sm" data-act="take-days" title="Wandertage aus dem Reiseverlauf übernehmen">Reiseverlauf: ${wanderTage(t)} Wandertage übernehmen</button>` : ""}
          <label class="check"><input type="checkbox" data-e="ohneStart" ${e.ohneStart ? "checked" : ""}> Starttag ohne Frühstück</label>
          <label class="check"><input type="checkbox" data-e="ohneEnde" ${e.ohneEnde ? "checked" : ""}> Letzter Tag ohne Dinner</label>
        </div>
        <div class="row no-print" style="margin-top:.9rem">
          <button class="btn primary sm" data-act="autofill">${ICON.wand} Leere Plätze automatisch füllen</button>
          <button class="btn sm" data-act="restore">Entfernte Mahlzeiten zurückholen</button>
          <button class="btn sm danger" data-act="clear">Plan leeren</button>
          <span class="spacer"></span>
          <button class="btn sm" data-act="print">${ICON.print} Drucken</button>
        </div>
      </div>
      <div class="essen-layout">
        <div class="card" style="overflow:hidden">
          <table class="plan"><thead><tr><th>Tag</th><th>Frühstück</th><th>Snacks</th><th>Dinner</th></tr></thead><tbody>${rows}</tbody></table>
        </div>
        <aside class="card card-pad summary">${renderSummary(e)}</aside>
      </div>`;
  }

  function renderSummary(e) {
    const totals = {}; const bags = []; let kcal = 0, meals = 0, open = 0, water = 0;
    const add = (rid, label, i) => {
      if (!rid) { open++; return; }
      const r = rez(rid); if (!r) return;
      meals++; water += (r.wasser || 0) * e.personen;
      r.zutaten.forEach(({ z, g }) => { totals[z] = (totals[z] || 0) + g * e.personen; });
      kcal += recipeInfo(r).kcal * e.personen;
      bags.push({ i, label, name: r.name });
    };
    e.plan.forEach((day, i) => {
      if (!slotOff(e, i, "f") && day.f !== null) add(day.f, "Frühstück", i);
      day.s.forEach((v) => add(v, "Snack", i));
      if (!slotOff(e, i, "d") && day.d !== null) add(day.d, "Dinner", i);
    });
    const weight = Object.values(totals).reduce((a, b) => a + b, 0);
    const kcalPP = e.tage && e.personen ? Math.round(kcal / e.personen / e.tage) : 0;
    const cats = REZ().kategorien;
    const byCat = cats.map((c) => ({ c, list: Object.entries(totals).map(([id, g]) => ({ Z: zut(id), g })).filter((x) => x.Z && x.Z.kat === c.id).sort((a, b) => b.g - a.g) })).filter((x) => x.list.length);
    const dehyd = Object.entries(totals).map(([id, g]) => ({ Z: zut(id), g })).filter((x) => x.Z && x.Z.herkunft === "dehydrieren");
    const fresh = Object.entries(totals).map(([id, g]) => ({ Z: zut(id), g })).filter((x) => x.Z && x.Z.herkunft === "frisch");

    const bagMap = {};
    bags.forEach((b) => { const k = b.label + "|" + b.name; bagMap[k] = (bagMap[k] || 0) + 1; });

    return `
      <div class="kpis">
        <div class="kpi"><b>${meals}</b><span>Mahlzeiten geplant${open ? ` · <span style="color:var(--rust)">${open} offen</span>` : ""}</span></div>
        <div class="kpi"><b>${fmtG(weight)}</b><span>Essen gesamt (${e.personen} P.)</span></div>
        <div class="kpi"><b>${kcalPP.toLocaleString("de-DE")}</b><span>kcal / Person / Tag (ca.)</span></div>
        <div class="kpi"><b>${(water / Math.max(1, e.tage) / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} l</b><span>Kochwasser / Tag</span></div>
      </div>
      ${weight ? `<div class="shop">
        <h4>Einkaufs- &amp; Vorbereitungsliste</h4>
        ${byCat.map(({ c, list }) => `<h4><span class="dot ${c.id}"></span>${esc(c.name)}</h4><ul>${list.map(({ Z, g }) => `<li><span>${esc(Z.name)}</span> ${Z.herkunft !== "kaufen" ? `<span class="badge ${Z.herkunft}">${Z.herkunft === "dehydrieren" ? "selbst trocknen" : "frisch"}</span>` : ""}<span class="amt">${fmtG(g)}</span></li>`).join("")}</ul>`).join("")}
        ${dehyd.length ? `<h4>Dehydrier-Batches</h4><ul>${dehyd.map(({ Z, g }) => `<li><span>${esc(Z.name)} <span class="muted small">${esc(Z.vorbereitung || "")}</span></span><span class="amt">${fmtG(g)}</span></li>`).join("")}</ul>` : ""}
        ${fresh.length ? `<h4>Kurz vor Abreise frisch besorgen</h4><ul>${fresh.map(({ Z, g }) => `<li><span>${esc(Z.name)}</span><span class="amt">${fmtG(g)}</span></li>`).join("")}</ul>` : ""}
        <h4>Beutel packen</h4>
        <ul class="bags">${Object.entries(bagMap).sort((a, b) => ["Frühstück", "Snack", "Dinner"].indexOf(a[0].split("|")[0]) - ["Frühstück", "Snack", "Dinner"].indexOf(b[0].split("|")[0])).map(([k, n]) => { const [l, name] = k.split("|"); return `<li><span>${esc(name)} <span class="muted small">${esc(l)}</span></span><span class="amt">${n}× à ${e.personen} Port.</span></li>`; }).join("")}</ul>
      </div>` : `<p class="muted small" style="margin-top:1rem">Wähle Gerichte im Plan oder klicke auf „automatisch füllen“ – hier erscheinen dann Einkaufsliste, Dehydrier-Batches und Beutel.</p>`}`;
  }

  function onEssenClick(ev) {
    const a = ev.target.closest("[data-act]"); if (!a || a.tagName === "SELECT") return;
    const e = essen(); const i = +a.dataset.i; const k = a.dataset.k;
    switch (a.dataset.act) {
      case "slot-off": e.plan[i][k] = null; break;
      case "slot-on": e.plan[i][k] = ""; break;
      case "snack-del": e.plan[i].s.splice(+a.dataset.j, 1); break;
      case "snack-add": e.plan[i].s.push(""); break;
      case "take-days": e.tage = wanderTage(trip()); essen(); break;
      case "autofill": autofill(e); toast("Leere Plätze gefüllt – einzelne Gerichte kannst du jederzeit tauschen."); break;
      case "restore": e.plan.forEach((d) => { if (d.f === null) d.f = ""; if (d.d === null) d.d = ""; while (d.s.length < e.snacks) d.s.push(""); }); break;
      case "clear": if (!armed(a, "Wirklich leeren?")) return; e.plan = []; essen(); break;
      case "print": doPrint(); return;
      default: return;
    }
    commit();
  }
  function onEssenChange(ev) {
    const a = ev.target; const e = essen();
    if (a.dataset.e) {
      const k = a.dataset.e;
      if (k === "tage") e.tage = Math.max(1, Math.min(30, parseInt(a.value) || 1));
      else if (k === "personen") e.personen = Math.max(1, Math.min(12, parseInt(a.value) || 1));
      else if (k === "snacks") { const n = Math.max(0, Math.min(5, parseInt(a.value) || 0)); e.snacks = n; e.plan.forEach((d) => { d.s = d.s.slice(0, n); while (d.s.length < n) d.s.push(""); }); }
      else if (k === "diaet") e.diaet = a.value;
      else e[k] = a.checked;
      return commit();
    }
    if (a.dataset.act === "pick") e.plan[+a.dataset.i][a.dataset.k] = a.value;
    if (a.dataset.act === "pick-s") e.plan[+a.dataset.i].s[+a.dataset.j] = a.value;
    commit();
  }
  function autofill(e) {
    const pools = {};
    ["fruehstueck", "snack", "dinner"].forEach((m) => { pools[m] = REZ().rezepte.filter((r) => r.mahlzeit === m && diaetOk(r, e.diaet)).map((r) => r.id); });
    // Zähler so, dass sich Gerichte möglichst wenig wiederholen
    const used = {};
    e.plan.forEach((d) => { [d.f, d.d, ...d.s].forEach((v) => { if (v) used[v] = (used[v] || 0) + 1; }); });
    const pick = (m, avoid) => {
      const pool = pools[m]; if (!pool.length) return "";
      const sorted = [...pool].sort((a, b) => (used[a] || 0) - (used[b] || 0) || Math.random() - .5);
      const c = sorted.find((x) => !avoid.includes(x)) || sorted[0];
      used[c] = (used[c] || 0) + 1; return c;
    };
    e.plan.forEach((d, i) => {
      if (d.f === "" && !slotOff(e, i, "f")) d.f = pick("fruehstueck", [e.plan[i - 1]?.f]);
      d.s = d.s.map((v, j) => v || pick("snack", [d.s[j - 1]]));
      if (d.d === "" && !slotOff(e, i, "d")) d.d = pick("dinner", [e.plan[i - 1]?.d]);
    });
  }

  // =========================================================
  //  WANDERGERICHTE (Rezepte & Register)
  // =========================================================
  const MEAL_LABEL = { fruehstueck: "Frühstück", snack: "Snack", dinner: "Dinner" };
  function renderRezepte() {
    const el = $("#view-rezepte");
    const D = REZ(); const f = state.ui.rFilter;
    const bases = [...new Set(D.rezepte.map((r) => r.basis))].sort();
    const sub = state.ui.rSub;
    const head = `<div class="card filters">
      <div class="seg" role="group"><button data-act="rsub" data-id="gerichte" class="${sub === "gerichte" ? "on" : ""}">Gerichte (${D.rezepte.length})</button><button data-act="rsub" data-id="register" class="${sub === "register" ? "on" : ""}">Zutaten-Register (${D.zutaten.length})</button></div>
      ${sub === "gerichte" ? `
        <div class="seg" role="group">${["alle", "fruehstueck", "snack", "dinner"].map((m) => `<button data-act="rmeal" data-id="${m}" class="${f.mahlzeit === m ? "on" : ""}">${m === "alle" ? "Alle" : MEAL_LABEL[m]}</button>`).join("")}</div>
        <select class="input" data-rf="basis" aria-label="Basis"><option value="alle">Jede Basis</option>${bases.map((b) => `<option ${f.basis === b ? "selected" : ""}>${esc(b)}</option>`).join("")}</select>
        <select class="input" data-rf="diaet" aria-label="Ernährung">${[["alle", "Alles"], ["pesce", "Pescetarisch"], ["vegetarisch", "Vegetarisch"], ["vegan", "Vegan"]].map(([v, l]) => `<option value="${v}" ${f.diaet === v ? "selected" : ""}>${l}</option>`).join("")}</select>
        <input class="input" type="search" data-rf="q" placeholder="Suchen, z. B. Couscous, Dashi …" value="${esc(f.q)}">` : ""}
      <span class="spacer"></span>
      ${sub === "gerichte" ? `<button class="btn primary sm" data-act="freestyle">${ICON.wand} Freestyle-Gericht bauen</button>` : ""}
      ${state.edit ? (sub === "gerichte" ? `<button class="btn sm" data-act="new-rezept">${ICON.plus} Neues Gericht</button>` : `<button class="btn primary sm" data-act="new-zutat">${ICON.plus} Neue Zutat</button>`) : ""}
    </div>`;

    if (sub === "register") {
      const usage = {}; D.rezepte.forEach((r) => r.zutaten.forEach(({ z }) => { usage[z] = (usage[z] || 0) + 1; }));
      el.innerHTML = head + `<p class="muted small" style="margin:.8rem .2rem 0">Der Baukasten: Jedes Wandergericht kombiniert <b>Carbs</b> + <b>Gemüse</b> + <b>Protein</b> + <b>Geschmack</b>. Kennzeichnung: <span class="badge dehydrieren">selbst trocknen</span> <span class="badge frisch">frisch / Dose</span> <span class="badge kaufen">kaufen</span></p>
      <div class="register">${D.kategorien.map((c) => {
        const list = D.zutaten.filter((z) => z.kat === c.id);
        return `<section class="card"><div class="reg-head"><span class="dot ${c.id}"></span><h3 style="font-size:1.05rem">${esc(c.name)}</h3><span class="muted small" style="margin-left:auto">${list.length}</span></div>
          ${list.map((z) => `<div class="reg-item"><div class="top"><span class="name">${esc(z.name)}</span>
            <span class="badge ${z.herkunft}">${z.herkunft === "dehydrieren" ? "selbst trocknen" : z.herkunft === "frisch" ? "frisch / Dose" : "kaufen"}</span>
            <span class="badge ${z.diaet}">${DIAET_LABEL[z.diaet] || ""}</span>
            <span class="muted small">${z.kcal} kcal/100 g · in ${usage[z.id] || 0} Gerichten</span>
            ${state.edit ? `<button class="icon-btn" data-act="edit-zutat" data-id="${z.id}" aria-label="Bearbeiten">${ICON.edit}</button>` : ""}</div>
            ${z.vorbereitung ? `<p>${esc(z.vorbereitung)}</p>` : ""}</div>`).join("")}</section>`;
      }).join("")}</div>`;
      return;
    }

    const q = f.q.trim().toLowerCase();
    const list = D.rezepte.filter((r) => (f.mahlzeit === "alle" || r.mahlzeit === f.mahlzeit) && (f.basis === "alle" || r.basis === f.basis) && diaetOk(r, f.diaet)
      && (!q || (r.name + " " + r.basis + " " + r.zutaten.map(({ z }) => zut(z)?.name || "").join(" ")).toLowerCase().includes(q)));
    const tips = `<details class="card mug-tips" ${state.ui.tipsOpen ? "open" : ""}><summary><b>Eine-Tasse-Küche</b> <span class="muted small">– Tipps, damit nichts anbrennt</span></summary>
      <ul>
        <li><b>Backpapier-Einlage:</b> Für Rührei, Käse oder Püree ein zugeschnittenes Stück Backpapier in die Tasse legen – danach einfach mit dem Essen herausheben.</li>
        <li><b>Ei & Käse zuletzt:</b> Ei- und Käsepulver im Beutel mit einem Schluck Wasser anrühren und erst <i>vom Herd genommen</i> unterrühren. Im heißen Essen stocken sie, am Tassenboden brennen sie an.</li>
        <li><b>Quellen statt kochen:</b> Couscous, Bulgur, Püree und feine Sojaschnetzel brauchen nur heißes Wasser – Tasse vom Herd, abdecken, warten.</li>
        <li><b>Wasser knapp bemessen:</b> Nudeln und Ramen in so wenig Wasser kochen, dass es fast aufgesogen wird – nichts abgießen, die Stärke bindet die Sauce.</li>
        <li><b>Reihenfolge:</b> Erst Wasser für Tee oder Kaffee, dann das Essen. Zum Schluss einen Schluck heißes Wasser in die Tasse, umrühren, austrinken – fast sauber.</li>
      </ul></details>`;
    el.innerHTML = head + tips + (list.length ? `<div class="recipe-grid">${list.map(recipeCard).join("")}</div>` : `<div class="card empty" style="margin-top:1rem">Kein Gericht passt zu diesen Filtern.</div>`);
  }

  function buildStrip(r) {
    const parts = { carbs: [], gemuese: [], protein: [], geschmack: [] };
    r.zutaten.forEach(({ z }) => { const Z = zut(z); if (Z && parts[Z.kat]) parts[Z.kat].push(Z.name.split(/[,(]/)[0].trim()); });
    const lbl = { carbs: "Carbs", gemuese: "Gemüse", protein: "Protein", geschmack: "Geschmack" };
    return `<div class="build">${Object.keys(parts).map((k) => `<div class="${parts[k].length ? k : "none"}"><b>${lbl[k]}</b>${esc(parts[k].slice(0, 2).join(", ") || "–")}</div>`).join("")}</div>`;
  }
  function recipeCard(r) {
    const info = recipeInfo(r);
    return `<button class="card recipe-card" data-act="open-rezept" data-id="${r.id}">
      <div class="recipe-meta"><span class="badge">${MEAL_LABEL[r.mahlzeit]}</span><span class="badge ${info.diaet}">${DIAET_LABEL[info.diaet]}</span>${r.eigen ? '<span class="badge person">eigenes</span>' : ""}<span>${esc(r.basis)}</span></div>
      <h3>${esc(r.name)}</h3>
      ${buildStrip(r)}
      <div class="recipe-stats"><span><b>${info.kcal}</b> kcal</span><span><b>${info.g}</b> g</span>${r.zeit ? `<span><b>${r.zeit}</b> min</span>` : ""}${r.kocher ? "" : "<span>ohne Kocher</span>"}</div>
    </button>`;
  }

  // ----- Werkbank: Gericht ansehen, Zutaten tauschen, Freestyle bauen -----
  const zW = (id) => zut(id)?.wasser || 0;
  const zT = (id) => zut(id)?.zeit || 0;
  const kurzOf = (Z) => Z.kurz || Z.name.split(/[,(]/)[0].trim();
  const roundG = (g) => (g >= 30 ? Math.round(g / 5) * 5 : Math.max(1, Math.round(g)));
  const TOPPING = ["roestzwiebeln", "sesam", "olivenoel"];
  const stepsOf = (u) => (Array.isArray(u) ? u : String(u || "").split(/\n+/)).map((x) => String(x).trim()).filter(Boolean);
  const fmtStep = (txt, wasserTotal, portions) => txt
    .replace(/\{wasser\}/g, `${wasserTotal} ml`)
    .replace(/\{ml:(\d+)\}/g, (_, n) => `${n * portions} ml`);
  const stepsHtml = (u, wasserTotal, portions) => `<ol class="steps">${stepsOf(u).map((x) => `<li>${esc(fmtStep(x, wasserTotal, portions))}</li>`).join("")}</ol>`;

  function computeWork(w) {
    const r = w.base ? rez(w.base) : null;
    const rows = w.rows.filter((x) => zut(x.z));
    const sumW = (list) => list.reduce((s, x) => s + x.g * zW(x.z), 0);
    const maxT = (list) => list.reduce((m, x) => Math.max(m, zT(x.z)), 0);
    let wasser, zeit;
    if (r) {
      wasser = r.wasser - sumW(r.zutaten) + sumW(rows);
      zeit = r.zeit - maxT(r.zutaten) + maxT(rows);
    } else {
      wasser = sumW(rows);
      zeit = maxT(rows) + (wasser > 0 ? 3 : 0);
    }
    wasser = Math.max(0, Math.round(wasser / 10) * 10);
    zeit = Math.max(wasser > 0 ? 3 : 0, Math.round(zeit));
    const info = recipeInfo({ zutaten: rows });
    const swaps = rows.filter((x) => x.orig && x.z !== x.orig).map((x) => ({ from: zut(x.orig), to: zut(x.z) })).filter((s) => s.from && s.to);
    const removed = r ? r.zutaten.filter((o) => !rows.some((x) => x.orig === o.z)).map((o) => zut(o.z)).filter(Boolean) : [];
    const added = rows.filter((x) => !x.orig).map((x) => zut(x.z));
    const modified = !!r && (swaps.length || removed.length || added.length || rows.some((x) => x.orig && x.g !== x.origG));
    const kocher = r ? (r.kocher || wasser > 0) : wasser > 0;
    const sticky = rows.filter((x) => zut(x.z).klebt).map((x) => kurzOf(zut(x.z)));
    const carb = rows.map((x) => zut(x.z)).find((Z) => Z.kat === "carbs");
    const replaceOne = (txt) => swaps.reduce((s, sw) => s.split(kurzOf(sw.from)).join(kurzOf(sw.to)), txt || "");
    const replaceNames = (txt) => (Array.isArray(txt) ? txt.map(replaceOne) : replaceOne(txt));

    // automatische Zubereitung aus den Bausteinen (Freestyle oder wenn die Carb-Basis getauscht wurde)
    const generate = () => {
      const Zs = rows.map((x) => zut(x.z));
      const bagB = Zs.filter((Z) => Z.klebt && Z.kat !== "carbs" && Z.id !== "milchpulver");
      const fresh = Zs.filter((Z) => Z.herkunft === "frisch");
      const tops = Zs.filter((Z) => TOPPING.includes(Z.id) || Z.id === "miso");
      const bagA = Zs.filter((Z) => !bagB.includes(Z) && !fresh.includes(Z) && !tops.includes(Z));
      const list = (arr) => arr.map(kurzOf).join(", ");
      const zh = rows.length ? [
        bagA.length ? `Beutel A: ${list(bagA)}.` : "",
        bagB.length ? `Beutel B: ${list(bagB)} – kommt erst zum Schluss dazu.` : "",
        fresh.length || tops.length ? `Separat: ${list([...fresh, ...tops])}.` : ""
      ].filter(Boolean).join(" ") : "";
      const steps = [];
      if (wasser > 0) {
        steps.push("{wasser} Wasser in der Tasse aufkochen.");
        if (carb && carb.zubereitung) steps.push(`Beutel A dazugeben – ${kurzOf(carb)}: ${carb.zubereitung}.`);
        else steps.push("Beutel A einrühren und abgedeckt 5 min ziehen lassen.");
      } else if (rows.length) steps.push("Kein Kocher nötig – alles zusammen genießen.");
      if (bagB.length) steps.push(`Tasse vom Herd nehmen. Beutel B (${list(bagB)}) mit einem Schluck warmem Wasser im Beutel anrühren und unterheben – so brennt nichts an.`);
      fresh.forEach((Z) => steps.push(`${kurzOf(Z)}: ${Z.zubereitung || "frisch dazugeben"}.`));
      if (tops.length) steps.push(`Zum Schluss ${list(tops)} dazu.`);
      return { zh, uw: steps };
    };
    const origCarb = r ? r.zutaten.map((x) => zut(x.z)).find((Z) => Z && Z.kat === "carbs") : null;
    const carbChanged = !!r && (origCarb?.id || null) !== (carb?.id || null);

    let name, basis, zuhause, unterwegs, auto = false;
    if (r) {
      name = replaceNames(r.name);
      basis = carb ? kurzOf(carb) : r.basis;
      if (carbChanged && r.kocher) { const g = generate(); zuhause = g.zh; unterwegs = g.uw; auto = true; }
      else { zuhause = replaceNames(r.zuhause); unterwegs = replaceNames(stepsOf(r.unterwegs)); }
    } else {
      name = w.name || "Freestyle-Gericht";
      basis = carb ? kurzOf(carb) : "Freestyle";
      const g = generate(); zuhause = g.zh; unterwegs = g.uw;
    }
    return { r, rows, wasser, zeit, info, swaps, removed, modified, kocher, sticky, name, basis, zuhause, unterwegs, auto };
  }

  const origCarbOf = (r) => r.zutaten.map((x) => zut(x.z)).find((Z) => Z && Z.kat === "carbs") || { name: "Original" };
  function openWerkbank(id, opts = {}) {
    const r0 = id ? rez(id) : null;
    const w = {
      base: r0 ? r0.id : null,
      name: opts.name || "Freestyle-Gericht",
      mahlzeit: r0 ? r0.mahlzeit : (opts.mahlzeit || "dinner"),
      rows: r0 ? r0.zutaten.map((x) => ({ z: x.z, g: x.g, orig: x.z, origG: x.g })) : [],
      portions: 1
    };
    const D = REZ();
    const zOpts = (kat, sel) => D.zutaten.filter((z) => z.kat === kat).map((z) => `<option value="${z.id}" ${z.id === sel ? "selected" : ""}>${esc(z.name)}</option>`).join("");
    const allOpts = () => `<option value="">+ Zutat hinzufügen …</option>` + D.kategorien.map((c) => `<optgroup label="${esc(c.name)}">${zOpts(c.id)}</optgroup>`).join("");

    openModal({
      title: r0 ? r0.name : "Freestyle-Gericht bauen", wide: true,
      body: `<div id="wb"></div>`,
      foot: `<div id="wbf" class="row" style="width:100%"></div>`,
      onMount: (m) => {
        const box = $("#wb", m), foot = $("#wbf", m);
        const draw = () => {
          const c = computeWork(w);
          const P = w.portions;
          const h2 = $(".modal-head h2", m); if (h2) h2.textContent = w.base ? c.name : (w.name || "Freestyle-Gericht");
          const rowsHtml = w.rows.map((x, i) => {
            const Z = zut(x.z); if (!Z) return "";
            const changed = x.orig && (x.z !== x.orig || x.g !== x.origG);
            return `<div class="wb-row ${changed ? "changed" : ""} ${!x.orig && w.base ? "added" : ""}">
              <span class="dot ${Z.kat}"></span>
              <select data-swap="${i}" aria-label="Zutat tauschen">${zOpts(Z.kat, x.z)}</select>
              <span class="g-in"><input type="number" min="0" step="1" data-g="${i}" value="${x.g}" aria-label="Gramm pro Portion"> g</span>
              ${P > 1 ? `<span class="g-tot">${fmtG(x.g * P)}</span>` : ""}
              <button type="button" class="icon-btn" data-del="${i}" aria-label="${esc(Z.name)} entfernen" title="Entfernen">${ICON.close}</button>
            </div>`;
          }).join("");
          const slots = !w.base ? ["carbs", "gemuese", "protein", "geschmack"].filter((k) => !w.rows.some((x) => zut(x.z)?.kat === k))
            .map((k) => `<select class="slot-pick" data-addkat="${k}"><option value="">+ ${esc(D.kategorien.find((cc) => cc.id === k).name)} wählen …</option>${zOpts(k)}</select>`).join("") : "";
          const hints = [];
          c.swaps.forEach((s) => { if (s.to.zubereitung && s.to.kat === "carbs") hints.push(`<b>${esc(kurzOf(s.to))} statt ${esc(kurzOf(s.from))}:</b> ${esc(s.to.zubereitung)}.`); });
          c.swaps.filter((s) => s.to.kat !== "carbs" && s.to.zubereitung).forEach((s) => hints.push(`<b>${esc(kurzOf(s.to))}:</b> ${esc(s.to.zubereitung)}.`));
          if (c.r && c.swaps.length) hints.push(`Wasser und Zeit sind angepasst: <b>${c.wasser} ml</b>, ca. <b>${c.zeit} min</b> pro Portion.`);
          box.innerHTML = `
            ${!w.base ? `<div class="form-grid" style="margin-bottom:.8rem">
              <label class="field c4">Name<input data-wname value="${esc(w.name)}"></label>
              <label class="field c2">Mahlzeit<select data-wmeal>${Object.entries(MEAL_LABEL).map(([k, v]) => `<option value="${k}" ${k === w.mahlzeit ? "selected" : ""}>${v}</option>`).join("")}</select></label>
            </div>` : ""}
            <div class="recipe-meta" style="margin-bottom:.7rem">
              <span class="badge">${MEAL_LABEL[w.mahlzeit]}</span>${w.rows.length ? `<span class="badge ${c.info.diaet}">${DIAET_LABEL[c.info.diaet]}</span>` : ""}
              ${c.modified ? `<span class="badge warn">angepasst</span>` : ""}
              <span>Basis: ${esc(c.basis)}</span>
              <span>· <b>${c.info.kcal}</b> kcal · <b>${c.info.g}</b> g pro Portion</span>
              ${c.wasser ? `<span>· ${c.wasser} ml Wasser</span>` : ""}${c.zeit ? `<span>· ca. ${c.zeit} min</span>` : ""}${c.kocher ? "" : "<span>· ohne Kocher</span>"}
            </div>
            ${buildStrip({ zutaten: w.rows })}
            <div class="cols wb-cols" style="margin-top:1rem">
              <div>
                <div class="row" style="justify-content:space-between;margin-bottom:.4rem"><h4 style="margin:0">Zutaten pro Portion</h4>
                  <span class="portion"><button class="btn sm" data-p="-1" aria-label="weniger Portionen">−</button><b>${P}</b> ${P === 1 ? "Portion" : "Portionen"}<button class="btn sm" data-p="1" aria-label="mehr Portionen">+</button></span></div>
                <div class="wb-rows">${rowsHtml || `<p class="muted small">Noch leer – wähle unten je eine Zutat aus dem Baukasten.</p>`}</div>
                <div class="wb-add">${slots}<select class="slot-pick" data-add>${allOpts()}</select></div>
                <p class="hint" style="margin-top:.6rem">Tauschen: einfach im Auswahlfeld eine andere Zutat derselben Kategorie wählen – die Grammzahl passt sich an die übliche Portion an.${P > 1 ? ` Wasser gesamt: <b>${c.wasser * P} ml</b>.` : ""}</p>
              </div>
              <div class="recipe-detail">
                ${hints.length ? `<div class="wb-hint">${hints.map((h) => `<p>${h}</p>`).join("")}</div>` : ""}
                ${c.sticky.length && c.kocher ? `<div class="wb-hint mug"><p><b>Eine-Tasse-Tipp:</b> ${esc(c.sticky.join(", "))} ${c.sticky.length === 1 ? "klebt" : "kleben"} leicht an. Backpapier in die Tasse legen oder erst vom Herd genommen unterrühren.</p></div>` : ""}
                ${c.zuhause ? `<h4>Zu Hause vorbereiten</h4><p>${esc(c.zuhause)}</p>` : ""}
                ${c.unterwegs.length ? `<h4>Unterwegs${P > 1 ? ` <span class="muted" style="text-transform:none;letter-spacing:0;font-weight:400">· für ${P} Portionen</span>` : ""}${c.auto ? ' <span class="badge warn" style="text-transform:none;letter-spacing:0">automatisch angepasst</span>' : ""}</h4>${stepsHtml(c.unterwegs, c.wasser * P, P)}` : ""}
                ${c.auto && c.r.unterwegs ? `<details class="small muted"><summary>Original-Zubereitung (mit ${esc(kurzOf(origCarbOf(c.r)))})</summary>${stepsHtml(c.r.unterwegs, c.r.wasser * P, P)}</details>` : ""}
                ${c.removed.length ? `<p class="small muted">Entfernt: ${c.removed.map((Z) => esc(kurzOf(Z))).join(", ")} – im Text oben ggf. ignorieren.</p>` : ""}
              </div>
            </div>`;
          foot.innerHTML = `
            ${c.modified ? `<button class="btn" data-reset>${ICON.reset} Original</button>` : ""}
            ${state.edit && w.base ? `<button class="btn" data-edit>${ICON.edit} Bearbeiten</button>` : ""}
            <span class="spacer"></span>
            ${(c.modified || !w.base) && w.rows.length ? `<button class="btn" data-save>Als eigenes Gericht speichern</button>` : ""}
            <button class="btn primary" data-close>Schließen</button>`;
          $$("[data-close]", foot).forEach((b) => b.addEventListener("click", closeModal));
        };
        draw();

        box.addEventListener("change", (e) => {
          const el = e.target;
          if (el.dataset.swap != null) {
            const row = w.rows[+el.dataset.swap]; const from = zut(row.z), to = zut(el.value);
            row.g = roundG(row.g / (from.portion || row.g) * (to.portion || row.g)); row.z = el.value;
          } else if (el.dataset.g != null) w.rows[+el.dataset.g].g = Math.max(0, +el.value || 0);
          else if (el.dataset.add != null || el.dataset.addkat != null) { if (el.value) w.rows.push({ z: el.value, g: zut(el.value).portion || 20 }); }
          else if (el.dataset.wname != null) { w.name = el.value.trim() || "Freestyle-Gericht"; return; }
          else if (el.dataset.wmeal != null) w.mahlzeit = el.value;
          draw();
        });
        box.addEventListener("click", (e) => {
          const d = e.target.closest("[data-del]"); if (d) { w.rows.splice(+d.dataset.del, 1); return draw(); }
          const p = e.target.closest("[data-p]"); if (p) { w.portions = Math.max(1, Math.min(12, w.portions + +p.dataset.p)); draw(); }
        });
        foot.addEventListener("click", (e) => {
          if (e.target.closest("[data-reset]")) { w.rows = r0.zutaten.map((x) => ({ z: x.z, g: x.g, orig: x.z, origG: x.g })); return draw(); }
          if (e.target.closest("[data-edit]")) return openRezeptEditor(w.base);
          if (e.target.closest("[data-save]")) {
            const c = computeWork(w);
            const suggested = w.base ? (c.name !== r0.name ? c.name : r0.name + " (Variante)") : w.name;
            return askName("Gericht speichern", suggested, (name) => {
              const RD = editable("rezept");
              const hint = c.swaps.filter((s) => s.to.zubereitung).map((s) => `${kurzOf(s.to)}: ${s.to.zubereitung}.`).join(" ");
              const nr = {
                id: slug(name) + "-" + uid().slice(0, 3), name, mahlzeit: w.mahlzeit, basis: c.basis,
                zutaten: c.rows.map((x) => ({ z: x.z, g: x.g })), wasser: c.wasser, zeit: c.zeit, kocher: c.kocher,
                zuhause: c.zuhause, unterwegs: [...c.unterwegs, ...(w.base && hint && !c.auto ? ["Hinweis zum Austausch: " + hint] : [])],
                eigen: true
              };
              RD.rezepte.push(nr); commit();
              toast(`„${name}“ gespeichert – steht jetzt auch im Essensplaner zur Wahl.`);
              openWerkbank(nr.id);
            });
          }
        });
      }
    });
  }

  function openRezeptEditor(id) {
    const D = REZ();
    const r = id ? rez(id) : { name: "", mahlzeit: "dinner", basis: "", zutaten: [{ z: D.zutaten[0].id, g: 100 }], wasser: 0, zeit: 0, kocher: true, zuhause: "", unterwegs: [] };
    const zOpts = (sel) => D.kategorien.map((c) => `<optgroup label="${esc(c.name)}">${D.zutaten.filter((z) => z.kat === c.id).map((z) => `<option value="${z.id}" ${z.id === sel ? "selected" : ""}>${esc(z.name)}</option>`).join("")}</optgroup>`).join("");
    const zrow = (z) => `<div class="zrow"><select name="zz">${zOpts(z.z)}</select><input type="number" name="zg" min="0" value="${z.g}" aria-label="Gramm pro Portion"><button type="button" class="icon-btn" data-delrow aria-label="Zutat entfernen">${ICON.close}</button></div>`;
    openModal({
      title: id ? "Gericht bearbeiten" : "Neues Gericht", wide: true,
      body: `<form id="rForm" class="form-grid">
        <label class="field c4">Name<input name="name" value="${esc(r.name)}" required></label>
        <label class="field c2">Mahlzeit<select name="mahlzeit">${Object.entries(MEAL_LABEL).map(([k, v]) => `<option value="${k}" ${k === r.mahlzeit ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label class="field c2">Basis<input name="basis" value="${esc(r.basis)}" placeholder="Couscous, Nudeln …" list="basisList"><datalist id="basisList">${[...new Set(D.rezepte.map((x) => x.basis))].map((b) => `<option value="${esc(b)}">`).join("")}</datalist></label>
        <label class="field c2">Wasser (ml/Portion)<input type="number" min="0" name="wasser" value="${r.wasser || 0}"></label>
        <label class="field c2">Zeit (min)<input type="number" min="0" name="zeit" value="${r.zeit || 0}"></label>
        <div class="field c6">Zutaten (Gramm pro Portion)<div class="zrows" id="zrows">${r.zutaten.map(zrow).join("")}</div>
          <button type="button" class="btn sm" data-addrow style="align-self:flex-start;margin-top:.3rem">${ICON.plus} Zutat</button>
          <span class="hint">Fehlt eine Zutat? Im Zutaten-Register anlegen.</span></div>
        <label class="field c6">Zu Hause vorbereiten<textarea name="zuhause">${esc(r.zuhause || "")}</textarea></label>
        <label class="field c6">Unterwegs – ein Schritt pro Zeile<textarea name="unterwegs" rows="6">${esc(stepsOf(r.unterwegs).join("\n"))}</textarea>
          <span class="hint">Platzhalter: <code>{wasser}</code> = Wassermenge des Gerichts, <code>{ml:40}</code> = 40 ml pro Portion – beides rechnet sich mit den Portionen um.</span></label>
        <label class="check c6"><input type="checkbox" name="kocher" ${r.kocher ? "checked" : ""}> Kocher nötig</label>
      </form>`,
      foot: `${id ? `<button class="btn danger" data-del>Löschen</button><span class="spacer"></span>` : ""}<button class="btn" data-close>Abbrechen</button><button class="btn primary" form="rForm">Speichern</button>`,
      onMount: (m) => {
        const box = $("#zrows", m);
        $("[data-addrow]", m).addEventListener("click", () => box.insertAdjacentHTML("beforeend", zrow({ z: D.zutaten[0].id, g: 20 })));
        box.addEventListener("click", (e) => { const b = e.target.closest("[data-delrow]"); if (b && box.children.length > 1) b.parentElement.remove(); });
        $("#rForm", m).addEventListener("submit", (e) => {
          e.preventDefault(); const f = e.target; const RD = editable("rezept");
          const item = id ? RD.rezepte.find((x) => x.id === id) : { id: slug(f.name.value) + "-" + uid().slice(0, 3) };
          Object.assign(item, {
            name: f.name.value.trim(), mahlzeit: f.mahlzeit.value, basis: f.basis.value.trim() || "Sonstiges",
            wasser: +f.wasser.value || 0, zeit: +f.zeit.value || 0, kocher: f.kocher.checked,
            zuhause: f.zuhause.value.trim(), unterwegs: stepsOf(f.unterwegs.value),
            zutaten: $$(".zrow", box).map((row) => ({ z: $("select", row).value, g: +$("input", row).value || 0 })).filter((x) => x.g > 0)
          });
          if (!id) RD.rezepte.push(item);
          closeModal(); commit(); toast("Gericht gespeichert (nur in diesem Browser).");
        });
        const del = $("[data-del]", m);
        if (del) del.addEventListener("click", () => {
          if (!armed(del, "Wirklich löschen?")) return;
          const RD = editable("rezept"); RD.rezepte = RD.rezepte.filter((x) => x.id !== id);
          closeModal(); commit(); toast("Gericht gelöscht.");
        });
      }
    });
  }

  function openZutatEditor(id) {
    const D = REZ();
    const z = id ? zut(id) : { name: "", kat: "gemuese", kcal: 300, diaet: "vegan", herkunft: "kaufen", vorbereitung: "" };
    const used = id ? D.rezepte.filter((r) => r.zutaten.some((x) => x.z === id)) : [];
    openModal({
      title: id ? "Zutat bearbeiten" : "Neue Zutat",
      body: `<form id="zForm" class="form-grid">
        <label class="field c4">Name<input name="name" value="${esc(z.name)}" required></label>
        <label class="field c2">kcal / 100 g<input type="number" min="0" name="kcal" value="${z.kcal}"></label>
        <label class="field c2">Kategorie<select name="kat">${D.kategorien.map((c) => `<option value="${c.id}" ${c.id === z.kat ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
        <label class="field c2">Ernährung<select name="diaet">${Object.entries(DIAET_LABEL).map(([k, v]) => `<option value="${k}" ${k === z.diaet ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label class="field c2">Herkunft<select name="herkunft">${[["kaufen", "kaufen"], ["dehydrieren", "selbst trocknen"], ["frisch", "frisch / Dose"]].map(([k, v]) => `<option value="${k}" ${k === z.herkunft ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label class="field c2">Kurzname<input name="kurz" value="${esc(z.kurz || "")}" placeholder="z. B. Couscous"></label>
        <label class="field c2">Portion (g)<input type="number" min="0" name="portion" value="${z.portion ?? ""}"></label>
        <label class="field c2">Wasser (ml pro g)<input type="number" min="0" step="any" name="wasser" value="${z.wasser ?? ""}" placeholder="0"></label>
        <label class="field c2">Garzeit (min)<input type="number" min="0" name="zeit" value="${z.zeit ?? ""}" placeholder="0"></label>
        <label class="check c4"><input type="checkbox" name="klebt" ${z.klebt ? "checked" : ""}> Brennt in der Tasse leicht an (Backpapier-Hinweis)</label>
        <label class="field c6">Zubereitung (kurzer Schritt, erscheint beim Austauschen)<input name="zubereitung" value="${esc(z.zubereitung || "")}" placeholder="z. B. mit kochendem Wasser übergießen, 5 min quellen lassen"></label>
        <label class="field c6">Vorbereitung / Hinweis<textarea name="vorbereitung">${esc(z.vorbereitung || "")}</textarea></label>
        ${used.length ? `<p class="hint c6">Verwendet in: ${used.map((r) => esc(r.name)).join(", ")}</p>` : ""}
      </form>`,
      foot: `${id ? `<button class="btn danger" data-del>Löschen</button><span class="spacer"></span>` : ""}<button class="btn" data-close>Abbrechen</button><button class="btn primary" form="zForm">Speichern</button>`,
      onMount: (m) => {
        $("#zForm", m).addEventListener("submit", (e) => {
          e.preventDefault(); const f = e.target; const RD = editable("rezept");
          const item = id ? RD.zutaten.find((x) => x.id === id) : { id: slug(f.name.value) };
          if (!id && RD.zutaten.find((x) => x.id === item.id)) item.id += "-" + uid().slice(0, 3);
          Object.assign(item, { name: f.name.value.trim(), kat: f.kat.value, kcal: +f.kcal.value || 0, diaet: f.diaet.value, herkunft: f.herkunft.value, vorbereitung: f.vorbereitung.value.trim(),
            kurz: f.kurz.value.trim(), portion: +f.portion.value || 0, wasser: +f.wasser.value || 0, zeit: +f.zeit.value || 0, zubereitung: f.zubereitung.value.trim(), klebt: f.klebt.checked });
          ["kurz", "portion", "wasser", "zeit", "zubereitung", "klebt"].forEach((k) => { if (!item[k]) delete item[k]; });
          if (!id) RD.zutaten.push(item);
          closeModal(); commit(); toast("Zutat gespeichert (nur in diesem Browser).");
        });
        const del = $("[data-del]", m);
        if (del) del.addEventListener("click", () => {
          if (used.length) return toast("Wird noch in Gerichten verwendet – erst dort entfernen.");
          if (!armed(del, "Wirklich löschen?")) return;
          const RD = editable("rezept"); RD.zutaten = RD.zutaten.filter((x) => x.id !== id);
          closeModal(); commit(); toast("Zutat gelöscht.");
        });
      }
    });
  }

  function onRezClick(e) {
    const a = e.target.closest("[data-act]"); if (!a) return;
    switch (a.dataset.act) {
      case "rsub": state.ui.rSub = a.dataset.id; break;
      case "rmeal": state.ui.rFilter.mahlzeit = a.dataset.id; break;
      case "open-rezept": return openWerkbank(a.dataset.id);
      case "freestyle": return openWerkbank(null, { mahlzeit: state.ui.rFilter.mahlzeit !== "alle" ? state.ui.rFilter.mahlzeit : "dinner" });
      case "new-rezept": return openRezeptEditor(null);
      case "new-zutat": return openZutatEditor(null);
      case "edit-zutat": return openZutatEditor(a.dataset.id);
      default: return;
    }
    commit();
  }
  function onRezInput(e) {
    const k = e.target.dataset.rf; if (!k) return;
    state.ui.rFilter[k] = e.target.value;
    if (k === "q") {
      // Fokus beim Tippen behalten
      const pos = e.target.selectionStart; commit();
      const inp = $('[data-rf="q"]'); if (inp) { inp.focus(); inp.setSelectionRange(pos, pos); }
    } else commit();
  }

  // =========================================================
  //  BEARBEITEN-MODUS, EXPORT & IMPORT
  // =========================================================
  function renderBanner() {
    const b = $("#editBanner");
    const local = !!(state.data && (state.data.pack || state.data.rezept));
    if (!state.edit && !local) { b.hidden = true; return; }
    b.hidden = false;
    b.innerHTML = state.edit
      ? `<span class="grow"><b>Bearbeiten-Modus.</b> Änderungen an Items, Modulen und Rezepten werden nur in <i>diesem</i> Browser gespeichert. Damit sie für alle gelten: exportieren und die Datei im Repo unter <code>data/</code> ersetzen.</span>
         <button class="btn sm" data-x="export">Exportieren</button>
         <label class="btn sm">Importieren<input type="file" accept=".js,.json,.txt" data-x="import" hidden></label>
         ${local ? `<button class="btn sm danger" data-x="discard">Lokale Änderungen verwerfen</button>` : ""}`
      : `<span class="grow">Hier sind <b>lokale Änderungen</b> an den Stammdaten aktiv (nur in diesem Browser).</span><button class="btn sm" data-x="export">Exportieren</button><button class="btn sm danger" data-x="discard">Verwerfen</button>`;
  }
  const exportText = (which) => which === "pack"
    ? `/* Packliste – exportiert am ${new Date().toLocaleDateString("de-DE")}. Felder: siehe README.md */\nwindow.PACK_DATA = ${JSON.stringify(PACK(), null, 2)};\n`
    : `/* Wandergerichte – exportiert am ${new Date().toLocaleDateString("de-DE")}. Felder: siehe README.md */\nwindow.REZEPT_DATA = ${JSON.stringify(REZ(), null, 2)};\n`;
  function openExport() {
    let which = "pack";
    const fname = () => (which === "pack" ? "packliste.js" : "rezepte.js");
    openModal({
      title: "Stammdaten exportieren", wide: true,
      body: `<div class="seg" role="group" style="margin-bottom:.7rem"><button data-w="pack" class="on">packliste.js</button><button data-w="rezept">rezepte.js</button></div>
        <p class="hint">Ersetze im Repo die Datei <code>data/<span id="fn">packliste.js</span></code> mit diesem Inhalt (auf GitHub: Datei öffnen → Stift-Symbol → alles ersetzen → „Commit changes“).</p>
        <textarea class="export-text" readonly id="exTxt"></textarea>`,
      foot: `<button class="btn" data-close>Schließen</button><button class="btn" data-dl>Herunterladen</button><button class="btn primary" data-cp>Kopieren</button>`,
      onMount: (m) => {
        const upd = () => { $("#exTxt", m).value = exportText(which); $("#fn", m).textContent = fname(); $$("[data-w]", m).forEach((b) => b.classList.toggle("on", b.dataset.w === which)); };
        $$("[data-w]", m).forEach((b) => b.addEventListener("click", () => { which = b.dataset.w; upd(); })); upd();
        $("[data-cp]", m).addEventListener("click", () => copyText($("#exTxt", m).value, "In die Zwischenablage kopiert."));
        $("[data-dl]", m).addEventListener("click", () => {
          try {
            const url = URL.createObjectURL(new Blob([$("#exTxt", m).value], { type: "text/javascript" }));
            const a = document.createElement("a"); a.href = url; a.download = fname(); document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          } catch { toast("Download blockiert – bitte „Kopieren“ nutzen."); }
        });
      }
    });
  }
  function importFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const txt = String(reader.result);
        const json = JSON.parse(txt.slice(txt.indexOf("{"), txt.lastIndexOf("}") + 1));
        if (json.items && json.module) { (state.data ||= {}).pack = json; toast("Packliste importiert."); }
        else if (json.rezepte && json.zutaten) { (state.data ||= {}).rezept = json; toast("Wandergerichte importiert."); }
        else throw new Error();
        commit();
      } catch { toast("Datei nicht erkannt. Bitte eine exportierte packliste.js oder rezepte.js wählen."); }
    };
    reader.readAsText(file);
  }
  $("#editBanner").addEventListener("click", (e) => {
    const x = e.target.closest("[data-x]"); if (!x) return;
    if (x.dataset.x === "export") openExport();
    if (x.dataset.x === "discard") { if (!armed(x, "Wirklich verwerfen?")) return; state.data = null; commit(); toast("Zurück auf dem Stand des Repositorys."); }
  });
  $("#editBanner").addEventListener("change", (e) => { if (e.target.dataset.x === "import" && e.target.files[0]) importFile(e.target.files[0]); });
  $("#editToggle").addEventListener("change", (e) => { state.edit = e.target.checked; commit(); });

  // =========================================================
  //  ROUTING & RENDER
  // =========================================================
  const TABS = ["urlaube", "karte", "plan", "unterwegs", "kosten", "packliste", "essen", "rezepte", "einstellungen"];
  const TRIP_TABS = ["plan", "unterwegs", "kosten", "packliste", "essen"];
  const TITLES = { karte: "Weltkarte", urlaube: "Urlaube", plan: "Planung", unterwegs: "Unterwegs", kosten: "Kosten", packliste: "Packliste", essen: "Essensplaner", rezepte: "Wandergerichte", einstellungen: "Einstellungen" };
  function route() {
    const h = location.hash.replace("#", "");
    if (TABS.includes(h)) state.ui.tab = h;
    render();
  }
  // Hintergründe: Höhenlinien echter Gebiete (Daten: Mapzen Terrain Tiles / SRTM u. a.)
  const BG = {
    tongariro: ["Tongariro Crossing", "39°11′S 175°36′E", 50],
    gomera: ["La Gomera", "28°07′N 17°13′W", 50],
    seiland: ["Seiland", "70°26′N 23°06′E", 50],
    vancouver: ["Vancouver Island · Strathcona", "49°43′N 125°37′W", 100],
    broughton: ["Broughton Archipelago", "50°44′N 126°30′W", 100],
  };
  const TAB_BG = { urlaube: "tongariro", karte: "broughton", plan: "vancouver", unterwegs: "gomera", kosten: "seiland", packliste: "broughton", essen: "gomera", rezepte: "tongariro", einstellungen: "vancouver" };
  function setBackground(tab) {
    const key = TAB_BG[tab] || "tongariro";
    const layer = $(".bg-layer"); if (!layer || layer.dataset.key === key) return;
    layer.dataset.key = key;
    let el = layer.querySelector('i[data-k="' + key + '"]');
    if (!el) { el = document.createElement("i"); el.dataset.k = key; el.style.backgroundImage = "url(img/bg/" + key + ".svg)"; layer.appendChild(el); }
    layer.querySelectorAll("i").forEach((x) => x.classList.toggle("on", x === el));
    const m = BG[key], lab = $(".bg-label");
    if (lab) lab.innerHTML = "<b>" + esc(m[0]) + "</b> · " + m[1] + " · Äquidistanz " + m[2] + " m";
  }

  function render() {
    let tab = state.ui.tab;
    const t = trip();
    if (TRIP_TABS.includes(tab) && !t) tab = "urlaube";
    TABS.forEach((x) => { const v = $("#view-" + x); if (v) v.hidden = x !== tab; });
    $$(".tabs a").forEach((a) => {
      a.classList.toggle("active", a.dataset.tab === tab);
      if (TRIP_TABS.includes(a.dataset.tab)) a.classList.toggle("disabled", !t);
    });
    document.title = TITLES[tab] + (t && TRIP_TABS.includes(tab) ? " · " + tripName(t) : "") + " · Urlaubsplanung";
    setBackground(tab);
    renderBanner();
    if (window.PL.renderHeader) window.PL.renderHeader();
    if (tab === "packliste") renderPack();
    else if (tab === "essen") renderEssen();
    else if (tab === "rezepte") renderRezepte();
    else if (window.PL.views && window.PL.views[tab]) window.PL.views[tab]();
  }
  function commit() { store.save(); render(); if (window.PL.afterCommit) window.PL.afterCommit(); }
  // speichern ohne neu zu zeichnen (z. B. beim Tippen in Tabellenzellen)
  function save() { store.save(); if (window.PL.afterCommit) window.PL.afterCommit(); }

  // Ereignisse (Delegation)
  const vp = $("#view-packliste"), ve = $("#view-essen"), vr = $("#view-rezepte");
  vp.addEventListener("click", onPackClick);
  vp.addEventListener("change", onPackChange);
  vp.addEventListener("dblclick", (e) => { const a = e.target.closest('[data-act="qty-reset"]'); if (a) { delete trip().menge[a.dataset.id]; commit(); } });
  vp.addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && e.target.classList.contains("tick")) { e.preventDefault(); e.target.closest(".item").click(); } });
  // Tage im Reiseverlauf markieren (tippen oder ziehen)
  let painting = false;
  function paintAt(x, y) {
    const cell = document.elementFromPoint(x, y)?.closest(".days.paintable .day-cell"); if (!cell) return;
    const t = trip(); const i = +cell.dataset.day;
    const arr = dayArts(t); if (arr[i] === brush) return;
    arr[i] = brush; t.tagArt = arr; t.tagArtManual = true;
    cell.className = "day-cell art-" + brush;
  }
  vp.addEventListener("pointerdown", (e) => {
    if (!e.target.closest(".days.paintable .day-cell")) return;
    e.preventDefault(); painting = true; paintAt(e.clientX, e.clientY);
  });
  vp.addEventListener("pointermove", (e) => { if (painting) paintAt(e.clientX, e.clientY); });
  document.addEventListener("pointerup", () => { if (painting) { painting = false; commit(); } });
  document.addEventListener("pointercancel", () => { if (painting) { painting = false; commit(); } });

  ve.addEventListener("click", onEssenClick);
  ve.addEventListener("change", onEssenChange);
  vr.addEventListener("click", onRezClick);
  vr.addEventListener("input", onRezInput);
  vr.addEventListener("toggle", (e) => { if (e.target.classList && e.target.classList.contains("mug-tips")) { state.ui.tipsOpen = e.target.open; store.save(); } }, true);
  window.addEventListener("hashchange", () => { if (window.PL.handleHash && window.PL.handleHash()) return; route(); });

  // Schnittstelle für die Urlaubsplanung (js/urlaub.js)
  Object.assign(window.PL, {
    core: { state, store, $, $$, esc, uid, clone, slug, fmtDate, addDays, dayDiff, ICON, PACK, REZ, trip, tripName, person, pname, artNames,
      myId, setMe, ST, normName, niceName, isPast, sortKey, toast, openModal, closeModal, armed, askName, copyText, commit, save, render, route, doPrint,
      cal, renderCal, parseDE, toDE, setRange, setPersonCount, todayISO, presetModules, newTrip, migrate, metaFields,
      onPackClick, onPackChange, tripItems, qtyOf, tagsOf, essen, rez, zut, recipeInfo, MEAL_LABEL, fmtG, daysPer, dayArts, wanderTage, TABS }
  });

  // Start, sobald alle Skripte geladen sind
  window.addEventListener("DOMContentLoaded", () => {
    if (window.PL.init) window.PL.init();
    const h = location.hash.replace("#", "");
    if (!TABS.includes(h) && !(window.PL.handleHash && window.PL.handleHash())) {
      try { history.replaceState(null, "", location.pathname + location.search + "#" + state.ui.tab); } catch { /* egal */ }
    }
    route();
    store.save();
  });
})();
