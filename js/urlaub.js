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
    split: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10h5l4-5h5M8 10l4 5h5M14 3l3 2-3 2M14 13l3 2-3 2"/></svg>',
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
    { k: "titel", h: "Programm", ph: "Was machen wir?", w: 22, rich: true },
    { k: "von", h: "Von", ph: "Start", w: 9 },
    { k: "nach", h: "Nach", ph: "Ziel", w: 9 },
    { k: "km", h: "km", ph: "", w: 4, num: true },
    { k: "dauer", h: "Dauer", ph: "5:30 h", w: 5 },
    { k: "hoch", h: "↑ m", ph: "", w: 4.5, num: true },
    { k: "runter", h: "↓ m", ph: "", w: 4.5, num: true },
    { k: "highlights", h: "Highlights", ph: "", w: 14, rich: true },
    { k: "unterkunft", h: "Unterkunft", ph: "", w: 13, rich: true },
    { k: "tour", h: "Wanderung", ph: "outdooractive-Link", w: 13, link: true },
    { k: "notizen", h: "Hinweise & Sonstiges", ph: "", w: 15, rich: true }
  ];
  // Recherche-Kasten unter der Tabelle (für die ganze Reise)
  const RECHERCHE = [
    { k: "empfehlungen", h: "Empfehlungen", ph: "Was man in der Gegend machen kann – z. B. die 10 schönsten Ausflüge, Badestellen, Aussichtspunkte …" },
    { k: "infos", h: "Wichtige Infos", ph: "z. B. „Bus nach Theth fährt stündlich ab 7 Uhr“, Öffnungszeiten, Fähren, Notfallnummern …" },
    { k: "unterkuenfte", h: "Unterkünfte", ph: "Optionen mit Preis, Link, Telefon …" },
    { k: "essen", h: "Essen & Trinken", ph: "Restaurants, Märkte, Bäckereien, regionale Spezialitäten …" }
  ];

  // ---------- Fett & kursiv: gespeichert als **fett** / *kursiv*, angezeigt formatiert ----------
  const mdInline = (x) => esc(x).replace(/\*\*(\S(?:[^*]*?\S)?)\*\*/g, "<b>$1</b>").replace(/(^|[^*])\*(\S(?:[^*]*?\S)?)\*(?!\*)/g, "$1<i>$2</i>");
  const richHtml = (md) => String(md || "").split("\n").map(mdInline).join("<br>");
  // Anzeige (nicht zum Bearbeiten): lange Links werden zu kurzen, anklickbaren Namen
  const linkLabel = (raw) => {
    try {
      const u = new URL(raw), host = u.hostname.replace(/^www\./, "");
      const seg = u.pathname.split("/").filter((x) => /[a-z]{3}/i.test(x)).map((x) => decodeURIComponent(x).replace(/\.(html?|php)$/i, "").replace(/\.[a-z]{2}-[a-z]{2}$/i, ""))
        .sort((a, b) => (b.match(/-/g) || []).length - (a.match(/-/g) || []).length)[0];
      const name = seg && seg.includes("-") ? seg.replace(/[-_]+/g, " ") : "";
      const lab = name ? `${host} · ${name}` : host + (u.pathname.length > 1 ? "/…" : "");
      return lab.length > 70 ? lab.slice(0, 68) + "…" : lab;
    } catch { return raw.length > 60 ? raw.slice(0, 58) + "…" : raw; }
  };
  const unesc = (x) => x.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  const showHtml = (md) => richHtml(md).replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)\]]/g, (m) => `<a href="${m}" target="_blank" rel="noopener" class="ext-link">${esc(linkLabel(unesc(m)))}</a>`);
  const plain = (md) => String(md || "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/(^|[^*])\*(.+?)\*/g, "$1$2");
  const firstLine = (md) => plain(String(md || "").split("\n")[0]);
  function nodeMd(n, b, i) {
    let out = "";
    for (const c of n.childNodes) {
      if (c.nodeType === 3) { out += c.nodeValue.replace(/\u00a0/g, " "); continue; }
      if (c.nodeType !== 1) continue;
      const tag = c.tagName;
      if (tag === "BR") { out += "\n"; continue; }
      const block = /^(DIV|P|LI|H\d)$/.test(tag);
      const fw = c.style ? c.style.fontWeight : "", fs = c.style ? c.style.fontStyle : "";
      const isB = !b && (tag === "B" || tag === "STRONG" || fw === "bold" || +fw >= 600);
      const isI = !i && (tag === "I" || tag === "EM" || fs === "italic");
      let inner = nodeMd(c, b || isB, i || isI);
      if ((isB || isI) && inner.trim()) {
        const a = (isB ? "**" : "") + (isI ? "*" : ""), z = (isI ? "*" : "") + (isB ? "**" : "");
        inner = inner.split("\n").map((l) => { const m = l.match(/^(\s*)(.*?)(\s*)$/); return m[2] ? m[1] + a + m[2] + z + m[3] : l; }).join("\n");
      }
      if (block) { if (out && !out.endsWith("\n")) out += "\n"; out += inner.endsWith("\n") ? inner : inner + "\n"; }
      else out += inner;
    }
    return out;
  }
  const htmlToMd = (el) => nodeMd(el, false, false).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/^\n+|\s+$/g, "");
  // Ansicht: gekürzte Links, Höhe begrenzt (ausklappbar). Erst beim Antippen wird das Feld zum Bearbeiten geöffnet.
  const richBox = (key, md, ph, label, cls = "") => `<div class="rich clamp ${cls}" tabindex="0" spellcheck="true" role="textbox" aria-multiline="true" aria-label="${esc(label)}" data-rich="${key}" data-ph="${esc(ph || "")}" data-md="${esc(md || "")}">${showHtml(md)}</div>${/\bcell\b/.test(cls) ? "" : `<button type="button" class="rich-more" data-richmore hidden>mehr anzeigen</button>`}`;
  function markOver(root) {
    (root || document).querySelectorAll(".rich.clamp").forEach((el) => {
      if (el.classList.contains("editing")) return;
      const open = el.classList.contains("open");
      const ov = open || el.scrollHeight > el.clientHeight + 2;
      el.classList.toggle("over", ov && !open);
      const b = el.nextElementSibling;
      if (b && b.matches(".rich-more")) { b.hidden = !ov; b.textContent = open ? "weniger anzeigen" : "mehr anzeigen"; }
    });
  }
  function startEdit(el) {
    if (el.classList.contains("editing")) return;
    el.classList.add("editing"); el.contentEditable = "true";
    el.innerHTML = richHtml(el.dataset.md || "");
    const b = el.nextElementSibling; if (b && b.matches(".rich-more")) b.hidden = true;
    const caret = () => { const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); };
    caret();
    // erst nach dem aktuellen Ereignis ist das Feld wirklich editierbar: erneut fokussieren
    setTimeout(() => { if (!el.classList.contains("editing")) return; if (document.activeElement !== el) el.focus(); if (!el.contains(getSelection().anchorNode)) caret(); }, 0);
  }
  function endEdit(el) {
    el.classList.remove("editing"); el.removeAttribute("contenteditable");
    el.innerHTML = showHtml(el.dataset.md || "");
    markOver(el.parentElement);
  }
  // Link in der Ansicht antippen öffnet ihn, statt das Feld zu bearbeiten
  document.addEventListener("mousedown", (e) => { const a = e.target.closest && e.target.closest(".rich:not(.editing) a"); if (a) e.preventDefault(); });
  document.addEventListener("click", (e) => {
    const m = e.target.closest && e.target.closest("[data-richmore]"); if (!m) return;
    const el = m.previousElementSibling; if (!el) return;
    el.classList.toggle("open"); markOver(el.parentElement);
  });
  // Formatierungsleiste (F / K) über dem gerade bearbeiteten Feld
  const richBar = document.createElement("div");
  richBar.className = "rich-bar"; richBar.hidden = true;
  richBar.innerHTML = `<button type="button" data-fmt="bold" title="Fett (Strg+B)" aria-label="Fett"><b>F</b></button><button type="button" data-fmt="italic" title="Kursiv (Strg+I)" aria-label="Kursiv"><i>K</i></button>`;
  document.body.appendChild(richBar);
  let richEl = null, richTimer = null;
  const placeBar = () => {
    if (!richEl || !document.contains(richEl)) { richBar.hidden = true; return; }
    const r = richEl.getBoundingClientRect();
    richBar.hidden = false;
    richBar.style.top = Math.max(6, r.top - 40) + "px";
    richBar.style.left = Math.min(window.innerWidth - 90, Math.max(6, r.right - 84)) + "px";
  };
  richBar.addEventListener("mousedown", (e) => e.preventDefault());
  richBar.addEventListener("click", (e) => { const b = e.target.closest("[data-fmt]"); if (b && richEl) { document.execCommand(b.dataset.fmt); richEl.dispatchEvent(new Event("input", { bubbles: true })); } });
  function saveRich(el) {
    const key = el.dataset.rich; if (!key) return;
    const t = trip(); if (!t) return;
    if (!el.classList.contains("editing")) return;
    const md = htmlToMd(el); el.dataset.md = md;
    const [a, k] = key.split(":");
    const obj = a === "R" ? (t.recherche ||= {}) : t.plan.find((x) => x.id === a);
    if (!obj || (obj[k] || "") === md) return;
    if (md) obj[k] = md; else delete obj[k];
    C.save();
  }
  document.addEventListener("focusin", (e) => { const el = e.target.closest && e.target.closest(".rich"); if (el) { startEdit(el); richEl = el; placeBar(); } });
  document.addEventListener("focusout", (e) => {
    const el = e.target.closest && e.target.closest(".rich"); if (!el) return;
    clearTimeout(richTimer); saveRich(el); endEdit(el);
    setTimeout(() => { if (!document.activeElement || !document.activeElement.closest(".rich")) { richEl = null; richBar.hidden = true; } }, 0);
  });
  document.addEventListener("input", (e) => { const el = e.target.closest && e.target.closest(".rich"); if (!el) return; clearTimeout(richTimer); richTimer = setTimeout(() => saveRich(el), 900); placeBar(); });
  document.addEventListener("paste", (e) => {
    const el = e.target.closest && e.target.closest(".rich"); if (!el) return;
    e.preventDefault(); document.execCommand("insertText", false, (e.clipboardData || window.clipboardData).getData("text/plain"));
  });
  window.addEventListener("scroll", () => { if (richEl) placeBar(); }, true);
  window.addEventListener("resize", () => { if (richEl) placeBar(); });

  // Neu zeichnen nach einem Abgleich erst, wenn gerade niemand in ein Feld tippt (sonst springt der Cursor)
  let renderLater = false;
  const editing = () => { const a = document.activeElement; return !!a && !!a.closest && !!a.closest("main") && (a.matches("input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea, select") || a.isContentEditable); };
  function safeRender() { if (editing()) { renderLater = true; return; } C.render(); }
  PL.safeRender = safeRender;
  document.addEventListener("focusout", () => setTimeout(() => { if (renderLater && !editing()) { renderLater = false; C.render(); } }, 120));

  const num = (v) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return isNaN(n) ? 0 : n; };
  const fmtNum = (n, d = 0) => n.toLocaleString("de-DE", { maximumFractionDigits: d });
  const money = (t, n) => (n || 0).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + (t.waehrung || "€");
  // ---------- Währungen ----------
  const WAEHRUNGEN = [["EUR", "€", "Euro"], ["CHF", "CHF", "Schweizer Franken"], ["GBP", "£", "Britisches Pfund"], ["USD", "$", "US-Dollar"], ["NOK", "NOK", "Norwegische Krone"],
    ["SEK", "SEK", "Schwedische Krone"], ["DKK", "DKK", "Dänische Krone"], ["ISK", "ISK", "Isländische Krone"], ["CZK", "Kč", "Tschechische Krone"], ["PLN", "zł", "Złoty"],
    ["HUF", "Ft", "Forint"], ["RON", "lei", "Rumänischer Leu"], ["BGN", "лв", "Lew"], ["ALL", "Lek", "Albanischer Lek"], ["RSD", "RSD", "Serbischer Dinar"], ["BAM", "KM", "Konvertible Mark"],
    ["MKD", "den", "Mazedonischer Denar"], ["TRY", "₺", "Türkische Lira"], ["GEL", "₾", "Georgischer Lari"], ["MAD", "MAD", "Marokkanischer Dirham"], ["CAD", "CA$", "Kanadischer Dollar"],
    ["AUD", "AU$", "Australischer Dollar"], ["NZD", "NZ$", "Neuseeland-Dollar"], ["JPY", "¥", "Yen"], ["THB", "฿", "Baht"], ["VND", "₫", "Dong"], ["IDR", "Rp", "Rupiah"],
    ["INR", "₹", "Rupie"], ["MXN", "MX$", "Mexikanischer Peso"], ["CNY", "CN¥", "Yuan"], ["KRW", "₩", "Won"], ["ZAR", "R", "Rand"]];
  const SYM2CODE = { "€": "EUR", "$": "USD", "£": "GBP", "¥": "JPY", "Fr.": "CHF", "kr": "NOK" };
  const curCode = (x) => { x = String(x || "€").trim(); if (SYM2CODE[x]) return SYM2CODE[x]; const u = x.toUpperCase(); return WAEHRUNGEN.some((w) => w[0] === u) || /^[A-Z]{3}$/.test(u) ? u : "EUR"; };
  const curSym = (code) => (WAEHRUNGEN.find((w) => w[0] === code) || [code, code])[1];
  const baseCode = (t) => curCode(t.waehrung);
  const fmtN = (n, d = 2) => (n || 0).toLocaleString("de-DE", { minimumFractionDigits: d, maximumFractionDigits: d });
  const moneyIn = (code, n) => fmtN(n, ["JPY", "KRW", "VND", "IDR", "ISK", "HUF"].includes(code) ? 0 : 2) + " " + curSym(code);
  // Kurs: wie viel Hauptwährung ist 1 Einheit der Fremdwährung?
  const rateOf = (t, code) => (code === baseCode(t) ? 1 : num(((t.kurse || {})[code] || {}).r) || 0);
  const kCode = (t, k) => (k.wae && k.wae !== baseCode(t) ? k.wae : baseCode(t));
  const inBase = (t, k) => num(k.betrag) * (rateOf(t, kCode(t, k)) || 0);
  const tripCurrencies = (t) => [...new Set([baseCode(t), ...(t.waehrungen || []), ...(t.kosten || []).map((k) => kCode(t, k))])];
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
  // Teilreisen: Urlaube mit gleicher „gruppe“ gehören zusammen (z. B. erst zu viert, dann getrennte Wege)
  const partsOf = (t) => (t.gruppe ? Object.values(state.trips).filter((x) => x.gruppe === t.gruppe).sort((a, b) => (a.von || "").localeCompare(b.von || "") || (a.gruppe === a.id ? -1 : b.gruppe === b.id ? 1 : (a.erstellt || "").localeCompare(b.erstellt || ""))) : [t]);
  const groupName = (t) => { const main = t.gruppe && state.trips[t.gruppe]; return main ? tripName(main) : tripName(t); };
  const withMe = (t) => { const me = C.normName(state.profile.name); const named = (t.personen || []).filter((p) => (p.name || "").trim()); return !me || !named.length || named.some((p) => C.normName(p.name) === me); };
  const dayLabel = (t, i, long) => {
    const iso = dateOf(t, i);
    if (!iso) return `Tag ${i + 1}`;
    return fmtDate(iso, long ? { weekday: "long", day: "numeric", month: "long" } : { weekday: "short", day: "2-digit", month: "2-digit" });
  };

  // ---------- Tagesplan an Reisedauer anpassen ----------
  const rowEmpty = (r) => !FIELDS.some((f) => String(r[f.k] ?? "").trim()) && !r.typ && !r.hinweise && !r.sonstiges;
  function ensurePlan(t) {
    t.plan ||= [];
    // alte Spalten „Hinweise“ und „Sonstiges“ → gemeinsame Spalte „Hinweise & Sonstiges“
    t.plan.forEach((r) => {
      if (!r.hinweise && !r.sonstiges) return;
      r.notizen = [r.notizen, r.hinweise, r.sonstiges].filter((x) => String(x || "").trim()).join("\n");
      delete r.hinweise; delete r.sonstiges;
    });
    while (t.plan.length < t.tage) t.plan.push({ id: uid() + uid(), typ: "" });
    while (t.plan.length > t.tage && rowEmpty(t.plan[t.plan.length - 1])) t.plan.pop();
  }

  // =========================================================
  //  SYNCHRONISIERUNG
  // =========================================================
  const sync = { status: "off", msg: "", at: null, queue: Promise.resolve(), timer: null, locked: new Set(), broken: new Set() };
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
    cfg.contactsGone = [...new Set([...(cfg.contactsGone || []), ...(ring.contactsGone || [])])];
    state.contacts = state.contacts.filter((c) => !cfg.contactsGone.includes(c.id));
    (ring.contacts || []).forEach((c) => { if (!cfg.contactsGone.includes(c.id) && !state.contacts.some((x) => x.id === c.id)) state.contacts.push(c); });
    if (ring.profile && ring.profile.name && !state.profile.name) state.profile.name = ring.profile.name;
    if (ring.gk && !cfg.gk) cfg.gk = ring.gk;
    if (ring.admin && !cfg.ring) cfg.admin = ring.admin;
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
    const ring = { v: 1, trips, deleted, contacts: state.contacts, contactsGone: cfg.contactsGone || [], profile: { name: state.profile.name || "" }, gk: cfg.gk, admin: cfg.ring ? undefined : cfg.admin };
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
  async function fp(k) {
    const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(k))));
    return [...h.slice(0, 3)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  function dropContacts(pred) {
    const gone = state.contacts.filter(pred).map((c) => c.id);
    if (state.syncCfg) state.syncCfg.contactsGone = [...new Set([...(state.syncCfg.contactsGone || []), ...gone])];
    state.contacts = state.contacts.filter((c) => !gone.includes(c.id));
  }
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
    let trips = {}, rings = [], gk = "";
    if (f) {
      try { const d = await S.decJSON(c.k, f.content); trips = d.trips || {}; rings = d.rings || []; gk = d.gk || ""; }
      catch {
        // Selbst angelegte Verknüpfung: maßgeblich ist der Schlüssel im Link – unlesbares Postfach neu schreiben
        if (isMine(c)) { sync.broken.delete(c.id); cfg.inbox[c.id] = { sha: f.sha, trips: {}, rings: [], gk: "", repair: true }; return cfg.inbox[c.id]; }
        sync.broken.add(c.id); cfg.inbox[c.id] = null; return null;
      }
    }
    sync.broken.delete(c.id);
    rings = [...new Set([...rings, ...(c.rings || [])])];
    cfg.inbox[c.id] = { sha: f ? f.sha : null, trips, rings, gk };
    if (gk && !cfg.gk) cfg.gk = gk; // Schlüssel für die gemeinsamen Gerichte
    return cfg.inbox[c.id];
  }
  async function pullInboxes() {
    const cfg = state.syncCfg; cfg.altKeys ||= {};
    for (const c of state.contacts) {
      const box = await readInbox(c);
      if (!box) continue;
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
        if (sync.broken.has(c.id)) break;
        const box = cfg.inbox[c.id] || await readInbox(c);
        if (!box) break;
        const want = { ...box.trips };
        Object.values(state.trips).forEach((t) => { if (tripHas(t, c.name) && state.keys[t.id] && !isRemoved(t.id) && !want[t.id]) want[t.id] = state.keys[t.id].k; });
        const rings = [...new Set([...(box.rings || []), ...(cfg.ring ? [cfg.ring] : [])])];
        const gk = box.gk || cfg.gk || "";
        if (box.sha && !box.repair && S.eq(want, box.trips) && S.eq(rings, box.rings || []) && gk === (box.gk || "")) break;
        try {
          const res = await S.putFile(cfg, `inbox/${c.id}.enc`, await S.encJSON(c.k, { v: 1, trips: want, rings, ...(gk ? { gk } : {}) }), box.sha, "Gemeinsame Urlaube aktualisiert");
          cfg.inbox[c.id] = { sha: res.content.sha, trips: want, rings, gk };
          delete c.rings;
          break;
        } catch (e) {
          if (e.status !== 409 && e.status !== 422) throw e;
          await readInbox(c); // jemand anderes war schneller – neu lesen und zusammenführen
        }
      }
    }
  }

  // ---------- Wer bin ich, wem gehört welche Verknüpfung ----------
  // Admin = wer das Daten-Repo mit eigenem Token eingerichtet hat (kein eigener Schlüsselbund unter keys/c_…).
  const isAdmin = () => !!(state.syncCfg && !state.syncCfg.ring);
  const whoId = () => { const cfg = state.syncCfg; return cfg ? (cfg.ring ? cfg.ring.replace(/^keys\/c_|\.enc$/g, "") : "admin") : "local"; };
  PL.whoId = whoId; PL.isAdmin = isAdmin;
  function inviter() { try { return dec64(state.syncCfg.invite); } catch { return {}; } }
  // eigene Verknüpfung = selbst angelegt; empfangene (über den Link einer anderen Person) dürfen nicht bearbeitet werden
  function isMine(c) {
    if (c.mine !== undefined) return c.mine;
    if (isAdmin()) return true;
    const inv = inviter();
    return !(c.id === inv.c || (inv.f && norm(c.name) === norm(inv.f)));
  }
  async function ensureAdmin() {
    const cfg = state.syncCfg; if (!isAdmin()) return;
    if (!cfg.gk) cfg.gk = S.randomKey();
    if (!cfg.admin) cfg.admin = await S.rsaGen();
    if (sync.pubOk === JSON.stringify(cfg.admin.pub)) return;
    const f = await S.getFile(cfg, "admin/pub.json");
    const want = JSON.stringify({ v: 1, jwk: cfg.admin.pub });
    if (!f || atob(f.content) !== want) await S.putFile(cfg, "admin/pub.json", btoa(want), f && f.sha, "Admin-Schlüssel");
    sync.pubOk = JSON.stringify(cfg.admin.pub);
  }
  async function adminPub() {
    const cfg = state.syncCfg;
    if (cfg.admin) return cfg.admin.pub;
    if (sync.adminPub === undefined) { const f = await S.getFile(cfg, "admin/pub.json"); sync.adminPub = f ? JSON.parse(atob(f.content)).jwk : null; }
    return sync.adminPub;
  }
  // Jede Verknüpfung wird für den Admin protokolliert – verschlüsselt, nur der Admin kann es lesen.
  async function registerLinks() {
    const cfg = state.syncCfg; const pub = await adminPub(); if (!pub) return;
    const put = async (path, obj, msg) => {
      try { await S.putFile(cfg, path, await S.sealJSON(pub, obj), null, msg); }
      catch (e) { if (e.status !== 422 && e.status !== 409) throw e; } // gibt es schon
    };
    for (const c of state.contacts) {
      if (c.reg || !isMine(c)) continue;
      if (!c.fp) c.fp = await fp(c.k);
      await put(`admin/links/${c.id}.enc`, { id: c.id, von: state.profile.name || (isAdmin() ? "Admin" : ""), vonId: whoId(), an: c.name, am: c.am || null, fp: c.fp }, "Verknüpfung protokolliert");
      c.reg = 1;
    }
    for (const ev of [...(cfg.regEv || [])]) {
      await put(`admin/links/${ev.id}.${ev.typ}.enc`, ev, ev.typ === "ok" ? "Verknüpfung angenommen" : "Verknüpfung ersetzt");
      cfg.regEv = cfg.regEv.filter((x) => x !== ev);
    }
  }
  // ---------- Gemeinsame Gerichte (für alle in der App) ----------
  function mergeShared(a, b) {
    const gone = new Map();
    [...(a.gone || []), ...(b.gone || [])].forEach((g) => { const o = gone.get(g.id); if (!o || o.am < g.am) gone.set(g.id, g); });
    const items = {};
    ["rezepte", "zutaten"].forEach((k) => {
      const m = new Map();
      [...(b[k] || []), ...(a[k] || [])].forEach((x) => { const o = m.get(x.id); if (!o || (x.am || 0) >= (o.am || 0)) m.set(x.id, x); });
      items[k] = [...m.values()];
    });
    const newest = new Map(); ["rezepte", "zutaten"].forEach((k) => items[k].forEach((x) => newest.set(x.id, Math.max(newest.get(x.id) || 0, x.am || 0))));
    const g = [...gone.values()].filter((x) => !(newest.get(x.id) > x.am)).sort((p, q) => p.id.localeCompare(q.id));
    const dead = new Set(g.map((x) => x.id));
    const out = { rezepte: [], zutaten: [], gone: g };
    ["rezepte", "zutaten"].forEach((k) => { out[k] = items[k].filter((x) => !dead.has(x.id)).sort((p, q) => String(p.id).localeCompare(String(q.id))); });
    return out;
  }
  async function syncShared() {
    const cfg = state.syncCfg; if (!cfg || !cfg.gk) return false;
    const me = whoId(), before = JSON.stringify(state.shared);
    ["rezepte", "zutaten"].forEach((k) => (state.shared[k] || []).forEach((x) => { if (x.vonId === "local") { x.vonId = me; x.von = x.von || state.profile.name || ""; } }));
    const empty = { rezepte: [], zutaten: [], gone: [] };
    for (let attempt = 0; attempt < 3; attempt++) {
      const f = await S.getFile(cfg, "shared/rezepte.enc");
      let remote = empty;
      if (f) { try { remote = await S.decJSON(cfg.gk, f.content); } catch { console.warn("Gemeinsame Gerichte: Schlüssel passt nicht"); return false; } }
      const merged = mergeShared(state.shared, remote);
      state.shared = merged; if (PL.rezDirty) PL.rezDirty();
      if (f && S.eq(merged, mergeShared(empty, remote))) break;
      try { await S.putFile(cfg, "shared/rezepte.enc", await S.encJSON(cfg.gk, merged), f && f.sha, "Gemeinsame Gerichte aktualisiert"); break; }
      catch (e) { if (e.status !== 409 && e.status !== 422) throw e; }
    }
    return JSON.stringify(state.shared) !== before;
  }
  PL.sharedChanged = () => { clearTimeout(sync.shTimer); sync.shTimer = setTimeout(() => syncAll({ sharedOnly: true }), 1200); };

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
        if (opts.sharedOnly) {
          if (state.syncCfg && await syncShared()) { C.store.save(); if (["rezepte", "essen"].includes(state.ui.tab)) safeRender(); }
          setStatus("ok"); return;
        }
        const before = JSON.stringify(state.trips);
        if (state.syncCfg) await pullKeyring();
        if (state.syncCfg) { state.contacts.forEach((c) => { if (c.mine === undefined) c.mine = isMine(c); }); await ensureAdmin(); }
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
        let shChanged = false;
        if (state.syncCfg && !opts.only) {
          try { await registerLinks(); } catch (e) { console.warn("Protokoll", e); }
          try { shChanged = await syncShared(); } catch (e) { console.warn("Gerichte", e); }
        }
        if (state.syncCfg) await pushKeyring();
        C.store.save();
        const brokenNames = [...new Set(state.contacts.filter((c) => sync.broken.has(c.id)).map((c) => c.name))];
        brokenNames.forEach((n) => errs.push(`Die Verbindung mit ${n} passt nicht – bitte ${n} um einen neuen Verbindungs-Link bitten (bei ${n}: Einstellungen → Mitreisende → Link → „Neuen Link erzeugen“).`));
        if (errs.length) setStatus("error", errs.join(" · "));
        else setStatus("ok");
        if (JSON.stringify(state.trips) !== before || (shChanged && ["rezepte", "essen"].includes(state.ui.tab))) safeRender();
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
    if (got && ["unterwegs", "karte"].includes(state.ui.tab)) safeRender();
  }

  // =========================================================
  //  KOPFZEILE (Urlaubs-Auswahl & Sync-Status)
  // =========================================================
  function renderHeader() {
    const sel = $("#tripSwitch"); if (!sel) return;
    const t = trip();
    // oben die aktuellsten, darunter ältere, ganz unten Urlaube ohne Datum
    const when = (x) => x.von || (x.jahr ? String(x.jahr) + "-00" : "");
    const list = Object.values(state.trips).sort((a, b) => (!when(a) - !when(b)) || when(b).localeCompare(when(a)) || tripName(a).localeCompare(tripName(b)));
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
    // Teilreisen hängen direkt am Hauptteil
    const gKey = (t) => { const ps = partsOf(t); return [ps[0], ps.indexOf(t)]; };
    const byGroup = (cmp) => (a, b) => { const [ga, ia] = gKey(a), [gb, ib] = gKey(b); return ga === gb ? ia - ib : cmp(ga, gb); };
    const upcoming = list.filter((t) => !C.isPast(t, today)).sort(byGroup((a, b) => (a.von || "9999").localeCompare(b.von || "9999")));
    const past = list.filter((t) => C.isPast(t, today)).sort(byGroup((a, b) => C.sortKey(b).localeCompare(C.sortKey(a))));
    const card = (t) => {
      const d = daysUntil(t.von), running = t.von && t.von <= today && t.bis >= today;
      const when = !t.von ? (t.vergangen ? (t.jahr ? t.jahr : "Datum unbekannt") : `${t.tage} Tage · Datum offen`) : `${fmtDate(t.von, { day: "numeric", month: "short" })} – ${fmtDate(t.bis, { day: "numeric", month: "short", year: "numeric" })} · ${t.tage} Tage`;
      const countdown = running ? `<span class="countdown live">läuft gerade · Tag ${C.dayDiff(t.von, today) + 1}</span>` : d > 0 ? `<span class="countdown">in ${d} ${d === 1 ? "Tag" : "Tagen"}</span>` : "";
      const people = t.personen.map((p) => pname(t, p)).join(", ");
      const ps = partsOf(t), pi = ps.indexOf(t);
      const partLine = ps.length > 1 ? `<div class="part-line small">${ICONS.split} Teil ${pi + 1} von ${ps.length} · ${esc(groupName(t))}${withMe(t) ? "" : ` · <span class="badge">ohne dich</span>`}</div>` : "";
      return `<button class="card trip-tile ${ps.length > 1 ? "is-part" : ""} ${ps.length > 1 && pi > 0 ? "part-follow" : ""}" data-open="${t.id}">
        ${partLine}
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

  // ----- Reise aufteilen (Teil mit anderer Besetzung) -----
  function openSplit(t) {
    const names = t.personen.map((p) => (p.name || "").trim()).filter(Boolean);
    const canMove = !!t.von && t.tage > 1;
    openModal({
      title: "Reise aufteilen",
      body: `<p class="small muted">Lege einen Teil an, den ihr in anderer Besetzung gemacht habt – z. B. „erst zu viert, danach getrennte Wege“. Jeder Teil ist ein eigener Urlaub und wird nur mit den Personen geteilt, die dabei waren. Die Teile bleiben verknüpft und stehen in der Liste beieinander. Für jede Gruppe einfach einen eigenen Teil anlegen.</p>
        <form id="splitForm" class="form-grid">
          <label class="field c6">Wer war bei diesem Teil dabei?
            <div class="row wrap" style="gap:.3rem .9rem;margin-top:.3rem">${names.map((n) => `<label class="check-inline"><input type="checkbox" name="p" value="${esc(n)}"> ${esc(n)}</label>`).join("")}</div>
          </label>
          <label class="field c6">Weitere Personen <span class="muted">(kommagetrennt, optional)</span><input name="mehr" placeholder="z. B. Mutti"></label>
          <label class="field c6">Name des Teils<input name="name" placeholder="${esc(tripName(t))} – …"></label>
          ${canMove ? `<label class="field c6">Tage übernehmen
            <select name="ab"><option value="">keine – leerer Teil</option>${t.plan.slice(1, t.tage).map((r, i) => `<option value="${i + 1}">ab Tag ${i + 2} (${esc(dayLabel(t, i + 1))}) – diese Tage wandern in den neuen Teil</option>`).join("")}</select></label>
            <label class="field c3">…oder Anzahl Tage<input name="tage" type="number" min="1" value="1"></label>`
          : `<label class="field c3">Anzahl Tage <span class="muted">(falls bekannt)</span><input name="tage" type="number" min="1" placeholder="z. B. 7"></label>`}
          <p class="small muted c6" id="splitMsg">Tipp: Den gemeinsamen Teil behältst du hier – passe in seinen Eckdaten die Personen an (z. B. alle vier) und lege dann pro Gruppe einen Teil an.</p>
        </form>`,
      foot: `<button class="btn" data-close>Abbrechen</button><button class="btn primary" type="submit" form="splitForm">${ICONS.split} Teil anlegen</button>`,
      onMount: (m) => {
        const f = $("#splitForm", m);
        const sel = () => [...$$('input[name=p]:checked', m).map((x) => x.value), ...f.mehr.value.split(",").map((x) => C.niceName(x)).filter(Boolean)];
        const upd = () => { const ps = sel(); f.name.placeholder = `${groupName(t)} – ${ps.length ? ps.join(" & ") : "…"}`; };
        m.addEventListener("input", upd); upd();
        f.addEventListener("submit", (e) => {
          e.preventDefault();
          const ps = [...new Set(sel())];
          if (!ps.length) return ($("#splitMsg", m).textContent = "Bitte mindestens eine Person auswählen.");
          if (!t.gruppe) t.gruppe = t.id;
          const n = C.newTrip(t.arten);
          Object.assign(n, { name: f.name.value.trim() || f.name.placeholder, ziel: t.ziel, waehrung: t.waehrung, waehrungen: t.waehrungen, kurse: t.kurse, module: [...t.module], gruppe: t.gruppe, vergangen: t.vergangen, jahr: t.jahr });
          n.personen = ps.map((name) => ({ id: uid(), name }));
          const ab = f.ab ? parseInt(f.ab.value, 10) : NaN;
          if (canMove && ab > 0) {
            ensurePlan(t);
            n.von = dateOf(t, ab); n.tage = t.tage - ab; n.bis = addDays(n.von, n.tage - 1);
            n.plan = t.plan.splice(ab, t.tage - ab);
            const moved = new Set(n.plan.map((r) => r.id));
            (t.tickets || []).forEach((x) => { if (moved.has(x.tag)) x.tag = ""; }); // Unterlagen bleiben im ursprünglichen Teil (unter „Allgemein“)
            t.tage = ab; t.bis = addDays(t.von, t.tage - 1);
          } else {
            n.tage = parseInt(f.tage && f.tage.value, 10) || 1;
            if (t.von) { n.von = addDays(t.bis || t.von, 1); n.bis = addDays(n.von, n.tage - 1); }
          }
          const me = n.personen.find((p) => C.normName(p.name) === C.normName(state.profile.name));
          if (me) state.me[n.id] = me.id; else delete state.me[n.id];
          state.trips[n.id] = C.migrate(n);
          closeModal(); C.commit();
          syncAll();
          toast(`Teil „${tripName(n)}“ angelegt${me ? "" : " – du bist nicht dabei, er wird aber mit den Verbundenen geteilt"}.`);
        });
      }
    });
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
      kosten: (t.kosten || []).reduce((s, k) => s + inBase(t, k), 0),
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
          <button class="btn sm" data-act="split" title="Einen Teil der Reise mit anderer Besetzung anlegen">${ICONS.split} Aufteilen</button>
          <button class="btn sm" data-act="invite">${ICONS.users} Einladen</button>
          <button class="btn sm" data-act="export">${ICONS.excel} Excel</button>
          <button class="btn sm" data-act="map">${ICONS.map} Karte</button>
          <button class="btn sm ghost" data-act="toggle-meta" aria-expanded="${!!state.ui.metaOpen}">${ICON.edit} Eckdaten</button>
        </div>
        ${partsOf(t).length > 1 ? `<div class="parts-bar small"><span class="muted">${ICONS.split} Teile von „${esc(groupName(t))}“:</span> ${partsOf(t).map((x, i) => `<button class="chip chip-s ${x.id === t.id ? "on" : ""}" data-part="${x.id}">${i + 1}. ${esc(tripName(x))} <span class="muted">(${esc(x.personen.map((p) => pname(x, p)).join(", "))})</span></button>`).join("")}</div>` : ""}
        ${state.ui.metaOpen || !t.von ? `<div class="meta-box">${C.metaFields(t)}
          <div class="row" style="margin-top:.8rem">
            <button class="btn sm" data-act="dup">Duplizieren</button>
            ${state.keys[t.id] && state.keys[t.id].owner === false ? `<button class="btn sm danger" data-act="leave">Urlaub verlassen</button>` : `<button class="btn sm danger" data-act="delete">${ICONS.trash} Urlaub löschen</button>`}
          </div></div>` : ""}
      </div>`;

    const track = (rid) => (t.tracks || []).find((x) => x.tag === rid);
    // Zelle „Wanderung“: Link + GPX (Datei wählen oder auf die Zeile ziehen)
    const tourCell = (r, label) => {
      const tr = track(r.id), url = /^https?:\/\//i.test(r.tour || "") ? r.tour : "";
      return `<div class="tour-cell"><input data-cell="${r.id}:tour" value="${esc(r.tour || "")}" placeholder="outdooractive-Link" inputmode="url" aria-label="Wanderung (Link) – ${esc(label)}">
        <div class="tour-btns">${url ? `<a class="mini-btn" href="${esc(url)}" target="_blank" rel="noopener" title="Tour öffnen – dort „GPX herunterladen“">${ICONS.map}<span>öffnen</span></a>` : ""}
        ${tr ? `<button class="mini-btn ok" data-gpxdl="${tr.id}" title="${esc(tr.name)} – GPX herunterladen">${ICONS.route || "↓"}<span>GPX ✓</span></button>`
          : `<label class="mini-btn" title="GPX-Datei hinzufügen (oder auf die Zeile ziehen)">${ICON.plus}<span>GPX</span><input type="file" accept=".gpx,application/gpx+xml" data-gpxadd="${r.id}" hidden></label>`}</div></div>`;
    };
    let body;
    if (cards) {
      const closed = state.ui.planClosed ||= {};
      body = `<div class="row plan-cards-tools"><button class="btn sm ghost" data-act="cards-all" data-id="open">Alle ausklappen</button><button class="btn sm ghost" data-act="cards-all" data-id="closed">Alle einklappen</button></div>
      <div class="day-cards">${t.plan.map((r, i) => {
        const out = i >= t.tage, isClosed = !!closed[r.id];
        const facts = [r.von && r.nach ? `${r.von} → ${r.nach}` : r.von || r.nach, r.km && `${r.km} km`, r.dauer, r.hoch && `↑ ${r.hoch} m`].filter(Boolean).join(" · ");
        const showNums = r.typ === "wandern" || ["fahrt", "anreise", "abreise"].includes(r.typ) || r.km || r.dauer;
        return `<div class="card day-card typ-${r.typ || "none"} ${out ? "out" : ""} ${isClosed ? "closed" : ""}" data-row="${r.id}">
          <div class="dc-head">
            <button class="dc-toggle" data-act="card-toggle" data-id="${r.id}" aria-expanded="${!isClosed}"><b>${out ? "nach Reiseende" : esc(dayLabel(t, i))}</b><small>Tag ${i + 1}${isClosed && r.titel ? " · " + esc(firstLine(r.titel)) : ""}</small></button>
            <select data-cell="${r.id}:typ" aria-label="Art des Tages">${TYPEN.map((x) => `<option value="${x.id}" ${x.id === (r.typ || "") ? "selected" : ""}>${x.name}</option>`).join("")}</select>
            <button class="icon-btn" data-act="day" data-id="${r.id}" title="Unterlagen & GPX" aria-label="Unterlagen & GPX">${ICONS.clip}${fileCount(r.id) ? `<span class="count-badge">${fileCount(r.id)}</span>` : ""}</button>
            ${out ? `<button class="icon-btn" data-act="delrow" data-id="${r.id}" aria-label="Zeile löschen">${ICONS.trash}</button>` : ""}
            <button class="icon-btn chev-btn" data-act="card-toggle" data-id="${r.id}" aria-label="${isClosed ? "Ausklappen" : "Einklappen"}">${isClosed ? "▾" : "▴"}</button>
          </div>
          ${isClosed ? (facts ? `<div class="dc-facts small muted">${esc(facts)}</div>` : "") : `
          <label class="dc-l">Programm</label>${richBox(r.id + ":titel", r.titel, "Was machen wir? Gern ausführlich – jede Zeile ein Programmpunkt.", "Programm – " + dayLabel(t, i), "big")}
          <div class="dc-grid">
            <label class="dc-f f-von"><span>Von</span><input data-cell="${r.id}:von" value="${esc(r.von || "")}" placeholder="Start"></label>
            <label class="dc-f f-nach"><span>Nach</span><input data-cell="${r.id}:nach" value="${esc(r.nach || "")}" placeholder="Ziel"></label>
            ${showNums ? ["km", "dauer", "hoch", "runter"].map((k) => { const f = FIELDS.find((x) => x.k === k); return `<label class="dc-f n f-${k}"><span>${f.h}</span><input data-cell="${r.id}:${k}" value="${esc(r[k] ?? "")}" placeholder="${f.ph}" ${f.num ? 'inputmode="decimal"' : ""}></label>`; }).join("") : ""}
          </div>
          <label class="dc-l">Highlights</label>${richBox(r.id + ":highlights", r.highlights, "Was darf man nicht verpassen?", "Highlights – " + dayLabel(t, i))}
          <label class="dc-l">Unterkunft</label>${richBox(r.id + ":unterkunft", r.unterkunft, "Name, Adresse, Check-in …", "Unterkunft – " + dayLabel(t, i))}
          <label class="dc-l">Wanderung</label>${tourCell(r, dayLabel(t, i))}
          <label class="dc-l">Hinweise & Sonstiges</label>${richBox(r.id + ":notizen", r.notizen, "z. B. Fahrtag, Reservierung nötig, Supermarkt am Ziel …", "Hinweise & Sonstiges – " + dayLabel(t, i))}`}
        </div>`;
      }).join("")}</div>`;
    } else {
      const s = planStats(t);
      body = `<div class="card sheet-wrap"><table class="sheet">
        <colgroup><col style="width:7.5em"><col style="width:8.8em">${FIELDS.map((f) => `<col style="width:${f.w}em">`).join("")}<col style="width:3em"></colgroup>
        <thead><tr><th class="sticky-col">Datum</th><th>Art</th>${FIELDS.map((f) => `<th class="${f.num ? "n" : ""}">${f.h}</th>`).join("")}<th aria-label="Unterlagen">${ICONS.clip}</th></tr></thead>
        <tbody>${t.plan.map((r, i) => {
          const out = i >= t.tage, label = dayLabel(t, i);
          return `<tr class="typ-${r.typ || "none"} ${out ? "out" : ""}" data-row="${r.id}" data-gpxdrop="${r.id}">
            <th class="sticky-col day-th">${out ? "<small>nach Ende</small>" : esc(label)}</th>
            <td><select data-cell="${r.id}:typ" aria-label="Art des Tages">${TYPEN.map((x) => `<option value="${x.id}" ${x.id === (r.typ || "") ? "selected" : ""}>${x.name}</option>`).join("")}</select></td>
            ${FIELDS.map((f) => `<td class="${f.num ? "n" : ""} ${f.rich ? "rt" : ""}">${f.rich ? richBox(r.id + ":" + f.k, r[f.k], "", f.h + " – " + label, f.k === "titel" ? "cell big" : "cell")
              : f.link ? tourCell(r, label)
              : `<input data-cell="${r.id}:${f.k}" value="${esc(r[f.k] ?? "")}" ${f.num ? 'inputmode="decimal"' : ""} aria-label="${f.h} – ${esc(label)}" title="${esc(r[f.k] ?? "")}">`}</td>`).join("")}
            <td class="c"><button class="icon-btn" data-act="day" data-id="${r.id}" title="Unterlagen & GPX" aria-label="Unterlagen & GPX">${fileCount(r.id) ? `<span class="count-badge solo">${fileCount(r.id)}</span>` : ICONS.expand}</button>
              ${out ? `<button class="icon-btn" data-act="delrow" data-id="${r.id}" aria-label="Zeile löschen">${ICONS.trash}</button>` : ""}</td>
          </tr>`;
        }).join("")}</tbody>
        <tfoot><tr><th class="sticky-col">Summe</th><td></td><td colspan="3" class="muted small">${s.wTage} Wandertage · ${fmtDur(s.wMin)} Gehzeit</td>
          <td class="n" data-sum="km">${fmtNum(s.wKm + s.fKm, 1)}</td><td></td><td class="n" data-sum="hoch">${fmtNum(s.hoch)}</td><td class="n" data-sum="runter">${fmtNum(s.runter)}</td><td colspan="5"></td></tr></tfoot>
      </table></div>`;
    }
    // Recherche-Kasten: Empfehlungen, wichtige Infos, Unterkünfte, Essen
    const rc = t.recherche || {};
    body += `<section class="card card-pad recherche">
      <div class="row" style="justify-content:space-between;align-items:baseline"><h3 class="section-title">Recherche & Optionen vor Ort</h3><span class="muted small">für die ganze Reise · erscheint auch bei „Unterwegs“</span></div>
      <div class="rc-grid">${RECHERCHE.map((f) => `<div class="rc-f"><label class="dc-l">${f.h}</label>${richBox("R:" + f.k, rc[f.k], f.ph, f.h, "rc")}</div>`).join("")}</div>
      <p class="hint" style="margin:.6rem 0 0">Fett und kursiv: Text markieren und <b>F</b> / <i>K</i> tippen – oder Strg+B / Strg+I.</p>
    </section>`;
    el.innerHTML = head + whoAmI(t) + statsHtml(t) + `
      <div class="row plan-tools no-print">
        <div class="seg"><button data-act="view" data-id="tabelle" class="${cards ? "" : "on"}">Tabelle</button><button data-act="view" data-id="karten" class="${cards ? "on" : ""}">Karten</button></div>
        <span class="muted small">${cards ? "" : "Tab = nächste Zelle · Änderungen werden automatisch gespeichert"}</span>
        <span class="spacer"></span>
        <button class="btn sm" data-act="print" title="Lädt die Excel-Datei – im Querformat auf Seitenbreite eingestellt, fertig zum Drucken">${ICON.print} Drucken (Excel)</button>
      </div>
      ${extra ? `<p class="hint">Der Zeitraum ist kürzer als der Plan – Tage nach Reiseende sind grau markiert und können gelöscht werden.</p>` : ""}
      ${body}`;
    requestAnimationFrame(() => markOver(el));
  }

  function onPlanClick(e) {
    const t = trip();
    const me = e.target.closest("[data-me]");
    if (me) { C.setMe(t, me.dataset.me); state.ui.viewPerson = me.dataset.me; return C.commit(); }
    const part = e.target.closest("[data-part]");
    if (part) { state.current = part.dataset.part; C.store.save(); syncAll({ only: part.dataset.part }); return C.render(); }
    const gdl = e.target.closest("[data-gpxdl]");
    if (gdl && PL.gpx) return PL.gpx.download(t, gdl.dataset.gpxdl);
    const a = e.target.closest("[data-act]");
    if (!a) return;
    // Eckdaten (Kalender, Reiseart …) übernimmt die gemeinsame Logik
    if (a.closest(".meta-box") && !["dup", "delete", "leave"].includes(a.dataset.act)) return C.onPackClick(e);
    switch (a.dataset.act) {
      case "split": return openSplit(t);
      case "toggle-meta": state.ui.metaOpen = !state.ui.metaOpen; return C.commit();
      case "view": state.ui.planView = a.dataset.id; return C.commit();
      case "card-toggle": { const c = state.ui.planClosed ||= {}; if (c[a.dataset.id]) delete c[a.dataset.id]; else c[a.dataset.id] = 1; return C.commit(); }
      case "cards-all": { state.ui.planClosed = {}; if (a.dataset.id === "closed") t.plan.forEach((r) => { state.ui.planClosed[r.id] = 1; }); return C.commit(); }
      case "day": return openDay(t, a.dataset.id);
      case "delrow": t.plan = t.plan.filter((r) => r.id !== a.dataset.id); return C.commit();
      case "invite": return openInvite(t);
      case "export": return exportExcel(t);
      case "map": state.ui.mapTrip = t.id; state.ui.mapDetail = "route"; C.store.save(); location.hash = "karte"; return;
      case "print": return exportExcel(t); // Drucken = druckfertige Excel-Datei
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
    if (el.dataset.gpxadd != null) { const f = el.files[0]; if (f && PL.gpx) PL.gpx.import(trip(), f, el.dataset.gpxadd).then(() => C.render()); return; }
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
      body: `${r.titel ? `<div class="day-sum">${showHtml(r.titel)}</div>` : ""}
      <h4 class="form-sub">Tickets & Unterlagen für diesen Tag</h4>
      <div id="dayFiles" data-drop="${rid}">${filesHtml(t, rid)}</div>
      ${PL.gpx ? `<h4 class="form-sub" style="margin-top:1rem">GPX-Track (z. B. aus Outdooractive)</h4><div id="dayGpx">${PL.gpx.rowHtml(t, rid)}</div>
        ${/^https?:/i.test(r.tour || "") ? `<p class="hint" style="margin-top:.4rem"><a href="${esc(r.tour)}" target="_blank" rel="noopener">Tour bei outdooractive öffnen</a> → dort „GPX herunterladen“ → Datei hier wählen.</p>` : ""}` : ""}`,
      foot: `<button class="btn primary" data-close>Fertig</button>`,
      onMount: (m) => {
        bindFiles($("#dayFiles", m), t, rid, () => { $("#dayFiles", m).innerHTML = filesHtml(t, rid); });
        if (PL.gpx) PL.gpx.bindRow($("#dayGpx", m), t, rid, () => { $("#dayGpx", m).innerHTML = PL.gpx.rowHtml(t, rid); });
      },
      onClose: () => C.render()
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
    t.plan.slice(0, t.tage).map((r, i) => `<option value="${r.id}" ${r.id === sel ? "selected" : ""}>${esc(dayLabel(t, i))}${r.titel ? " · " + esc(firstLine(r.titel)) : ""}</option>`).join("");
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
    const tourUrl = /^https?:/i.test(r.tour || "") ? r.tour : "";
    const more = String(r.titel || "").includes("\n") || /\*/.test(r.titel || "");
    return `<div class="uw-body">
      ${route ? `<div class="tc-route">${esc(route)}</div>` : ""}
      ${facts.length ? `<div class="tc-facts">${facts.map((x) => `<span>${esc(x)}</span>`).join("")}</div>` : ""}
      ${more ? `<div class="tc-sec"><h4>Programm</h4><p>${showHtml(r.titel)}</p></div>` : ""}
      ${track || tourUrl || r.tour ? `<div class="tc-sec"><h4>Wanderung</h4><div class="row" style="gap:.4rem">
        ${track ? `<button class="btn sm primary" data-gpxdl="${track.id}">GPX herunterladen</button><a class="btn sm" href="#karte" data-mapday="${r.id}">${ICONS.map} Auf der Karte</a>` : ""}
        ${tourUrl ? `<a class="btn sm" href="${esc(tourUrl)}" target="_blank" rel="noopener">Tour bei outdooractive</a>` : r.tour ? `<span>${esc(r.tour)}</span>` : ""}</div>
        ${track ? `<p class="small muted" style="margin:.35rem 0 0">${esc(track.name)}</p>` : ""}</div>` : ""}
      ${r.highlights ? `<div class="tc-sec"><h4>Highlights</h4><p>${showHtml(r.highlights)}</p></div>` : ""}
      ${r.unterkunft ? `<div class="tc-sec"><h4>Unterkunft</h4><p>${showHtml(r.unterkunft)} <a class="map-link" href="${maps(plain(r.unterkunft).split("\n")[0] + " " + (r.nach || t.ziel || ""))}" target="_blank" rel="noopener">${ICONS.map} Karte</a></p></div>` : ""}
      ${r.notizen ? `<div class="tc-sec"><h4>Hinweise & Sonstiges</h4><p>${showHtml(r.notizen)}</p></div>` : ""}
      <div class="tc-sec"><h4>Tickets & Unterlagen</h4>${filesHtml(t, r.id)}</div>
      <div class="row" style="margin-top:.6rem"><button class="btn sm" data-act="edit" data-id="${r.id}">${ICON.edit} Tag bearbeiten</button></div>
    </div>`;
  }
  // Empfehlungen & wichtige Infos aus der Planung – immer vor Augen
  function recherCard(t) {
    const rc = t.recherche || {}; const parts = RECHERCHE.filter((f) => String(rc[f.k] || "").trim());
    if (!parts.length) return "";
    const open = state.ui.rcOpen !== false;
    return `<section class="card card-pad uw-rc">
      <button class="uw-rc-head" data-act="rc-toggle" aria-expanded="${open}"><h3 class="section-title">Empfehlungen & wichtige Infos</h3><span class="chev">${open ? "▴" : "▾"}</span></button>
      ${open ? `<div class="rc-grid ro">${parts.map((f) => `<div class="tc-sec"><h4>${f.h}</h4><p>${showHtml(rc[f.k])}</p></div>`).join("")}</div>
      <p class="small muted" style="margin:.5rem 0 0">Bearbeiten in der <a href="#plan">Planung</a>.</p>` : ""}
    </section>`;
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
      ${recherCard(t)}
      <p class="muted small uw-hint">${ICONS.clip} Dateien einfach auf einen Tag ziehen – oder vorhandene Dateien zwischen Tagen verschieben.</p>
      <div class="uw-days">${t.plan.slice(0, t.tage).map((r, i) => {
        const isOpen = open.has(r.id); const n = files.filter((f) => f.tag === r.id).length;
        return `<section class="card uw-day typ-${r.typ || "none"} ${isOpen ? "open" : ""} ${i === ti ? "is-today" : ""}" data-drop="${r.id}" id="uw-${r.id}">
          <button class="uw-head" data-toggle="${r.id}" aria-expanded="${isOpen}">
            <span class="uw-date"><b>${esc(dayLabel(t, i))}</b><small>Tag ${i + 1}${i === ti ? " · heute" : ""}</small></span>
            <span class="uw-title">${r.typ ? `<span class="badge typ-badge">${typName(r.typ)}</span>` : ""}<span>${r.titel ? mdInline(String(r.titel).split("\n")[0]) : r.typ ? "" : "–"}</span></span>
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
    const rct = e.target.closest("[data-act=rc-toggle]"); if (rct) { state.ui.rcOpen = state.ui.rcOpen === false; C.store.save(); return C.render(); }
    const gdl = e.target.closest("[data-gpxdl]"); if (gdl && PL.gpx) return PL.gpx.download(trip(), gdl.dataset.gpxdl);
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
      const b = inBase(t, k); if (!b) return;
      const fuer = (k.fuer && k.fuer.length ? k.fuer : ids).filter((x) => ids.includes(x));
      if (k.von && paid[k.von] != null) paid[k.von] += b;
      fuer.forEach((x) => { share[x] += b / (fuer.length || 1); });
    });
    // beglichene Ausgleichszahlungen: von hat an überwiesen
    const sent = {}; ids.forEach((id) => { sent[id] = 0; });
    (t.zahlungen || []).forEach((z) => { if (sent[z.von] != null && sent[z.an] != null) { sent[z.von] += num(z.betrag); sent[z.an] -= num(z.betrag); } });
    const saldo = {}; ids.forEach((id) => { saldo[id] = paid[id] - share[id] + sent[id]; });
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
    return { paid, share, saldo, transfers, sent };
  }
  function renderKosten() {
    const t = trip(); const el = $("#view-kosten");
    const ids = t.personen.map((p) => p.id);
    const base = baseCode(t), curs = tripCurrencies(t);
    const missing = curs.filter((c) => c !== base && !rateOf(t, c));
    const total = (t.kosten || []).reduce((s, k) => s + inBase(t, k), 0);
    const b = balances(t);
    const byKat = {}; (t.kosten || []).forEach((k) => { const kat = k.kat || "Sonstiges"; byKat[kat] = (byKat[kat] || 0) + inBase(t, k); });
    const sorted = [...(t.kosten || [])].sort((a, c) => (a.datum || "9999").localeCompare(c.datum || "9999"));
    const curOpts = (sel) => curs.map((c) => `<option value="${c}" ${c === sel ? "selected" : ""}>${c}</option>`).join("") + `<option value="+">+ weitere …</option>`;
    const rc = state.ui.rechner ||= { betrag: "100", von: curs.find((c) => c !== base) || base };
    if (!curs.includes(rc.von) || rc.von === base) rc.von = curs.find((c) => c !== base) || base;
    const rcVal = num(rc.betrag) * (rateOf(t, rc.von) || 0);
    el.innerHTML = `
      ${whoAmI(t)}
      ${missing.length ? `<div class="card card-pad warn-box">Für ${missing.join(", ")} fehlt noch ein Kurs – diese Ausgaben zählen erst mit, wenn rechts unter „Währungen“ ein Kurs steht. <button class="btn sm" data-act="kurse">Kurse jetzt holen</button></div>` : ""}
      <div class="kosten-layout">
        <div class="card sheet-wrap">
          <table class="sheet kosten">
            <thead><tr><th style="width:8.6em">Datum</th><th class="n" style="width:12em">Betrag</th><th>Wofür</th><th style="width:9.5em">Kategorie</th><th style="width:8em">Bezahlt von</th><th style="width:11em">Für wen</th><th style="width:2.5em"></th></tr></thead>
            <tbody>${sorted.map((k) => { const kc = kCode(t, k), foreign = kc !== base; return `<tr data-k="${k.id}">
              <td><input data-kc="${k.id}:datum" value="${C.toDE(k.datum || "")}" placeholder="TT.MM.JJJJ" inputmode="numeric"></td>
              <td class="n"><div class="amt"><input data-kc="${k.id}:betrag" value="${k.betrag != null && k.betrag !== "" ? String(k.betrag).replace(".", ",") : ""}" inputmode="decimal" placeholder="0,00" aria-label="Betrag">
                <select data-kc="${k.id}:wae" class="cur-sel" aria-label="Währung">${curOpts(kc)}</select></div>
                ${foreign && num(k.betrag) ? `<div class="conv">${rateOf(t, kc) ? "≈ " + money(t, inBase(t, k)) : "Kurs fehlt"}</div>` : ""}</td>
              <td><input data-kc="${k.id}:grund" value="${esc(k.grund || "")}" placeholder="z. B. Hotel Lyon"></td>
              <td><select data-kc="${k.id}:kat">${KATEGORIEN.map((x) => `<option ${x === (k.kat || "Sonstiges") ? "selected" : ""}>${x}</option>`).join("")}</select></td>
              <td><select data-kc="${k.id}:von"><option value="">–</option>${t.personen.map((p) => `<option value="${p.id}" ${p.id === k.von ? "selected" : ""}>${esc(pname(t, p))}</option>`).join("")}</select></td>
              <td><div class="fuer">${t.personen.map((p) => { const on = !k.fuer || !k.fuer.length || k.fuer.includes(p.id); return `<button class="chip chip-s ${on ? "on" : ""}" data-fuer="${k.id}:${p.id}" aria-pressed="${on}">${esc(pname(t, p))}</button>`; }).join("")}</div></td>
              <td class="c"><button class="icon-btn" data-kdel="${k.id}" aria-label="Ausgabe löschen">${ICONS.trash}</button></td>
            </tr>`; }).join("") || `<tr><td colspan="7" class="muted" style="padding:1rem">Noch keine Ausgaben eingetragen.</td></tr>`}</tbody>
            <tfoot><tr><th>Summe</th><td class="n"><b>${money(t, total)}</b></td><td colspan="5" class="muted small">${curs.length > 1 ? "alles umgerechnet in " + base : ""}</td></tr></tfoot>
          </table>
          <div class="row" style="padding:.7rem"><button class="btn primary sm" data-act="add">${ICON.plus} Ausgabe</button></div>
        </div>
        <aside class="stack">
          <div class="card card-pad">
            <h3 class="section-title">Aufteilung</h3>
            <table class="bal">
              <thead><tr><th></th><th class="n">bezahlt</th><th class="n">Anteil</th><th class="n">offen</th></tr></thead>
              <tbody>${ids.map((id) => `<tr><td>${esc(pname(t, person(t, id)))}</td><td class="n">${money(t, b.paid[id])}</td><td class="n">${money(t, b.share[id])}</td><td class="n ${b.saldo[id] > 0.005 ? "pos" : b.saldo[id] < -0.005 ? "neg" : ""}">${Math.abs(b.saldo[id]) < 0.005 ? "–" : (b.saldo[id] > 0 ? "+" : "") + money(t, b.saldo[id])}</td></tr>`).join("")}</tbody>
            </table>
            <h4 class="form-sub" style="margin-top:1rem">Ausgleich</h4>
            ${b.transfers.length ? `<ul class="transfers">${b.transfers.map((x) => `<li><span class="tr-who"><b>${esc(pname(t, person(t, x.von)))}</b> → <b>${esc(pname(t, person(t, x.an)))}</b></span><span>${money(t, x.betrag)}</span>
                <button class="btn sm" data-settle="${x.von}:${x.an}:${Math.round(x.betrag * 100) / 100}" title="Als bezahlt markieren">Beglichen</button></li>`).join("")}</ul>`
              : `<p class="muted small">${(t.kosten || []).length ? "✓ Alles beglichen." : "Noch nichts aufzuteilen."}</p>`}
            ${(t.zahlungen || []).length ? `<h4 class="form-sub" style="margin-top:1rem">Beglichen</h4><ul class="transfers done">${[...t.zahlungen].sort((a, c) => (c.am || "").localeCompare(a.am || "")).map((z) => `<li><span class="tr-who">${esc(pname(t, person(t, z.von)))} → ${esc(pname(t, person(t, z.an)))}<small>${z.am ? fmtDate(z.am) : ""}</small></span><span>${money(t, num(z.betrag))}</span>
                <button class="icon-btn" data-unsettle="${z.id}" aria-label="Rückgängig" title="Rückgängig">${ICONS.trash}</button></li>`).join("")}</ul>` : ""}
            <p class="hint" style="margin-top:.6rem">Jede Ausgabe wird gleichmäßig auf die Personen unter „Für wen“ verteilt. „Beglichen“ trägt die Überweisung ein – danach ist der Betrag nicht mehr offen.</p>
          </div>
          <div class="card card-pad" id="waehrungen">
            <h3 class="section-title">Währungen & Rechner</h3>
            <label class="field small">Hauptwährung (darin wird abgerechnet)
              <select class="input" data-act="basis">${WAEHRUNGEN.map((w) => `<option value="${w[0]}" ${w[0] === base ? "selected" : ""}>${w[0]} – ${w[2]}</option>`).join("")}</select></label>
            ${curs.filter((c) => c !== base).map((c) => { const k = (t.kurse || {})[c] || {}; return `<div class="rate-row"><span>1 ${c} =</span><input class="input" data-rate="${c}" value="${k.r ? String(+(+k.r).toPrecision(6)).replace(".", ",") : ""}" inputmode="decimal" placeholder="Kurs"><span>${base}</span>
              <small class="muted">${k.r ? `1 ${base} = ${fmtN(1 / k.r, 1 / k.r >= 100 ? 0 : 2)} ${c}${k.am ? " · " + (k.auto ? "Stand " : "eigener Kurs, ") + fmtDate(k.am) : ""}` : "noch kein Kurs"}</small>
              ${(t.kosten || []).some((x) => kCode(t, x) === c) ? "" : `<button class="icon-btn" data-curdel="${c}" aria-label="${c} entfernen">${ICONS.trash}</button>`}</div>`; }).join("")}
            <div class="row" style="gap:.4rem;margin:.6rem 0">
              <select class="input" data-act="addcur" style="max-width:12rem"><option value="">+ Währung hinzufügen</option>${WAEHRUNGEN.filter((w) => !curs.includes(w[0])).map((w) => `<option value="${w[0]}">${w[0]} – ${w[2]}</option>`).join("")}</select>
              ${curs.length > 1 ? `<button class="btn sm" data-act="kurse" ${navigator.onLine ? "" : "disabled"}>Aktuelle Kurse holen</button>` : ""}</div>
            ${curs.length > 1 ? `<div class="rechner">
              <input class="input" data-rc="betrag" value="${esc(rc.betrag)}" inputmode="decimal" aria-label="Betrag">
              <select class="input" data-rc="von" aria-label="Währung">${curs.filter((c) => c !== base).map((c) => `<option ${c === rc.von ? "selected" : ""}>${c}</option>`).join("")}</select>
              <span class="eq">=</span><b data-rc-out>${rateOf(t, rc.von) ? moneyIn(base, rcVal) : "–"}</b>
              <small class="muted" data-rc-back>${rateOf(t, rc.von) ? `${moneyIn(base, num(rc.betrag))} = ${moneyIn(rc.von, num(rc.betrag) / rateOf(t, rc.von))}` : ""}</small>
            </div>` : `<p class="hint">Füge eine Fremdwährung hinzu, um Ausgaben darin einzutragen und umzurechnen.</p>`}
          </div>
          ${Object.keys(byKat).length ? `<div class="card card-pad"><h3 class="section-title">Nach Kategorie</h3>
            <ul class="katlist">${Object.entries(byKat).sort((a, c) => c[1] - a[1]).map(([k, v]) => `<li><span>${esc(k)}</span><span class="bar"><i style="width:${total ? (v / total) * 100 : 0}%"></i></span><b>${money(t, v)}</b></li>`).join("")}</ul></div>` : ""}
        </aside>
      </div>`;
  }
  // Kurse von open.er-api.com (kostenlos, ohne Schlüssel)
  async function fetchRates(t) {
    const base = baseCode(t), want = tripCurrencies(t).filter((c) => c !== base);
    if (!want.length) return;
    try {
      const r = await fetch(`https://open.er-api.com/v6/latest/${base}`); const d = await r.json();
      if (d.result !== "success") throw new Error("keine Kurse");
      t.kurse ||= {}; const day = C.todayISO(); const got = [];
      want.forEach((c) => { const x = d.rates[c]; if (x) { t.kurse[c] = { r: Math.round((1 / x) * 1e8) / 1e8, am: day, auto: true }; got.push(c); } });
      C.commit(); toast(got.length ? `Kurse aktualisiert: ${got.join(", ")}` : "Für diese Währungen gibt es keine Kurse – bitte selbst eintragen.");
    } catch { toast("Kurse konnten gerade nicht geladen werden – du kannst sie auch selbst eintragen."); }
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
    const st = e.target.closest("[data-settle]");
    if (st) {
      const [von, an, betrag] = st.dataset.settle.split(":");
      (t.zahlungen ||= []).push({ id: uid() + uid(), von, an, betrag: +betrag, am: C.todayISO() });
      toast(`${pname(t, person(t, von))} → ${pname(t, person(t, an))}: ${money(t, +betrag)} als beglichen eingetragen.`); return C.commit();
    }
    const us = e.target.closest("[data-unsettle]");
    if (us) { if (!armed(us, "×?")) return; t.zahlungen = (t.zahlungen || []).filter((z) => z.id !== us.dataset.unsettle); return C.commit(); }
    const cd = e.target.closest("[data-curdel]");
    if (cd) { t.waehrungen = (t.waehrungen || []).filter((c) => c !== cd.dataset.curdel); return C.commit(); }
    const ku = e.target.closest("[data-act=kurse]");
    if (ku) { ku.disabled = true; return fetchRates(t); }
    const d = e.target.closest("[data-kdel]");
    if (d) { if (!armed(d, "×?")) return; t.kosten = t.kosten.filter((x) => x.id !== d.dataset.kdel); return C.commit(); }
    const a = e.target.closest("[data-act]");
    if (a && a.dataset.act === "add") {
      const last = [...t.kosten].reverse().find((x) => x.wae);
      t.kosten.push({ id: uid() + uid(), datum: C.todayISO(), betrag: "", grund: "", kat: "Sonstiges", von: C.myId(t) || t.personen[0].id, fuer: [], ...(last && last.wae !== baseCode(t) ? { wae: last.wae } : {}) });
      C.commit();
      const rows = $$("[data-kc$=':grund']"); const k = t.kosten[t.kosten.length - 1];
      const inp = $(`[data-kc="${k.id}:betrag"]`); if (inp) inp.focus();
      return rows;
    }
  }
  function onKostenChange(e) {
    const t = trip(); const el = e.target;
    if (el.dataset.act === "basis") {
      const old = baseCode(t), nb = el.value; if (nb === old) return;
      // Kurse auf die neue Hauptwährung umrechnen
      const k = t.kurse ||= {}; const f = rateOf(t, nb);
      if (!f && ((t.zahlungen || []).length || (t.kosten || []).length)) { el.value = old; return toast(`Bitte zuerst einen Kurs für ${nb} eintragen (unter „+ Währung hinzufügen“), dann umstellen.`); }
      const neu = {}; if (f) { tripCurrencies(t).forEach((c) => { if (c !== nb) { const r = c === old ? 1 / f : rateOf(t, c) / f; if (r) neu[c] = { r: Math.round(r * 1e8) / 1e8, am: (k[c] || {}).am || C.todayISO(), auto: !!(k[c] || {}).auto }; } }); }
      t.kurse = neu; t.waehrungen = [...new Set([...(t.waehrungen || []), old])].filter((c) => c !== nb);
      (t.kosten || []).forEach((x) => { if (!x.wae) x.wae = old; if (x.wae === nb) delete x.wae; });
      t.waehrung = nb === "EUR" ? "€" : nb;
      // Bereits beglichene Beträge in die neue Währung umrechnen
      (t.zahlungen || []).forEach((z) => { const r = f ? 1 / f : 0; if (r) z.betrag = Math.round(num(z.betrag) * r * 100) / 100; });
      return C.commit();
    }
    if (el.dataset.act === "addcur") { const c = el.value; if (c) { t.waehrungen = [...new Set([...(t.waehrungen || []), c])]; C.commit(); if (navigator.onLine) fetchRates(t); } return; }
    if (el.dataset.rate) {
      const v = num(el.value); t.kurse ||= {};
      if (v > 0) t.kurse[el.dataset.rate] = { r: v, am: C.todayISO(), auto: false }; else delete t.kurse[el.dataset.rate];
      return C.commit();
    }
    if (el.dataset.rc) { (state.ui.rechner ||= {})[el.dataset.rc] = el.value; C.store.save(); return C.render(); }
    const c = el.dataset.kc; if (!c) return;
    const [kid, f] = c.split(":"); const k = t.kosten.find((x) => x.id === kid); if (!k) return;
    let v = el.value.trim();
    if (f === "datum") { const d = C.parseDE(v); if (d === null) { toast("Datum nicht erkannt – TT.MM.JJJJ"); return C.render(); } v = d; }
    if (f === "betrag") { v = v ? Math.round(num(v) * 100) / 100 : ""; }
    if (f === "wae") {
      if (v === "+") { el.value = kCode(t, k); $("#waehrungen [data-act=addcur]")?.focus(); return toast("Wähle rechts unter „Währungen & Rechner“ eine weitere Währung aus."); }
      if (v === baseCode(t)) { delete k.wae; return C.commit(); }
    }
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
    return baseUrl() + "#connect=" + enc64({ v: 1, o: cfg.o, r: cfg.r, t: cfg.t, c: c.id, k: c.k, n: c.name, f: state.profile.name || "", h: c.fp || "", ...(cfg.ring ? { w: cfg.ring } : {}) });
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
          ${g.contact ? (isMine(g.contact) ? `<span class="badge vegan">verbunden</span><button class="btn sm" data-act="plink" data-id="${g.contact.id}">Link</button>`
              : `<span class="badge vegan" title="Diese Verbindung hat ${esc(g.contact.name)} angelegt">verbunden</span><span class="small muted">über den Link von ${esc(g.contact.name)}</span>`)
            : `<button class="btn sm primary" data-act="pconnect" data-name="${esc(g.name)}">Verbinden</button>`}
        </div>`).join("")}</div>` : `<p class="small muted">In deinen Reisen stehen noch keine weiteren Namen.</p>`}
      <div class="people-new"><b class="small">Weitere Person einladen</b>
        <div class="row" style="gap:.4rem;flex-wrap:nowrap"><input class="input" data-pnewname placeholder="Name, z. B. Lena" style="max-width:240px;min-width:0"><button class="btn sm primary" data-act="pnew">Link erstellen</button></div>
        <p class="hint">Auch ohne gemeinsame Reise – z. B. für deine Partnerin. Trag die Person danach in einer Reise als Mitreisende ein, dann bekommt sie die Reise automatisch. Links, die du anlegst, kannst nur du verschicken oder erneuern.</p></div>
      ${state.syncCfg.invite ? `<p class="hint">Auf deinen anderen Geräten öffnest du einfach wieder deinen Einladungslink und gibst dein Passwort ein. <button class="btn sm" data-act="mylink">Meinen Link kopieren</button></p>` : ""}
    </div>`;
  }
  // ----- Admin: Überblick über alle Verknüpfungen in der App -----
  const admin = { rows: null, loading: false, err: "", cache: new Map(), at: null };
  async function loadAdmin(force) {
    const cfg = state.syncCfg; if (!isAdmin() || admin.loading || (admin.rows && !force)) return;
    admin.loading = true; admin.err = ""; rerenderAdmin();
    try {
      await ensureAdmin();
      const [files, keys] = await Promise.all([S.listDir(cfg, "admin/links"), S.listDir(cfg, "keys")]);
      const konten = new Set(keys.map((k) => k.name));
      const starts = {}, ends = {}, oks = {};
      for (const f of files) {
        if (!f.name.endsWith(".enc")) continue;
        let d = admin.cache.get(f.sha);
        if (!d) {
          const file = await S.getFile(cfg, f.path); if (!file) continue;
          try { d = await S.openJSON(cfg.admin.priv, file.content); } catch { continue; }
          admin.cache.set(f.sha, d);
        }
        if (f.name.endsWith(".end.enc")) ends[d.id] = d; else if (f.name.endsWith(".ok.enc")) oks[d.id] = d; else starts[d.id] = d;
      }
      admin.rows = Object.values(starts).map((e) => ({ ...e, end: ends[e.id], ok: oks[e.id] || (konten.has(`c_${e.id}.enc`) ? {} : null) }))
        .sort((a, b) => (!!a.end - !!b.end) || String(b.am || "").localeCompare(String(a.am || "")) || String(a.von).localeCompare(String(b.von)));
      admin.at = new Date();
    } catch (e) { admin.err = e.message || String(e); }
    admin.loading = false; rerenderAdmin();
  }
  function rerenderAdmin() { const el = $("#adminLinks"); if (el) el.outerHTML = renderAdmin(); }
  function renderAdmin() {
    if (!admin.rows && !admin.loading && !admin.err) setTimeout(() => loadAdmin(), 0);
    const rows = admin.rows || [];
    const aktiv = rows.filter((r) => !r.end);
    const status = (r) => r.end ? `<span class="badge">ersetzt${r.end.am ? " am " + esc(fmtDate(r.end.am)) : ""}</span>`
      : r.ok ? `<span class="badge vegan">angenommen${r.ok.name && norm(r.ok.name) !== norm(r.an) ? " als " + esc(r.ok.name) : ""}</span>` : `<span class="badge warn">noch nicht geöffnet</span>`;
    return `<div class="card card-pad stack" id="adminLinks">
      <h3 class="section-title">${ICONS.users} Alle Verknüpfungen <span class="badge">Admin</span></h3>
      <p class="small muted">Jede Verbindung, die jemand in der App anlegt, wird hier verschlüsselt protokolliert – nur du kannst die Liste lesen. Reiseinhalte siehst du dadurch nicht. Verknüpfungen aus der Zeit vor dieser Funktion erscheinen, sobald die Person, die sie angelegt hat, die App einmal öffnet.</p>
      ${admin.err ? `<p class="badge warn">${esc(admin.err)}</p>` : ""}
      ${admin.loading && !admin.rows ? `<p class="small muted">Lade …</p>` : rows.length ? `
        <p class="small"><b>${aktiv.length}</b> aktive Verknüpfung${aktiv.length === 1 ? "" : "en"} · ${new Set(aktiv.flatMap((r) => [norm(r.von), norm(r.an)])).size} Personen</p>
        <div class="adm-list">${rows.map((r) => `<div class="adm-row ${r.end ? "is-old" : ""}">
          <span class="adm-who"><b>${esc(r.von || "?")}</b> → <b>${esc(r.an || "?")}</b></span>
          <span class="small muted">${r.am ? esc(fmtDate(r.am)) : "früher"} · Prüfcode ${esc(r.fp || "–")}</span>
          ${status(r)}</div>`).join("")}</div>` : !admin.loading ? `<p class="small muted">Noch keine Verknüpfungen protokolliert.</p>` : ""}
      <div class="row"><button class="btn sm" data-act="adminload" ${admin.loading ? "disabled" : ""}>${admin.loading ? "Lade …" : "Aktualisieren"}</button>${admin.at ? `<span class="small muted">Stand ${admin.at.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</span>` : ""}</div>
    </div>`;
  }
  async function showConnectLink(c) {
    if (!c.fp) { c.fp = await fp(c.k); C.store.save(); }
    let check = "";
    try {
      let box = await readInbox(c);
      if (box && box.repair) { await syncAll(); box = await readInbox(c); }
      check = box && !box.repair ? `<span class="badge vegan">Freigabe geprüft ✓</span>` : `<span class="badge warn">Freigabe passt nicht – bitte „Neuen Link erzeugen“</span>`;
    } catch { check = ""; }
    const link = connectLink(c);
    const n = Object.values(state.trips).filter((t) => tripHas(t, c.name)).length;
    openModal({
      title: `Mit ${c.name} verbinden`,
      body: `<p>Schick ${esc(c.name)} diesen Link. Damit bekommt ${esc(c.name)} ${n === 1 ? "eure gemeinsame Reise" : `alle ${n} gemeinsamen Reisen`} und kann die App danach auch für eigene Urlaube nutzen. Neue Urlaube, in denen „${esc(c.name)}“ steht, erscheinen automatisch bei ${esc(c.name)}.</p>
        <p class="small muted">Prüfcode: <b>${c.fp}</b> ${check}</p>
        <label class="field">Verbindungs-Link<textarea class="export-text" style="min-height:110px" readonly>${esc(link)}</textarea></label>
        <div class="hint" style="margin-top:.6rem;line-height:1.5"><b>Wichtig:</b> Der Link ist ein Schlüssel – nur direkt verschicken (z. B. Signal, WhatsApp). ${esc(c.name)} wählt beim Öffnen ein eigenes Passwort. Eure Reisen liegen verschlüsselt in deinem Daten-Repo; was ${esc(c.name)} alleine plant, kannst du nicht lesen.</div>`,
      foot: `<button class="btn" data-rekey title="Falls der Link nicht funktioniert: neue Verbindung mit neuem Schlüssel">Neuen Link erzeugen</button><button class="btn" data-close>Schließen</button><button class="btn primary" data-copy>Link kopieren</button>`,
      onMount: (m) => {
        $("[data-copy]", m).addEventListener("click", () => C.copyText(link, "Link kopiert."));
        $("[data-rekey]", m).addEventListener("click", (e) => {
          if (!armed(e.currentTarget, "Alter Link wird ungültig – nochmal tippen")) return;
          const oldBox = state.syncCfg.inbox && state.syncCfg.inbox[c.id];
          const n2 = { id: uid() + uid(), name: c.name, k: S.randomKey(), rings: (oldBox && oldBox.rings) || [], mine: true, am: C.todayISO() };
          const cfg = state.syncCfg; cfg.regEv = [...(cfg.regEv || []), { typ: "end", id: c.id, ersetzt: n2.id, am: C.todayISO(), von: state.profile.name || "" }];
          dropContacts((x) => x.id === c.id); state.contacts.push(n2); C.store.save();
          closeModal(); toast("Neuer Link wird vorbereitet …");
          syncAll().then(() => { C.render(); showConnectLink(n2); });
        });
      }
    });
  }
  function onPeopleClick(a) {
    if (a.dataset.act === "pconnect") {
      if (!state.profile.name) state.profile.name = guessMe();
      const c = { id: uid() + uid(), name: a.dataset.name, k: S.randomKey(), mine: true, am: C.todayISO() };
      state.contacts.push(c); C.store.save();
      toast(`Teile Reisen mit ${c.name} …`);
      syncAll().then(() => { C.render(); showConnectLink(c); });
      return true;
    }
    if (a.dataset.act === "pnew") {
      const inp = $("[data-pnewname]"); const name = C.niceName((inp && inp.value) || "");
      if (!name) { toast("Bitte einen Namen eingeben."); if (inp) inp.focus(); return true; }
      if (norm(name) === norm(state.profile.name)) { toast("Das bist du selbst."); return true; }
      const ex = state.contacts.find((x) => norm(x.name) === norm(name));
      if (ex) { if (isMine(ex)) showConnectLink(ex); else toast(`Mit ${ex.name} bist du schon verbunden (über den Link von ${ex.name}).`); return true; }
      if (!state.profile.name) state.profile.name = guessMe();
      const c = { id: uid() + uid(), name, k: S.randomKey(), mine: true, am: C.todayISO() };
      state.contacts.push(c); C.store.save();
      toast(`Verbindung mit ${name} wird angelegt …`);
      syncAll().then(() => { C.render(); showConnectLink(c); });
      return true;
    }
    if (a.dataset.act === "plink") {
      const c = state.contacts.find((x) => x.id === a.dataset.id); if (!c) return true;
      if (!isMine(c)) { toast(`Diesen Link hat ${c.name} angelegt – nur ${c.name} kann ihn verschicken oder erneuern.`); return true; }
      showConnectLink(c); return true;
    }
    if (a.dataset.act === "adminload") { loadAdmin(true); return true; }
    if (a.dataset.act === "mylink") { C.copyText(baseUrl() + "#connect=" + state.syncCfg.invite, "Link kopiert."); return true; }
    return false;
  }
  async function handleConnect(code) {
    let inv;
    try { inv = dec64(code); if (!inv.c || !inv.k || !inv.o) throw new Error(); } catch { toast("Der Verbindungs-Link ist ungültig."); return; }
    if (inv.h && inv.h !== await fp(inv.k)) {
      return openModal({ title: "Link beschädigt", body: `<p>Der Link wurde beim Verschicken verändert. Bitte ${esc(inv.f || "die Person")}, ihn noch einmal zu schicken – am besten über „Link kopieren“ und ohne ihn zu bearbeiten.</p>`, foot: `<button class="btn primary" data-close>OK</button>` });
    }
    const ring = `keys/c_${inv.c}.enc`;
    if (state.syncCfg) {
      const mine = state.contacts.find((c) => c.id === inv.c);
      if (mine && !state.syncCfg.ring) { toast(`Das ist der Link, den du an ${inv.n} geschickt hast.`); return; }
      if (state.syncCfg.o !== inv.o || state.syncCfg.r !== inv.r) {
        return openModal({ title: "Anderes Daten-Repo", body: `<p>Dieses Gerät ist mit einem anderen Daten-Repo verbunden. Melde dich unter Einstellungen zuerst ab, um den Link von ${esc(inv.f || "deiner Mitreise")} zu nutzen.</p>`, foot: `<button class="btn primary" data-close>OK</button>` });
      }
      // gleiches Repo: Verbindung hinzufügen bzw. erneuern (ersetzt eine alte Verbindung mit derselben Person)
      const name = C.niceName(inv.f || "Mitreisende Person");
      dropContacts((c) => c.id !== inv.c && norm(c.name) === norm(name)); state.contacts = state.contacts.filter((c) => c.id !== inv.c);
      state.contacts.push({ id: inv.c, name, k: inv.k, mine: false });
      state.syncCfg.regEv = [...(state.syncCfg.regEv || []), { typ: "ok", id: inv.c, name: state.profile.name || "", am: C.todayISO() }];
      sync.broken.clear(); C.store.save();
      toast(`Verbindung mit ${name} erneuert – lade gemeinsame Reisen …`);
      syncAll().then(() => { location.hash = "urlaube"; C.render(); });
      return;
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
        let existing = null, olds = [];
        try { existing = await S.getFile(cfg, ring); } catch (e) { say(e.message || String(e)); }
        if (!existing) {
          // Gibt es schon ein Konto dieser Person (aus einem früheren Link)? Dann wird es weiterverwendet.
          try {
            const box = await S.getFile(cfg, `inbox/${inv.c}.enc`);
            if (box) { const d = await S.decJSON(inv.k, box.content); olds = (d.rings || []).filter((r) => r !== ring && r !== inv.w); } // nicht das Konto der Person, die den Link geschickt hat
          } catch { /* egal */ }
        }
        const p2 = $("[data-p2]", m);
        if (existing) { p2.remove(); say("Willkommen zurück – gib dein Passwort ein."); }
        else if (olds.length) { p2.hidden = true; say("Du hast die App schon genutzt? Dann gib dein bisheriges Passwort ein – deine Reisen werden übernommen."); }
        $("#connForm", m).addEventListener("submit", async (e) => {
          e.preventDefault(); const f = e.target;
          try {
            let salt;
            if (!existing && olds.length) {
              say("Suche dein bisheriges Konto …");
              for (const r of olds) {
                const fr = await S.getFile(cfg, r); if (!fr) continue;
                const w = JSON.parse(atob(fr.content));
                const mk = await S.deriveMaster(f.pass.value, w.salt);
                try { await S.decJSON(mk, w.data); cfg.ring = r; cfg.salt = w.salt; cfg.mk = mk; existing = fr; break; } catch { /* nicht dieses */ }
              }
              if (!existing && p2.hidden) { p2.hidden = false; return say("Kein bisheriges Konto mit diesem Passwort gefunden. Falls du neu bist: Passwort wiederholen und erneut auf „Verbinden“ tippen."); }
            }
            if (existing && cfg.mk) { /* bisheriges Konto gefunden */ }
            else if (existing) salt = JSON.parse(atob(existing.content)).salt;
            else { if (f.pass.value !== f.pass2.value) return say("Die Passwörter stimmen nicht überein."); salt = S.bytesToB64(crypto.getRandomValues(new Uint8Array(16))); }
            if (!cfg.mk) {
              say("Leite Schlüssel ab …");
              cfg.salt = salt; cfg.mk = await S.deriveMaster(f.pass.value, salt);
              if (existing) { try { await S.decJSON(cfg.mk, JSON.parse(atob(existing.content)).data); } catch { cfg.mk = null; return say("Passwort falsch."); } }
            }
            state.syncCfg = cfg;
            state.profile.name = C.niceName(f.name.value) || inv.n || "";
            const nm = C.niceName(inv.f || "Mitreisende Person");
            dropContacts((c) => c.id !== inv.c && norm(c.name) === norm(nm));
            if (!state.contacts.some((c) => c.id === inv.c)) state.contacts.push({ id: inv.c, name: nm, k: inv.k, mine: false });
            else Object.assign(state.contacts.find((c) => c.id === inv.c), { k: inv.k, mine: false });
            cfg.regEv = [...(cfg.regEv || []), { typ: "ok", id: inv.c, name: state.profile.name || "", am: C.todayISO() }];
            sync.broken.clear();
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
      ${isAdmin() ? renderAdmin() : ""}
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
    const cols = [["Datum", 12], ["Wochentag", 11], ["Art", 11], ["Programm", 28], ["Von", 18], ["Nach", 18], ["km", 7], ["Dauer", 8], ["Aufstieg (m)", 10], ["Abstieg (m)", 10], ["Highlights", 28], ["Unterkunft", 24], ["Wanderung", 28], ["Hinweise & Sonstiges", 28], ["Unterlagen", 20]];
    ws.columns = cols.map(([h, w]) => ({ width: w }));
    const hr = ws.getRow(4); hr.values = cols.map((c) => c[0]); headStyle(hr);
    t.plan.slice(0, t.tage).forEach((r, i) => {
      const iso = dateOf(t, i);
      const row = ws.addRow([iso ? isoToDate(iso) : `Tag ${i + 1}`, iso ? fmtDate(iso, { weekday: "long" }) : "", typName(r.typ || "").replace("–", ""), plain(r.titel), r.von || "", r.nach || "",
        r.km ? num(r.km) : null, r.dauer || "", r.hoch ? num(r.hoch) : null, r.runter ? num(r.runter) : null, plain(r.highlights), plain(r.unterkunft), r.tour || "", plain(r.notizen),
        (t.tickets || []).filter((f) => f.tag === r.id).map((f) => f.name).join(", ")]);
      if (iso) row.getCell(1).numFmt = "dd.mm.yyyy";
      row.alignment = { vertical: "top", wrapText: true };
      if (typFill[r.typ]) row.eachCell({ includeEmpty: true }, (c, n) => { if (n <= cols.length) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: typFill[r.typ] } }; });
    });
    const last = 4 + t.tage;
    const sum = ws.addRow(["Summe", "", "", "", "", "", { formula: `SUM(G5:G${last})` }, "", { formula: `SUM(I5:I${last})` }, { formula: `SUM(J5:J${last})` }]);
    sum.font = { bold: true }; sum.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PAPER } }; });
    ws.autoFilter = { from: "A4", to: `O${last}` };
    ws.pageSetup = { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: "4:4", margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 } };
    ws.headerFooter = { oddFooter: `&L${tripName(t).replace(/&/g, "&&")}&RSeite &P von &N` };
    // --- Recherche ---
    const rc = t.recherche || {};
    if (RECHERCHE.some((f) => rc[f.k])) {
      const wr = wb.addWorksheet("Recherche");
      wr.columns = [{ header: "Thema", width: 18 }, { header: "Notizen", width: 90 }]; headStyle(wr.getRow(1));
      wr.pageSetup = { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
      RECHERCHE.forEach((f) => { if (rc[f.k]) { const row = wr.addRow([f.h, plain(rc[f.k])]); row.alignment = { vertical: "top", wrapText: true }; } });
    }

    // --- Kosten ---
    const wk = wb.addWorksheet("Kosten", { views: [{ state: "frozen", ySplit: 1 }] });
    wk.pageSetup = { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    wk.columns = [{ header: "Datum", width: 12 }, { header: `Betrag (${baseCode(t)})`, width: 14 }, { header: "Wofür", width: 34 }, { header: "Kategorie", width: 14 }, { header: "Bezahlt von", width: 16 }, { header: "Für wen", width: 28 }, { header: "Original", width: 16 }];
    headStyle(wk.getRow(1));
    const cur = t.waehrung === "€" ? '#,##0.00 "€"' : `#,##0.00 "${t.waehrung}"`;
    [...(t.kosten || [])].sort((a, c) => (a.datum || "").localeCompare(c.datum || "")).forEach((k) => {
      const row = wk.addRow([k.datum ? isoToDate(k.datum) : "", Math.round(inBase(t, k) * 100) / 100, k.grund || "", k.kat || "", pname(t, person(t, k.von)) || "",
        (k.fuer && k.fuer.length ? k.fuer : t.personen.map((p) => p.id)).map((id) => pname(t, person(t, id))).join(", "), kCode(t, k) !== baseCode(t) ? moneyIn(kCode(t, k), num(k.betrag)) : ""]);
      row.getCell(1).numFmt = "dd.mm.yyyy"; row.getCell(2).numFmt = cur;
    });
    const kl = wk.rowCount;
    const ks = wk.addRow(["Gesamt", { formula: `SUM(B2:B${Math.max(2, kl)})` }]); ks.font = { bold: true }; ks.getCell(2).numFmt = cur;

    // --- Abrechnung ---
    const wa = wb.addWorksheet("Abrechnung");
    const b = balances(t);
    wa.columns = [{ width: 18 }, { width: 14 }, { width: 14 }, { width: 14 }];
    headStyle(wa.addRow(["Person", "Bezahlt", "Anteil", "Offen"]));
    t.personen.forEach((p) => { const row = wa.addRow([pname(t, p), b.paid[p.id], b.share[p.id], b.saldo[p.id]]); [2, 3, 4].forEach((n) => { row.getCell(n).numFmt = cur; }); });
    if ((t.zahlungen || []).length) {
      wa.addRow([]); headStyle(wa.addRow(["Beglichen: von", "an", "Betrag", "am"]));
      t.zahlungen.forEach((z) => { const row = wa.addRow([pname(t, person(t, z.von)), pname(t, person(t, z.an)), num(z.betrag), z.am ? isoToDate(z.am) : ""]); row.getCell(3).numFmt = cur; row.getCell(4).numFmt = "dd.mm.yyyy"; });
    }
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
      ["typ", "titel", "von", "nach", "km", "dauer", "hoch", "runter", "unterkunft"].forEach((k) => { if (d[k]) r[k] = d[k]; });
      const extra = [d.hinweise, d.sonstiges].filter(Boolean); if (extra.length) r.notizen = extra.join("\n");
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
  PL.U = { partsOf, withMe, groupName, cfgFor, isShared, syncAll, putBlob, getBlob, dropBlob, offlineState, whoAmI, planStats, TYPEN, typName, dayLabel, dateOf,
    ensurePlan, durMin, fmtDur, num, fmtNum, money, inBase, ICONS, online, openDay, tripBadge, fmtSize, plain, firstLine, richHtml };
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
    on("plan", "dragover", (e) => { const tr = e.target.closest("[data-gpxdrop], .day-card"); if (tr && [...(e.dataTransfer.items || [])].some((x) => x.kind === "file")) { e.preventDefault(); tr.classList.add("gpx-over"); } });
    on("plan", "dragleave", (e) => { const tr = e.target.closest("[data-gpxdrop], .day-card"); if (tr) tr.classList.remove("gpx-over"); });
    on("plan", "drop", (e) => {
      const tr = e.target.closest("[data-gpxdrop], .day-card"); if (!tr) return;
      const files = [...(e.dataTransfer.files || [])]; if (!files.length) return;
      e.preventDefault(); tr.classList.remove("gpx-over");
      const t = trip(), rid = tr.dataset.gpxdrop || tr.dataset.row;
      (async () => { for (const f of files) { if (/\.gpx$/i.test(f.name) && PL.gpx) await PL.gpx.import(t, f, rid); else await addFile(t, f, rid); } C.render(); })();
    });
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
