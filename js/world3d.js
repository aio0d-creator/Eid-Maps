/* Eidmaps 3D road engine: a three.js custom layer inside MapLibre.
   Builds road ribbons with lane markings and estimated bridge elevations from OpenStreetMap ways around the user,
   a highlighted route on the road surface, and the user's vehicle. Geometry is in local metres (x east, y up, z south)
   around an origin that moves with the user. */
(function (root) {
  "use strict";
  var G = root.EidGeo;

  function World3D(map, opts) {
    this.map = map; this.opts = opts || {};
    this.origin = null; this.roads = []; this.segGrid = new Map(); this.cell = 25;
    this.routeColor = "#35d0ff"; this.markColor = "#f2f2ee";
    this.car = null; this.carState = { lnglat: null, h: 0, y: 0, visible: true };
    this.texCache = {}; this.ready = false; this.loading = false; this.lastLoad = null;
    this.estimatedShare = 0;
    var self = this;
    this.layer = {
      id: "eid-world3d", type: "custom", renderingMode: "3d",
      onAdd: function (m, gl) { self._onAdd(m, gl); },
      render: function (gl, matrix) { self._render(gl, matrix); }
    };
  }

  World3D.prototype._onAdd = function (map, gl) {
    var THREE = root.THREE;
    this.camera = new THREE.Camera();
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a66, 0.9));
    var sun = new THREE.DirectionalLight(0xfff2dc, 0.9); sun.position.set(120, 260, 80); this.scene.add(sun);
    this.roadGroup = new THREE.Group(); this.routeGroup = new THREE.Group(); this.carGroup = new THREE.Group(); this.bldGroup = new THREE.Group();
    this.scene.add(this.bldGroup, this.roadGroup, this.routeGroup, this.carGroup);
    this.renderer = new THREE.WebGLRenderer({ canvas: map.getCanvas(), context: gl, antialias: true });
    this.renderer.autoClear = false;
    if ("outputEncoding" in this.renderer) this.renderer.outputEncoding = THREE.sRGBEncoding;
  };

  World3D.prototype._render = function (gl, matrix) {
    if (!this.origin || !this.renderer) return;
    var THREE = root.THREE;
    var mc = root.maplibregl.MercatorCoordinate.fromLngLat(this.origin, 0);
    var s = mc.meterInMercatorCoordinateUnits();
    var l = new THREE.Matrix4().makeTranslation(mc.x, mc.y, mc.z).scale(new THREE.Vector3(s, -s, s)).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    this.camera.projectionMatrix = new THREE.Matrix4().fromArray(matrix).multiply(l);
    this.renderer.resetState();
    this.renderer.setViewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    this.renderer.render(this.scene, this.camera);
  };

  // ---------- textures ----------
  World3D.prototype.laneTexture = function (lanes, oneway) {
    var holo = this.roadStyle === "holo";
    var key = lanes + "|" + (oneway ? 1 : 0) + "|" + this.markColor + "|" + (holo ? "h" : "a");
    if (this.texCache[key]) return this.texCache[key];
    var THREE = root.THREE, lw = 64, sh = 10, W = lanes * lw + sh * 2, H = 256;
    var c = document.createElement("canvas"); c.width = W; c.height = H; var g = c.getContext("2d");
    if (holo) {
      g.fillStyle = "#15283c"; g.fillRect(0, 0, W, H);
      var gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, "rgba(120,210,255,.28)"); gr.addColorStop(.5, "rgba(120,210,255,0)"); gr.addColorStop(1, "rgba(120,210,255,.28)"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      g.shadowColor = this.markColor; g.shadowBlur = 10; g.fillStyle = this.markColor; g.fillRect(sh - 5, 0, 5, H); g.fillRect(W - sh, 0, 5, H);
      for (var hj = 1; hj < lanes; hj++) g.fillRect(sh + hj * lw - 2, 0, 4, H * 0.36);
      var ht = new root.THREE.CanvasTexture(c); ht.wrapS = ht.wrapT = root.THREE.RepeatWrapping; ht.anisotropy = this.renderer ? this.renderer.capabilities.getMaxAnisotropy() : 1;
      return (this.texCache[key] = ht);
    }
    g.fillStyle = "#3c3f44"; g.fillRect(0, 0, W, H);
    for (var i = 0; i < 2600; i++) { g.fillStyle = "rgba(255,255,255," + (Math.random() * 0.05) + ")"; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    g.fillStyle = "rgba(0,0,0,.10)"; for (var k = 0; k < lanes; k++) { g.fillRect(sh + k * lw + lw * 0.25, 0, lw * 0.12, H); g.fillRect(sh + k * lw + lw * 0.63, 0, lw * 0.12, H); }
    g.fillStyle = this.markColor; g.fillRect(sh - 4, 0, 4, H); g.fillRect(W - sh, 0, 4, H);
    for (var j = 1; j < lanes; j++) {
      var x = sh + j * lw - 2;
      if (!oneway && j === lanes / 2) { g.fillStyle = "#e9c64a"; g.fillRect(x - 3, 0, 3, H); g.fillRect(x + 3, 0, 3, H); g.fillStyle = this.markColor; }
      else g.fillRect(x, 0, 4, H * 0.35);
    }
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
    t.anisotropy = this.renderer ? this.renderer.capabilities.getMaxAnisotropy() : 1;
    return (this.texCache[key] = t);
  };
  World3D.prototype.routeTexture = function () {
    if (this._routeTex && this._routeTexColor === this.routeColor) return this._routeTex;
    var THREE = root.THREE, c = document.createElement("canvas"); c.width = 64; c.height = 128; var g = c.getContext("2d");
    g.clearRect(0, 0, 64, 128);
    var gr = g.createLinearGradient(0, 0, 64, 0); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.15, this.routeColor); gr.addColorStop(0.85, this.routeColor); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.globalAlpha = 0.55; g.fillStyle = gr; g.fillRect(0, 0, 64, 128);
    g.globalAlpha = 0.95; g.strokeStyle = "#ffffff"; g.lineWidth = 7; g.lineJoin = "round"; g.beginPath(); g.moveTo(16, 90); g.lineTo(32, 62); g.lineTo(48, 90); g.stroke();
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    this._routeTex = t; this._routeTexColor = this.routeColor; return t;
  };

  // ---------- geometry helpers ----------
  function ribbonGeometry(THREE, pts, heights, width, yOff, uvLen) {
    var pos = [], uv = [], idx = [], d = 0;
    for (var i = 0; i < pts.length; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      var tx = b[0] - a[0], tz = b[1] - a[1], L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
      var sx = -tz, sz = tx; // right-hand side in x-east / z-south space
      if (i) d += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      var y = heights[i] + yOff;
      pos.push(pts[i][0] - sx * width / 2, y, pts[i][1] - sz * width / 2, pts[i][0] + sx * width / 2, y, pts[i][1] + sz * width / 2);
      uv.push(0, d / uvLen, 1, d / uvLen);
      if (i < pts.length - 1) { var k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    var g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  function wallGeometry(THREE, pts, heights, width, h) {
    var pos = [], idx = [], base = 0;
    [-1, 1].forEach(function (sd) {
      for (var i = 0; i < pts.length; i++) {
        var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
        var tx = b[0] - a[0], tz = b[1] - a[1], L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
        var ex = pts[i][0] + (-tz) * sd * width / 2, ez = pts[i][1] + tx * sd * width / 2, y = heights[i];
        pos.push(ex, y - 0.9, ez, ex, y + h, ez);
        if (i < pts.length - 1) { var k = base + i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
      }
      base += pts.length * 2;
    });
    var g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }

  // ---------- OSM loading ----------
  var HW = "^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$";
  var ORDER = { motorway: 9, trunk: 8, motorway_link: 7, trunk_link: 7, primary: 6, primary_link: 5, secondary: 5, secondary_link: 4, tertiary: 4, tertiary_link: 3, unclassified: 2, residential: 2, living_street: 1, service: 1 };

  World3D.prototype.loadAround = function (center, radius) {
    if (this.loading) return Promise.resolve(null);
    if (this.failT && Date.now() - this.failT < 15000) return Promise.resolve(null);
    this.loading = true; var self = this; radius = radius || 900;
    var q = '[out:json][timeout:25];way(around:' + radius + ',' + center[1] + ',' + center[0] + ')[highway~"' + HW + '"];(._;>;);out body qt;';
    return fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" } })
      .then(function (r) { if (!r.ok) throw new Error("OSM roads " + r.status); return r.json(); })
      .then(function (j) { self.lastElements = j.elements || []; self.build(center, self.lastElements); self.lastLoad = center; self.loading = false; return true; })
      .catch(function (e) { self.loading = false; self.failT = Date.now(); if (self.opts.onError) self.opts.onError(e); return false; });
  };

  // Build roads from the vector tiles the map has already loaded (OpenMapTiles `transportation` layer).
  // No extra network request; bridges and tunnels come from the `brunnel` and `layer` attributes.
  var CLASS = { motorway: "motorway", trunk: "trunk", primary: "primary", secondary: "secondary", tertiary: "tertiary", minor: "residential", service: "service" };
  World3D.prototype.loadFromTiles = function (center, radius) {
    var map = this.map, st = map.getStyle(); if (!st) return false;
    var src = Object.keys(st.sources).find(function (k) { return st.sources[k].type === "vector"; }); if (!src) return false;
    var fs; try { fs = map.querySourceFeatures(src, { sourceLayer: "transportation" }); } catch (e) { return false; }
    if (!fs || !fs.length) return false;
    radius = radius || 1200;
    var nodeId = new Map(), nextId = 1, elements = [], seen = new Set(), wayId = 1;
    function nid(c) { var k = c[0].toFixed(6) + "," + c[1].toFixed(6); var id = nodeId.get(k); if (!id) { id = nextId++; nodeId.set(k, id); elements.push({ type: "node", id: id, lon: c[0], lat: c[1] }); } return id; }
    fs.forEach(function (f) {
      var p = f.properties || {}, cls = CLASS[p.class]; if (!cls) return;
      var g = f.geometry, lines = g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : [];
      lines.forEach(function (L) {
        if (L.length < 2) return;
        var near = false; for (var i = 0; i < L.length; i += Math.max(1, Math.floor(L.length / 8))) if (G.dist(center, L[i]) < radius) { near = true; break; }
        if (!near && G.dist(center, L[L.length - 1]) > radius) return;
        var key = L[0][0].toFixed(5) + L[0][1].toFixed(5) + L[L.length - 1][0].toFixed(5) + L[L.length - 1][1].toFixed(5) + L.length;
        if (seen.has(key)) return; seen.add(key);
        var tags = { highway: p.ramp == 1 && /motorway|trunk|primary|secondary|tertiary/.test(cls) ? cls + "_link" : cls };
        if (p.brunnel === "bridge") tags.bridge = "yes"; if (p.brunnel === "tunnel") tags.tunnel = "yes";
        if (p.layer != null) tags.layer = String(p.layer); if (p.oneway == 1 || p.oneway == -1) tags.oneway = "yes";
        elements.push({ type: "way", id: wayId++, tags: tags, nodes: L.map(nid) });
      });
    });
    if (elements.length < 2) return false;
    this.lastElements = elements; this.build(center, elements); this.lastLoad = center; this.source = "tiles";
    if (this.opts.customBuildings) try { this.buildBuildings(src, center, radius); } catch (e) { if (this.opts.onError) this.opts.onError(e); }
    return true;
  };

  World3D.prototype.build = function (center, elements) {
    var THREE = root.THREE, self = this;
    var nodes = new Map(), ways = [];
    elements.forEach(function (e) { if (e.type === "node") nodes.set(e.id, [e.lon, e.lat]); else if (e.type === "way") ways.push(e); });
    // which nodes belong to elevated ways (to decide whether a bridge end ramps down)
    var elevatedNode = new Map();
    ways.forEach(function (w) {
      var t = w.tags || {}, lay = parseInt(t.layer, 10) || 0;
      if (t.bridge && t.bridge !== "no" || lay > 0) w.nodes.forEach(function (id) { elevatedNode.set(id, (elevatedNode.get(id) || 0) + 1); });
    });
    // rebuild in a fresh origin
    this.clearGroup(this.roadGroup);
    var oldOrigin = this.origin; this.origin = center.slice(); this.roads = []; this.segGrid = new Map();
    if (oldOrigin && this.bldGroup) { var od = G.toLocal(this.origin, oldOrigin); this.bldGroup.position.x += od[0]; this.bldGroup.position.z += od[1]; }
    var concrete = new THREE.MeshStandardMaterial({ color: 0xc9c6bf, roughness: 0.85, side: THREE.DoubleSide });
    var under = new THREE.MeshStandardMaterial({ color: 0x8d8a84, roughness: 0.95, side: THREE.DoubleSide });
    var pillarGeo = new THREE.CylinderGeometry(0.8, 0.95, 1, 10);
    var est = 0;
    ways.sort(function (a, b) { return (ORDER[(a.tags || {}).highway] || 0) - (ORDER[(b.tags || {}).highway] || 0); });
    ways.forEach(function (w, wi) {
      var t = w.tags || {}; if (t.area === "yes") return;
      var ll = w.nodes.map(function (id) { return nodes.get(id); }).filter(Boolean); if (ll.length < 2) return;
      var pts = ll.map(function (p) { return G.toLocal(self.origin, p); });
      var cum = [0]; for (var i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      var bridge = !!(t.bridge && t.bridge !== "no"), tunnel = !!(t.tunnel && t.tunnel !== "no"), layer = parseInt(t.layer, 10) || 0;
      var first = w.nodes[0], last = w.nodes[w.nodes.length - 1];
      var heights = G.wayHeights(cum, { bridge: bridge, tunnel: tunnel, layer: layer,
        startElevated: (elevatedNode.get(first) || 0) > 1, endElevated: (elevatedNode.get(last) || 0) > 1 });
      var rw = G.roadWidth(t); if (rw.estimated) est++;
      var oneway = t.oneway === "yes" || t.oneway === "1" || /motorway|_link/.test(t.highway || "") || t.junction === "roundabout";
      var lanes = Math.max(1, Math.min(8, rw.lanes));
      var cls = ORDER[t.highway] || 1, yOff = 0.25 + cls * 0.012 + (wi % 7) * 0.001;
      if (tunnel) return; // tunnels stay off the surface; the base map shows their position
      var tex = self.laneTexture(lanes, oneway);
      var mat = self.roadStyle === "holo" ? new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -cls, polygonOffsetUnits: -cls }) : new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -cls, polygonOffsetUnits: -cls });
      var g = ribbonGeometry(THREE, pts, heights, rw.width, yOff, 12);
      self.roadGroup.add(new THREE.Mesh(g, mat));
      var maxH = Math.max.apply(null, heights);
      if (maxH > 2) {
        self.roadGroup.add(new THREE.Mesh(ribbonGeometry(THREE, pts, heights, rw.width + 0.6, -0.8, 12), under));
        var lvl = Math.max(1, Math.min(3, Math.round(maxH / 6.5)));
        var wallMesh = new THREE.Mesh(wallGeometry(THREE, pts, heights, rw.width + 0.6, 1.0), self.levelMaterial(lvl)); self.roadGroup.add(wallMesh);
        for (var dd = 18; dd < cum[cum.length - 1]; dd += 30) {
          var at = interp(pts, cum, heights, dd); if (at.h < 3) continue;
          var col = new THREE.Mesh(pillarGeo, concrete); col.scale.y = at.h - 0.9; col.position.set(at.x, (at.h - 0.9) / 2, at.z); self.roadGroup.add(col);
        }
      }
      var rec = { pts: pts, heights: heights, width: rw.width, tags: t, maxH: maxH, walls: maxH > 2 ? wallMesh : null, level: maxH > 2 ? lvl : 0 };
      self.roads.push(rec); self.indexRoad(rec);
    });
    this.estimatedShare = ways.length ? est / ways.length : 0;
    if (this._radarList) this.setRadars(this._radarList);
    this.ready = true;
    if (this.routeLine) this.setRoute(this.routeLine);
    this.map.triggerRepaint();
  };
  function interp(pts, cum, heights, d) {
    for (var i = 1; i < pts.length; i++) if (cum[i] >= d) { var t = (d - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1); return { x: pts[i - 1][0] + t * (pts[i][0] - pts[i - 1][0]), z: pts[i - 1][1] + t * (pts[i][1] - pts[i - 1][1]), h: heights[i - 1] + t * (heights[i] - heights[i - 1]) }; }
    var n = pts.length - 1; return { x: pts[n][0], z: pts[n][1], h: heights[n] };
  }
  // ---------- buildings: real footprints and heights from the vector tiles, with facades ----------
  World3D.prototype.facadeTexture = function (kind) {
    var night = this.roadStyle === "holo", key = "f" + kind + (night ? "n" : "d");
    if (this.texCache[key]) return this.texCache[key];
    var THREE = root.THREE, c = document.createElement("canvas"); c.width = 128; c.height = 128; var g = c.getContext("2d");
    var wall = night ? ["#1c2638", "#222c40", "#18202e"][kind] : ["#e6dccb", "#f1efe9", "#8fa7b8"][kind];
    g.fillStyle = wall; g.fillRect(0, 0, 128, 128);
    for (var y = 0; y < 4; y++) for (var x = 0; x < 4; x++) {
      var lit = night && Math.random() < 0.55;
      g.fillStyle = night ? (lit ? "rgba(255," + (200 + Math.random() * 40 | 0) + ",140," + (0.6 + Math.random() * 0.4) + ")" : "rgba(40,60,90,.9)")
        : (kind === 2 ? "rgba(200,225,240,.75)" : "rgba(70,90,110,.55)");
      if (kind === 2) g.fillRect(x * 32 + 1, y * 32 + 2, 30, 26); else g.fillRect(x * 32 + 8, y * 32 + 7, 16, 18);
    }
    if (!night) { g.fillStyle = "rgba(0,0,0,.06)"; for (var r = 0; r < 4; r++) g.fillRect(0, r * 32 + 30, 128, 2); }
    var tx = new THREE.CanvasTexture(c); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(1 / 12, 1 / 12);
    if (!night && THREE.sRGBEncoding) tx.encoding = THREE.sRGBEncoding;
    return (this.texCache[key] = tx);
  };
  World3D.prototype.buildBuildings = function (src, center, radius) {
    var THREE = root.THREE, map = this.map, self = this, token = (this._bldToken = (this._bldToken || 0) + 1);
    var fs = map.querySourceFeatures(src, { sourceLayer: "building" }); if (!fs || !fs.length) return;
    var o0 = this.origin.slice(), R = Math.min(radius, 750), seen = new Set(), cand = [];
    for (var fi = 0; fi < fs.length; fi++) {
      var f = fs[fi], g = f.geometry, polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
      var p = f.properties || {}; if (p.hide_3d) continue;
      for (var pi = 0; pi < polys.length; pi++) {
        var ring = polys[pi][0]; if (!ring || ring.length < 4) continue;
        var key = ring[0][0].toFixed(6) + ring[0][1].toFixed(6) + ring.length; if (seen.has(key)) continue; seen.add(key);
        var c0 = G.toLocal(o0, ring[0]), d = Math.hypot(c0[0], c0[1]); if (d > R) continue;
        cand.push({ poly: polys[pi], top: +p.render_height || 8, base: +p.render_min_height || 0, d: d });
      }
    }
    cand.sort(function (a, b) { return a.d - b.d; }); cand = cand.slice(0, 650);
    var night = this.roadStyle === "holo", group = new THREE.Group(), buckets = [[], [], []], roofs = [], i = 0;
    var roof = new THREE.MeshStandardMaterial({ color: night ? 0x1a2232 : 0xcfc8bb, roughness: 0.95, side: THREE.DoubleSide });
    var merge = THREE.BufferGeometryUtils && THREE.BufferGeometryUtils.mergeBufferGeometries;
    function flush() {
      function addAll(list, mat) { if (!list.length) return; if (merge) { var mg = merge(list, false); if (mg) group.add(new THREE.Mesh(mg, mat)); list.forEach(function (gg) { gg.dispose(); }); } else list.forEach(function (gg) { group.add(new THREE.Mesh(gg, mat)); }); }
      buckets.forEach(function (list, kind) { addAll(list, night ? new THREE.MeshBasicMaterial({ map: self.facadeTexture(kind), side: THREE.DoubleSide }) : new THREE.MeshStandardMaterial({ map: self.facadeTexture(kind), roughness: kind === 2 ? 0.35 : 0.85, metalness: kind === 2 ? 0.4 : 0, side: THREE.DoubleSide })); });
      addAll(roofs, roof); buckets = [[], [], []]; roofs = [];
    }
    function step() { try { stepBody(); } catch (e) { if (self.opts.onError) self.opts.onError(new Error("buildings: " + e.message)); } }
    function stepBody() {
      if (token !== self._bldToken) return; // a newer build started
      var t0 = performance.now();
      while (i < cand.length && performance.now() - t0 < 8) {
        var c = cand[i++], poly = c.poly, pts = poly[0].map(function (q) { return G.toLocal(o0, q); });
        var area = 0; for (var k = 0, n = pts.length; k < n; k++) { var a = pts[k], b = pts[(k + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; } if (Math.abs(area) / 2 < 25) continue;
        var sh = new THREE.Shape(); pts.forEach(function (q, j) { if (j) sh.lineTo(q[0], -q[1]); else sh.moveTo(q[0], -q[1]); });
        for (var hh = 1; hh < poly.length; hh++) { var hole = new THREE.Path(); poly[hh].forEach(function (cc, j) { var q = G.toLocal(o0, cc); if (j) hole.lineTo(q[0], -q[1]); else hole.moveTo(q[0], -q[1]); }); sh.holes.push(hole); }
        var geo; try { geo = new THREE.ExtrudeGeometry(sh, { depth: Math.max(2, c.top - c.base), bevelEnabled: false, curveSegments: 1 }); } catch (e) { continue; }
        geo.rotateX(-Math.PI / 2); geo.translate(0, c.base, 0);
        var kind = c.top > 45 ? 2 : (Math.abs(Math.round(pts[0][0] * 7 + pts[0][1] * 3)) % 2);
        var parts = splitGroups(THREE, geo); geo.dispose(); roofs.push(parts[0]); buckets[kind].push(parts[1]);
        if (roofs.length >= 120) flush();
      }
      if (i < cand.length) { requestAnimationFrame(step); return; }
      flush();
      var off = G.toLocal(self.origin, o0); group.position.set(off[0], 0, off[1]);
      if (self.bldGroup) { self.scene.remove(self.bldGroup); self.clearGroup(self.bldGroup); }
      self.bldGroup = group; self.scene.add(group);
      self.hasBuildings = group.children.length > 0; if (self.opts.onBuildings) self.opts.onBuildings(self.hasBuildings);
      self.map.triggerRepaint();
    }
    requestAnimationFrame(step);
  };

  // ExtrudeGeometry is non-indexed with group 0 = caps (roof/floor) and group 1 = walls; split them so they can be merged per material.
  function splitGroups(THREE, geo) {
    var out = [], pos = geo.attributes.position.array, nor = geo.attributes.normal.array, uv = geo.attributes.uv.array;
    [0, 1].forEach(function (gi) {
      var grp = geo.groups[gi]; var g = new THREE.BufferGeometry();
      if (!grp) { g.setAttribute("position", new THREE.Float32BufferAttribute([], 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute([], 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute([], 2)); out.push(g); return; }
      var a = grp.start, b = grp.start + grp.count;
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos.slice(a * 3, b * 3), 3));
      g.setAttribute("normal", new THREE.Float32BufferAttribute(nor.slice(a * 3, b * 3), 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv.slice(a * 2, b * 2), 2));
      out.push(g);
    });
    return out;
  }

  World3D.prototype.clearGroup = function (g) {
    while (g.children.length) { var o = g.children.pop(); if (o.geometry) o.geometry.dispose(); if (o.material && o.material.dispose && !o.material.map) o.material.dispose(); }
  };

  // spatial index of road segments for height lookup
  World3D.prototype.indexRoad = function (rec) {
    for (var i = 1; i < rec.pts.length; i++) {
      var a = rec.pts[i - 1], b = rec.pts[i];
      var x0 = Math.floor(Math.min(a[0], b[0]) / this.cell), x1 = Math.floor(Math.max(a[0], b[0]) / this.cell);
      var z0 = Math.floor(Math.min(a[1], b[1]) / this.cell), z1 = Math.floor(Math.max(a[1], b[1]) / this.cell);
      for (var x = x0; x <= x1; x++) for (var z = z0; z <= z1; z++) {
        var k = x + "," + z; if (!this.segGrid.has(k)) this.segGrid.set(k, []); this.segGrid.get(k).push({ r: rec, i: i });
      }
    }
  };
  // Road surface height at a local point. Prefers segments aligned with `heading` and close to the previous height,
  // so a car on a bridge stays on the bridge and a car under it stays below.
  World3D.prototype.heightAt = function (x, z, heading, prevH) {
    var cx = Math.floor(x / this.cell), cz = Math.floor(z / this.cell), best = null, bestScore = Infinity;
    for (var dx = -1; dx <= 1; dx++) for (var dz = -1; dz <= 1; dz++) {
      var list = this.segGrid.get((cx + dx) + "," + (cz + dz)); if (!list) continue;
      for (var n = 0; n < list.length; n++) {
        var r = list[n].r, i = list[n].i, a = r.pts[i - 1], b = r.pts[i];
        var sx = b[0] - a[0], sz = b[1] - a[1], L2 = sx * sx + sz * sz; if (!L2) continue;
        var t = Math.max(0, Math.min(1, ((x - a[0]) * sx + (z - a[1]) * sz) / L2));
        var px = a[0] + t * sx, pz = a[1] + t * sz, d = Math.hypot(x - px, z - pz);
        if (d > r.width / 2 + 4) continue;
        var h = r.heights[i - 1] + t * (r.heights[i] - r.heights[i - 1]);
        var segBrg = (Math.atan2(sx, -sz) * 180 / Math.PI + 360) % 360;
        var align = heading == null ? 0 : Math.min(G.angDiff(segBrg, heading), G.angDiff(segBrg, (heading + 180) % 360));
        var score = d + align * 0.08 + (prevH == null ? 0 : Math.abs(h - prevH) * 1.5);
        if (score < bestScore) { bestScore = score; best = h; }
      }
    }
    return best == null ? (prevH || 0) : best;
  };

  // ---------- route ----------
  World3D.prototype.setRoute = function (line) {
    var THREE = root.THREE; this.routeLine = line; this.clearGroup(this.routeGroup);
    if (!line || !this.origin || !this.renderer) { this.map.triggerRepaint(); return; }
    var pts = [], hs = [], prev = null, self = this;
    for (var i = 0; i < line.length; i++) {
      var p = G.toLocal(this.origin, line[i]); if (Math.abs(p[0]) > 1600 || Math.abs(p[1]) > 1600) { if (pts.length > 1) break; else continue; }
      var hd = i < line.length - 1 ? G.bearing(line[i], line[i + 1]) : null;
      var h = this.ready ? this.heightAt(p[0], p[1], hd, prev) : 0; prev = h; pts.push(p); hs.push(h);
    }
    // densify so the ribbon follows ramps smoothly
    if (pts.length > 1) {
      var dp = [pts[0]], dh = [hs[0]];
      for (var j = 1; j < pts.length; j++) {
        var L = Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]), n = Math.ceil(L / 8);
        for (var k = 1; k <= n; k++) {
          var t = k / n, x = pts[j - 1][0] + t * (pts[j][0] - pts[j - 1][0]), z = pts[j - 1][1] + t * (pts[j][1] - pts[j - 1][1]);
          var brg = (Math.atan2(pts[j][0] - pts[j - 1][0], -(pts[j][1] - pts[j - 1][1])) * 180 / Math.PI + 360) % 360;
          var hh = this.ready ? this.heightAt(x, z, brg, dh[dh.length - 1]) : 0; dp.push([x, z]); dh.push(hh);
        }
      }
      var mat = new THREE.MeshBasicMaterial({ map: this.routeTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -12, polygonOffsetUnits: -12 });
      this.routeMesh = new THREE.Mesh(ribbonGeometry(THREE, dp, dh, 3.0, 0.55, 6), mat);
      this.markRouteBridges(dp.map(function (q, qi) { return [q[0], q[1], dh[qi]]; }));
      this.routeGroup.add(this.routeMesh);
    }
    this.map.triggerRepaint();
  };
  // Bridge barrier colour per level so stacked bridges can be told apart: 1 teal, 2 amber, 3 violet.
  var LEVEL_COLORS = { 1: 0x3fb8ae, 2: 0xe3a640, 3: 0x9f7fe0 };
  World3D.prototype.levelMaterial = function (lvl) {
    this._lvlMats = this._lvlMats || {}; var THREE = root.THREE;
    if (!this._lvlMats[lvl]) this._lvlMats[lvl] = new THREE.MeshStandardMaterial({ color: LEVEL_COLORS[lvl] || 0xc9c6bf, roughness: 0.6, side: THREE.DoubleSide, emissive: LEVEL_COLORS[lvl] || 0, emissiveIntensity: this.roadStyle === "holo" ? 0.55 : 0.15 });
    return this._lvlMats[lvl];
  };
  World3D.LEVEL_COLORS = LEVEL_COLORS;
  // Highest deck level around a local point (0 = no bridge), and how many distinct levels are stacked there.
  World3D.prototype.levelsAt = function (x, z, r) {
    r = r || 18; var cx = Math.floor(x / this.cell), cz = Math.floor(z / this.cell), lv = new Set();
    for (var dx = -1; dx <= 1; dx++) for (var dz = -1; dz <= 1; dz++) {
      var list = this.segGrid.get((cx + dx) + "," + (cz + dz)); if (!list) continue;
      for (var n = 0; n < list.length; n++) { var rec = list[n].r, i = list[n].i, a = rec.pts[i - 1], b = rec.pts[i];
        var sx = b[0] - a[0], sz = b[1] - a[1], L2 = sx * sx + sz * sz; if (!L2) continue;
        var t = Math.max(0, Math.min(1, ((x - a[0]) * sx + (z - a[1]) * sz) / L2)), d = Math.hypot(x - a[0] - t * sx, z - a[1] - t * sz);
        if (d > r) continue; var h = rec.heights[i - 1] + t * (rec.heights[i] - rec.heights[i - 1]); lv.add(h > 3 ? Math.max(1, Math.round(h / 6.5)) : 0); }
    }
    var arr = Array.from(lv); return { levels: arr.length ? Math.max.apply(null, arr) : 0, stacked: arr.length };
  };
  // Light up the barriers of bridges the route uses; other bridges keep their level colour.
  World3D.prototype.markRouteBridges = function (localPts) {
    var THREE = root.THREE, self = this;
    if (!this._routeWallMat || this._routeWallColor !== this.routeColor) { this._routeWallMat = new THREE.MeshBasicMaterial({ color: this.routeColor, side: THREE.DoubleSide }); this._routeWallColor = this.routeColor; }
    this.roads.forEach(function (rec) {
      if (!rec.walls) return; var on = false;
      for (var k = 0; k < localPts.length && !on; k += 2) { var p = localPts[k];
        for (var i = 1; i < rec.pts.length; i++) { var a = rec.pts[i - 1], b = rec.pts[i], sx = b[0] - a[0], sz = b[1] - a[1], L2 = sx * sx + sz * sz; if (!L2) continue;
          var t = Math.max(0, Math.min(1, ((p[0] - a[0]) * sx + (p[1] - a[1]) * sz) / L2)); var h = rec.heights[i - 1] + t * (rec.heights[i] - rec.heights[i - 1]);
          if (Math.hypot(p[0] - a[0] - t * sx, p[1] - a[1] - t * sz) < rec.width / 2 + 1 && Math.abs(h - p[2]) < 2.5 && h > 3) { on = true; break; } } }
      rec.walls.material = on ? self._routeWallMat : self.levelMaterial(rec.level); rec.onRoute = on;
    });
  };
  // Small 3D speed-camera poles at their mapped positions (positions come from OpenStreetMap, unverified).
  World3D.prototype.setRadars = function (list) {
    var THREE = root.THREE; this._radarList = list;
    if (!this.radarGroup) { this.radarGroup = new THREE.Group(); this.scene && this.scene.add(this.radarGroup); }
    this.clearGroup(this.radarGroup); if (!this.origin || !list) return;
    var grey = new THREE.MeshStandardMaterial({ color: 0x9aa2a8, metalness: 0.6, roughness: 0.4 });
    var box = new THREE.MeshStandardMaterial({ color: 0xdfe3e6, roughness: 0.5 });
    var amber = new THREE.MeshBasicMaterial({ color: 0xf0b43c }), lens = new THREE.MeshStandardMaterial({ color: 0x10161c, metalness: 0.9, roughness: 0.1 });
    var poleG = new THREE.CylinderGeometry(0.12, 0.16, 5.2, 8), boxG = new THREE.BoxGeometry(0.7, 0.8, 1.0), ringG = new THREE.RingGeometry(1.2, 1.6, 32), lensG = new THREE.CircleGeometry(0.2, 16);
    var self = this;
    list.forEach(function (ll) {
      var p = G.toLocal(self.origin, ll); if (Math.abs(p[0]) > 4000 || Math.abs(p[1]) > 4000) return;
      var g = new THREE.Group();
      var pole = new THREE.Mesh(poleG, grey); pole.position.y = 2.6; g.add(pole);
      var b = new THREE.Mesh(boxG, box); b.position.y = 5.4; g.add(b);
      [-1, 1].forEach(function (sd) { var l = new THREE.Mesh(lensG, lens); l.position.set(0, 5.45, sd * 0.51); if (sd < 0) l.rotation.y = Math.PI; g.add(l); });
      var ring = new THREE.Mesh(ringG, amber); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.08; g.add(ring);
      g.position.set(p[0], 0, p[1]); self.radarGroup.add(g);
    });
    this.map.triggerRepaint();
  };
  World3D.prototype.animate = function (dt) { if (this._routeTex) { this._routeTex.offset.y = (this._routeTex.offset.y - dt * 1.4) % 1; } };

  // ---------- vehicle ----------
  var PROFILES = {
    suv: { w: 1.98, body: [[-2.45, .36], [-2.45, 1.0], [-2.38, 1.5], [-2.15, 1.74], [.85, 1.76], [1.55, 1.12], [2.32, .98], [2.46, .66], [2.46, .36]], glass: [[-2.2, 1.18], [-2.05, 1.64], [.78, 1.66], [1.36, 1.16]], wheel: .41, axle: 1.45 },
    sedan: { w: 1.88, body: [[-2.4, .4], [-2.4, .92], [-2.0, 1.04], [-1.25, 1.42], [.55, 1.45], [1.3, .98], [2.3, .86], [2.42, .58], [2.42, .4]], glass: [[-1.85, 1.06], [-1.2, 1.36], [.5, 1.39], [1.15, 1.0]], wheel: .36, axle: 1.42 },
    sport: { w: 1.95, body: [[-2.3, .36], [-2.3, .86], [-1.75, .98], [-.75, 1.28], [.25, 1.3], [1.15, .9], [2.25, .7], [2.34, .5], [2.34, .36]], glass: [[-1.6, .98], [-.7, 1.24], [.22, 1.25], [1.0, .92]], wheel: .36, axle: 1.38 },
    ev: { w: 1.92, body: [[-2.4, .38], [-2.4, .95], [-2.1, 1.25], [-1.1, 1.52], [.7, 1.5], [1.6, 1.0], [2.35, .82], [2.44, .56], [2.44, .38]], glass: [[-1.95, 1.22], [-1.05, 1.46], [.62, 1.44], [1.42, 1.02]], wheel: .38, axle: 1.45 },
    pickup: { w: 2.02, body: [[-2.7, .45], [-2.7, 1.22], [-.45, 1.22], [-.38, 1.86], [.8, 1.88], [1.32, 1.28], [2.55, 1.12], [2.66, .74], [2.66, .45]], glass: [[-.3, 1.3], [-.26, 1.78], [.74, 1.79], [1.18, 1.3]], wheel: .43, axle: 1.6 }
  };
  World3D.PROFILES = PROFILES;
  function extrude(THREE, pts, depth, bevel) {
    var sh = new THREE.Shape(); pts.forEach(function (q, i) { if (i) sh.lineTo(q[0], q[1]); else sh.moveTo(q[0], q[1]); }); sh.closePath();
    var g = new THREE.ExtrudeGeometry(sh, { depth: depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 4 });
    g.translate(0, 0, -depth / 2); g.rotateY(Math.PI / 2); return g; // front of the car now points to local -z (north at bearing 0)
  }
  World3D.prototype.setVehicle = function (type, color, gltfScene) {
    var THREE = root.THREE; this.clearGroup(this.carGroup);
    var g = new THREE.Group(); this.wheels = [];
    if (gltfScene) {
      var m = gltfScene.clone(true), box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3());
      var long = Math.max(size.x, size.z) || 1; m.scale.multiplyScalar(4.8 / long); if (size.x > size.z) m.rotation.y = Math.PI / 2;
      if (this.flipModel) m.rotation.y += Math.PI;
      var b2 = new THREE.Box3().setFromObject(m), c = b2.getCenter(new THREE.Vector3()); m.position.x -= c.x; m.position.z -= c.z; m.position.y -= b2.min.y;
      g.add(m);
    } else {
      var P = PROFILES[type] || PROFILES.suv;
      var paint = new THREE.MeshStandardMaterial({ color: color, metalness: .55, roughness: .3 });
      var glass = new THREE.MeshStandardMaterial({ color: 0x10161c, metalness: .9, roughness: .08 });
      g.add(new THREE.Mesh(extrude(THREE, P.body, P.w - .16, .08), paint));
      g.add(new THREE.Mesh(extrude(THREE, P.glass, P.w - .1, .04), glass));
      var wg = new THREE.CylinderGeometry(P.wheel, P.wheel, .3, 20), tyre = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: .85 });
      var rimG = new THREE.CylinderGeometry(P.wheel * .62, P.wheel * .62, .32, 10), rim = new THREE.MeshStandardMaterial({ color: 0xb9c0c7, metalness: .9, roughness: .25 });
      var self = this;
      [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(function (q) {
        var w = new THREE.Group(); var t = new THREE.Mesh(wg, tyre); t.rotation.z = Math.PI / 2; w.add(t);
        var r = new THREE.Mesh(rimG, rim); r.rotation.z = Math.PI / 2; w.add(r);
        w.position.set(q[0] * (P.w / 2 - .12), P.wheel, q[1] * P.axle); g.add(w); self.wheels.push({ g: w, r: P.wheel });
      });
      var len = P.body[P.body.length - 1][0];
      var tl = new THREE.Mesh(new THREE.BoxGeometry(P.w - .3, .09, .05), new THREE.MeshBasicMaterial({ color: 0xff2a2a })); tl.position.set(0, P.body[1][1] - .12, -P.body[0][0] + .06); g.add(tl);
      var hl = new THREE.Mesh(new THREE.BoxGeometry(P.w - .5, .07, .05), new THREE.MeshBasicMaterial({ color: 0xf4fbff })); hl.position.set(0, P.body[P.body.length - 2][1] - .1, -len - .05); g.add(hl);
    }
    // soft contact shadow
    var sh = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 5.2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: .28, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = .03; g.add(sh);
    this.car = g; this.carGroup.add(g); this.map.triggerRepaint();
  };
  // Place the vehicle at a GPS position (lng/lat) with a heading in degrees.
  World3D.prototype.placeVehicle = function (lnglat, heading, speedMs, dt) {
    if (!this.car) return;
    if (!this.origin) this.origin = lnglat.slice();
    var p = G.toLocal(this.origin, lnglat);
    var target = this.ready ? this.heightAt(p[0], p[1], heading, this.carState.y) : 0;
    this.carState.y += (target - this.carState.y) * Math.min(1, (dt || 0.016) * 4);
    this.car.position.set(p[0], this.carState.y + 0.32, p[1]);
    this.car.rotation.y = -heading * Math.PI / 180;
    if (this.wheels && speedMs) this.wheels.forEach(function (w) { w.g.rotation.x -= speedMs * (dt || 0.016) / w.r; });
    this.car.visible = this.carState.visible;
  };
  World3D.prototype.setColors = function (routeColor, markColor, roadStyle) {
    var changed = (markColor && markColor !== this.markColor) || (roadStyle || "asphalt") !== (this.roadStyle || "asphalt");
    this.roadStyle = roadStyle || "asphalt";
    this.routeColor = routeColor || this.routeColor; if (markColor) this.markColor = markColor;
    if (changed) { this.texCache = {}; this._lvlMats = {}; if (this.lastElements) { this.build(this.origin, this.lastElements); var st = this.map.getStyle(), src = st && Object.keys(st.sources).find(function (k) { return st.sources[k].type === "vector"; }); if (src && this.lastLoad) try { this.buildBuildings(src, this.lastLoad, 1200); } catch (e) {} } }
    if (this.routeLine) this.setRoute(this.routeLine);
  };

  root.EidWorld3D = World3D;
})(this);
