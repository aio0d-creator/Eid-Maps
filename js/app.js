/* Eidmaps app: real GPS, real map, search, OSRM routing, turn-by-turn, 3D road view, vehicle, cameras, radar. */
(function () {
  "use strict";
  var G = window.EidGeo, $ = function (id) { return document.getElementById(id); };
  function showErr(m) { var b = $("errbox"); b.hidden = false; b.textContent = "Eidmaps: " + m; clearTimeout(showErr._t); showErr._t = setTimeout(function () { b.hidden = true; }, 9000); }
  window.addEventListener("error", function (e) { showErr(e.message || "unknown error"); });
  window.addEventListener("unhandledrejection", function (e) { showErr(String(e.reason && e.reason.message || e.reason)); });
  if (!window.maplibregl || !window.THREE) { $("go").textContent = "Reload"; $("go").onclick = function () { location.reload(); }; $("startTxt").textContent = "Map or 3D library did not load. Check your internet and reload."; return; }

  // ---------- text ----------
  var T = {
    ar: { start: "خريطتك الحقيقية بالـ GPS، ومسار حقيقي، وشوارع 3D بحاراتها، وسيارتك عليها.", go: "ابدأ", safe: "لا تستخدم الجوال وأنت تسوق. ثبّته أو خل الراكب يستخدمه.",
      search: "وين رايح؟", searchPh: "اكتب مكان، مثلاً: ياس مول", noRes: "ما لقيت نتائج", routes: "المسارات", goNav: "ابدأ الملاحة", end: "إنهاء", min: "د", km: "كم", m: "م",
      arrive: "الوصول", remain: "متبقي", acc: "دقة الموقع", wait: "ننتظر إشارة الـ GPS…", noGeo: "ما قدرنا نوصل لموقعك. فعّل الموقع للمتصفح من الإعدادات.",
      unnamed: "شارع بدون اسم", reroute: "نحسب مسار جديد…", settings: "الإعدادات", view: "الكاميرا", views: ["خلف السيارة", "السائق", "3D مرتفع", "2D"],
      base: "الخريطة", bases: { map: "عادية", sat: "قمر صناعي" }, theme: "الثيم", themes: { none: "بدون", neon: "نيون", gold: "ليل ذهبي", redline: "خط أحمر", blue: "مخطط هندسي", holo: "هولوجرام" },
      car: "سيارتي", bodies: { suv: "SUV", sedan: "سيدان", sport: "رياضية", ev: "كهربائية", pickup: "بيك أب" }, model: "اسم الموديل", glb: "مجسم سيارتك (‎.glb)", voice: "الصوت", on: "شغّال", off: "مطفي",
      lang: "English", recenter: "توسيط", loading3d: "نحمّل شوارع 3D…", est: "عرض الشوارع وارتفاع الجسور تقديري من OpenStreetMap",
      radar: "رادار", limit: "الحد", cap: "يصوّر على", unk: "سرعة التصوير غير مؤكدة", slow: "خفّف", limSrc: "من OpenStreetMap · غير مؤكد", via: "عن طريق", fastest: "الأسرع", alt: "بديل" },
    en: { start: "Your real map by GPS, a real route, 3D roads with lanes, and your car on them.", go: "Start", safe: "Don't use the phone while driving. Mount it or let a passenger operate it.",
      search: "Where to?", searchPh: "Type a place, e.g. Yas Mall", noRes: "No results", routes: "Routes", goNav: "Start navigation", end: "End", min: "min", km: "km", m: "m",
      arrive: "Arrive", remain: "left", acc: "Accuracy", wait: "Waiting for GPS signal…", noGeo: "Couldn't get your location. Allow location for this browser in Settings.",
      unnamed: "Unnamed road", reroute: "Finding a new route…", settings: "Settings", view: "Camera", views: ["Behind car", "Driver", "3D elevated", "2D"],
      base: "Map", bases: { map: "Standard", sat: "Satellite" }, theme: "Theme", themes: { none: "None", neon: "Neon", gold: "Gold night", redline: "Red line", blue: "Blueprint", holo: "Hologram" },
      car: "My car", bodies: { suv: "SUV", sedan: "Sedan", sport: "Sports", ev: "Electric", pickup: "Pickup" }, model: "Model name", glb: "Your car's 3D model (.glb)", voice: "Voice", on: "On", off: "Off",
      lang: "العربية", recenter: "Re-center", loading3d: "Loading 3D roads…", est: "Road widths and bridge heights are estimated from OpenStreetMap",
      radar: "Camera", limit: "limit", cap: "captures at", unk: "capture speed unconfirmed", slow: "slow down", limSrc: "OpenStreetMap · unverified", via: "via", fastest: "Fastest", alt: "Alternative" }
  };
  var THEMES = { none: null, neon: { route: "#ff3ea5", mark: "#ffb3dd" }, gold: { route: "#f0c060", mark: "#f5dc9a" }, redline: { route: "#ff3b3b", mark: "#ffc0c0" }, blue: { route: "#5fb8ff", mark: "#cfe8ff" }, holo: { route: "#8fdcff", mark: "#bfefff" } };
  var COLORS = [0xf4f4f2, 0x1b1d21, 0x8f969d, 0x2f5d4a, 0x6b7a5c, 0x1f3d6e, 0x8c1d1d, 0xc9b28a];
  function load(k, d) { try { var v = localStorage.getItem("eid2-" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem("eid2-" + k, JSON.stringify(v)); } catch (e) {} }
  var S = { lang: load("lang", "ar"), view: load("view", 0), base: load("base", "map"), theme: load("theme", "none"), voice: load("voice", true),
    car: load("car", { type: "suv", color: 0xf4f4f2, name: "BYD Leopard 7" }) };
  if (!THEMES.hasOwnProperty(S.theme)) S.theme = "none";
  if (!(S.view >= 0 && S.view <= 3)) S.view = 0;
  function t(k) { return T[S.lang][k]; }

  // ---------- map ----------
  try { if (maplibregl.getRTLTextPluginStatus && maplibregl.getRTLTextPluginStatus() === "unavailable") maplibregl.setRTLTextPlugin("https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js", false); } catch (e) {}
  var map = new maplibregl.Map({ container: "map", style: "https://tiles.openfreemap.org/styles/liberty", center: [54.37, 24.47], zoom: 11, maxPitch: 72,
    attributionControl: { compact: true, customAttribution: "Routing © OSRM · Search © Photon/OSM" } });
  var world = new window.EidWorld3D(map, { onError: function (e) { showErr("3D roads: " + e.message); } });
  map.on("error", function (e) { var m = (e && e.error && e.error.message) || ""; if (/style|Failed to fetch|NetworkError/i.test(m)) showErr("Map: " + m); });
  map.on("style.load", function () { styleMap(); if (!map.getLayer("eid-world3d")) map.addLayer(world.layer); world.setVehicle(S.car.type, S.car.color, glbScene); applyTheme(); if (route) drawRoute2D(); });

  function vecSource() { var st = map.getStyle(); return Object.keys(st.sources).find(function (k) { return st.sources[k].type === "vector"; }); }
  function styleMap() {
    var st = map.getStyle(), layers = st.layers || [];
    var nameExpr = S.lang === "ar" ? ["coalesce", ["get", "name:ar"], ["get", "name"]] : ["coalesce", ["get", "name:en"], ["get", "name:latin"], ["get", "name"]];
    layers.forEach(function (l) { try {
      if (l.type === "symbol") { if (l["source-layer"] === "transportation_name") map.setLayoutProperty(l.id, "visibility", "none"); else if (l["source-layer"] !== "housenumber" && map.getLayoutProperty(l.id, "text-field") !== undefined) map.setLayoutProperty(l.id, "text-field", nameExpr); }
    } catch (e) {} });
    if (S.base === "sat") setSatellite(true);
    var src = vecSource(), firstSym = (layers.find(function (l) { return l.type === "symbol"; }) || {}).id;
    if (S.base !== "sat" && src && !layers.some(function (l) { return l.type === "fill-extrusion"; })) {
      try { map.addLayer({ id: "eid-3d", type: "fill-extrusion", source: src, "source-layer": "building", minzoom: 14,
        paint: { "fill-extrusion-color": ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 8], 0, "#e4dfd6", 60, "#d2cdc4", 200, "#bfc6cf"],
          "fill-extrusion-height": ["coalesce", ["get", "render_height"], 8], "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0], "fill-extrusion-opacity": 0.92 } }, firstSym); } catch (e) {}
    }
    try { if (map.setSky) map.setSky({ "sky-color": "#7fb2e6", "horizon-color": "#efe6d6", "fog-color": "#ebe6de", "sky-horizon-blend": 0.6, "horizon-fog-blend": 0.6, "fog-ground-blend": 0.4 }); } catch (e) {}
    bridgeLayersVisible(S.view >= 2);
  }
  var satSaved = null;
  function setSatellite(on) {
    var layers = map.getStyle().layers || [];
    if (on) {
      if (!map.getSource("eid-sat")) map.addSource("eid-sat", { type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, maxzoom: 19, attribution: "Imagery © Esri, Maxar, Earthstar Geographics" });
      if (!map.getLayer("eid-sat")) { var first = layers.find(function (l) { return l.type !== "background"; }); map.addLayer({ id: "eid-sat", type: "raster", source: "eid-sat" }, first && first.id); }
      satSaved = satSaved || {};
      layers.forEach(function (l) { try { if (l.type === "fill") { if (!(l.id in satSaved)) satSaved[l.id] = map.getPaintProperty(l.id, "fill-opacity"); map.setPaintProperty(l.id, "fill-opacity", 0); }
        if (l.type === "fill-extrusion") map.setLayoutProperty(l.id, "visibility", "none"); } catch (e) {} });
    } else {
      if (map.getLayer("eid-sat")) map.removeLayer("eid-sat");
      layers.forEach(function (l) { try { if (l.type === "fill") map.setPaintProperty(l.id, "fill-opacity", satSaved && l.id in satSaved ? satSaved[l.id] : 1);
        if (l.type === "fill-extrusion") map.setLayoutProperty(l.id, "visibility", "visible"); } catch (e) {} });
    }
  }
  // In close 3D views the flat base-map bridges would show under our raised decks, so hide them there.
  function bridgeLayersVisible(v) { (map.getStyle().layers || []).forEach(function (l) { if (/bridge/.test(l.id) && l.type === "line") try { map.setLayoutProperty(l.id, "visibility", v ? "visible" : "none"); } catch (e) {} }); }
  function applyTheme() {
    var th = THEMES[S.theme]; world.setColors(th ? th.route : "#35d0ff", th ? th.mark : "#f2f2ee");
    document.documentElement.style.setProperty("--accent", th ? th.route : "#35d0ff");
    if (map.getLayer("eid-route-2d")) map.setPaintProperty("eid-route-2d", "line-color", th ? th.route : "#35d0ff");
  }

  // ---------- GPS & smoothing ----------
  var fix = null, disp = null, dispH = 0, dispZ = 18, lastFrame = performance.now(), lastFixT = 0, following = true, zoomBias = 0, touching = false, userPitch = null;
  var limit = null, limitAt = null, limitBusy = false, cams = [], camAt = null, camBusy = false, camMarkers = [];
  function onPos(p) {
    var c = [p.coords.longitude, p.coords.latitude], now = performance.now(), v = p.coords.speed, h;
    if ((v == null || isNaN(v)) && fix) { var dd = G.dist(fix.raw, c), dt = (now - lastFixT) / 1000; v = dt > 0 ? dd / dt : 0; }
    v = Math.max(0, v || 0);
    if (p.coords.heading != null && !isNaN(p.coords.heading) && v > 1.5) h = p.coords.heading; else if (fix && G.dist(fix.raw, c) > 4) h = G.bearing(fix.raw, c); else h = fix ? fix.h : 0;
    // map matching: snap to the active route when close to it
    var snapped = c;
    if (route) {
      var pr = G.project(c, route.line, route.cum, route.hint, 40);
      if (pr.d < 30) { snapped = pr.point; route.hint = pr.i; route.along = pr.along; var pa = G.pointAt(route.line, route.cum, pr.along + 3); if (v > 2) h = pa.brg; offRouteSince = 0; }
      else if (v > 2) { offRouteSince = offRouteSince || now; if (now - offRouteSince > 6000 && !rerouting) reroute(c); }
    }
    fix = { c: snapped, raw: c, t: now, v: v, h: h, acc: p.coords.accuracy, onRoute: snapped !== c }; lastFixT = now;
    if (!disp) { disp = snapped.slice(); dispH = h; puckMarker.setLngLat(disp).addTo(map); }
    var kmh = Math.round(v * 3.6);
    $("spd").textContent = kmh; $("spdBox").classList.toggle("over", !!(limit && kmh > limit));
    if (!route) $("etaSub").textContent = t("acc") + " ±" + Math.round(p.coords.accuracy) + " " + t("m");
    var good = p.coords.accuracy <= 100;
    if (good && (!world.lastLoad || G.dist(world.lastLoad, c) > 350) && (!onPos._tl || now - onPos._tl > 2500)) { onPos._tl = now; var ok = world.loadFromTiles(c, 1200); $("loading").hidden = ok || !!world.lastLoad; if (ok) noteEstimated(); }
    if (good && (!limitAt || G.dist(limitAt, c) > 150)) setTimeout(function () { fetchLimit(c); }, 1200);
    if (good && (!camAt || G.dist(camAt, c) > 1500)) setTimeout(function () { fetchCams(c); }, 2600);
    camCheck(c, h, kmh);
    if (!route && (!onPos._rn || now - onPos._rn > 3000)) { onPos._rn = now; setTimeout(function () { roadName(disp || c); }, 200); }
    if (route) updateGuidance(kmh);
  }
  var offRouteSince = 0, rerouting = false;
  function noteEstimated() { $("estNote").textContent = world.estimatedShare > 0.3 ? t("est") : ""; }

  var puckEl = document.createElement("div"); puckEl.className = "puck"; puckEl.innerHTML = '<svg viewBox="0 0 34 34" width="30" height="30"><circle cx="17" cy="17" r="14" fill="rgba(0,0,0,.35)" stroke="var(--accent)" stroke-width="2"/><path d="M17 6l8 20-8-5-8 5z" fill="var(--accent)"/></svg>';
  var puckMarker = new maplibregl.Marker({ element: puckEl, rotationAlignment: "map", pitchAlignment: "map" });

  var CAM = [ { pitch: 66, zoom: 19.2, pad: 0.5 }, { pitch: 72, zoom: 20.0, pad: 0.38, ahead: 6 }, { pitch: 55, zoom: 17.6, pad: 0.42 }, { pitch: 0, zoom: 16.4, pad: 0 } ];
  function frame(now) {
    requestAnimationFrame(frame);
    try { frameBody(now); } catch (e) { if (!frame._e) { frame._e = 1; showErr(e.message); } }
  }
  function frameBody(now) {
    var dt = Math.min(0.1, (now - lastFrame) / 1000); lastFrame = now;
    if (fix && disp) {
      var ahead = Math.min(1.5, (now - fix.t) / 1000), k = 1 - Math.exp(-dt * 5);
      var tgt = route && fix.onRoute ? G.pointAt(route.line, route.cum, (route.along || 0) + fix.v * ahead).p : G.offset(fix.c, fix.v * ahead, fix.h);
      disp[0] += (tgt[0] - disp[0]) * k; disp[1] += (tgt[1] - disp[1]) * k; dispH = G.angLerp(dispH, fix.h, 1 - Math.exp(-dt * 4));
      var cm = CAM[S.view], speedZoom = S.view <= 1 ? Math.min(1.2, fix.v * 3.6 / 90) : Math.min(1.4, fix.v * 3.6 / 70);
      var zT = cm.zoom - speedZoom + zoomBias; dispZ += (zT - dispZ) * (1 - Math.exp(-dt * 1.5));
      puckMarker.setLngLat(disp).setRotation(dispH); puckEl.style.display = S.view >= 2 ? "" : "none";
      world.carState.visible = S.view !== 1 && S.view !== 3; world.placeVehicle(disp, dispH, fix.v, dt);
      if (following && !touching) {
        var center = cm.ahead ? G.offset(disp, cm.ahead, dispH) : disp;
        map.jumpTo({ center: center, bearing: S.view === 3 ? 0 : dispH, pitch: S.view === 3 ? 0 : (userPitch != null ? userPitch : cm.pitch), zoom: dispZ,
          padding: { top: innerHeight * cm.pad, bottom: 0, left: 0, right: 0 } });
      }
    }
    world.animate(dt); map.triggerRepaint();
  }
  map.on("touchstart", function () { touching = true; }); map.on("touchend", function () { touching = false; }); map.on("touchcancel", function () { touching = false; });
  map.on("dragstart", function (e) { if (e.originalEvent && fix) { following = false; $("recenter").hidden = false; } });
  map.on("zoomend", function (e) { if (e.originalEvent && following) { var cm = CAM[S.view], sz = fix ? (S.view <= 1 ? Math.min(1.2, fix.v * 3.6 / 90) : Math.min(1.4, fix.v * 3.6 / 70)) : 0; zoomBias = Math.max(-6, Math.min(3, map.getZoom() - (cm.zoom - sz))); dispZ = map.getZoom(); } });
  map.on("pitchend", function (e) { if (e.originalEvent && S.view !== 3) userPitch = map.getPitch(); });
  $("recenter").onclick = function () { following = true; $("recenter").hidden = true; };

  // ---------- street name, limit, cameras ----------
  function roadName(c) { try {
    var src = vecSource(); if (!src) return; var fs = map.querySourceFeatures(src, { sourceLayer: "transportation_name" }), best = null, bd = 60;
    fs.forEach(function (f) { var g = f.geometry, lines = g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : [];
      lines.forEach(function (L) { if (L.length < 2) return; var pr = G.project(c, L); if (pr.d < bd) { bd = pr.d; best = f; } }); });
    var P = best ? best.properties || {} : {};
    $("instr").textContent = best ? ((S.lang === "ar" ? (P["name:ar"] || P.name) : (P["name:en"] || P["name:latin"] || P.name)) || t("unnamed")) : t("unnamed");
    $("road").textContent = P.ref || ""; $("dist").textContent = ""; setArrow("straight");
  } catch (e) {} }
  function fetchLimit(c) {
    if (limitBusy) return; limitBusy = true;
    var q = "[out:json][timeout:10];way(around:25," + c[1] + "," + c[0] + ")[highway][maxspeed];out tags 1;";
    fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (j) { limitAt = c; var w = j.elements && j.elements[0], n = w ? parseInt(w.tags.maxspeed, 10) : NaN;
        limit = isNaN(n) ? null : n; $("lim").textContent = limit || "—"; $("lim").classList.toggle("unk", !limit); })
      .catch(function () {}).then(function () { limitBusy = false; });
  }
  function fetchCams(c) {
    if (camBusy) return; camBusy = true;
    var q = "[out:json][timeout:15];node(around:4000," + c[1] + "," + c[0] + ")[highway=speed_camera];out;";
    fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (j) {
        camAt = c; cams = (j.elements || []).map(function (n) { return { c: [n.lon, n.lat], lim: parseInt((n.tags || {}).maxspeed, 10) || null }; });
        camMarkers.forEach(function (m) { m.remove(); });
        camMarkers = cams.map(function (k) { var el = document.createElement("div"); el.className = "camdot"; el.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13"><rect x="3" y="7" width="13" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 10l5-2v8l-5-2" fill="none" stroke="currentColor" stroke-width="2"/></svg>'; return new maplibregl.Marker({ element: el }).setLngLat(k.c).addTo(map); });
      }).catch(function () {}).then(function () { camBusy = false; });
  }
  function camCheck(c, h, kmh) {
    var el = $("rad"), best = null, bd = 700;
    cams.forEach(function (k) { var d = G.dist(c, k.c); if (d > bd) return; if (G.angDiff(G.bearing(c, k.c), h) < 50 || d < 40) { bd = d; best = k; } });
    if (!best) { el.hidden = true; return; }
    var lim = best.lim || limit, tr = G.captureSpeed(G.emirateOf(c), lim), over = lim && kmh > lim;
    el.hidden = false; el.classList.toggle("over", !!over);
    el.innerHTML = "📷 " + t("radar") + " <b>" + Math.round(bd / 10) * 10 + " " + t("m") + "</b>" + (lim ? " · " + t("limit") + " <b>" + lim + "</b>" : "") + " · " + (tr ? t("cap") + " <b>" + tr + "</b>" : t("unk")) + (over ? " · " + t("slow") : "");
  }

  // ---------- search & routing ----------
  var route = null, routeOptions = [], dest = null, spokenFor = {};
  var UAE_BBOX = "51.5,22.6,56.4,26.1";
  var searchTimer = null;
  $("q").addEventListener("input", function () { clearTimeout(searchTimer); var q = this.value.trim(); if (q.length < 2) { $("results").innerHTML = ""; return; } searchTimer = setTimeout(function () { doSearch(q); }, 350); });
  function doSearch(q) {
    var near = fix ? "&lat=" + fix.raw[1] + "&lon=" + fix.raw[0] : "";
    fetch("https://photon.komoot.io/api/?q=" + encodeURIComponent(q) + "&limit=8&bbox=" + UAE_BBOX + near)
      .then(function (r) { return r.json(); }).then(function (j) {
        var fs = j.features || [];
        if (!fs.length) { $("results").innerHTML = '<div class="empty">' + t("noRes") + "</div>"; return; }
        $("results").innerHTML = fs.map(function (f, i) { var p = f.properties || {}, sub = [p.street, p.district || p.city, p.state].filter(Boolean).join("، ");
          return '<button class="res" data-i="' + i + '"><b>' + esc(p.name || p.street || "—") + "</b><span>" + esc(sub) + "</span></button>"; }).join("");
        $("results")._fs = fs;
      }).catch(function (e) { showErr("Search: " + e.message); });
  }
  $("results").addEventListener("click", function (e) { var b = e.target.closest(".res"); if (!b || b.dataset.r != null || !this._fs) return; var f = this._fs[+b.dataset.i]; if (!f) return;
    dest = { c: f.geometry.coordinates, name: (f.properties || {}).name || "" }; planRoutes(); });
  function osrm(from, to, alternatives) {
    var u = "https://router.project-osrm.org/route/v1/driving/" + from[0] + "," + from[1] + ";" + to[0] + "," + to[1] + "?overview=full&geometries=geojson&steps=true&alternatives=" + (alternatives ? "true" : "false");
    return fetch(u).then(function (r) { if (!r.ok) throw new Error("Routing " + r.status); return r.json(); }).then(function (j) { if (j.code !== "Ok") throw new Error("Routing: " + j.code); return j.routes; });
  }
  function planRoutes() {
    if (!fix) { showErr(t("wait")); return; }
    $("results").innerHTML = '<div class="empty">…</div>';
    osrm(fix.raw, dest.c, true).then(function (rs) {
      routeOptions = rs;
      $("results").innerHTML = '<div class="lab">' + t("routes") + "</div>" + rs.map(function (r, i) {
        var main = (r.legs[0].summary || "").split(",")[0];
        return '<button class="res route" data-r="' + i + '"><b>' + fmtDur(r.duration) + " · " + fmtKm(r.distance) + "</b><span>" + (i === 0 ? t("fastest") : t("alt")) + (main ? " · " + t("via") + " " + esc(main) : "") + "</span></button>";
      }).join("");
      previewRoutes(rs);
    }).catch(function (e) { showErr(e.message); $("results").innerHTML = ""; });
  }
  $("results").addEventListener("click", function (e) { var b = e.target.closest("[data-r]"); if (!b) return; startRoute(routeOptions[+b.dataset.r]); });
  function previewRoutes(rs) {
    var fc = { type: "FeatureCollection", features: rs.map(function (r, i) { return { type: "Feature", properties: { i: i }, geometry: r.geometry }; }) };
    if (map.getSource("eid-preview")) map.getSource("eid-preview").setData(fc);
    else { map.addSource("eid-preview", { type: "geojson", data: fc });
      map.addLayer({ id: "eid-preview", type: "line", source: "eid-preview", paint: { "line-color": ["case", ["==", ["get", "i"], 0], "#35d0ff", "#8c96a3"], "line-width": 6, "line-opacity": 0.85 }, layout: { "line-cap": "round", "line-join": "round" } }); }
    var b = new maplibregl.LngLatBounds(); rs[0].geometry.coordinates.forEach(function (c) { b.extend(c); });
    following = false; $("recenter").hidden = false; map.fitBounds(b, { padding: { top: 120, bottom: innerHeight * 0.5, left: 40, right: 40 }, pitch: 0, bearing: 0, duration: 800 });
  }
  function startRoute(r) {
    route = { line: r.geometry.coordinates, steps: G.indexSteps(r.legs[0].steps), duration: r.duration, distance: r.distance, hint: 0, along: 0 };
    route.cum = G.cumulative(route.line); spokenFor = {};
    if (map.getLayer("eid-preview")) { map.removeLayer("eid-preview"); map.removeSource("eid-preview"); }
    drawRoute2D(); world.setRoute(route.line);
    $("searchSheet").hidden = true; $("endNav").hidden = false; following = true; $("recenter").hidden = true;
    if (S.view === 3) S.view = 0; renderSettings(); updateGuidance(fix ? fix.v * 3.6 : 0);
  }
  function drawRoute2D() {
    var data = { type: "Feature", geometry: { type: "LineString", coordinates: route.line } };
    if (map.getSource("eid-route-2d")) map.getSource("eid-route-2d").setData(data);
    else { map.addSource("eid-route-2d", { type: "geojson", data: data });
      map.addLayer({ id: "eid-route-2d", type: "line", source: "eid-route-2d", paint: { "line-color": (THEMES[S.theme] || {}).route || "#35d0ff", "line-width": ["interpolate", ["linear"], ["zoom"], 12, 4, 18, 12], "line-opacity": 0.75 }, layout: { "line-cap": "round", "line-join": "round" } }, map.getLayer("eid-world3d") ? "eid-world3d" : undefined); }
  }
  function endRoute() {
    route = null; world.setRoute(null); if (map.getLayer("eid-route-2d")) { map.removeLayer("eid-route-2d"); map.removeSource("eid-route-2d"); }
    $("endNav").hidden = true; $("lanes").hidden = true; $("eta").textContent = ""; if (fix) roadName(fix.c);
  }
  $("endNav").onclick = endRoute;
  function reroute(c) {
    if (!dest) return; rerouting = true; $("instr").textContent = t("reroute"); say(t("reroute"));
    osrm(c, dest.c, false).then(function (rs) { startRoute(rs[0]); }).catch(function (e) { showErr(e.message); }).then(function () { rerouting = false; offRouteSince = 0; });
  }
  function updateGuidance() {
    if (!route) return;
    var nm = G.nextManeuver(route.steps, route.along || 0); if (!nm) return;
    var st = nm.step, d = nm.distance;
    setArrow(G.arrowKey(st)); $("dist").innerHTML = fmtDist(d);
    $("instr").textContent = G.instruction(st, S.lang); $("road").textContent = st.ref || st.destinations || "";
    var left = Math.max(0, route.distance - (route.along || 0)), secs = route.duration * (left / (route.distance || 1));
    $("eta").textContent = fmtKm(left) + " · " + fmtDur(secs);
    $("etaSub").textContent = t("arrive") + " " + new Date(Date.now() + secs * 1000).toLocaleTimeString(S.lang === "ar" ? "ar-AE" : "en-GB", { hour: "2-digit", minute: "2-digit" });
    renderLanes(st, d);
    // voice: once far ahead, once close
    var key = nm.i, far = fix && fix.v > 20 ? 800 : 400;
    if (d < far && d > 160 && !spokenFor[key + "f"]) { spokenFor[key + "f"] = 1; say(S.lang === "ar" ? "بعد " + fmtDistPlain(d) + "، " + G.instruction(st, "ar") : "In " + fmtDistPlain(d) + ", " + G.instruction(st, "en")); }
    if (d <= 120 && !spokenFor[key + "n"]) { spokenFor[key + "n"] = 1; say(G.instruction(st, S.lang)); }
    if (st.maneuver.type === "arrive" && d < 25) endRoute();
  }
  // Lane guidance only where OSRM returns lane data for the maneuver's intersection (from OSM turn:lanes).
  function renderLanes(st, d) {
    var el = $("lanes"), ints = st.intersections || [], lanes = null;
    for (var i = 0; i < ints.length; i++) if (ints[i].lanes) { lanes = ints[i].lanes; break; }
    if (!lanes || d > 900) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = lanes.map(function (l) { var ind = (l.indications || ["straight"])[0], rot = { left: -90, "slight left": -40, "sharp left": -120, right: 90, "slight right": 40, "sharp right": 120, uturn: 180 }[ind] || 0;
      return '<span class="' + (l.valid ? "on" : "") + '"><svg viewBox="0 0 22 26" style="transform:rotate(' + rot + 'deg)"><path d="M11 24V4M4 11l7-7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'; }).join("");
  }
  var ARROWS = { straight: "M26 46V12 M14 22l12-12 12 12", right: "M14 46V30c0-7 5-12 12-12h8 M30 8l12 10-12 10", left: "M38 46V30c0-7-5-12-12-12h-8 M22 8L10 18l12 10",
    "slight-right": "M18 46V28l14-14 M24 12h10v10", "slight-left": "M34 46V28L20 14 M28 12H18v10", uturn: "M18 46V20a8 8 0 0 1 16 0v10 M28 26l6 6 6-6", round: "M26 46V32 M26 32a8 8 0 1 1 8-8 M30 12l6 4-6 4", flag: "M16 46V8 M16 10h20l-5 7 5 7H16" };
  function setArrow(k) { $("turnIcon").innerHTML = '<path d="' + (ARROWS[k] || ARROWS.straight) + '" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'; }
  function say(text) { if (!S.voice || !window.speechSynthesis) return; try { var u = new SpeechSynthesisUtterance(text); u.lang = S.lang === "ar" ? "ar-AE" : "en-GB";
    var vs = speechSynthesis.getVoices(), v = vs.find(function (x) { return x.lang && x.lang.indexOf(S.lang === "ar" ? "ar" : "en") === 0; }); if (v) u.voice = v; if (speechSynthesis.speaking) speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {} }

  // ---------- formatting ----------
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function fmtKm(m) { return (m >= 1000 ? (m / 1000).toFixed(m >= 10000 ? 0 : 1) + " " + t("km") : Math.round(m / 10) * 10 + " " + t("m")); }
  function fmtDur(s) { var m = Math.max(1, Math.round(s / 60)); return m >= 60 ? Math.floor(m / 60) + ":" + String(m % 60).padStart(2, "0") + " h" : m + " " + t("min"); }
  function fmtDist(m) { return m >= 1000 ? (m / 1000).toFixed(1) + "<small>" + t("km") + "</small>" : (m > 300 ? Math.round(m / 50) * 50 : Math.round(m / 10) * 10) + "<small>" + t("m") + "</small>"; }
  function fmtDistPlain(m) { return m >= 1000 ? (m / 1000).toFixed(1) + " " + (S.lang === "ar" ? "كيلو" : "kilometres") : Math.round(m / 50) * 50 + " " + (S.lang === "ar" ? "متر" : "metres"); }

  // ---------- settings UI ----------
  var glbScene = null;
  function seg(id, items, cur, key) { $(id).innerHTML = items.map(function (it) { return '<button data-k="' + key + '" data-v="' + it[0] + '" aria-pressed="' + (String(it[0]) === String(cur)) + '">' + it[1] + "</button>"; }).join(""); }
  function renderSettings() {
    var L = T[S.lang];
    document.documentElement.lang = S.lang; document.documentElement.dir = S.lang === "ar" ? "rtl" : "ltr";
    ["view", "base", "theme", "car", "voice"].forEach(function (k) { $("l-" + k).textContent = L[k]; });
    seg("s-view", L.views.map(function (v, i) { return [i, v]; }), S.view, "view");
    seg("s-base", [["map", L.bases.map], ["sat", L.bases.sat]], S.base, "base");
    seg("s-theme", Object.keys(L.themes).map(function (k) { return [k, L.themes[k]]; }), S.theme, "theme");
    seg("s-body", Object.keys(L.bodies).map(function (k) { return [k, L.bodies[k]]; }), S.car.type, "body");
    $("s-color").innerHTML = COLORS.map(function (c) { var h = "#" + c.toString(16).padStart(6, "0"); return '<button class="sw" data-k="color" data-v="' + c + '" aria-pressed="' + (c === S.car.color) + '" aria-label="' + h + '" style="background:' + h + '"></button>'; }).join("");
    seg("s-voice", [[1, L.on], [0, L.off]], S.voice ? 1 : 0, "voice");
    $("model").placeholder = L.model; $("model").value = S.car.name || ""; $("l-glb").textContent = L.glb; $("bLang").textContent = L.lang;
    $("q").placeholder = L.searchPh; $("bSearch").setAttribute("aria-label", L.search); $("searchTitle").textContent = L.search; $("recenter").textContent = L.recenter;
    $("loading").textContent = L.loading3d; $("endNav").textContent = L.end; $("startTxt").textContent = L.start; $("go").textContent = L.go; $("safe").textContent = L.safe;
    $("limSrc").textContent = L.limSrc;
  }
  $("settings").addEventListener("click", function (e) {
    var b = e.target.closest("[data-k]"); if (!b) return; var k = b.dataset.k, v = b.dataset.v;
    if (k === "view") { S.view = +v; userPitch = null; zoomBias = 0; following = true; $("recenter").hidden = true; bridgeLayersVisible(S.view >= 2); }
    if (k === "base") { if (S.base !== v) { S.base = v; save("base", v); setSatellite(v === "sat"); } }
    if (k === "theme") { S.theme = v; applyTheme(); }
    if (k === "body") { S.car.type = v; glbScene = null; world.setVehicle(S.car.type, S.car.color, null); }
    if (k === "color") { S.car.color = +v; glbScene = null; world.setVehicle(S.car.type, S.car.color, null); }
    if (k === "voice") { S.voice = v === "1"; }
    ["view", "theme", "voice", "car"].forEach(function (x) { save(x, S[x]); });
    renderSettings();
  });
  $("model").addEventListener("input", function () { S.car.name = this.value.trim(); save("car", S.car); });
  $("glb").addEventListener("change", function () {
    var f = this.files && this.files[0]; if (!f) return;
    if (!THREE.GLTFLoader) { showErr("3D model loader not available"); return; }
    var r = new FileReader(); r.onload = function () { try { new THREE.GLTFLoader().parse(r.result, "", function (g) { glbScene = g.scene; world.flipModel = false; world.setVehicle(null, null, glbScene); }, function () { showErr("This .glb file could not be read"); }); } catch (e) { showErr("This .glb file could not be read"); } };
    r.readAsArrayBuffer(f);
  });
  $("bLang").onclick = function () { S.lang = S.lang === "ar" ? "en" : "ar"; save("lang", S.lang); renderSettings(); styleMap(); if (route) updateGuidance(); };
  $("bSet").onclick = function () { $("settings").hidden = !$("settings").hidden; $("searchSheet").hidden = true; };
  $("bSearch").onclick = function () { $("searchSheet").hidden = !$("searchSheet").hidden; $("settings").hidden = true; if (!$("searchSheet").hidden) $("q").focus(); };
  $("closeSearch").onclick = function () { $("searchSheet").hidden = true; if (map.getLayer("eid-preview")) { map.removeLayer("eid-preview"); map.removeSource("eid-preview"); } following = true; };

  $("go").onclick = function () {
    $("start").hidden = true;
    function lock() { try { if (navigator.wakeLock) navigator.wakeLock.request("screen").catch(function () {}); } catch (e) {} }
    lock(); document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") lock(); });
    try { if (window.speechSynthesis) { var u0 = new SpeechSynthesisUtterance(" "); u0.volume = 0; speechSynthesis.speak(u0); } } catch (e) {} // unlock speech on iOS
    if (!navigator.geolocation) { showErr(t("noGeo")); return; }
    $("etaSub").textContent = t("wait");
    navigator.geolocation.watchPosition(onPos, function (err) { if (err && err.code === 1) showErr(t("noGeo")); }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  };
  renderSettings(); setArrow("straight"); requestAnimationFrame(frame);
})();
