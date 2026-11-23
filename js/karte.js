/* =========================================================
   Weltkarte: alle Reisen · Orte & Route · GPX-Tracks · Fotos · Review
   Sichtbar sind nur Urlaube, die auf diesem Gerät entschlüsselt werden können –
   also deine eigenen und die, zu denen du eingeladen wurdest.
   ========================================================= */
(() => {
  "use strict";
  const PL = window.PL;
  const C = PL.core, U = PL.U, S = PL.sync;
  const { state, $, $$, esc, uid, fmtDate, ICON, trip, tripName, person, pname, toast, openModal, armed } = C;

  const COLORS = ["#2f5241", "#b65a2e", "#557a90", "#8b6a8c", "#c99a3e", "#6f8f47", "#a04668", "#3d7d8a"];
  const ASPEKTE = [
    ["gesamt", "Gesamt"], ["landschaft", "Landschaft & Natur"], ["wandern", "Wandern"], ["essen", "Essen"], ["unterkunft", "Unterkunft"],
    ["wetter", "Wetter"], ["preis", "Preis-Leistung"], ["kultur", "Kultur"], ["stimmung", "Stimmung"]
  ];
  const I = {
    star: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M10 1.8l2.5 5.2 5.7.8-4.1 4 1 5.7L10 14.8 4.9 17.5l1-5.7-4.1-4 5.7-.8z"/></svg>',
    dl: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3v10M5.5 8.5 10 13l4.5-4.5M4 17h12"/></svg>',
    x: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 5l10 10M15 5 5 15"/></svg>',
    pin: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M10 17.5s5.5-5 5.5-9.5a5.5 5.5 0 0 0-11 0c0 4.5 5.5 9.5 5.5 9.5z"/><circle cx="10" cy="8" r="2"/></svg>',
    up: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12l5-5 5 5"/></svg>',
    down: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 8l5 5 5-5"/></svg>',
    photo: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="2.5" y="5" width="15" height="11" rx="2"/><circle cx="10" cy="10.5" r="3"/><path d="M7 5l1.2-2h3.6L13 5"/></svg>',
    back: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 4l-6 6 6 6"/></svg>',
    route: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="5" cy="15" r="2"/><circle cx="15" cy="5" r="2"/><path d="M6.5 13.5c2-2 1-5 4-6s2.5-1.5 3-1"/></svg>'
  };
  const colorOf = (t) => { const ids = Object.keys(state.trips).sort(); return COLORS[Math.max(0, ids.indexOf(t.id)) % COLORS.length]; };
  // Etappe = Weg zum Ort: „Berlin → Glasgow“; der erste Ort ist der Start
  function legName(t, oid) {
    const orte = t.orte || []; const i = orte.findIndex((o) => o.id === oid);
    if (i < 0) return "Reise allgemein";
    return i === 0 ? orte[0].name : `${orte[i - 1].name} → ${orte[i].name}`;
  }
  const legOpts = (t, cur, prefix = "") => (t.orte || []).map((o) => `<option value="${o.id}" ${o.id === cur ? "selected" : ""}>${prefix}${esc(legName(t, o.id))}</option>`).join("");
  const located = (t) => (t.orte || []).filter((o) => Number.isFinite(o.lat) && Number.isFinite(o.lon));

  // ---------- Leaflet (Kartenbibliothek, wird erst bei Bedarf geladen) ----------
  let leafletP = null;
  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (!leafletP) leafletP = new Promise((resolve, reject) => {
      const css = document.createElement("link");
      css.rel = "stylesheet"; css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(css);
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
      s.onload = () => resolve(window.L);
      s.onerror = () => { leafletP = null; reject(new Error("Die Karte konnte nicht geladen werden (offline?).")); };
      document.head.appendChild(s);
    });
    return leafletP;
  }

  // ---------- Ortssuche (OpenStreetMap Nominatim, max. 1 Anfrage pro Sekunde) ----------
  let lastGeo = 0;
  async function nominatim(path) {
    const wait = Math.max(0, 1100 - (Date.now() - lastGeo));
    await new Promise((r) => setTimeout(r, wait)); lastGeo = Date.now();
    let res;
    try { res = await fetch(`https://nominatim.openstreetmap.org/${path}&format=jsonv2&accept-language=de`); }
    catch { throw new Error("Ortssuche nicht erreichbar (offline?)."); }
    if (!res.ok) throw new Error("Ortssuche nicht erreichbar.");
    return res.json();
  }
  async function searchPlaces(q) {
    const list = await nominatim(`search?limit=5&q=${encodeURIComponent(q)}`);
    return list.map((x) => ({ name: x.name || x.display_name.split(",")[0], label: x.display_name, lat: +x.lat, lon: +x.lon }));
  }
  async function geocode(q) {
    const key = q.trim().toLowerCase();
    if (state.geo[key]) return state.geo[key];
    const r = (await searchPlaces(q))[0] || null;
    if (r) state.geo[key] = { lat: r.lat, lon: r.lon };
    return r;
  }
  async function reverse(lat, lon) {
    const x = await nominatim(`reverse?lat=${lat}&lon=${lon}&zoom=12`);
    const a = x.address || {};
    return a.city || a.town || a.village || a.hamlet || a.municipality || x.name || (x.display_name || "").split(",")[0] || "Ort";
  }

  // ---------- Orte aus dem Tagesplan ableiten ----------
  // Route = Folge von Orten. Aufenthalte (z. B. 3 Tage Lyon) werden zu einem Ort mit mehreren Nächten.
  const ARROW = /\s*(?:->|→|–>|—>| - | – )\s*/;
  function placesFromPlan(t) {
    const out = [];
    const push = (name, nights) => {
      name = (name || "").replace(/[?!]+$/, "").trim(); if (!name || name === "-") return;
      const last = out[out.length - 1];
      if (last && last.name.toLowerCase() === name.toLowerCase()) last.naechte += nights;
      else out.push({ name, naechte: nights });
    };
    t.plan.slice(0, t.tage).forEach((r, i) => {
      const lastDay = i === t.tage - 1;
      let von = r.von, nach = r.nach;
      if (!von && !nach && r.titel && ARROW.test(r.titel)) [von, nach] = r.titel.split(ARROW);
      // Stadt- und Ruhetage ohne Pfeil: der Titel ist der Ort (z. B. „Lyon“, „Ruhetag Ceillac“). Strand-/Aktivtage zählen als weitere Nacht am letzten Ort.
      if (!von && !nach && r.titel && ["stadt", "ruhe"].includes(r.typ)) nach = r.titel.replace(/^(ruhetag|halber tag)\s*(in)?\s*/i, "");
      if (von) push(von, 0);
      if (nach) push(nach, lastDay ? 0 : 1);
      else if (out.length && !lastDay) out[out.length - 1].naechte += 1;
    });
    return out.map((o) => ({ ...o, name: o.name.replace(/[?!]+$/, "").trim() })).filter((o) => o.name && o.name !== "-");
  }
  async function routeFromPlan(t) {
    const names = placesFromPlan(t);
    if (!names.length) return toast("Im Tagesplan stehen noch keine Orte (Spalten „Von“ / „Nach“).");
    toast(`Suche ${names.length} Orte auf der Karte …`);
    const old = t.orte || [];
    const orte = [];
    let miss = 0;
    for (const n of names) {
      const prev = old.find((o) => o.name.toLowerCase() === n.name.toLowerCase());
      let lat = prev && prev.lat, lon = prev && prev.lon;
      if (!Number.isFinite(lat)) {
        try { const g = await geocode(n.name + (t.ziel ? "" : "")); if (g) { lat = g.lat; lon = g.lon; } } catch (e) { toast(e.message); break; }
      }
      if (!Number.isFinite(lat)) miss++;
      orte.push({ id: prev ? prev.id : uid() + uid(), name: n.name, naechte: n.naechte, lat: Number.isFinite(lat) ? lat : null, lon: Number.isFinite(lon) ? lon : null });
    }
    t.orte = orte;
    C.commit(); fitTrip(t);
    toast(miss ? `${orte.length} Orte übernommen – ${miss} nicht gefunden, bitte per Klick auf die Karte setzen.` : `${orte.length} Orte übernommen.`);
  }

  // ---------- GPX ----------
  const hav = (a, b) => {
    const R = 6371000, r = Math.PI / 180;
    const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  };
  function parseGPX(text) {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.getElementsByTagName("parsererror").length) throw new Error("Keine gültige GPX-Datei.");
    let nodes = [...doc.getElementsByTagName("trkpt")];
    if (!nodes.length) nodes = [...doc.getElementsByTagName("rtept")];
    if (!nodes.length) throw new Error("Die GPX-Datei enthält keinen Track.");
    const child = (n, tag) => { const c = n.getElementsByTagName(tag)[0]; return c ? c.textContent : null; };
    const P = nodes.map((n) => ({ lat: +n.getAttribute("lat"), lon: +n.getAttribute("lon"), ele: child(n, "ele") != null ? +child(n, "ele") : null, time: child(n, "time") ? Date.parse(child(n, "time")) : null }))
      .filter((p) => isFinite(p.lat) && isFinite(p.lon));
    let dist = 0, up = 0, down = 0, ref = null;
    for (let i = 1; i < P.length; i++) dist += hav(P[i - 1], P[i]);
    for (const p of P) { // Höhenmeter mit 5-m-Schwelle gegen Messrauschen
      if (p.ele == null || !isFinite(p.ele)) continue;
      if (ref == null) { ref = p.ele; continue; }
      const d = p.ele - ref;
      if (d >= 5) { up += d; ref = p.ele; } else if (d <= -5) { down -= d; ref = p.ele; }
    }
    const times = P.map((p) => p.time).filter((x) => x);
    const step = Math.max(1, Math.ceil(P.length / 400));
    const nameEl = doc.getElementsByTagName("name")[0];
    return {
      name: nameEl ? nameEl.textContent.trim() : "",
      km: Math.round(dist / 100) / 10, hoch: Math.round(up), runter: Math.round(down),
      dauerMin: times.length > 1 ? Math.round((times[times.length - 1] - times[0]) / 60000) : 0,
      pts: P.filter((_, i) => i % step === 0 || i === P.length - 1).map((p) => [Math.round(p.lat * 1e5) / 1e5, Math.round(p.lon * 1e5) / 1e5])
    };
  }
  async function importGpx(t, file, tag) {
    let g; const text = await file.text();
    try { g = parseGPX(text); } catch (e) { return toast(e.message); }
    t.tracks ||= [];
    const old = t.tracks.find((x) => tag && x.tag === tag);
    if (old) { U.dropBlob(t, old.fileId); t.tracks = t.tracks.filter((x) => x !== old); }
    const fileId = uid() + uid();
    try { await U.putBlob(t, fileId, new TextEncoder().encode(text)); } catch (e) { return toast(e.message); }
    t.tracks.push({ id: uid() + uid(), fileId, tag: tag || "", name: g.name || file.name.replace(/\.gpx$/i, ""), datei: file.name, km: g.km, hoch: g.hoch, runter: g.runter, dauerMin: g.dauerMin, pts: g.pts });
    const r = tag && t.plan.find((x) => x.id === tag);
    if (r) {
      if (!r.km) r.km = String(g.km).replace(".", ",");
      if (!r.hoch && g.hoch) r.hoch = String(g.hoch);
      if (!r.runter && g.runter) r.runter = String(g.runter);
      if (!r.dauer && g.dauerMin) r.dauer = U.fmtDur(g.dauerMin);
      if (!r.typ) r.typ = "wandern";
    }
    C.commit(); toast(`GPX „${file.name}“: ${String(g.km).replace(".", ",")} km · ↑ ${g.hoch} m · ↓ ${g.runter} m`);
    if (U.isShared(t.id)) U.syncAll({ only: t.id });
  }
  async function downloadGpx(t, tr) {
    try {
      const bytes = await U.getBlob(t, tr.fileId);
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/gpx+xml" }));
      const a = document.createElement("a"); a.href = url; a.download = tr.datei || tr.name + ".gpx"; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) { toast(e.message); }
  }
  function removeTrack(t, id) {
    const tr = (t.tracks || []).find((x) => x.id === id); if (!tr) return;
    U.dropBlob(t, tr.fileId); t.tracks = t.tracks.filter((x) => x !== tr); C.commit();
    if (U.isShared(t.id)) U.syncAll({ only: t.id });
  }
  // Baustein für den Tagesdialog der Planung
  PL.gpx = {
    rowHtml(t, rid) {
      const tr = (t.tracks || []).find((x) => x.tag === rid);
      return tr ? `<div class="track-row"><span>${I.route}<b>${esc(tr.name)}</b> · ${String(tr.km).replace(".", ",")} km · ↑ ${tr.hoch} m · ↓ ${tr.runter} m${tr.dauerMin ? " · " + U.fmtDur(tr.dauerMin) : ""}</span>
          <button class="btn sm" data-gdl="${tr.id}">GPX herunterladen</button><button class="icon-btn" data-gdel="${tr.id}" aria-label="Track entfernen">${U.ICONS.trash}</button></div>`
        : `<label class="btn sm">${ICON.plus} GPX-Datei wählen<input type="file" accept=".gpx,application/gpx+xml" data-gadd hidden></label>
           <p class="hint" style="margin-top:.4rem">km und Höhenmeter werden aus dem Track übernommen, falls die Felder noch leer sind. Der Track erscheint auf der Weltkarte.</p>`;
    },
    bindRow(root, t, rid, refresh) {
      root.addEventListener("change", async (e) => { const f = e.target.closest("[data-gadd]"); if (f && f.files[0]) { await importGpx(t, f.files[0], rid); refresh(); } });
      root.addEventListener("click", (e) => {
        const d = e.target.closest("[data-gdl]"); if (d) return downloadGpx(t, t.tracks.find((x) => x.id === d.dataset.gdl));
        const x = e.target.closest("[data-gdel]"); if (x) { if (!armed(x, "×?")) return; removeTrack(t, x.dataset.gdel); refresh(); }
      });
    }
  };

  // ---------- Fotos ----------
  async function resize(file, max, q) {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * s), h = Math.round(bmp.height * s);
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    cv.getContext("2d").drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise((r) => cv.toBlob(r, "image/jpeg", q));
    return { bytes: new Uint8Array(await blob.arrayBuffer()), w, h };
  }
  // ---------- Videos ----------
  const VIDEO_MAX = 50 * 1048576; // GitHub nimmt Dateien bis ca. 100 MB an; verschlüsselt + Base64 bleibt so Luft
  const isVideoFile = (f) => f.type.startsWith("video/") || /\.(mp4|mov|m4v|webm|3gp)$/i.test(f.name);
  const isVideo = (f) => f && f.typ === "video";
  function loadVideo(src) {
    return new Promise((res, rej) => {
      const v = document.createElement("video"); v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = src;
      v.onloadedmetadata = () => res(v); v.onerror = () => rej(new Error("Video lässt sich in diesem Browser nicht lesen."));
    });
  }
  async function videoPoster(file) {
    const url = URL.createObjectURL(file);
    try {
      const v = await loadVideo(url);
      const dur = isFinite(v.duration) ? v.duration : 0;
      await new Promise((r) => { v.onseeked = r; v.currentTime = Math.min(1, dur / 3 || 0); setTimeout(r, 2500); });
      const sc = Math.min(1, 480 / Math.max(v.videoWidth, v.videoHeight));
      const cv = document.createElement("canvas"); cv.width = Math.round(v.videoWidth * sc) || 480; cv.height = Math.round(v.videoHeight * sc) || 270;
      cv.getContext("2d").drawImage(v, 0, 0, cv.width, cv.height);
      const blob = await new Promise((r) => cv.toBlob(r, "image/jpeg", 0.75));
      return { bytes: new Uint8Array(await blob.arrayBuffer()), w: v.videoWidth || cv.width, h: v.videoHeight || cv.height, dur };
    } finally { URL.revokeObjectURL(url); }
  }
  // Zu große Videos im Browser auf 720p verkleinern (dauert so lange wie das Video)
  async function compressVideo(file, onProgress) {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) throw new Error("Verkleinern wird von diesem Browser nicht unterstützt.");
    const url = URL.createObjectURL(file);
    try {
      const v = await loadVideo(url); v.muted = false; v.volume = 0;
      const sc = Math.min(1, 1280 / Math.max(v.videoWidth, v.videoHeight));
      const cv = document.createElement("canvas"); cv.width = Math.round(v.videoWidth * sc / 2) * 2; cv.height = Math.round(v.videoHeight * sc / 2) * 2;
      const ctx = cv.getContext("2d");
      const stream = cv.captureStream(30);
      try { const vs = v.captureStream ? v.captureStream() : v.mozCaptureStream && v.mozCaptureStream(); vs && vs.getAudioTracks().forEach((tr) => stream.addTrack(tr)); } catch { /* ohne Ton */ }
      const mime = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m)) || "";
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2500000, audioBitsPerSecond: 96000 });
      const chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const done = new Promise((r) => (rec.onstop = r));
      let raf; const drawF = () => { ctx.drawImage(v, 0, 0, cv.width, cv.height); onProgress && onProgress(v.currentTime / (v.duration || 1)); raf = requestAnimationFrame(drawF); };
      rec.start(1000); await v.play(); drawF();
      await new Promise((r) => (v.onended = r));
      cancelAnimationFrame(raf); rec.stop(); await done;
      const type = (mime || "video/webm").split(";")[0];
      return { bytes: new Uint8Array(await new Blob(chunks, { type }).arrayBuffer()), mime: type };
    } finally { URL.revokeObjectURL(url); }
  }

  async function addPhotos(t, files, ort) {
    const media = [...files].filter((f) => f.type.startsWith("image/") || isVideoFile(f) || /\.(jpe?g|png|webp|heic)$/i.test(f.name));
    if (!media.length) return toast("Keine Fotos oder Videos gefunden.");
    let ok = 0;
    for (const f of media) {
      try {
        const id = uid() + uid();
        const meta = { id, ort: ort || "", name: f.name, von: C.myId(t) || "", am: new Date(f.lastModified || Date.now()).toISOString() };
        if (isVideoFile(f)) {
          toast(`Bereite Video ${ok + 1} von ${media.length} vor …`);
          const poster = await videoPoster(f);
          let bytes = new Uint8Array(await f.arrayBuffer()), mime = f.type || "video/mp4";
          if (bytes.length > VIDEO_MAX) {
            toast(`„${f.name}“ ist ${(bytes.length / 1048576).toFixed(0)} MB – wird auf 720p verkleinert (dauert etwa ${Math.ceil(poster.dur / 60) || 1} min, Seite offen lassen) …`);
            const c = await compressVideo(f, (p) => { const el = $("#toast"); if (el) el.textContent = `Verkleinere „${f.name}“ … ${Math.round(p * 100)} %`; });
            bytes = c.bytes; mime = c.mime;
            if (bytes.length > VIDEO_MAX) throw new Error(`„${f.name}“ ist auch verkleinert noch zu groß (max. 50 MB) – bitte kürzen.`);
          }
          toast(`Verschlüssele & lade Video hoch (${(bytes.length / 1048576).toFixed(1)} MB) …`);
          await U.putBlob(t, id, bytes); await U.putBlob(t, id + "_t", poster.bytes);
          Object.assign(meta, { typ: "video", mime, w: poster.w, h: poster.h, dauer: Math.round(poster.dur), size: bytes.length });
        } else {
          toast(`Verkleinere & verschlüssele Foto ${ok + 1} von ${media.length} …`);
          const full = await resize(f, 2048, 0.82), th = await resize(f, 480, 0.72);
          await U.putBlob(t, id, full.bytes); await U.putBlob(t, id + "_t", th.bytes);
          Object.assign(meta, { w: full.w, h: full.h, size: full.bytes.length });
        }
        t.fotos ||= []; t.fotos.push(meta);
        ok++;
      } catch (e) { console.warn(e); toast(e.message && e.message.startsWith("„") ? e.message : `„${f.name}“ konnte nicht gelesen werden${isVideoFile(f) ? "" : " (HEIC bitte als JPG exportieren)"}.`); }
    }
    C.commit(); if (ok) toast(`${ok} ${ok === 1 ? "Datei" : "Dateien"} hinzugefügt.`);
    if (U.isShared(t.id)) U.syncAll({ only: t.id });
  }
  // zufällige, aber pro Sitzung stabile Auswahl (damit nichts bei jedem Neuzeichnen springt)
  const shuffleCache = {};
  function pick(key, list, n) {
    const ids = list.map((f) => f.id).join(",");
    if (!shuffleCache[key] || shuffleCache[key].ids !== ids) {
      const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      shuffleCache[key] = { ids, list: a };
    }
    return shuffleCache[key].list.slice(0, n);
  }
  // Platzhalter fürs Profilbild: Symbol passend zur Reiseart
  const TI = {
    zelt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18M12 4 4 20M12 4l8 16M12 4v0M9.5 20 12 14l2.5 6"/><path d="M10.5 4.5 12 4l1.5.5"/></svg>',
    huette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20l6-10 3 4 4-7 7 13z"/><path d="M15 7l1.5-2.5L18 7"/></svg>',
    stadt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V10l4-2v13M9 21V5l6-2v18M15 21V9l4 2v10"/><path d="M11.5 8h1M11.5 11h1M11.5 14h1"/></svg>',
    flug: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 13.5 3 11l1.2-1.6 8.3 1L17 5.6c.9-.9 2.4-.9 2.9-.4s.5 2-.4 2.9L14.6 12.5l1 8.3L14 22l-2.5-7.5"/></svg>'
  };
  const tripIcon = (t) => TI[(t.arten || []).includes("wandern") ? (t.tour === "huette" ? "huette" : "zelt") : (t.arten || []).includes("stadt") ? "stadt" : "flug"];
  const coverOf = (t) => (t.cover && (t.fotos || []).find((f) => f.id === t.cover)) || null;
  const urlCache = {};
  async function photoUrl(t, fid, type = "image/jpeg") {
    if (urlCache[fid]) return urlCache[fid];
    const bytes = await U.getBlob(t, fid);
    return (urlCache[fid] = URL.createObjectURL(new Blob([bytes], { type })));
  }
  const fmtDauer = (s) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "");
  function hydrateThumbs(root, t) {
    $$("img[data-thumb]", root).forEach(async (img) => {
      const tt = img.dataset.trip ? state.trips[img.dataset.trip] : t; if (!tt) return;
      try { img.src = await photoUrl(tt, img.dataset.thumb + "_t"); img.classList.add("loaded"); }
      catch { img.alt = "noch nicht verfügbar"; img.classList.add("missing"); }
    });
  }
  // Galerie aus Kacheln, die sich je nach Bildformat zu vollen Zeilen zusammenfügen
  function justify(box) {
    if (!box) return;
    const W = box.clientWidth; if (!W) return;
    const gap = 4, target = W < 520 ? 120 : 175;
    const tiles = $$(".jg-tile", box);
    let row = [], sum = 0;
    const flush = (last) => {
      if (!row.length) return;
      const h = last ? Math.min(target, (W - gap * (row.length - 1)) / sum) : (W - gap * (row.length - 1)) / sum;
      row.forEach(([el, a]) => { el.style.width = Math.floor(a * h) + "px"; el.style.height = Math.floor(h) + "px"; });
      row = []; sum = 0;
    };
    tiles.forEach((el) => {
      const a = Math.max(0.4, Math.min(3, parseFloat(el.dataset.ar) || 1.5));
      row.push([el, a]); sum += a;
      if (sum * target + gap * (row.length - 1) >= W) flush(false);
    });
    flush(true);
  }
  // Vollbild-Betrachter: wischen/Pfeiltasten, unten Etappe zuordnen, Profilbild, Download, Löschen
  let viewer = null;
  function openPhoto(t, id, list) {
    let idx = list.findIndex((f) => f.id === id); if (idx < 0) return;
    closeViewer();
    const el = document.createElement("div"); el.className = "pv"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Foto");
    document.body.appendChild(el); document.body.classList.add("pv-open");
    viewer = { el, t, list };
    const ortName = (oid) => legName(t, oid);
    const show = async () => {
      const f = list[idx]; if (!f) return closeViewer();
      el.innerHTML = `<div class="pv-top"><span class="pv-count">${idx + 1} / ${list.length}</span><span class="pv-title">${esc(ortName(f.ort))}</span><button class="pv-btn" data-pv="close" aria-label="Schließen">${I.x}</button></div>
        <div class="pv-stage">${isVideo(f) ? `<video class="pv-img" controls playsinline preload="metadata"></video><span class="pv-loading">Video wird geladen …</span>` : `<img class="pv-img" alt="${esc(f.name)}">`}</div>
        ${idx > 0 ? `<button class="pv-nav prev" data-pv="prev" aria-label="Vorheriges Foto">‹</button>` : ""}
        ${idx < list.length - 1 ? `<button class="pv-nav next" data-pv="next" aria-label="Nächstes Foto">›</button>` : ""}
        <div class="pv-bar">
          <span class="pv-meta">${f.am ? fmtDate(f.am.slice(0, 10), { day: "numeric", month: "short", year: "numeric" }) : ""}${f.von && person(t, f.von) ? " · " + esc(pname(t, person(t, f.von))) : ""}</span>
          <label class="pv-ort">Etappe <select data-pv-ort><option value="">Reise allgemein</option>${legOpts(t, f.ort)}</select></label>
          <span class="pv-actions">
            <button class="pv-btn ${t.cover === f.id ? "on" : ""}" data-pv="cover" title="Als Profilbild der Reise">${I.star}<span>Profilbild</span></button>
            <a class="pv-btn" data-pv-dl download="${esc((f.name || "foto").replace(/\.\w+$/, ""))}.${isVideo(f) ? ((f.mime || "").includes("webm") ? "webm" : (f.mime || "").includes("quicktime") ? "mov" : "mp4") : "jpg"}" title="Herunterladen">${I.dl}</a>
            <button class="pv-btn" data-pv="del" title="Löschen">${U.ICONS.trash}</button>
          </span>
        </div>`;
      const img = $(".pv-img", el);
      try {
        if (isVideo(f)) {
          img.poster = await photoUrl(t, f.id + "_t");
          const full = await photoUrl(t, f.id, f.mime || "video/mp4");
          if (viewer && list[idx] === f) { img.src = full; const l = $(".pv-loading", el); if (l) l.remove(); const dl = $("[data-pv-dl]", el); if (dl) dl.href = full; }
        } else {
          img.src = await photoUrl(t, f.id + "_t"); const full = await photoUrl(t, f.id);
          if (viewer && list[idx] === f) { img.src = full; const dl = $("[data-pv-dl]", el); if (dl) dl.href = full; }
        }
      } catch (e) { toast(e.message); }
      // nächstes Bild vorladen (Videos erst bei Bedarf)
      if (list[idx + 1] && !isVideo(list[idx + 1])) photoUrl(t, list[idx + 1].id).catch(() => {});
    };
    const go = (d) => { const n = idx + d; if (n < 0 || n >= list.length) return; idx = n; show(); };
    viewer.go = go;
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-pv]");
      if (!b) { if (e.target.classList.contains("pv-stage")) closeViewer(); return; }
      const f = list[idx], act = b.dataset.pv;
      if (act === "close") return closeViewer();
      if (act === "prev") return go(-1);
      if (act === "next") return go(1);
      if (act === "cover") { t.cover = t.cover === f.id ? "" : f.id; C.commit(); toast(t.cover ? "Profilbild gesetzt." : "Profilbild entfernt."); return show(); }
      if (act === "del") {
        if (!armed(b, "Löschen?")) return;
        U.dropBlob(t, f.id); U.dropBlob(t, f.id + "_t");
        t.fotos = t.fotos.filter((x) => x.id !== f.id); if (t.cover === f.id) t.cover = "";
        list.splice(idx, 1); if (idx >= list.length) idx = list.length - 1;
        C.commit(); if (U.isShared(t.id)) U.syncAll({ only: t.id });
        return list.length ? show() : closeViewer();
      }
    });
    el.addEventListener("change", (e) => { if (e.target.matches("[data-pv-ort]")) { list[idx].ort = e.target.value; C.commit(); toast("Etappe zugeordnet."); show(); } });
    // Wischen
    let sx = null, sy = 0;
    el.addEventListener("pointerdown", (e) => { if (e.target.closest(".pv-bar, .pv-top, .pv-nav, video")) return; sx = e.clientX; sy = e.clientY; });
    el.addEventListener("pointerup", (e) => { if (sx == null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1); else if (dy > 90) closeViewer(); });
    show();
  }
  function closeViewer() { if (!viewer) return; viewer.el.remove(); viewer = null; document.body.classList.remove("pv-open"); }
  document.addEventListener("keydown", (e) => {
    if (!viewer) return;
    if (e.key === "Escape") closeViewer(); else if (e.key === "ArrowLeft") viewer.go(-1); else if (e.key === "ArrowRight") viewer.go(1);
  });

  // ---------- Karte ----------
  let map = null, layer = null, mode = null, fitted = false;
  function buildView() {
    const el = $("#view-karte");
    if ($("#kMap", el)) return Promise.resolve();
    el.innerHTML = `<div class="karte-layout"><aside class="card karte-side" id="kSide"></aside>
      <div class="card karte-map"><div id="kMap"></div><div id="kMode" class="map-mode" hidden></div></div></div>`;
    return loadLeaflet().then((L) => {
      map = L.map("kMap", { worldCopyJump: true, zoomControl: true }).setView([47, 10], 4);
      const base = {
        // OpenStreetMap-Standardkarte – frei nutzbar ohne API-Schlüssel (mit Namensnennung)
        "Karte": L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap-Mitwirkende</a>' }),
        "Topo": L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", { maxZoom: 17, attribution: "© OpenStreetMap-Mitwirkende, SRTM | © OpenTopoMap (CC-BY-SA)" }),
        "Satellit": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Bilder © Esri" })
      };
      base[state.ui.mapBase && base[state.ui.mapBase] ? state.ui.mapBase : "Karte"].addTo(map);
      L.control.layers(base, null, { position: "topright" }).addTo(map);
      map.on("baselayerchange", (e) => { state.ui.mapBase = e.name; C.store.save(); });
      layer = L.featureGroup().addTo(map);
      map.on("click", onMapClick);
      // Regler: Fotos auf der Karte zeigen
      const Ctl = L.Control.extend({ options: { position: "topright" }, onAdd() {
        const d = L.DomUtil.create("label", "map-toggle leaflet-bar");
        d.innerHTML = `<input type="checkbox" data-mapphotos ${state.ui.mapPhotos === false ? "" : "checked"}><span class="sw"></span><span>Fotos</span>`;
        L.DomEvent.disableClickPropagation(d);
        d.querySelector("input").addEventListener("change", (e) => { state.ui.mapPhotos = e.target.checked; C.store.save(); draw(); });
        return d;
      } });
      new Ctl().addTo(map);
    }).catch((e) => { $("#kMap", el).innerHTML = `<div class="empty">${esc(e.message)}</div>`; });
  }
  function draw() {
    if (!map || !window.L) return;
    const L = window.L; layer.clearLayers();
    const sel = state.ui.mapTrip && state.trips[state.ui.mapTrip] ? state.ui.mapTrip : null;
    Object.values(state.trips).forEach((t) => {
      const col = colorOf(t), active = !sel || sel === t.id, focus = sel === t.id;
      const pts = located(t);
      if (pts.length > 1) L.polyline(pts.map((o) => [o.lat, o.lon]), { color: col, weight: focus ? 3 : 2.5, opacity: active ? 0.85 : 0.25, dashArray: "6 7" }).on("click", () => select(t.id)).addTo(layer);
      (t.tracks || []).forEach((tr) => { if (tr.pts && tr.pts.length > 1) L.polyline(tr.pts, { color: col, weight: focus ? 5 : 3.5, opacity: active ? 0.95 : 0.3 }).bindTooltip(`${esc(tr.name)} · ${String(tr.km).replace(".", ",")} km`).on("click", () => select(t.id)).addTo(layer); });
      pts.forEach((o, i) => {
        const nf = (t.fotos || []).filter((f) => f.ort === o.id).length;
        const m = focus
          ? L.marker([o.lat, o.lon], { icon: L.divIcon({ className: "pin-num", html: `<span style="background:${col}">${i + 1}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] }) })
          : L.circleMarker([o.lat, o.lon], { radius: active ? 5 : 4, color: "#fff", weight: 1.5, fillColor: col, fillOpacity: active ? 1 : 0.35 });
        m.bindPopup(`<b>${esc(o.name)}</b><br><span class="muted">${esc(tripName(t))}</span>${o.naechte ? `<br>${o.naechte} ${o.naechte === 1 ? "Nacht" : "Nächte"}` : ""}${nf ? `<br>${nf} ${nf === 1 ? "Foto" : "Fotos"} · <a href="#karte" data-popfotos="${t.id}:${o.id}">ansehen</a>` : ""}`);
        m.on("click", () => { if (!focus) select(t.id, true); });
        m.addTo(layer);
        // geöffnete Reise: bis zu 3 Fotos der Etappe neben dem Punkt
        if (focus && state.ui.mapPhotos !== false && nf) {
          const ph = pick("ort:" + o.id, (t.fotos || []).filter((f) => f.ort === o.id), 3);
          const html = `<div class="map-ph">${ph.map((f, k) => `<button data-mapph="${t.id}:${o.id}:${f.id}" class="${isVideo(f) ? "is-video" : ""}" style="--k:${k}"><img data-thumb="${f.id}" data-trip="${t.id}" alt=""></button>`).join("")}${nf > 3 ? `<span class="more">+${nf - 3}</span>` : ""}</div>`;
          const pm = L.marker([o.lat, o.lon], { icon: L.divIcon({ className: "map-ph-icon", html, iconSize: [0, 0], iconAnchor: [-16, 30] }), zIndexOffset: -100, keyboard: false }).addTo(layer);
          const elx = pm.getElement(); if (elx) hydrateThumbs(elx, t);
        }
      });
    });
    if (!fitted) { fitted = true; sel ? fitTrip(state.trips[sel]) : fitAll(); }
  }
  function boundsOf(list) {
    const pts = [];
    list.forEach((t) => { located(t).forEach((o) => pts.push([o.lat, o.lon])); (t.tracks || []).forEach((tr) => (tr.pts || []).forEach((p) => pts.push(p))); });
    return pts;
  }
  function fitAll() { if (!map) return; const p = boundsOf(Object.values(state.trips)); if (p.length) map.fitBounds(p, { padding: [40, 40], maxZoom: 9 }); }
  function fitTrip(t) { if (!map || !t) return; const p = boundsOf([t]); if (p.length) map.fitBounds(p, { padding: [50, 50], maxZoom: 12 }); }
  function select(id, keepView) {
    if (state.ui.mapTrip !== id) { state.ui.mapDetail = "ueberblick"; state.ui.fotoFilter = "alle"; sel.on = false; sel.ids.clear(); }
    state.ui.mapTrip = id; C.store.save();
    renderSide(); draw(); if (!keepView) fitTrip(state.trips[id]);
  }
  function setMode(m) {
    mode = m; const box = $("#kMode");
    if (box) { box.hidden = !m; box.innerHTML = m ? `${m.type === "add" ? "Klicke auf die Karte, um einen Ort hinzuzufügen" : `Klicke auf die Karte, um „${esc(m.name)}“ zu platzieren`} <button class="btn sm" data-cancelmode>Abbrechen</button>` : ""; }
    const mp = $("#kMap"); if (mp) mp.style.cursor = m ? "crosshair" : "";
  }
  async function onMapClick(e) {
    if (!mode) return;
    const t = state.trips[state.ui.mapTrip]; if (!t) return setMode(null);
    const { lat, lng } = e.latlng; const m = mode; setMode(null);
    if (m.type === "set") {
      const o = (t.orte || []).find((x) => x.id === m.id); if (o) { o.lat = Math.round(lat * 1e5) / 1e5; o.lon = Math.round(lng * 1e5) / 1e5; }
    } else {
      let name = "Ort";
      try { name = await reverse(lat, lng); } catch { /* ohne Namen weiter */ }
      t.orte ||= []; t.orte.push({ id: uid() + uid(), name, naechte: 0, lat: Math.round(lat * 1e5) / 1e5, lon: Math.round(lng * 1e5) / 1e5 });
    }
    C.commit();
  }

  // ---------- Seitenleiste ----------
  function stars(n) { const v = Math.round(n * 2) / 2; return `<span class="stars" aria-label="${v} von 5 Sternen">${[1, 2, 3, 4, 5].map((i) => `<i class="${v >= i ? "f" : v >= i - 0.5 ? "h" : ""}">★</i>`).join("")}</span>`; }
  function reviewAvg(t, k = "gesamt") {
    const v = Object.values(t.reviews || {}).map((r) => r[k]).filter((x) => x > 0);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
  }
  function tripStats(t) {
    const s = U.planStats(t);
    const trackKm = (t.tracks || []).reduce((a, x) => a + (x.km || 0), 0);
    return { ...s, wKm: s.wKm || trackKm, orte: located(t).length, naechte: (t.orte || []).reduce((a, o) => a + (+o.naechte || 0), 0) };
  }
  function renderSide() {
    const side = $("#kSide"); if (!side) return;
    const sel = state.ui.mapTrip && state.trips[state.ui.mapTrip];
    side.innerHTML = sel ? detailHtml(sel) : listHtml();
    hydrateThumbs(side, sel);
    const wide = !!sel && state.ui.mapDetail === "fotos";
    const lay = side.closest(".karte-layout"); if (lay) { const was = lay.classList.contains("wide-side"); lay.classList.toggle("wide-side", wide); if (was !== wide && map) setTimeout(() => map.invalidateSize(), 80); }
    $$(".jg", side).forEach(justify);
  }
  function listHtml() {
    const all = Object.values(state.trips);
    const today = C.todayISO(); const f = state.ui.mapFilter || "alle"; const q = (state.ui.mapQ || "").toLowerCase();
    const list = all.filter((t) => (f === "alle" || (f === "vergangen" ? C.isPast(t, today) : !C.isPast(t, today))) && (!q || (tripName(t) + " " + (t.ziel || "")).toLowerCase().includes(q)))
      .sort((a, b) => C.sortKey(b).localeCompare(C.sortKey(a)));
    const doneAll = all.filter((t) => C.isPast(t, today) && U.withMe(t));
    const seenG = new Set(); const done = doneAll.filter((t) => { const g = t.gruppe || t.id; if (seenG.has(g)) return false; seenG.add(g); return true; });
    const tot = doneAll.reduce((a, t) => { const s = tripStats(t); if (t.von) a.tage += t.tage; a.km += s.wKm; a.hm += s.hoch; a.orte += s.orte; return a; }, { tage: 0, km: 0, hm: 0, orte: 0 });
    return `<div class="side-head"><h2>Unsere Reisen</h2>
        <div class="tot-grid">
          <div><b>${done.length}</b><span>Reisen</span></div><div><b>${U.fmtNum(tot.tage)}</b><span>Tage unterwegs</span></div>
          <div><b>${U.fmtNum(tot.km)}</b><span>km gewandert</span></div><div><b>${U.fmtNum(tot.hm)}</b><span>Höhenmeter</span></div>
        </div>
        <div class="row" style="gap:.4rem;margin-top:.7rem">
          <div class="seg">${[["alle", "Alle"], ["vergangen", "Vergangen"], ["geplant", "Geplant"]].map(([k, l]) => `<button data-mfilter="${k}" class="${f === k ? "on" : ""}">${l}</button>`).join("")}</div>
          <input class="input" data-mq placeholder="Suchen …" value="${esc(state.ui.mapQ || "")}" style="flex:1;min-width:6em">
        </div>
      </div>
      <ul class="trip-list">${list.map((t) => {
        const s = tripStats(t), r = reviewAvg(t);
        const cv = coverOf(t);
        return `<li><button data-mtrip="${t.id}"><span class="dot-c" style="background:${colorOf(t)}"></span>
          ${cv ? `<span class="tl-cover"><img data-thumb="${cv.id}" data-trip="${t.id}" alt=""></span>` : `<span class="tl-cover tl-ph" aria-hidden="true" style="--c:${colorOf(t)}">${tripIcon(t)}</span>`}
          <span class="tl-main"><b>${esc(tripName(t))}</b><small>${t.von ? fmtDate(t.von, { month: "short", year: "numeric" }) + " · " + t.tage + " Tage" : t.jahr || (t.vergangen ? "Datum unbekannt" : t.tage + " Tage")}${s.wKm ? " · " + U.fmtNum(s.wKm, 0) + " km" : ""}${s.hoch ? " · ↑ " + U.fmtNum(s.hoch) + " m" : ""}</small>
          ${!s.orte ? `<small class="warn-txt">noch keine Route</small>` : ""}</span>
          ${r ? stars(r) : ""}</button></li>`;
      }).join("") || `<li class="muted small" style="padding:1rem">Keine Reisen gefunden.</li>`}</ul>
      <div class="side-foot"><button class="btn sm" data-newtrip>${ICON.plus} Reise nachtragen</button><span class="muted small">Gezeigt werden nur Reisen, die du auf diesem Gerät öffnen kannst.</span></div>`;
  }
  function detailHtml(t) {
    const tab = state.ui.mapDetail || "ueberblick";
    const tabs = [["ueberblick", "Überblick"], ["route", "Route"], ["fotos", `Impressionen${(t.fotos || []).length ? ` <small>${(t.fotos || []).length}</small>` : ""}`], ["review", "Review"]];
    return `<div class="side-head">
        <button class="btn sm ghost" data-mback>${I.back} Alle Reisen</button>
        <h2><span class="dot-c" style="background:${colorOf(t)}"></span>${coverOf(t) ? `<span class="tl-cover big"><img data-thumb="${coverOf(t).id}" alt=""></span>` : ""}${esc(tripName(t))}</h2>
        <div class="small muted">${t.ziel && t.name ? esc(t.ziel) + " · " : ""}${t.von ? fmtDate(t.von, { day: "numeric", month: "short" }) + " – " + fmtDate(t.bis, { day: "numeric", month: "short", year: "numeric" }) : t.jahr || (t.vergangen ? "Datum unbekannt" : "Datum offen")} · ${t.personen.map((p) => esc(pname(t, p))).join(", ")}</div>
        <div class="seg side-tabs">${tabs.map(([k, l]) => `<button data-mdetail="${k}" class="${tab === k ? "on" : ""}">${l}</button>`).join("")}</div>
      </div>
      <div class="side-body">${tab === "route" ? routeHtml(t) : tab === "fotos" ? fotosHtml(t) : tab === "review" ? reviewHtml(t) : overviewHtml(t)}</div>`;
  }
  function overviewHtml(t) {
    const s = tripStats(t); const r = reviewAvg(t);
    const kpi = (v, l) => (v ? `<div class="kpi"><b>${v}</b><span>${l}</span></div>` : "");
    const hl = Object.entries(t.reviews || {}).map(([pid, x]) => x.highlight && `<blockquote>„${esc(x.highlight)}“<cite>– ${esc(pname(t, person(t, pid)) || "")}</cite></blockquote>`).filter(Boolean);
    const fotos = pick("ov:" + t.id, t.fotos || [], 6);
    return `<div class="kpis-side">
        ${kpi(t.von ? t.tage : 0, "Tage")}${kpi(s.naechte && s.orte ? s.orte : 0, "Orte")}${kpi(s.wTage, "Wandertage")}${kpi(s.wKm ? U.fmtNum(s.wKm, 1) + " km" : 0, "zu Fuß")}
        ${kpi(s.wMin ? U.fmtDur(s.wMin) : 0, "Gehzeit")}${kpi(s.hoch ? U.fmtNum(s.hoch) + " m" : 0, "Aufstieg")}${kpi(s.runter ? U.fmtNum(s.runter) + " m" : 0, "Abstieg")}
        ${kpi(s.fKm ? U.fmtNum(s.fKm) + " km" : 0, "Fahrstrecke")}${kpi(s.kosten ? U.money(t, s.kosten) : 0, "Kosten")}
      </div>
      ${r ? `<p class="ov-rating">${stars(r)} <span class="muted small">${r.toFixed(1).replace(".", ",")} von 5 · ${Object.keys(t.reviews).length} ${Object.keys(t.reviews).length === 1 ? "Bewertung" : "Bewertungen"}</span></p>` : ""}
      ${hl.join("")}
      ${fotos.length ? `<div class="jg">${fotos.map((f) => tile(f)).join("")}</div><button class="btn sm ghost" data-mdetail="fotos" style="margin-top:.3rem">Alle ${(t.fotos || []).length} Fotos ansehen</button>` : ""}
      ${!located(t).length ? `<div class="hint">Noch keine Route. Im Reiter <b>Route</b> lassen sich die Orte aus dem Tagesplan übernehmen oder direkt auf der Karte setzen.</div>` : ""}
      <div class="row" style="margin-top:.8rem"><button class="btn sm" data-openplan>Planung öffnen</button><button class="btn sm" data-mdetail="review">Bewerten</button></div>`;
  }
  function routeHtml(t) {
    const orte = t.orte || [];
    const tracks = t.tracks || [];
    return `<div class="row" style="gap:.4rem;margin-bottom:.6rem">
        <button class="btn sm primary" data-fromplan>${I.route} Aus Tagesplan übernehmen</button>
        <button class="btn sm" data-addclick>${I.pin} Ort per Klick</button>
      </div>
      <form class="place-search" data-psearch><input class="input" name="q" placeholder="Ort suchen und hinzufügen …"><button class="btn sm">Suchen</button></form>
      <div id="pResults"></div>
      <ol class="orte">${orte.map((o, i) => `<li data-oid="${o.id}" class="${Number.isFinite(o.lat) ? "" : "nopos"}">
          <span class="num" style="background:${colorOf(t)}">${i + 1}</span>
          <input class="input o-name" data-oname="${o.id}" value="${esc(o.name)}" aria-label="Name">
          <label class="o-n" title="Nächte an diesem Ort"><input class="input" type="number" min="0" max="99" data-onights="${o.id}" value="${o.naechte || 0}"><span>N.</span></label>
          <span class="o-act">
            <button class="icon-btn ${Number.isFinite(o.lat) ? "" : "warn"}" data-oset="${o.id}" title="${Number.isFinite(o.lat) ? "Neu auf der Karte setzen" : "Nicht gefunden – auf der Karte setzen"}">${I.pin}</button>
            <button class="icon-btn" data-oup="${o.id}" ${i === 0 ? "disabled" : ""} aria-label="nach oben">${I.up}</button>
            <button class="icon-btn" data-odown="${o.id}" ${i === orte.length - 1 ? "disabled" : ""} aria-label="nach unten">${I.down}</button>
            <button class="icon-btn" data-odel="${o.id}" aria-label="entfernen">${U.ICONS.trash}</button>
          </span></li>`).join("") || `<li class="muted small">Noch keine Orte.</li>`}</ol>
      <p class="hint">Orte werden per Luftlinie verbunden. Ein längerer Aufenthalt (z. B. 3 Tage Lyon) ist <b>ein</b> Ort mit 3 Nächten. Fotos lassen sich jedem Ort zuordnen.</p>
      <h4 class="form-sub" style="margin-top:1rem">GPX-Tracks</h4>
      <ul class="tracks">${tracks.map((tr) => { const i = t.plan.findIndex((r) => r.id === tr.tag); return `<li>${I.route}<span><b>${esc(tr.name)}</b><small>${i >= 0 ? esc(U.dayLabel(t, i)) + " · " : ""}${String(tr.km).replace(".", ",")} km · ↑ ${tr.hoch} m · ↓ ${tr.runter} m</small></span>
          <button class="btn sm" data-tdl="${tr.id}">GPX</button><button class="icon-btn" data-tdel="${tr.id}" aria-label="entfernen">${U.ICONS.trash}</button></li>`; }).join("") || `<li class="muted small">Noch keine Tracks.</li>`}</ul>
      <div class="row" style="gap:.4rem;margin-top:.5rem">
        <select class="input" data-gtag style="flex:1;min-width:0"><option value="">Ohne bestimmten Tag</option>${t.plan.slice(0, t.tage).map((r, i) => `<option value="${r.id}">${esc(U.dayLabel(t, i))}${r.titel ? " · " + esc(r.titel) : ""}</option>`).join("")}</select>
        <label class="btn sm">${ICON.plus} GPX hochladen<input type="file" accept=".gpx,application/gpx+xml" data-gfile hidden multiple></label>
      </div>
      <p class="hint" style="margin-top:.5rem">Tipp: In Outdooractive die Tour öffnen → „GPX herunterladen“. Dieselbe Datei kannst du auf deine Suunto übertragen und hier hochladen.</p>`;
  }
  const sel = { on: false, ids: new Set() };
  const tile = (f) => `<button class="jg-tile ${isVideo(f) ? "is-video" : ""} ${sel.ids.has(f.id) ? "sel" : ""}" data-photo="${f.id}" data-ar="${f.w && f.h ? (f.w / f.h).toFixed(3) : 1.5}" title="${esc(f.name || "")}"><img data-thumb="${f.id}" alt="${esc(f.name || "")}" loading="lazy">${isVideo(f) ? `<span class="vid-badge">▶ ${fmtDauer(f.dauer)}</span>` : ""}<span class="sel-check" aria-hidden="true">✓</span></button>`;
  function fotoList(t) {
    const flt = state.ui.fotoFilter || "alle";
    return (t.fotos || []).filter((f) => flt === "alle" || (flt === "_" ? !f.ort : f.ort === flt)).sort((a, b) => (a.am || "").localeCompare(b.am || ""));
  }
  function fotosHtml(t) {
    const flt = state.ui.fotoFilter || "alle";
    const orte = t.orte || [];
    const all = t.fotos || [];
    const count = (k) => all.filter((f) => (k === "_" ? !f.ort : f.ort === k)).length;
    // Bei „Alle“: Abschnitte je Etappe (in Reihenfolge der Route), sonst eine Galerie
    const sections = flt === "alle"
      ? (all.length ? [...orte.map((o) => [legName(t, o.id), all.filter((f) => f.ort === o.id), o.id]), ["Reise allgemein", all.filter((f) => !f.ort || !orte.some((o) => o.id === f.ort)), ""]] : [])
      : [[null, fotoList(t), flt === "_" ? "" : flt]];
    return `${U.whoAmI(t)}
      <div class="foto-tools" data-fdrop>
        <label class="btn sm primary">${I.photo} Hinzufügen<input type="file" accept="image/*,video/*" multiple data-fupload hidden></label>
        <select class="input" data-fort><option value="">zu: Reise allgemein</option>${legOpts(t, flt, "zu: ")}</select>
        <span class="small muted">Fotos & Videos – oder einfach hierher ziehen</span>
      </div>
      ${all.length ? `<div class="foto-filter">${[["alle", `Alle (${all.length})`], ...orte.map((o) => [o.id, `${legName(t, o.id)} (${count(o.id)})`]), ["_", `Allgemein (${count("_")})`]]
        .map(([k, l]) => `<button class="chip chip-s ${flt === k ? "on" : ""} ${k !== "alle" && !count(k) && flt !== k ? "is-empty" : ""}" data-ffilter="${k}">${esc(l)}</button>`).join("")}</div>` : ""}
      ${all.length ? `<div class="sel-bar ${sel.on ? "on" : ""}">${sel.on
        ? `<b>${sel.ids.size} ausgewählt</b>
           <button class="btn sm" data-selall>${sel.ids.size === all.length ? "Keine" : "Alle"}</button>
           <select class="input" data-selmove ${sel.ids.size ? "" : "disabled"}><option value="">Etappe zuweisen …</option><option value="_">Reise allgemein</option>${legOpts(t, null)}</select>
           <button class="btn sm danger" data-seldel ${sel.ids.size ? "" : "disabled"}>${U.ICONS.trash} Löschen</button>
           <button class="btn sm primary" data-seldone>Fertig</button>`
        : `<button class="btn sm" data-selon>Mehrere auswählen</button>`}</div>` : ""}
      ${all.length > 1 && orte.length && !sel.on ? `<p class="small muted jg-tip">Tipp: Kachel auf eine andere Etappe ziehen, um sie umzuordnen${matchMedia("(pointer: coarse)").matches ? " (kurz gedrückt halten)" : " – mit Strg/⌘ oder Umschalt mehrere auswählen"}.</p>` : ""}
      ${sections.map(([h, l, oid]) => `<div class="jg-sec ${l.length ? "" : "is-empty"}" data-drop-ort="${oid}">${h ? `<h4 class="jg-head">${esc(h)} <span class="muted small">${l.length}</span></h4>` : ""}${l.length ? `<div class="jg">${l.map(tile).join("")}</div>` : `<div class="jg-empty">hierher ziehen</div>`}</div>`).join("") || `<p class="muted small">Noch keine Fotos. Profilbild, Etappen-Vorschau auf der Karte und Überblick füllen sich automatisch, sobald welche da sind.</p>`}`;
  }
  function reviewHtml(t) {
    const me = C.myId(t);
    const mine = (me && t.reviews && t.reviews[me]) || {};
    const others = Object.entries(t.reviews || {}).filter(([pid]) => pid !== me && person(t, pid));
    const rateRow = (k, l) => `<div class="rate-row ${k === "gesamt" ? "main" : ""}"><span>${l}</span><span class="rate" role="group" aria-label="${l}">${[1, 2, 3, 4, 5].map((n) => `<button data-rate="${k}:${n}" class="${(mine[k] || 0) >= n ? "on" : ""}" aria-label="${n} Sterne">★</button>`).join("")}</span>
      ${others.length || (mine[k] && Object.keys(t.reviews).length > 1) ? `<small class="avg">${reviewAvg(t, k) ? "Ø " + reviewAvg(t, k).toFixed(1).replace(".", ",") : ""}</small>` : ""}</div>`;
    if (!me) return U.whoAmI(t) || `<p class="muted">Wähle in der Planung, wer du bist.</p>`;
    return `<p class="small muted" style="margin-top:0">Deine Bewertung als <b>${esc(pname(t, person(t, me)))}</b>. Nicht Passendes einfach leer lassen – nochmal auf denselben Stern tippen setzt zurück.</p>
      <div class="rates">${ASPEKTE.map(([k, l]) => rateRow(k, l)).join("")}</div>
      <label class="field" style="margin-top:.8rem">Highlight der Reise<textarea class="input" rows="2" data-rtext="highlight">${esc(mine.highlight || "")}</textarea></label>
      <label class="field">Learnings fürs nächste Mal<textarea class="input" rows="2" data-rtext="learnings">${esc(mine.learnings || "")}</textarea></label>
      <div class="field">Würdest du wieder hinfahren?
        <div class="seg">${[["ja", "Ja"], ["vielleicht", "Vielleicht"], ["nein", "Nein"]].map(([k, l]) => `<button data-rwieder="${k}" class="${mine.wieder === k ? "on" : ""}">${l}</button>`).join("")}</div></div>
      ${others.length ? `<h4 class="form-sub" style="margin-top:1rem">Die anderen</h4>${others.map(([pid, r]) => `<div class="other-rev"><b>${esc(pname(t, person(t, pid)))}</b> ${r.gesamt ? stars(r.gesamt) : ""}
        ${r.highlight ? `<p>„${esc(r.highlight)}“</p>` : ""}${r.learnings ? `<p class="small muted">Learnings: ${esc(r.learnings)}</p>` : ""}${r.wieder ? `<p class="small muted">Wieder hin: ${esc(r.wieder)}</p>` : ""}</div>`).join("")}` : ""}`;
  }

  // ---------- Ereignisse ----------
  function onSideClick(e) {
    const tSel = state.ui.mapTrip && state.trips[state.ui.mapTrip];
    const q = (sel) => e.target.closest(sel);
    let x;
    if ((x = q("[data-mtrip]"))) return select(x.dataset.mtrip);
    if ((x = q("[data-mfilter]"))) { state.ui.mapFilter = x.dataset.mfilter; return renderSide(); }
    if (q("[data-newtrip]")) return PL.openNewUrlaub({ nachtragen: true });
    if (q("[data-mback]")) { state.ui.mapTrip = null; setMode(null); C.store.save(); renderSide(); draw(); return fitAll(); }
    if ((x = q("[data-mdetail]"))) { state.ui.mapDetail = x.dataset.mdetail; C.store.save(); return renderSide(); }
    if (!tSel) return;
    const t = tSel;
    if ((x = q("[data-me]"))) { C.setMe(t, x.dataset.me); return C.commit(); }
    if (q("[data-openplan]")) { state.current = t.id; C.store.save(); location.hash = "plan"; return; }
    if (q("[data-fromplan]")) {
      if ((t.orte || []).length && !armed(q("[data-fromplan]"), "Vorhandene Orte ersetzen?")) return;
      return routeFromPlan(t);
    }
    if (q("[data-addclick]")) return setMode({ type: "add" });
    if ((x = q("[data-oset]"))) { const o = t.orte.find((y) => y.id === x.dataset.oset); return setMode({ type: "set", id: o.id, name: o.name }); }
    if ((x = q("[data-oup]")) || (x = q("[data-odown]"))) {
      const id = x.dataset.oup || x.dataset.odown, i = t.orte.findIndex((o) => o.id === id), j = i + (x.dataset.oup ? -1 : 1);
      if (j < 0 || j >= t.orte.length) return;
      [t.orte[i], t.orte[j]] = [t.orte[j], t.orte[i]]; return C.commit();
    }
    if ((x = q("[data-odel]"))) { if (!armed(x, "×?")) return; t.orte = t.orte.filter((o) => o.id !== x.dataset.odel); (t.fotos || []).forEach((f) => { if (f.ort === x.dataset.odel) f.ort = ""; }); return C.commit(); }
    if ((x = q("[data-padd]"))) {
      const r = JSON.parse(x.dataset.padd); t.orte ||= []; t.orte.push({ id: uid() + uid(), name: r.name, naechte: 0, lat: r.lat, lon: r.lon });
      state.geo[r.name.toLowerCase()] = { lat: r.lat, lon: r.lon }; $("#pResults").innerHTML = ""; C.commit(); return fitTrip(t);
    }
    if ((x = q("[data-tdl]"))) return downloadGpx(t, t.tracks.find((y) => y.id === x.dataset.tdl));
    if ((x = q("[data-tdel]"))) { if (!armed(x, "×?")) return; return removeTrack(t, x.dataset.tdel); }
    if ((x = q("[data-ffilter]"))) { state.ui.fotoFilter = x.dataset.ffilter; return renderSide(); }
    if (q("[data-selon]")) { sel.on = true; sel.ids.clear(); return renderSide(); }
    if (q("[data-seldone]")) { sel.on = false; sel.ids.clear(); return renderSide(); }
    if (q("[data-selall]")) { const all = (t.fotos || []).map((f) => f.id); if (sel.ids.size === all.length) sel.ids.clear(); else all.forEach((id) => sel.ids.add(id)); return renderSide(); }
    if ((x = q("[data-seldel]"))) {
      if (!sel.ids.size || !armed(x, `${sel.ids.size} löschen?`)) return;
      sel.ids.forEach((id) => { U.dropBlob(t, id); U.dropBlob(t, id + "_t"); if (t.cover === id) t.cover = ""; });
      t.fotos = (t.fotos || []).filter((f) => !sel.ids.has(f.id)); toast(`${sel.ids.size} gelöscht.`);
      sel.ids.clear(); sel.on = false; C.commit(); if (U.isShared(t.id)) U.syncAll({ only: t.id }); return;
    }
    if ((x = q(".jg-tile[data-photo]")) && (sel.on || e.ctrlKey || e.metaKey || e.shiftKey)) {
      sel.on = true; const id = x.dataset.photo;
      if (e.shiftKey && sel.last) { // Bereich auswählen
        const ids = $$(".jg-tile[data-photo]", $("#kSide")).map((b) => b.dataset.photo); const a = ids.indexOf(sel.last), b = ids.indexOf(id);
        ids.slice(Math.min(a, b), Math.max(a, b) + 1).forEach((y) => sel.ids.add(y));
      } else sel.ids.has(id) ? sel.ids.delete(id) : sel.ids.add(id);
      sel.last = id; return renderSide();
    }
    if ((x = q("[data-photo]"))) {
      // Reihenfolge wie angezeigt
      const ids = $$("[data-photo]", $("#kSide")).map((b) => b.dataset.photo);
      const list = ids.map((id) => (t.fotos || []).find((f) => f.id === id)).filter(Boolean);
      return openPhoto(t, x.dataset.photo, list);
    }
    if ((x = q("[data-rate]"))) {
      const me = C.myId(t); if (!me) return;
      const [k, n] = x.dataset.rate.split(":"); t.reviews ||= {}; const r = (t.reviews[me] ||= {});
      r[k] = r[k] === +n ? 0 : +n; if (!r[k]) delete r[k]; r.am = new Date().toISOString(); return C.commit();
    }
    if ((x = q("[data-rwieder]"))) {
      const me = C.myId(t); if (!me) return; t.reviews ||= {}; const r = (t.reviews[me] ||= {});
      r.wieder = r.wieder === x.dataset.rwieder ? "" : x.dataset.rwieder; return C.commit();
    }
  }
  async function onSideChange(e) {
    const t = state.ui.mapTrip && state.trips[state.ui.mapTrip];
    const el = e.target;
    if (el.dataset.mq != null) { state.ui.mapQ = el.value; return renderSide(); }
    if (!t) return;
    if (el.dataset.oname) { const o = t.orte.find((x) => x.id === el.dataset.oname); if (o) o.name = el.value.trim() || o.name; return C.commit(); }
    if (el.dataset.onights) { const o = t.orte.find((x) => x.id === el.dataset.onights); if (o) o.naechte = Math.max(0, parseInt(el.value) || 0); return C.commit(); }
    if (el.dataset.rtext) { const me = C.myId(t); if (!me) return; t.reviews ||= {}; const r = (t.reviews[me] ||= {}); r[el.dataset.rtext] = el.value.trim(); return C.save(); }
    if (el.dataset.gfile != null && el.files.length) { const tag = $("[data-gtag]").value; for (const f of el.files) await importGpx(t, f, tag); return; }
    if (el.dataset.selmove != null && el.value) {
      const to = el.value === "_" ? "" : el.value; let n = 0;
      (t.fotos || []).forEach((f) => { if (sel.ids.has(f.id)) { f.ort = to; n++; } });
      toast(`${n} ${n === 1 ? "Datei" : "Dateien"} zu „${legName(t, to)}“.`); sel.ids.clear(); sel.on = false; return C.commit();
    }
    if (el.dataset.fupload != null && el.files.length) { await addPhotos(t, el.files, $("[data-fort]").value); return; }
  }
  async function onSideSubmit(e) {
    if (!e.target.matches("[data-psearch]")) return;
    e.preventDefault();
    const q = e.target.q.value.trim(); if (!q) return;
    const box = $("#pResults"); box.innerHTML = `<p class="small muted">Suche …</p>`;
    try {
      const res = await searchPlaces(q);
      box.innerHTML = res.length ? `<ul class="presults">${res.map((r) => `<li><button data-padd='${esc(JSON.stringify(r))}'><b>${esc(r.name)}</b><small>${esc(r.label)}</small></button></li>`).join("")}</ul>` : `<p class="small muted">Nichts gefunden.</p>`;
    } catch (err) { box.innerHTML = `<p class="small muted">${esc(err.message)}</p>`; }
  }

  let tdrag = null, suppressClick = false;
  function tileDragStart(e) {
    const tileEl = e.target.closest(".jg-tile"); if (!tileEl || !tileEl.closest("#kSide [data-drop-ort]")) return;
    const touch = e.pointerType !== "mouse";
    tdrag = { el: tileEl, id: tileEl.dataset.photo, x: e.clientX, y: e.clientY, active: false, touch, pid: e.pointerId };
    if (touch) tdrag.timer = setTimeout(() => { if (tdrag && !tdrag.moved) activateTileDrag(e.clientX, e.clientY); }, 380);
  }
  function activateTileDrag(x, y) {
    const d = tdrag; d.active = true;
    const r = d.el.getBoundingClientRect();
    const g = d.el.cloneNode(true); g.className = "jg-ghost"; g.style.width = Math.min(r.width, 140) + "px"; g.style.height = Math.min(r.height, 140) * (Math.min(r.width, 140) / r.width) + "px";
    const img = g.querySelector("img"); if (img) img.classList.add("loaded");
    document.body.appendChild(g); d.ghost = g; d.el.classList.add("dragging");
    document.body.classList.add("is-dragging"); $("#kSide").classList.add("tile-dragging");
    if (navigator.vibrate) navigator.vibrate(15);
    moveTileDrag(x, y);
  }
  function moveTileDrag(x, y) {
    const d = tdrag; d.ghost.style.transform = `translate(${x - 30}px, ${y - 30}px)`;
    d.ghost.style.visibility = "hidden"; const el = document.elementFromPoint(x, y); d.ghost.style.visibility = "";
    $$("#kSide .drop-on").forEach((z) => z.classList.remove("drop-on"));
    const chip = el && el.closest("[data-ffilter]:not([data-ffilter=alle])");
    const sec = el && el.closest("[data-drop-ort]");
    d.target = chip ? (chip.dataset.ffilter === "_" ? "" : chip.dataset.ffilter) : sec ? sec.dataset.dropOrt : null;
    (chip || sec) && (chip || sec).classList.add("drop-on");
    const side = $("#kSide .side-body"); if (side) { const r = side.getBoundingClientRect(); if (y < r.top + 40) side.scrollTop -= 12; else if (y > r.bottom - 40) side.scrollTop += 12; }
  }
  window.addEventListener("pointermove", (e) => {
    const d = tdrag; if (!d || e.pointerId !== d.pid) return;
    const dist = Math.hypot(e.clientX - d.x, e.clientY - d.y);
    if (!d.active) {
      if (d.touch) { if (dist > 10) { d.moved = true; clearTimeout(d.timer); tdrag = null; } return; } // Touch ohne langes Drücken = scrollen
      if (dist > 6) activateTileDrag(e.clientX, e.clientY); else return;
    }
    e.preventDefault(); moveTileDrag(e.clientX, e.clientY);
  }, { passive: false });
  window.addEventListener("touchmove", (e) => { if (tdrag && tdrag.active) e.preventDefault(); }, { passive: false });
  const endTileDrag = () => {
    const d = tdrag; tdrag = null; if (!d) return; clearTimeout(d.timer);
    if (!d.active) return;
    suppressClick = true; setTimeout(() => (suppressClick = false), 50);
    d.ghost.remove(); d.el.classList.remove("dragging"); document.body.classList.remove("is-dragging");
    const side = $("#kSide"); side && side.classList.remove("tile-dragging"); $$("#kSide .drop-on").forEach((z) => z.classList.remove("drop-on"));
    const t = state.trips[state.ui.mapTrip]; if (!t || d.target == null) return;
    const ids = sel.ids.has(d.id) ? [...sel.ids] : [d.id];
    const fs = (t.fotos || []).filter((x) => ids.includes(x.id) && (x.ort || "") !== d.target); if (!fs.length) return;
    fs.forEach((f) => (f.ort = d.target)); if (ids.length > 1) { sel.ids.clear(); sel.on = false; }
    const o = (t.orte || []).find((x) => x.id === d.target);
    toast(`${fs.length > 1 ? fs.length + " Dateien" : "Zu"} ${fs.length > 1 ? "zu " : ""}„${o ? legName(t, o.id) : "Reise allgemein"}“ verschoben.`);
    C.commit();
  };
  window.addEventListener("pointerup", endTileDrag);
  window.addEventListener("pointercancel", endTileDrag);

  let lastTab = null;
  function renderKarte() {
    if (lastTab !== "karte") { state.ui.mapTrip = null; setMode(null); fitted = false; }
    lastTab = "karte";
    buildView().then(() => {
      renderSide(); draw();
      if (map) setTimeout(() => map.invalidateSize(), 60);
    });
  }
  PL.views.karte = renderKarte;
  window.addEventListener("hashchange", () => { if (location.hash !== "#karte") lastTab = location.hash.slice(1); });
  // Kacheln bei Größenänderung neu verteilen
  let jt = null; window.addEventListener("resize", () => { clearTimeout(jt); jt = setTimeout(() => $$("#kSide .jg").forEach(justify), 120); });
  const prevInit = PL.init;
  PL.init = () => {
    prevInit();
    const v = $("#view-karte");
    v.addEventListener("click", (e) => {
      if (e.target.closest("[data-cancelmode]")) return setMode(null);
      const mp = e.target.closest("[data-mapph]");
      if (mp) { const [tid, oid, fid] = mp.dataset.mapph.split(":"); const t = state.trips[tid]; if (t) openPhoto(t, fid, (t.fotos || []).filter((f) => f.ort === oid)); return; }
      const pf = e.target.closest("[data-popfotos]");
      if (pf) { e.preventDefault(); const [tid, oid] = pf.dataset.popfotos.split(":"); state.ui.mapTrip = tid; state.ui.mapDetail = "fotos"; state.ui.fotoFilter = oid; renderSide(); draw(); return; }
      if (suppressClick && e.target.closest(".jg-tile")) return;
      if (e.target.closest("#kSide")) onSideClick(e);
    });
    v.addEventListener("pointerdown", tileDragStart);
    v.addEventListener("contextmenu", (e) => { if (e.target.closest(".jg-tile")) e.preventDefault(); });
    v.addEventListener("change", (e) => { if (e.target.closest("#kSide")) onSideChange(e); });
    v.addEventListener("submit", onSideSubmit);
    // Fotos per Drag & Drop
    v.addEventListener("dragover", (e) => { const z = e.target.closest("[data-fdrop]"); if (z) { e.preventDefault(); z.classList.add("drag-over"); } });
    v.addEventListener("dragleave", (e) => { const z = e.target.closest("[data-fdrop]"); if (z && !z.contains(e.relatedTarget)) z.classList.remove("drag-over"); });
    v.addEventListener("drop", async (e) => {
      const z = e.target.closest("[data-fdrop]"); if (!z) return;
      e.preventDefault(); z.classList.remove("drag-over");
      const t = state.trips[state.ui.mapTrip]; if (t && e.dataTransfer.files.length) await addPhotos(t, e.dataTransfer.files, $("[data-fort]").value);
    });
  };
})();
