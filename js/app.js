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
      base: "الخريطة", bases: { map: "عادية", sat: "قمر صناعي" }, theme: "الثيم", themes: { start: "ستايل البداية", none: "بدون", neon: "نيون", gold: "ليل ذهبي", redline: "خط أحمر", blue: "مخطط هندسي", holo: "هولوجرام" },
      car: "سيارتي", bodies: { suv: "SUV", sedan: "سيدان", sport: "رياضية", ev: "كهربائية", pickup: "بيك أب" }, model: "اسم الموديل", glb: "مجسم سيارتك (‎.glb)", cats: { cafe: "مقهى", food: "مطعم", fuel: "محطة وقود", mosque: "مسجد", hospital: "مستشفى / عيادة", pharmacy: "صيدلية", shop: "محل", hotel: "فندق", parking: "مواقف", bank: "بنك / صراف", sight: "معلم", park: "حديقة / رياضة" }, unnamedPlace: "مكان بدون اسم", noInfo: "ما فيه تفاصيل إضافية مسجلة في OpenStreetMap", flags: { delivery: "توصيل", takeaway: "سفري", outdoor: "جلسات خارجية", drive: "درايف ثرو", wheel: "مناسب للكراسي المتحركة" }, gBad: "مفتاح Google غير صالح أو غير مفعّل", gLoading: "جاري تحميل الصور والتقييمات…", gNone: "ما لقيت صور أو تقييمات لهذا المكان", price: "الأسعار", reviews: "التقييمات", menu: "المنيو", gkey: "مفتاح Google Places (يُحفظ في جهازك فقط)", pGo: "اذهب", pGoogle: "الصور والتقييمات في Google Maps", pNote: "التفاصيل من OpenStreetMap · التقييمات ما تظهر داخل التطبيق إلا بمزوّد مرخّص", voice: "الصوت", bld: "المباني", blds: { auto: "تلقائي", enhanced: "محسّن", performance: "أداء", reality: "واقعي" }, bldNote: { auto: "يبدأ محسّن وينزل للأداء إذا الجهاز بطيء", enhanced: "المكان والارتفاع حقيقي من OpenStreetMap · الواجهة تقريبية حسب نوع المبنى", performance: "مباني بسيطة · لون المبنى من OpenStreetMap إذا موجود", reality: "غير متوفر: يحتاج بيانات مرخّصة مدفوعة (Google 3D Tiles) وتغطية الإمارات غير مؤكدة · يعرض المحسّن" }, on: "شغّال", off: "مطفي",
      lang: "English", recenter: "توسيط", loading3d: "نحمّل شوارع 3D…", est: "عرض الشوارع وارتفاع الجسور تقديري من OpenStreetMap",
      radar: "رادار", limit: "الحد", cap: "يصوّر على", unk: "سرعة التصوير غير مؤكدة", slow: "خفّف", limSrc: "من OpenStreetMap · غير مؤكد", via: "عن طريق", fastest: "الأسرع", alt: "بديل", demo: "عرض تجريبي: مدينة خليفة ← ياس", demoTag: "تجريبي · قيادة محاكاة على شوارع حقيقية" },
    en: { start: "Your real map by GPS, a real route, 3D roads with lanes, and your car on them.", go: "Start", safe: "Don't use the phone while driving. Mount it or let a passenger operate it.",
      search: "Where to?", searchPh: "Type a place, e.g. Yas Mall", noRes: "No results", routes: "Routes", goNav: "Start navigation", end: "End", min: "min", km: "km", m: "m",
      arrive: "Arrive", remain: "left", acc: "Accuracy", wait: "Waiting for GPS signal…", noGeo: "Couldn't get your location. Allow location for this browser in Settings.",
      unnamed: "Unnamed road", reroute: "Finding a new route…", settings: "Settings", view: "Camera", views: ["Behind car", "Driver", "3D elevated", "2D"],
      base: "Map", bases: { map: "Standard", sat: "Satellite" }, theme: "Theme", themes: { start: "Original style", none: "None", neon: "Neon", gold: "Gold night", redline: "Red line", blue: "Blueprint", holo: "Hologram" },
      car: "My car", bodies: { suv: "SUV", sedan: "Sedan", sport: "Sports", ev: "Electric", pickup: "Pickup" }, model: "Model name", glb: "Your car's 3D model (.glb)", cats: { cafe: "Café", food: "Restaurant", fuel: "Fuel station", mosque: "Mosque", hospital: "Hospital / clinic", pharmacy: "Pharmacy", shop: "Shop", hotel: "Hotel", parking: "Parking", bank: "Bank / ATM", sight: "Landmark", park: "Park / sport" }, unnamedPlace: "Unnamed place", noInfo: "No extra details recorded in OpenStreetMap", flags: { delivery: "Delivery", takeaway: "Takeaway", outdoor: "Outdoor seating", drive: "Drive-through", wheel: "Wheelchair accessible" }, gBad: "Google key invalid or not enabled", gLoading: "Loading photos and reviews…", gNone: "No photos or reviews found for this place", price: "Price", reviews: "Reviews", menu: "Menu", gkey: "Google Places key (stored on this device only)", pGo: "Go", pGoogle: "Photos & reviews in Google Maps", pNote: "Details from OpenStreetMap · in-app reviews need a licensed provider", voice: "Voice", bld: "Buildings", blds: { auto: "Auto", enhanced: "Enhanced", performance: "Performance", reality: "Reality" }, bldNote: { auto: "Starts enhanced, drops to performance on slow devices", enhanced: "Real position and height from OpenStreetMap · facades approximate by building type", performance: "Simple buildings · OSM building colour where mapped", reality: "Not available: needs paid licensed data (Google 3D Tiles), UAE coverage unconfirmed · showing Enhanced" }, on: "On", off: "Off",
      lang: "العربية", recenter: "Re-center", loading3d: "Loading 3D roads…", est: "Road widths and bridge heights are estimated from OpenStreetMap",
      radar: "Camera", limit: "limit", cap: "captures at", unk: "capture speed unconfirmed", slow: "slow down", limSrc: "OpenStreetMap · unverified", via: "via", fastest: "Fastest", alt: "Alternative", demo: "Demo: Khalifa City → Yas", demoTag: "DEMO · simulated drive on real roads" }
  };
  var THEMES = { start: { route: "#2fd27a", mark: "#bdeeff", road: "holo", sky: { "sky-color": "#24407a", "horizon-color": "#8e9cc0", "fog-color": "#4a5570", "sky-horizon-blend": 0.6, "horizon-fog-blend": 0.6, "fog-ground-blend": 0.35 }, bld: "#2b3a56" }, none: null, neon: { route: "#ff3ea5", mark: "#ffb3dd" }, gold: { route: "#f0c060", mark: "#f5dc9a" }, redline: { route: "#ff3b3b", mark: "#ffc0c0" }, blue: { route: "#5fb8ff", mark: "#cfe8ff" }, holo: { route: "#8fdcff", mark: "#bfefff" } };
  var COLORS = [0xf4f4f2, 0x1b1d21, 0x8f969d, 0x2f5d4a, 0x6b7a5c, 0x1f3d6e, 0x8c1d1d, 0xc9b28a];
  function load(k, d) { try { var v = localStorage.getItem("eid2-" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem("eid2-" + k, JSON.stringify(v)); } catch (e) {} }
  var S = { lang: load("lang", "ar"), view: load("view", 0), base: load("base", "map"), theme: load("theme", "none"), voice: load("voice", true), bld: load("bld", "auto"),
    car: load("car", { type: "suv", color: 0xf4f4f2, name: "BYD Leopard 7" }) };
  if (!THEMES.hasOwnProperty(S.theme)) S.theme = "none";
  if (!(S.view >= 0 && S.view <= 3)) S.view = 0;
  function t(k) { return T[S.lang][k]; }

  // ---------- map ----------
  try { if (maplibregl.getRTLTextPluginStatus && maplibregl.getRTLTextPluginStatus() === "unavailable") maplibregl.setRTLTextPlugin("https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js", false); } catch (e) {}
  var map = new maplibregl.Map({ container: "map", style: "https://tiles.openfreemap.org/styles/liberty", center: [54.37, 24.47], zoom: 11, maxPitch: 72,
    attributionControl: { compact: true, customAttribution: "Routing © OSRM · Search © Photon/OSM" } });
  var world = new window.EidWorld3D(map, { onError: function (e) { showErr("3D: " + e.message); }, onBuildings: function (has) { (map.getStyle().layers || []).forEach(function (l) { if (l.type === "fill-extrusion") try { map.setLayoutProperty(l.id, "visibility", has || S.base === "sat" ? "none" : "visible"); } catch (e) {} }); } });
  map.on("error", function (e) { var m = (e && e.error && e.error.message) || ""; if (/style|Failed to fetch|NetworkError/i.test(m)) showErr("Map: " + m); });
  map.on("style.load", function () { styleMap(); if (!map.getLayer("eid-world3d")) map.addLayer(world.layer); poiOnTop(); world.setVehicle(S.car.type, S.car.color, glbScene); applyTheme(); if (route) drawRoute2D(); });

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
    addPoiLayer();
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
  var DAY_SKY = { "sky-color": "#7fb2e6", "horizon-color": "#efe6d6", "fog-color": "#ebe6de", "sky-horizon-blend": 0.6, "horizon-fog-blend": 0.6, "fog-ground-blend": 0.4 }, bldSaved = {};
  // ---------- places: every café, restaurant and other POI with its own icon ----------
  var POI = [
    ["cafe", "#7A4E2D", ["cafe", "ice_cream"]],
    ["food", "#C8553D", ["restaurant", "fast_food", "bar", "pub", "beer", "food_court"]],
    ["fuel", "#1F6FB2", ["fuel", "charging_station"]],
    ["mosque", "#1F7A74", ["place_of_worship"]],
    ["hospital", "#D63A3A", ["hospital", "clinic", "doctors", "dentist"], true],
    ["pharmacy", "#1E9E6A", ["pharmacy", "chemist"]],
    ["shop", "#6A4FB3", ["shop", "grocery", "supermarket", "mall", "clothing_store", "department_store", "convenience", "bakery", "jewelry", "electronics", "furniture", "hardware", "mobile_phone"]],
    ["hotel", "#2D4F8E", ["lodging", "hotel"]],
    ["parking", "#2D6CC8", ["parking"]],
    ["bank", "#5A6B2A", ["bank", "atm", "money_transfer"]],
    ["sight", "#B9822A", ["attraction", "museum", "monument", "castle", "viewpoint", "theatre", "cinema", "art_gallery", "zoo", "theme_park"]],
    ["park", "#3F7E3A", ["park", "garden", "playground", "pitch", "stadium", "sports_centre", "golf"]]
  ];
  // Glyphs on a 24-unit grid (sample C, approved): stroked white unless marked fill.
  var GLYPH = {
    cafe: { d: "M5 8h11v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5zM16 9h1.5a2.5 2.5 0 0 1 0 5H16M8 3c0 1 1 1.5 1 2.5M12 3c0 1 1 1.5 1 2.5M4 21h14" },
    food: { d: "M7 3v6a2 2 0 0 0 4 0V3M9 3v6M9 11v10M17 21V3c-2 1.5-3 4-3 7 0 2 1 3 3 3" },
    fuel: { d: "M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M6.5 8h5M14 10h2a2 2 0 0 1 2 2v4a1.5 1.5 0 0 0 3 0V8l-3-3" },
    mosque: { d: "M12 3v2M7 13a5 5 0 0 1 10 0M5 21v-8h14v8M3 21h18M3 21V9M21 21V9M10 21v-4a2 2 0 0 1 4 0v4" },
    hospital: { d: "M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z", fill: true },
    pharmacy: { d: "M10.5 20.5a5 5 0 0 1-7-7l6-6a5 5 0 0 1 7 7zM8.5 8.5l7 7" },
    shop: { d: "M3 4h2l2.5 11h10L20 7H6.2M9 19.5h.01M17 19.5h.01" },
    hotel: { d: "M3 18V6M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 11.5h.01" },
    parking: { d: "M8 20V4h5a4.5 4.5 0 0 1 0 9H8" },
    bank: { d: "M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18" },
    sight: { d: "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7z" },
    park: { d: "M12 3l6 9h-3l4 6H5l4-6H6zM12 18v3" }
  };
  function poiIcon(key, color, invert) {
    var px = 2, S0 = 34, c = document.createElement("canvas"); c.width = c.height = S0 * px; var g = c.getContext("2d"); g.scale(px, px);
    var r = 9, x = 1.5, y = 1.5, w = S0 - 3, h = S0 - 3;
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
    g.fillStyle = invert ? "#ffffff" : color; g.fill(); g.lineWidth = invert ? 2 : 1.5; g.strokeStyle = invert ? color : "#ffffff"; g.stroke();
    var gl = GLYPH[key], ink = invert ? color : "#ffffff";
    g.save(); g.translate(7, 7); g.scale(20 / 24, 20 / 24);
    var path = new Path2D(gl.d);
    if (gl.fill) { g.fillStyle = ink; g.fill(path); }
    else { g.strokeStyle = ink; g.lineWidth = 2.4; g.lineCap = "round"; g.lineJoin = "round"; g.stroke(path); }
    g.restore();
    return { width: c.width, height: c.height, data: new Uint8Array(g.getImageData(0, 0, c.width, c.height).data.buffer) };
  }
  // Place icons sit above the 3D roads and buildings, never under them.
  function poiOnTop() { try { if (map.getLayer("eid-poi")) map.moveLayer("eid-poi"); } catch (e) {} }
  function addPoiLayer() {
    var src = vecSource(); if (!src || map.getLayer("eid-poi")) return;
    POI.forEach(function (p) { if (!map.hasImage("eid-" + p[0])) map.addImage("eid-" + p[0], poiIcon(p[0], p[1], p[3]), { pixelRatio: 2 }); });
    (map.getStyle().layers || []).forEach(function (l) { if (l["source-layer"] === "poi" && l.type === "symbol") try { map.setLayoutProperty(l.id, "visibility", "none"); } catch (e) {} });
    var match = ["match", ["get", "class"]];
    POI.forEach(function (p) { match.push(p[2], "eid-" + p[0]); }); match.push("");
    var nameExpr = S.lang === "ar" ? ["coalesce", ["get", "name:ar"], ["get", "name"]] : ["coalesce", ["get", "name:en"], ["get", "name:latin"], ["get", "name"]];
    map.addLayer({ id: "eid-poi", type: "symbol", source: src, "source-layer": "poi", minzoom: 14,
      filter: ["!=", ["get", "class"], "bus"],
      layout: { "icon-image": match, "icon-size": ["interpolate", ["linear"], ["zoom"], 14, ["*", 0.42, ["case", ["<=", ["coalesce", ["get", "rank"], 30], 10], 1, ["<=", ["coalesce", ["get", "rank"], 30], 25], 0.85, 0.72]], 16, ["*", 0.55, ["case", ["<=", ["coalesce", ["get", "rank"], 30], 10], 1, ["<=", ["coalesce", ["get", "rank"], 30], 25], 0.85, 0.72]], 18, ["*", 0.72, ["case", ["<=", ["coalesce", ["get", "rank"], 30], 10], 1, ["<=", ["coalesce", ["get", "rank"], 30], 25], 0.85, 0.72]], 20, ["*", 0.9, ["case", ["<=", ["coalesce", ["get", "rank"], 30], 10], 1, ["<=", ["coalesce", ["get", "rank"], 30], 25], 0.85, 0.72]]], "icon-padding": 1, "icon-allow-overlap": false, "icon-pitch-alignment": "viewport",
        "text-field": ["step", ["zoom"], "", 17.5, nameExpr], "text-font": ["Noto Sans Regular"], "text-size": 10.5, "text-offset": [0, 1.1], "text-anchor": "top", "text-optional": true, "symbol-sort-key": ["get", "rank"] },
      paint: { "text-color": "#1b2430", "text-halo-color": "#ffffff", "text-halo-width": 1.4 } });
  }
  // ---------- buildings: real OSM footprints and heights; facades are approximate (no verified facade imagery for the UAE) ----------
  // kinds: v = villa/low-rise (<12 m), m = mid-rise apartments (12–40 m), t = tower (>40 m). Several variants each, picked per building.
  var FAC = {
    v: [{ wall: "#e8dcc4", win: "#4f6a80" }, { wall: "#f1eee8", win: "#56707f" }, { wall: "#d6bf98", win: "#4a5f6f" }],
    m: [{ wall: "#d9d4cb", win: "#3f5a70", bal: "#bfb8ab" }, { wall: "#cbbfa9", win: "#3c5466", bal: "#a99d86" }],
    t: [{ glass: "#4d7493", mull: "#9fb6c8" }, { glass: "#457a7a", mull: "#9cc2bf" }, { glass: "#7f8b97", mull: "#c8d0d8" }]
  };
  function seeded(n) { return function () { n = (n * 9301 + 49297) % 233280; return n / 233280; }; }
  function facade(kind, i, night) {
    var W = 64, H = 64, c = document.createElement("canvas"); c.width = W; c.height = H; var g = c.getContext("2d"), f = FAC[kind][i], rnd = seeded(7 + i * 31 + (kind.charCodeAt(0)));
    function lit(p) { return night && rnd() < p; }
    if (kind === "t") {
      g.fillStyle = night ? "#121c2b" : f.glass; g.fillRect(0, 0, W, H);
      for (var y = 0; y < 8; y++) for (var x = 0; x < 4; x++) {
        g.fillStyle = night ? (lit(0.55) ? "rgba(255,216,150,.9)" : "rgba(38,58,86,.95)") : (rnd() < 0.35 ? "rgba(225,240,250,.45)" : "rgba(255,255,255,.12)");
        g.fillRect(x * 16 + 1, y * 8 + 1, 14, 6);
      }
      g.fillStyle = night ? "rgba(255,255,255,.07)" : f.mull; for (var m = 0; m < 4; m++) g.fillRect(m * 16, 0, 1, H);
      for (var r = 0; r < 8; r++) g.fillRect(0, r * 8, W, 1);
    } else if (kind === "m") {
      g.fillStyle = night ? "#2b2f39" : f.wall; g.fillRect(0, 0, W, H);
      for (var fl = 0; fl < 4; fl++) {
        var y0 = fl * 16;
        g.fillStyle = night ? "rgba(0,0,0,.3)" : f.bal; g.fillRect(0, y0 + 12, W, 3);            // balcony slab
        for (var w = 0; w < 4; w++) { g.fillStyle = night ? (lit(0.5) ? "rgba(255,208,140,.95)" : "rgba(30,40,56,.95)") : f.win; g.fillRect(w * 16 + 3, y0 + 2, 10, 9); }
      }
    } else {
      g.fillStyle = night ? "#2a2f3c" : f.wall; g.fillRect(0, 0, W, H);
      g.fillStyle = night ? "rgba(0,0,0,.25)" : "rgba(110,85,50,.12)"; g.fillRect(0, 30, W, 2); g.fillRect(0, 62, W, 2);
      for (var yy = 0; yy < 2; yy++) for (var xx = 0; xx < 2; xx++) {
        g.fillStyle = night ? (lit(0.5) ? "rgba(255,210,140,.95)" : "rgba(30,40,55,.95)") : f.win;
        g.fillRect(xx * 32 + 9, yy * 32 + 8, 14, 15);
        if (!night) { g.fillStyle = "rgba(255,255,255,.6)"; g.fillRect(xx * 32 + 8, yy * 32 + 23, 16, 2); }
      }
    }
    return { width: W, height: H, data: new Uint8Array(g.getImageData(0, 0, W, H).data.buffer) };
  }
  var BLD_MODES = ["auto", "enhanced", "performance", "reality"];
  if (BLD_MODES.indexOf(S.bld) < 0) S.bld = "auto";
  var bldAuto = "enhanced", bldNight = false;
  function bldMode() { return S.bld === "auto" ? bldAuto : S.bld === "reality" ? "enhanced" : S.bld; }
  var H_EXPR = ["coalesce", ["get", "render_height"], 8];
  function styleBuildings(night) {
    bldNight = night;
    var mode = bldMode(), sfx = night ? "-n" : "";
    var layers = (map.getStyle().layers || []).filter(function (l) { return l.type === "fill-extrusion"; });
    if (mode === "performance") {
      layers.forEach(function (l) { try {
        map.setPaintProperty(l.id, "fill-extrusion-pattern", undefined);
        // OSM building:colour where mapped, otherwise a neutral tone by height
        map.setPaintProperty(l.id, "fill-extrusion-color", ["coalesce", ["get", "colour"], ["interpolate", ["linear"], H_EXPR, 0, night ? "#2e3546" : "#e4dfd6", 60, night ? "#27324a" : "#d2cdc4", 200, night ? "#243450" : "#bfc6cf"]]);
        map.setPaintProperty(l.id, "fill-extrusion-vertical-gradient", false);
        map.setLayerZoomRange(l.id, 15, 24);
      } catch (e) {} });
      return;
    }
    Object.keys(FAC).forEach(function (k) { FAC[k].forEach(function (_, i) { var id = "eid-fac-" + k + i + sfx; if (!map.hasImage(id)) map.addImage(id, facade(k, i, night)); }); });
    // variant: feature id when the tiles carry one, else a stable value from the height
    var key = ["coalesce", ["to-number", ["id"], 0], 0];
    var pick = function (n) { return ["to-string", ["%", ["+", ["floor", ["abs", key]], ["floor", ["*", H_EXPR, 7]]], n]]; };
    var pattern = ["case",
      [">", H_EXPR, 40], ["concat", "eid-fac-t", pick(3), sfx],
      [">", H_EXPR, 12], ["concat", "eid-fac-m", pick(2), sfx],
      ["concat", "eid-fac-v", pick(3), sfx]];
    layers.forEach(function (l) { try {
      map.setPaintProperty(l.id, "fill-extrusion-pattern", pattern);
      map.setPaintProperty(l.id, "fill-extrusion-opacity", 1);
      map.setPaintProperty(l.id, "fill-extrusion-vertical-gradient", true);
      map.setPaintProperty(l.id, "fill-extrusion-height", H_EXPR);
      map.setPaintProperty(l.id, "fill-extrusion-base", ["coalesce", ["get", "render_min_height"], 0]);
      map.setLayerZoomRange(l.id, 14, 24);
    } catch (e) {} });
  }
  // Auto: start in enhanced, drop to performance if the frame rate stays low.
  (function fpsWatch() {
    var n = 0, t0 = performance.now(), low = 0;
    function tick(now) {
      n++;
      if (now - t0 >= 2000) { var fps = n * 1000 / (now - t0); n = 0; t0 = now; window.EID_FPS = Math.round(fps);
        if (!document.hidden && fps < 22) low++; else low = 0;
        if (S.bld === "auto" && bldAuto === "enhanced" && low >= 3) { bldAuto = "performance"; styleBuildings(bldNight); renderSettings(); } }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })();
  function applyTheme() {
    var th = THEMES[S.theme]; world.setColors(th ? th.route : "#35d0ff", th ? th.mark : "#f2f2ee", th && th.road);
    try { if (map.setSky) map.setSky((th && th.sky) || DAY_SKY); } catch (e) {}
    styleBuildings(!!(th && th.road === "holo"));
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
    if (good && (!world.lastLoad || G.dist(world.lastLoad, c) > 600) && (!onPos._tl || now - onPos._tl > 2500)) { onPos._tl = now; var ok = world.loadFromTiles(c, 1200); $("loading").hidden = ok || !!world.lastLoad; if (ok) { noteEstimated(); if (route) findRouteBridges(); } }
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
  var RADAR_SVG = '<svg viewBox="0 0 24 30" width="20" height="25" aria-hidden="true"><path d="M12 29V14" stroke="#cfd5da" stroke-width="2.2"/><rect x="4" y="3" width="16" height="11" rx="2.5" fill="#1b1f25" stroke="#f0b43c" stroke-width="1.8"/><circle cx="10" cy="8.5" r="2.6" fill="#f0b43c"/><circle cx="16.5" cy="6" r="1" fill="#ff5a4a"/></svg>';
  var OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
  function overpass(q, i) {
    i = i || 0;
    return fetch(OVERPASS[i], { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" } })
      .then(function (r) { if (!r.ok) throw new Error("Overpass " + r.status); return r; })
      .catch(function (e) { if (i + 1 < OVERPASS.length) return overpass(q, i + 1); throw e; });
  }
  function fetchLimit(c) {
    if (limitBusy) return; limitBusy = true;
    var q = "[out:json][timeout:10];way(around:25," + c[1] + "," + c[0] + ")[highway][maxspeed];out tags 1;";
    overpass(q)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (j) { limitAt = c; var w = j.elements && j.elements[0], n = w ? parseInt(w.tags.maxspeed, 10) : NaN;
        limit = isNaN(n) ? null : n; $("lim").textContent = limit || "—"; $("lim").classList.toggle("unk", !limit); })
      .catch(function () {}).then(function () { limitBusy = false; });
  }
  function fetchCams(c) {
    if (camBusy) return; camBusy = true;
    var q = "[out:json][timeout:15];node(around:4000," + c[1] + "," + c[0] + ")[highway=speed_camera];out;";
    overpass(q)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (j) {
        camAt = c; cams = (j.elements || []).map(function (n) { return { c: [n.lon, n.lat], lim: parseInt((n.tags || {}).maxspeed, 10) || null }; });
        camMarkers.forEach(function (m) { m.remove(); });
        camMarkers = cams.map(function (k) { var el = document.createElement("div"); el.className = "camdot"; el.innerHTML = RADAR_SVG; return new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat(k.c).addTo(map); });
        world.setRadars(cams.map(function (k) { return k.c; }));
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
    drawRoute2D(); world.setRoute(route.line); findRouteBridges();
    $("searchSheet").hidden = true; $("endNav").hidden = false; following = true; $("recenter").hidden = true;
    if (S.view === 3) S.view = 0; renderSettings(); updateGuidance(fix ? fix.v * 3.6 : 0);
  }
  function drawRoute2D() {
    var data = { type: "Feature", geometry: { type: "LineString", coordinates: route.line } };
    if (map.getSource("eid-route-2d")) map.getSource("eid-route-2d").setData(data);
    else { map.addSource("eid-route-2d", { type: "geojson", data: data });
      map.addLayer({ id: "eid-route-2d", type: "line", source: "eid-route-2d", paint: { "line-color": (THEMES[S.theme] || {}).route || "#35d0ff", "line-width": ["interpolate", ["linear"], ["zoom"], 12, 4, 18, 12], "line-opacity": 0.75 }, layout: { "line-cap": "round", "line-join": "round" } }, map.getLayer("eid-world3d") ? "eid-world3d" : undefined); }
  }
  // ---------- which bridge is mine ----------
  var bridgeMarkers = [];
  function findRouteBridges() {
    if (!route) return; bridgeMarkers.forEach(function (m) { m.remove(); }); bridgeMarkers = []; route.bridges = [];
    if (!world.ready || !world.origin) return;
    var prev = null, cur = null;
    for (var i = 0; i < route.line.length; i++) {
      var p = G.toLocal(world.origin, route.line[i]); if (Math.abs(p[0]) > 1300 || Math.abs(p[1]) > 1300) { prev = null; continue; }
      var hd = i < route.line.length - 1 ? G.bearing(route.line[i], route.line[i + 1]) : null, h = world.heightAt(p[0], p[1], hd, prev); prev = h;
      if (h > 3) { var lv = world.levelsAt(p[0], p[1]); if (!cur) cur = { from: route.cum[i], level: Math.max(1, Math.round(h / 6.5)), levels: lv.levels, mid: route.line[i] };
        cur.to = route.cum[i]; cur.levels = Math.max(cur.levels, lv.levels); cur.level = Math.max(cur.level, Math.round(h / 6.5)); }
      else if (cur) { route.bridges.push(cur); cur = null; }
    }
    if (cur) route.bridges.push(cur);
    route.bridges.forEach(function (b) {
      var mid = G.pointAt(route.line, route.cum, (b.from + b.to) / 2).p, el = document.createElement("div"); el.className = "brtag";
      el.textContent = (S.lang === "ar" ? "جسرك" : "Your bridge") + (b.levels > 1 ? " · " + b.level + "/" + b.levels : "");
      bridgeMarkers.push(new maplibregl.Marker({ element: el, anchor: "bottom", offset: [0, -24] }).setLngLat(mid).addTo(map));
    });
  }
  function bridgeHint() {
    if (!route || !route.bridges) return; var along = route.along || 0, b = route.bridges.find(function (x) { return x.to > along; });
    var el = $("bridge"); if (!b || b.from - along > 900) { el.hidden = true; return; }
    var lvlTxt = b.levels > 1 ? (S.lang === "ar" ? " · المستوى " + b.level + " من " + b.levels + (b.level === b.levels ? " (العلوي)" : b.level === 1 ? " (السفلي)" : " (الأوسط)") : " · level " + b.level + " of " + b.levels + (b.level === b.levels ? " (top)" : b.level === 1 ? " (lowest)" : " (middle)")) : "";
    var d = b.from - along;
    el.hidden = false; el.style.setProperty("--lv", "#" + (window.EidWorld3D.LEVEL_COLORS[Math.min(3, b.level)] || 0x35d0ff).toString(16).padStart(6, "0"));
    el.innerHTML = "🌉 " + (d > 20 ? (S.lang === "ar" ? "جسرك بعد <b>" + fmtKm(d) + "</b>" : "Your bridge in <b>" + fmtKm(d) + "</b>") : (S.lang === "ar" ? "أنت على جسرك" : "You are on your bridge")) + lvlTxt;
  }
  function endRoute() {
    bridgeMarkers.forEach(function (m) { m.remove(); }); bridgeMarkers = []; $("bridge").hidden = true;
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
    bridgeHint();
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

  // ---------- place card: tap a café / restaurant / shop icon ----------
  var placeDest = null, placeTok = 0;
  function catOf(cls) { for (var i = 0; i < POI.length; i++) if (POI[i][2].indexOf(cls) >= 0) return POI[i]; return null; }
  function commonsUrl(file) { file = String(file).replace(/^File:/i, "").replace(/ /g, "_"); return "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(file) + "?width=640"; }
  function placePhoto(tags) {
    if (tags.image && /^https:\/\//.test(tags.image) && /\.(jpe?g|png|webp)(\?|$)/i.test(tags.image)) return Promise.resolve(tags.image);
    if (tags.wikimedia_commons && /^File:/i.test(tags.wikimedia_commons)) return Promise.resolve(commonsUrl(tags.wikimedia_commons));
    var q = tags.wikidata || tags["brand:wikidata"];
    if (!q || !/^Q\d+$/.test(q)) return Promise.resolve(null);
    return fetch("https://www.wikidata.org/wiki/Special:EntityData/" + q + ".json").then(function (r) { return r.json(); }).then(function (j) {
      var e = j.entities && j.entities[q], c = e && e.claims; var f = c && ((c.P18 || c.P154 || [])[0]);
      return f && f.mainsnak && f.mainsnak.datavalue ? commonsUrl(f.mainsnak.datavalue.value) : null;
    }).catch(function () { return null; });
  }
  function row(icon, html) { return '<div class="prow"><span>' + icon + "</span><div>" + html + "</div></div>"; }
  function openPlace(f) {
    var p = f.properties || {}, c = f.geometry.coordinates, cat = catOf(p.class), L = T[S.lang];
    var name = (S.lang === "ar" ? (p["name:ar"] || p.name) : (p["name:en"] || p["name:latin"] || p.name)) || L.unnamedPlace;
    placeDest = { c: c, name: name };
    $("searchSheet").hidden = true; $("settings").hidden = true;
    $("pIcon").style.background = cat ? cat[1] : "#666"; $("pIcon").innerHTML = cat ? '<svg viewBox="0 0 24 24" width="22" height="22" fill="' + (GLYPH[cat[0]].fill ? "#fff" : "none") + '" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="' + GLYPH[cat[0]].d + '"/></svg>' : "";
    $("pName").textContent = name; $("pCat").textContent = (L.cats[cat ? cat[0] : ""] || "") + (p.subclass && p.subclass !== p.class ? " · " + p.subclass.replace(/_/g, " ") : "");
    $("pPhoto").hidden = true; $("pPhoto").removeAttribute("src");
    $("pInfo").innerHTML = '<div class="empty">…</div>';
    var gq = encodeURIComponent((p.name || name) + " " + c[1].toFixed(5) + "," + c[0].toFixed(5));
    $("pGoogle").href = "https://www.google.com/maps/search/?api=1&query=" + gq;
    $("pDist").textContent = fix ? fmtKm(G.dist(fix.raw, c)) : "";
    $("place").hidden = false;
    var tok = ++placeTok; googlePlace(p.name || name, c, tok);
    $("pGoogle").hidden = !!gKey;
    var nm = (p.name || "").replace(/["\\]/g, "");
    var q = "[out:json][timeout:10];nwr(around:60," + c[1] + "," + c[0] + ")" + (nm ? '["name"="' + nm + '"]' : "[amenity]") + ";out tags center 1;";
    overpass(q).then(function (r) { return r.json(); }).then(function (j) {
      if (placeTok !== tok) return;
      var tags = (j.elements && j.elements[0] && j.elements[0].tags) || {}, h = "";
      if (tags.opening_hours) h += row("🕒", esc(tags.opening_hours));
      if (tags.cuisine) h += row("🍽", esc(tags.cuisine.replace(/;/g, "، ").replace(/_/g, " ")));
      var addr = [tags["addr:housenumber"], tags["addr:street"], tags["addr:city"]].filter(Boolean).join(" ");
      if (addr) h += row("📍", esc(addr));
      var ph = tags.phone || tags["contact:phone"];
      if (ph) h += row("📞", '<a href="tel:' + esc(ph.split(";")[0].replace(/\s/g, "")) + '">' + esc(ph.split(";")[0]) + "</a>");
      var web = tags.website || tags["contact:website"];
      if (web && /^https?:\/\//.test(web)) h += row("🌐", '<a href="' + esc(web) + '" target="_blank" rel="noopener">' + esc(web.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")) + "</a>");
      var menu = tags["website:menu"] || tags["menu:url"]; if (menu && /^https:\/\//.test(menu)) h += row("📋", '<a href="' + esc(menu) + '" target="_blank" rel="noopener">' + L.menu + "</a>");
      var ig = tags["contact:instagram"]; if (ig) h += row("📷", '<a href="' + (/^https:\/\//.test(ig) ? esc(ig) : "https://instagram.com/" + esc(ig.replace(/^@/, ""))) + '" target="_blank" rel="noopener">Instagram</a>');
      var fl = []; if (tags.delivery === "yes") fl.push(L.flags.delivery); if (tags.takeaway === "yes") fl.push(L.flags.takeaway); if (tags.outdoor_seating === "yes") fl.push(L.flags.outdoor); if (tags.drive_through === "yes") fl.push(L.flags.drive); if (tags.wheelchair === "yes") fl.push(L.flags.wheel);
      if (fl.length) h += row("✓", esc(fl.join(" · ")));
      $("pInfo").innerHTML = h || '<div class="empty">' + L.noInfo + "</div>";
      return placePhoto(tags).then(function (u) { if (u && placeTok === tok && $("pGal").hidden) { $("pPhoto").src = u; $("pPhoto").hidden = false; } });
    }).catch(function () { if (placeTok === tok) $("pInfo").innerHTML = '<div class="empty">' + L.noInfo + "</div>"; });
  }
  $("pPhoto").onerror = function () { this.hidden = true; };
  $("pClose").onclick = function () { $("place").hidden = true; };
  $("pGo").onclick = function () { if (!placeDest) return; dest = placeDest; $("place").hidden = true; $("searchSheet").hidden = false; planRoutes(); };
  map.on("click", "eid-poi", function (e) { var f = e.features && e.features[0]; if (f) openPlace(f); });
  map.on("mouseenter", "eid-poi", function () { map.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave", "eid-poi", function () { map.getCanvas().style.cursor = ""; });
  // ---------- Google Places (photos, rating, reviews, prices) ----------
  // Uses the owner's own browser key, pasted in Settings and stored only on this device (never in the code).
  // Billing per Google: 1 free ID-only text search + 1 Place Details (Enterprise + Atmosphere) per card, photos only as they load.
  var gKey = load("gkey", ""), gLoad = null, gCache = {};
  function gmaps() {
    if (!gKey) return Promise.reject(new Error("no key"));
    if (gLoad) return gLoad;
    gLoad = new Promise(function (res, rej) {
      window.__eidG = function () { google.maps.importLibrary("places").then(res, rej); };
      window.gm_authFailure = function () { gLoad = null; showErr(T[S.lang].gBad); rej(new Error("auth")); };
      var sc = document.createElement("script"); sc.async = true;
      sc.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(gKey) + "&v=weekly&loading=async&language=" + S.lang + "&region=AE&callback=__eidG";
      sc.onerror = function () { gLoad = null; rej(new Error("load")); }; document.head.appendChild(sc);
    });
    return gLoad;
  }
  var PRICE = ["", "$", "$$", "$$$", "$$$$"];
  function stars(r) { var s = ""; for (var i = 1; i <= 5; i++) s += Math.round(r) >= i ? "★" : "☆"; return s; }
  function googlePlace(name, c, token) {
    var L = T[S.lang];
    ["pGal", "pRate", "pRev", "pAttr"].forEach(function (id) { $(id).hidden = true; $(id).innerHTML = ""; });
    if (!gKey || !name) return;
    var ck = name + "@" + c[0].toFixed(5) + "," + c[1].toFixed(5);
    $("pRate").hidden = false; $("pRate").innerHTML = '<span class="pc">' + L.gLoading + "</span>";
    var get = gCache[ck] ? Promise.resolve(gCache[ck]) : gmaps().then(function (lib) {
      return lib.Place.searchByText({ textQuery: name, fields: ["id"], locationBias: { center: { lat: c[1], lng: c[0] }, radius: 150 }, maxResultCount: 1 })
        .then(function (r) { var pl = r.places && r.places[0]; if (!pl) return null;
          return pl.fetchFields({ fields: ["displayName", "location", "photos", "rating", "userRatingCount", "reviews", "priceLevel", "priceRange", "regularOpeningHours", "nationalPhoneNumber", "websiteURI", "primaryTypeDisplayName"] }).then(function (x) { return x.place; }); });
    }).then(function (pl) {
      if (pl && pl.location && G.dist(c, [pl.location.lng(), pl.location.lat()]) > 250) pl = null;   // wrong match: don't show another shop's data
      gCache[ck] = pl || "none"; return gCache[ck];
    });
    get.then(function (pl) {
      if (placeTok !== token) return;
      if (!pl || pl === "none") { $("pRate").innerHTML = '<span class="pc">' + L.gNone + "</span>"; return; }
      $("pAttr").hidden = false; $("pAttr").innerHTML = '<span class="glogo">Google Maps</span>';
      var ph = (pl.photos || []).slice(0, 8);
      if (ph.length) {
        $("pPhoto").hidden = true;
        $("pGal").innerHTML = ph.map(function (p, i) { var who = (p.authorAttributions || [])[0];
          return '<figure><img loading="lazy" referrerpolicy="no-referrer" data-big="' + esc(p.getURI({ maxHeight: 1200 })) + '" src="' + esc(p.getURI({ maxHeight: 400 })) + '" alt="">' + (who ? "<figcaption>" + esc(who.displayName || "") + "</figcaption>" : "") + "</figure>"; }).join("");
        $("pGal").hidden = false;
      }
      var r = "";
      if (pl.rating) r += '<b class="stars">' + stars(pl.rating) + "</b> <b>" + pl.rating.toFixed(1) + "</b> <span class=pc>(" + (pl.userRatingCount || 0).toLocaleString() + ")</span>";
      var pr = pl.priceRange && pl.priceRange.startPrice ? pl.priceRange.startPrice.units + (pl.priceRange.endPrice ? "–" + pl.priceRange.endPrice.units : "+") + " " + (pl.priceRange.startPrice.currencyCode || "AED") : "";
      var lvl = { FREE: 0, INEXPENSIVE: 1, MODERATE: 2, EXPENSIVE: 3, VERY_EXPENSIVE: 4 }[pl.priceLevel];
      if (pr || lvl) r += ' · <span>' + L.price + ' <bdi dir="ltr">' + esc(pr || PRICE[lvl]) + "</bdi></span>";
      if (pl.regularOpeningHours && pl.regularOpeningHours.weekdayDescriptions) { var d = (new Date().getDay() + 6) % 7; r += '<div class="pc">🕒 ' + esc(pl.regularOpeningHours.weekdayDescriptions[d] || "") + "</div>"; }
      $("pRate").innerHTML = r || '<span class="pc">' + L.gNone + "</span>";
      var rv = (pl.reviews || []).slice(0, 5);
      if (rv.length) {
        $("pRev").innerHTML = '<div class="lab">' + L.reviews + "</div>" + rv.map(function (v) { var a = v.authorAttribution || {};
          return '<div class="rev"><div><b>' + esc(a.displayName || "") + '</b> <span class="stars">' + stars(v.rating || 0) + '</span> <span class="pc">' + esc(v.relativePublishTimeDescription || "") + "</span></div><p>" + esc(v.text || "") + "</p></div>"; }).join("");
        $("pRev").hidden = false;
      }
    }).catch(function (e) { if (placeTok === token) $("pRate").innerHTML = '<span class="pc">' + L.gNone + "</span>"; });
  }
  $("pGal").addEventListener("click", function (e) { var im = e.target.closest("img"); if (!im) return; $("viewImg").src = im.dataset.big; $("viewer").hidden = false; });
  $("viewer").onclick = function () { this.hidden = true; $("viewImg").removeAttribute("src"); };
  $("gkey").value = gKey;
  $("gkey").addEventListener("change", function () { gKey = this.value.trim(); save("gkey", gKey); gLoad = null; gCache = {}; });
  // ---------- settings UI ----------
  var glbScene = null;
  function seg(id, items, cur, key) { $(id).innerHTML = items.map(function (it) { return '<button data-k="' + key + '" data-v="' + it[0] + '" aria-pressed="' + (String(it[0]) === String(cur)) + '">' + it[1] + "</button>"; }).join(""); }
  function renderSettings() {
    var L = T[S.lang];
    document.documentElement.lang = S.lang; document.documentElement.dir = S.lang === "ar" ? "rtl" : "ltr";
    ["view", "base", "theme", "car", "voice", "bld"].forEach(function (k) { $("l-" + k).textContent = L[k]; });
    seg("s-bld", BLD_MODES.map(function (k) { return [k, L.blds[k]]; }), S.bld, "bld");
    $("bldNote").textContent = L.bldNote[S.bld] + (S.bld === "auto" ? " · " + L.blds[bldAuto] : "");
    seg("s-view", L.views.map(function (v, i) { return [i, v]; }), S.view, "view");
    seg("s-base", [["map", L.bases.map], ["sat", L.bases.sat]], S.base, "base");
    seg("s-theme", Object.keys(L.themes).map(function (k) { return [k, L.themes[k]]; }), S.theme, "theme");
    seg("s-body", Object.keys(L.bodies).map(function (k) { return [k, L.bodies[k]]; }), S.car.type, "body");
    $("s-color").innerHTML = COLORS.map(function (c) { var h = "#" + c.toString(16).padStart(6, "0"); return '<button class="sw" data-k="color" data-v="' + c + '" aria-pressed="' + (c === S.car.color) + '" aria-label="' + h + '" style="background:' + h + '"></button>'; }).join("");
    seg("s-voice", [[1, L.on], [0, L.off]], S.voice ? 1 : 0, "voice");
    $("model").placeholder = L.model; $("model").value = S.car.name || ""; $("l-glb").textContent = L.glb; $("bLang").textContent = L.lang;
    $("q").placeholder = L.searchPh; $("bSearch").setAttribute("aria-label", L.search); $("searchTitle").textContent = L.search; $("recenter").textContent = L.recenter;
    $("loading").textContent = L.loading3d; $("endNav").textContent = L.end; $("startTxt").textContent = L.start; $("go").textContent = L.go; $("demo").textContent = L.demo; $("safe").textContent = L.safe;
    $("limSrc").textContent = L.limSrc; $("pGo").textContent = L.pGo; $("pGoogle").textContent = L.pGoogle; $("pNote").textContent = gKey ? "" : L.pNote; $("l-gkey").textContent = L.gkey;
  }
  $("settings").addEventListener("click", function (e) {
    var b = e.target.closest("[data-k]"); if (!b) return; var k = b.dataset.k, v = b.dataset.v;
    if (k === "view") { S.view = +v; userPitch = null; zoomBias = 0; following = true; $("recenter").hidden = true; bridgeLayersVisible(S.view >= 2); }
    if (k === "base") { if (S.base !== v) { S.base = v; save("base", v); setSatellite(v === "sat"); } }
    if (k === "theme") { S.theme = v; applyTheme(); }
    if (k === "body") { S.car.type = v; glbScene = null; world.setVehicle(S.car.type, S.car.color, null); }
    if (k === "color") { S.car.color = +v; glbScene = null; world.setVehicle(S.car.type, S.car.color, null); }
    if (k === "voice") { S.voice = v === "1"; }
    if (k === "bld") { S.bld = v; if (v === "auto") bldAuto = "enhanced"; styleBuildings(bldNight); }
    ["view", "theme", "voice", "car", "bld"].forEach(function (x) { save(x, S[x]); });
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
  $("bSet").onclick = function () { $("settings").hidden = !$("settings").hidden; $("searchSheet").hidden = true; $("place").hidden = true; };
  $("bSearch").onclick = function () { $("searchSheet").hidden = !$("searchSheet").hidden; $("settings").hidden = true; $("place").hidden = true; if (!$("searchSheet").hidden) $("q").focus(); };
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
  // ---------- demo: simulated drive along a real OSRM route (no GPS) ----------
  var DEMO_FROM = [54.5770, 24.4195], DEMO_TO = [54.6090, 24.4889], demoTimer = null;
  function runDemo() {
    $("start").hidden = true; $("demoTag").hidden = false; $("demoTag").textContent = t("demoTag");
    if (S.theme === "none") { S.theme = "start"; save("theme", S.theme); applyTheme(); renderSettings(); }
    try { if (window.speechSynthesis) { var u0 = new SpeechSynthesisUtterance(" "); u0.volume = 0; speechSynthesis.speak(u0); } } catch (e) {}
    dest = { c: DEMO_TO, name: "Yas Mall" };
    osrm(DEMO_FROM, DEMO_TO, false).then(function (rs) {
      var r = rs[0], line = r.geometry.coordinates, cum = G.cumulative(line), along = 0, v = 8, steps = G.indexSteps(r.legs[0].steps);
      map.jumpTo({ center: line[0], zoom: 17, pitch: 60 });
      startRoute(r); // routing state for guidance
      var last = performance.now();
      demoTimer = setInterval(function () {
        var now = performance.now(), dt = Math.min(1.5, (now - last) / 1000); last = now;
        var nm = G.nextManeuver(steps, along), target = 22;
        if (nm && nm.distance < 180) target = 11; if (nm && nm.distance < 60) target = 8;
        v += (target - v) * Math.min(1, dt * 0.6); along += v * dt;
        if (along >= cum[cum.length - 1]) { clearInterval(demoTimer); return; }
        var pa = G.pointAt(line, cum, along);
        onPos({ coords: { longitude: pa.p[0], latitude: pa.p[1], speed: v, heading: pa.brg, accuracy: 4 }, timestamp: Date.now() });
      }, 500);
    }).catch(function (e) { showErr(e.message); });
  }
  $("demo").onclick = runDemo;
  if (/[?&]demo=/.test(location.search)) setTimeout(runDemo, 800);

  renderSettings(); setArrow("straight"); requestAnimationFrame(frame);
})();
