/* =========================================================
   Sync-Schicht: Verschlüsselung · GitHub-Daten-Repo · Offline-Cache
   ---------------------------------------------------------
   - Jeder Urlaub hat einen eigenen zufälligen Schlüssel (AES-GCM, 256 Bit).
   - Urlaubsdaten liegen verschlüsselt als  trips/<id>.enc  im privaten Daten-Repo.
   - Tickets/Dateien liegen verschlüsselt als  files/<urlaub-id>/<datei-id>.enc
   - Der eigene Schlüsselbund (welche Urlaube gehören mir, mit welchem Schlüssel)
     liegt als keys/keyring.enc – verschlüsselt mit deinem Passwort.
   - Eingeladene Personen bekommen per Einladungs-Link nur den Schlüssel
     des jeweiligen Urlaubs.
   GitHub sieht nur verschlüsselte Daten.
   ========================================================= */
(() => {
  "use strict";
  const PL = (window.PL = window.PL || {});
  const te = new TextEncoder(), td = new TextDecoder();

  // ---------- Base64 ----------
  function bytesToB64(bytes) {
    let s = ""; const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    return btoa(s);
  }
  function b64ToBytes(b64) {
    const s = atob(b64.replace(/\s/g, "")); const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  const b64url = (s) => s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unb64url = (s) => { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return s; };

  // ---------- Krypto ----------
  const subtle = window.crypto && window.crypto.subtle;
  const randomKey = () => bytesToB64(crypto.getRandomValues(new Uint8Array(32)));
  const keyCache = new Map();
  async function aesKey(b64) {
    if (!keyCache.has(b64)) keyCache.set(b64, await subtle.importKey("raw", b64ToBytes(b64), "AES-GCM", false, ["encrypt", "decrypt"]));
    return keyCache.get(b64);
  }
  async function encBytes(keyB64, bytes) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(keyB64), bytes));
    const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
    return out;
  }
  async function decBytes(keyB64, data) {
    const pt = await subtle.decrypt({ name: "AES-GCM", iv: data.subarray(0, 12) }, await aesKey(keyB64), data.subarray(12));
    return new Uint8Array(pt);
  }
  const encJSON = async (keyB64, obj) => bytesToB64(await encBytes(keyB64, te.encode(JSON.stringify(obj))));
  const decJSON = async (keyB64, b64) => JSON.parse(td.decode(await decBytes(keyB64, b64ToBytes(b64))));

  async function deriveMaster(pass, saltB64) {
    const base = await subtle.importKey("raw", te.encode(pass), "PBKDF2", false, ["deriveBits"]);
    const bits = await subtle.deriveBits({ name: "PBKDF2", salt: b64ToBytes(saltB64), iterations: 310000, hash: "SHA-256" }, base, 256);
    return bytesToB64(new Uint8Array(bits));
  }

  // ---------- GitHub-API ----------
  class GHError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
  async function gh(cfg, method, path, body, accept = "application/vnd.github+json") {
    let res;
    try {
      res = await fetch(`https://api.github.com/repos/${cfg.o}/${cfg.r}/contents/${path}`, {
        method,
        headers: { Authorization: `Bearer ${cfg.t}`, Accept: accept, "X-GitHub-Api-Version": "2022-11-28", ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store"
      });
    } catch (e) { throw new GHError(0, "Keine Verbindung zu GitHub."); }
    if (res.status === 404) return null;
    if (!res.ok) {
      let msg = res.statusText;
      try { msg = (await res.json()).message || msg; } catch { /* egal */ }
      if (res.status === 401) msg = "Token ungültig oder abgelaufen.";
      if (res.status === 403) msg = "Kein Zugriff – hat der Token Schreibrechte (Contents: Read and write) für dieses Repo?";
      throw new GHError(res.status, msg);
    }
    return accept.includes("raw") ? res : res.json();
  }
  async function getFile(cfg, path) {
    const meta = await gh(cfg, "GET", path);
    if (!meta) return null;
    let content = meta.content;
    if (!content && meta.size > 0) { // > 1 MB: Inhalt separat holen
      const raw = await gh(cfg, "GET", path, null, "application/vnd.github.raw");
      content = (await raw.text()).trim();
    }
    return { sha: meta.sha, content: (content || "").replace(/\n/g, "") };
  }
  async function getRawBytes(cfg, path) {
    const raw = await gh(cfg, "GET", path, null, "application/vnd.github.raw");
    if (!raw) return null;
    return new Uint8Array(await raw.arrayBuffer());
  }
  const putFile = (cfg, path, contentB64, sha, message) =>
    gh(cfg, "PUT", path, { message, content: contentB64, ...(sha ? { sha } : {}) });
  async function delFile(cfg, path, message) {
    const meta = await gh(cfg, "GET", path);
    if (!meta) return;
    await gh(cfg, "DELETE", path, { message, sha: meta.sha });
  }
  async function testRepo(cfg) {
    const res = await fetch(`https://api.github.com/repos/${cfg.o}/${cfg.r}`, { headers: { Authorization: `Bearer ${cfg.t}`, Accept: "application/vnd.github+json" } })
      .catch(() => { throw new GHError(0, "Keine Verbindung zu GitHub."); });
    if (res.status === 404) throw new GHError(404, "Repo nicht gefunden – Name richtig und Token für dieses Repo freigegeben?");
    if (res.status === 401) throw new GHError(401, "Token ungültig oder abgelaufen.");
    if (!res.ok) throw new GHError(res.status, "GitHub antwortet mit Fehler " + res.status);
    const info = await res.json();
    if (!info.private) throw new GHError(400, "Das Repo ist öffentlich. Bitte ein privates Repo verwenden.");
    if (info.permissions && !info.permissions.push) throw new GHError(403, "Der Token hat keine Schreibrechte.");
    return info;
  }

  // ---------- IndexedDB (Dateien offline) ----------
  let dbp = null;
  function db() {
    if (!dbp) dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open("urlaubsplanung", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("files");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }
  async function idb(mode, fn) {
    const d = await db();
    return new Promise((resolve, reject) => {
      const tx = d.transaction("files", mode); const st = tx.objectStore("files");
      const req = fn(st);
      tx.oncomplete = () => resolve(req && req.result);
      tx.onerror = () => reject(tx.error);
    });
  }
  const cacheGet = (k) => idb("readonly", (s) => s.get(k)).catch(() => null);
  const cachePut = (k, v) => idb("readwrite", (s) => s.put(v, k)).catch(() => null);
  const cacheDel = (k) => idb("readwrite", (s) => s.delete(k)).catch(() => null);

  // ---------- 3-Wege-Merge ----------
  const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const isRecArr = (a) => Array.isArray(a) && a.every((x) => isObj(x) && x.id != null);
  function merge3(base, local, remote) {
    if (eq(local, base)) return remote;
    if (eq(remote, base)) return local;
    if (eq(local, remote)) return local;
    if (isObj(local) && isObj(remote)) {
      const b = isObj(base) ? base : {}; const out = {};
      new Set([...Object.keys(local), ...Object.keys(remote)]).forEach((k) => {
        const v = merge3(b[k], local[k], remote[k]);
        if (v !== undefined) out[k] = v;
      });
      return out;
    }
    if ((local === undefined || isRecArr(local)) && (remote === undefined || isRecArr(remote)) && (local || remote)) {
      const L = local || [], R = remote || [], B = isRecArr(base) ? base : [];
      const bm = new Map(B.map((x) => [x.id, x])), lm = new Map(L.map((x) => [x.id, x])), rm = new Map(R.map((x) => [x.id, x]));
      const out = [];
      const take = (id) => {
        const v = merge3(bm.get(id), lm.get(id), rm.get(id));
        if (v !== undefined) out.push(v);
      };
      L.forEach((x) => take(x.id));
      R.forEach((x) => { if (!lm.has(x.id)) take(x.id); });
      return out;
    }
    return local; // echter Konflikt bei einfachem Wert: lokale Änderung gewinnt
  }

  PL.sync = { bytesToB64, b64ToBytes, b64url, unb64url, randomKey, encBytes, decBytes, encJSON, decJSON, deriveMaster,
    GHError, getFile, getRawBytes, putFile, delFile, testRepo, cacheGet, cachePut, cacheDel, merge3, eq,
    available: !!subtle };
})();
