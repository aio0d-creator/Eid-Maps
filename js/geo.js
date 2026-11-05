/* Eidmaps geo core — pure functions, no DOM. Loaded in the browser as window.EidGeo and in Node for tests. */
(function (root) {
  "use strict";
  var R = 6371000, D2R = Math.PI / 180;

  // Great-circle distance in metres between [lon,lat] points.
  function dist(a, b) {
    var dl = (b[1] - a[1]) * D2R, dn = (b[0] - a[0]) * D2R;
    var x = Math.sin(dl / 2) * Math.sin(dl / 2) + Math.cos(a[1] * D2R) * Math.cos(b[1] * D2R) * Math.sin(dn / 2) * Math.sin(dn / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
  }
  // Initial bearing a->b in degrees, 0 = north, clockwise.
  function bearing(a, b) {
    var y = Math.sin((b[0] - a[0]) * D2R) * Math.cos(b[1] * D2R);
    var x = Math.cos(a[1] * D2R) * Math.sin(b[1] * D2R) - Math.sin(a[1] * D2R) * Math.cos(b[1] * D2R) * Math.cos((b[0] - a[0]) * D2R);
    return (Math.atan2(y, x) / D2R + 360) % 360;
  }
  function angDiff(a, b) { return Math.abs(((b - a + 540) % 360) - 180); }
  function angLerp(a, b, k) { var d = ((b - a + 540) % 360) - 180; return (a + d * k + 360) % 360; }

  // Local tangent plane around an origin: x = metres east, z = metres south (three.js convention used by the 3D layer).
  function toLocal(origin, p) {
    var kx = 111320 * Math.cos(origin[1] * D2R), ky = 110540;
    return [(p[0] - origin[0]) * kx, -(p[1] - origin[1]) * ky];
  }
  function fromLocal(origin, xz) {
    var kx = 111320 * Math.cos(origin[1] * D2R), ky = 110540;
    return [origin[0] + xz[0] / kx, origin[1] - xz[1] / ky];
  }
  // Move a point forward by metres along a bearing (small distances).
  function offset(p, metres, brg) {
    var kx = 111320 * Math.cos(p[1] * D2R), ky = 110540;
    return [p[0] + metres * Math.sin(brg * D2R) / kx, p[1] + metres * Math.cos(brg * D2R) / ky];
  }

  // Cumulative distances along a polyline of [lon,lat].
  function cumulative(line) {
    var out = [0];
    for (var i = 1; i < line.length; i++) out.push(out[i - 1] + dist(line[i - 1], line[i]));
    return out;
  }

  // Project a point onto a polyline. Returns nearest point, its distance from p, distance along the line and segment index.
  // `hint` (segment index) limits the search to a window so a route that doubles back is not matched to the wrong leg.
  function project(p, line, cum, hint, windowSize) {
    cum = cum || cumulative(line);
    var kx = 111320 * Math.cos(p[1] * D2R), ky = 110540;
    var lo = 1, hi = line.length - 1;
    if (hint != null && windowSize) { lo = Math.max(1, hint - windowSize); hi = Math.min(line.length - 1, hint + windowSize); }
    var best = { d: Infinity, along: 0, i: 1, point: line[0] };
    for (var i = lo; i <= hi; i++) {
      var a = line[i - 1], b = line[i];
      var ax = (a[0] - p[0]) * kx, ay = (a[1] - p[1]) * ky, bx = (b[0] - p[0]) * kx, by = (b[1] - p[1]) * ky;
      var dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
      var t = l ? -(ax * dx + ay * dy) / l : 0; t = Math.max(0, Math.min(1, t));
      var cx = ax + t * dx, cy = ay + t * dy, d = Math.sqrt(cx * cx + cy * cy);
      if (d < best.d) best = { d: d, i: i, t: t, along: cum[i - 1] + t * (cum[i] - cum[i - 1]), point: [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])] };
    }
    return best;
  }
  // Point and bearing at a given distance along a polyline.
  function pointAt(line, cum, along) {
    if (along <= 0) return { p: line[0], brg: bearing(line[0], line[1] || line[0]) };
    for (var i = 1; i < line.length; i++) {
      if (cum[i] >= along) {
        var seg = cum[i] - cum[i - 1] || 1, t = (along - cum[i - 1]) / seg;
        return { p: [line[i - 1][0] + t * (line[i][0] - line[i - 1][0]), line[i - 1][1] + t * (line[i][1] - line[i - 1][1])], brg: bearing(line[i - 1], line[i]) };
      }
    }
    var n = line.length;
    return { p: line[n - 1], brg: bearing(line[n - 2] || line[n - 1], line[n - 1]) };
  }

  // Lane count for an OSM way. Returns {lanes, estimated}. OSM `lanes` is the total for the way.
  var DEFAULT_LANES = { motorway: 3, trunk: 3, primary: 2, secondary: 2, tertiary: 2, unclassified: 2, residential: 2, living_street: 1, service: 1,
    motorway_link: 1, trunk_link: 1, primary_link: 1, secondary_link: 1, tertiary_link: 1 };
  function laneInfo(tags) {
    tags = tags || {};
    var n = parseInt(tags.lanes, 10);
    if (n > 0 && n < 12) return { lanes: n, estimated: false };
    var d = DEFAULT_LANES[tags.highway] || 1;
    // Divided motorways and trunks are mapped one carriageway per way; a two-way road of the same class gets both directions.
    if (tags.highway === "trunk" && tags.oneway !== "yes" && tags.oneway !== "-1") d = 4;
    return { lanes: d, estimated: true };
  }
  function roadWidth(tags) {
    var w = parseFloat(tags && tags.width);
    var li = laneInfo(tags);
    if (w > 2 && w < 60) return { width: w, lanes: li.lanes, estimated: false };
    return { width: li.lanes * 3.5 + 1, lanes: li.lanes, estimated: true };
  }

  // Heights (metres) for the nodes of one way. Bridges sit at layer*levelHeight; a bridge end that does not join
  // another elevated way ramps down to ground over `taper` metres. Heights are estimates: OSM stores no elevation profile.
  function wayHeights(cumDist, opts) {
    var n = cumDist.length, total = cumDist[n - 1] || 0, out = new Array(n);
    var layer = opts.layer || 0, lh = opts.levelHeight || 6.5, taper = opts.taper || 45;
    if (opts.tunnel || layer < 0) { for (var i = 0; i < n; i++) out[i] = -0.05; return out; }
    var top = opts.bridge ? Math.max(1, layer || 1) * lh : Math.max(0, layer) * lh;
    for (var j = 0; j < n; j++) {
      var h = top;
      if (top > 0) {
        if (!opts.startElevated) h = Math.min(h, top * smooth(Math.min(1, cumDist[j] / taper)));
        if (!opts.endElevated) h = Math.min(h, top * smooth(Math.min(1, (total - cumDist[j]) / taper)));
      }
      out[j] = h;
    }
    return out;
  }
  function smooth(t) { return t * t * (3 - 2 * t); }

  // Index the steps of an OSRM route by distance along the route.
  function indexSteps(steps) {
    var along = 0, out = [];
    for (var i = 0; i < steps.length; i++) { out.push({ step: steps[i], at: along }); along += steps[i].distance || 0; }
    return out;
  }
  // Next maneuver ahead of the current distance along the route (skips the depart step).
  function nextManeuver(indexed, along) {
    for (var i = 0; i < indexed.length; i++) {
      var s = indexed[i].step;
      if (s.maneuver && s.maneuver.type === "depart") continue;
      if (indexed[i].at > along + 2) return { i: i, step: s, distance: indexed[i].at - along };
    }
    var last = indexed[indexed.length - 1];
    return last ? { i: indexed.length - 1, step: last.step, distance: Math.max(0, last.at - along) } : null;
  }

  var DIR = {
    ar: { right: "يمين", left: "يسار", "slight right": "خلك يمين", "slight left": "خلك يسار", "sharp right": "يمين حاد", "sharp left": "يسار حاد", straight: "سيدا", uturn: "ارجع يو-تيرن" },
    en: { right: "right", left: "left", "slight right": "keep right", "slight left": "keep left", "sharp right": "sharp right", "sharp left": "sharp left", straight: "straight", uturn: "make a U-turn" }
  };
  // Human instruction for an OSRM step.
  function instruction(step, lang) {
    lang = lang === "ar" ? "ar" : "en";
    var m = step.maneuver || {}, mod = m.modifier || "straight", d = DIR[lang][mod] || DIR[lang].straight;
    var name = step.name || step.ref || "";
    var onto = name ? (lang === "ar" ? " إلى " + name : " onto " + name) : "";
    var exits = step.exits ? (lang === "ar" ? " (مخرج " + step.exits + ")" : " (exit " + step.exits + ")") : "";
    if (mod === "uturn" && m.type !== "arrive") return (lang === "ar" ? "ارجع يو-تيرن" : "Make a U-turn") + onto;
    switch (m.type) {
      case "arrive": return lang === "ar" ? "وصلت وجهتك" : "You have arrived";
      case "roundabout": case "rotary": case "exit roundabout": case "exit rotary":
        return lang === "ar" ? "في الدوار خذ المخرج " + (m.exit || 1) + onto : "At the roundabout take exit " + (m.exit || 1) + onto;
      case "off ramp": return (lang === "ar" ? "خذ المخرج " + d : "Take the exit " + d) + exits + onto;
      case "on ramp": return (lang === "ar" ? "خذ المدخل " + d : "Take the ramp " + d) + onto;
      case "fork": return (lang === "ar" ? "عند التفرع " + d : "At the fork " + d) + onto;
      case "merge": return (lang === "ar" ? "اندمج " + d : "Merge " + d) + onto;
      case "end of road": return (lang === "ar" ? "آخر الشارع لف " + d : "At the end of the road turn " + d) + onto;
      case "continue": case "new name":
        return mod === "straight" ? (lang === "ar" ? "استمر" + onto : "Continue" + onto) : (lang === "ar" ? "لف " + d : "Turn " + d) + onto;
      default: return mod === "straight" ? (lang === "ar" ? "استمر" + onto : "Continue" + onto) : (lang === "ar" ? "لف " + d : "Turn " + d) + onto;
    }
  }
  // Arrow icon key for a maneuver.
  function arrowKey(step) {
    var m = (step && step.maneuver) || {};
    if (m.type === "arrive") return "flag";
    if (m.type === "roundabout" || m.type === "rotary") return "round";
    var mod = m.modifier || "straight";
    if (mod.indexOf("right") >= 0) return mod.indexOf("slight") >= 0 ? "slight-right" : "right";
    if (mod.indexOf("left") >= 0) return mod.indexOf("slight") >= 0 ? "slight-left" : "left";
    if (mod === "uturn") return "uturn";
    return "straight";
  }

  // Coarse emirate lookup for camera capture-speed rules (bounding boxes, not legal boundaries).
  function emirateOf(c) {
    var x = c[0], y = c[1];
    if (x > 54.89 && x < 55.66 && y > 24.62 && y < 25.36 && !(x < 55.1 && y < 24.9)) return "DU";
    if (x > 55.95 && x < 56.25 && y > 24.6 && y < 24.95) return "DU"; // Hatta
    if (y < 24.9 || x < 54.9) return "AD";
    return null;
  }
  // Published capture speeds: Abu Dhabi = limit + 1 (buffer removed Aug 2018); Dubai = Dubai Police radar-limit table.
  var DU_TRIGGER = { 60: 81, 70: 91, 80: 101, 100: 121, 110: 131, 120: 141 };
  function captureSpeed(emirate, limit) {
    if (!limit) return null;
    if (emirate === "AD") return limit + 1;
    if (emirate === "DU") return DU_TRIGGER[limit] || null;
    return null;
  }

  var api = { dist: dist, bearing: bearing, angDiff: angDiff, angLerp: angLerp, toLocal: toLocal, fromLocal: fromLocal, offset: offset,
    cumulative: cumulative, project: project, pointAt: pointAt, laneInfo: laneInfo, roadWidth: roadWidth, wayHeights: wayHeights,
    indexSteps: indexSteps, nextManeuver: nextManeuver, instruction: instruction, arrowKey: arrowKey, emirateOf: emirateOf, captureSpeed: captureSpeed };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.EidGeo = api;
})(this);
