import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const G = createRequire(import.meta.url)("../js/geo.js");

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

test("distance Sheikh Zayed Grand Mosque to Louvre AD is about 14 km", () => {
  near(G.dist([54.4749, 24.4129], [54.3982, 24.5338]), 15500, 1500, "dist");
});

test("bearing north and east", () => {
  near(G.bearing([55, 25], [55, 25.01]), 0, 0.5, "north");
  near(G.bearing([55, 25], [55.01, 25]), 90, 0.5, "east");
});

test("toLocal / fromLocal round trip, x east and z south", () => {
  const o = [54.37, 24.47];
  const p = [54.371, 24.469];
  const xz = G.toLocal(o, p);
  assert.ok(xz[0] > 0 && xz[1] > 0, "east and south are positive");
  const back = G.fromLocal(o, xz);
  near(back[0], p[0], 1e-9, "lon"); near(back[1], p[1], 1e-9, "lat");
});

test("project onto a polyline gives distance along and lateral offset", () => {
  const line = [[55, 25], [55, 25.01], [55.01, 25.01]];
  const cum = G.cumulative(line);
  const r = G.project([55.0001, 25.005], line, cum);
  near(r.along, cum[1] / 2, 15, "along");
  near(r.d, 10, 2, "offset ~10 m");
  assert.equal(r.i, 1);
});

test("project with a hint window ignores far legs", () => {
  const line = [[55, 25], [55, 25.01], [55.0002, 25.01], [55.0002, 25]];
  const cum = G.cumulative(line);
  const r = G.project([55.0001, 25.002], line, cum, 1, 1);
  assert.ok(r.i <= 2, "matched to the first leg");
});

test("pointAt walks along the line", () => {
  const line = [[55, 25], [55, 25.01]];
  const cum = G.cumulative(line);
  const r = G.pointAt(line, cum, cum[1] / 2);
  near(r.p[1], 25.005, 1e-6, "mid lat");
  near(r.brg, 0, 0.5, "heading north");
});

test("lane info uses OSM tags and flags estimates", () => {
  assert.deepEqual(G.laneInfo({ highway: "motorway", lanes: "4" }), { lanes: 4, estimated: false });
  assert.deepEqual(G.laneInfo({ highway: "motorway" }), { lanes: 3, estimated: true });
  assert.equal(G.laneInfo({ highway: "trunk" }).lanes, 4);
  assert.equal(G.laneInfo({ highway: "trunk", oneway: "yes" }).lanes, 3);
  assert.equal(G.roadWidth({ highway: "primary", lanes: "3" }).width, 3 * 3.5 + 1);
});

test("bridge heights ramp at free ends and stay up at joined ends", () => {
  const cum = [0, 20, 45, 100, 155, 180, 200];
  const h = G.wayHeights(cum, { bridge: true, layer: 1, startElevated: false, endElevated: true });
  assert.equal(h[0], 0, "free start on ground");
  near(h[3], 6.5, 1e-9, "middle at deck height");
  near(h[6], 6.5, 1e-9, "joined end stays elevated");
  assert.ok(h[1] > 0 && h[1] < 6.5, "ramp in between");
  const flat = G.wayHeights(cum, {});
  assert.ok(flat.every(v => v === 0), "plain road on ground");
  const tun = G.wayHeights(cum, { tunnel: true });
  assert.ok(tun.every(v => v < 0), "tunnel below ground");
});

test("next maneuver skips depart and reports distance", () => {
  const steps = [
    { distance: 300, maneuver: { type: "depart" } },
    { distance: 500, maneuver: { type: "turn", modifier: "right" }, name: "Al Khail Rd" },
    { distance: 0, maneuver: { type: "arrive" } }];
  const idx = G.indexSteps(steps);
  const n = G.nextManeuver(idx, 120);
  assert.equal(n.i, 1); near(n.distance, 180, 1e-9, "distance");
  assert.equal(G.nextManeuver(idx, 900).step.maneuver.type, "arrive");
});

test("instructions in Arabic and English", () => {
  const s = { maneuver: { type: "turn", modifier: "right" }, name: "شارع الخيل" };
  assert.equal(G.instruction(s, "ar"), "لف يمين إلى شارع الخيل");
  assert.equal(G.instruction({ maneuver: { type: "off ramp", modifier: "slight right" }, name: "E11", exits: "32" }, "en"), "Take the exit keep right (exit 32) onto E11");
  assert.equal(G.instruction({ maneuver: { type: "roundabout", exit: 2 } }, "ar"), "في الدوار خذ المخرج 2");
  assert.equal(G.instruction({ maneuver: { type: "arrive" } }, "en"), "You have arrived");
  assert.equal(G.arrowKey({ maneuver: { type: "turn", modifier: "slight left" } }), "slight-left");
});

test("capture speed rules", () => {
  assert.equal(G.emirateOf([54.37, 24.47]), "AD");
  assert.equal(G.emirateOf([55.27, 25.2]), "DU");
  assert.equal(G.captureSpeed("AD", 120), 121);
  assert.equal(G.captureSpeed("DU", 100), 121);
  assert.equal(G.captureSpeed("DU", 90), null);
  assert.equal(G.captureSpeed(null, 100), null);
});

test("U-turn wording", () => {
  assert.equal(G.instruction({ maneuver: { type: "turn", modifier: "uturn" } }, "en"), "Make a U-turn");
  assert.equal(G.instruction({ maneuver: { type: "continue", modifier: "uturn" }, name: "E11" }, "ar"), "ارجع يو-تيرن إلى E11");
});
