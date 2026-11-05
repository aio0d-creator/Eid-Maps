# Eid-Maps

UAE smart navigation prototype: real GPS, real map, real routes, a 3D road view built from OpenStreetMap, and your own vehicle on the road.

Live: https://aio0d-creator.github.io/Eid-Maps/

## Status (honest)

| Feature | State |
| --- | --- |
| Real map (OpenFreeMap / OpenStreetMap), Arabic RTL labels | Implemented, unverified on device |
| GPS position, speed, heading, smoothing between fixes | Implemented, unverified on device |
| Destination search (Photon, UAE only) | Implemented, unverified |
| Routing with alternatives (OSRM demo server) | Implemented, unverified |
| Turn-by-turn text + Arabic/English voice (browser speech) | Implemented, unverified |
| Lane guidance | Only where OSRM returns lane data from OSM `turn:lanes` |
| Map matching to route, rerouting after 6 s off route | Implemented, unverified |
| 3D roads with lane markings, raised bridges, pillars | Implemented; widths and bridge heights are estimates |
| 3D buildings | Position, footprint and height are real (OpenStreetMap). Facades are **approximate**: 8 variants by type (villa < 12 m, apartments 12–40 m, tower > 40 m), day and night. No building is marked verified |
| Building modes | Auto (enhanced, drops to performance below ~22 fps), Enhanced, Performance (plain, OSM `building:colour` where mapped), Reality (not available, see below) |
| Bridge identification | Barriers coloured by level (teal 1, amber 2, violet 3); bridges on your route glow; "your bridge in 300 m · level 2 of 3" hint |
| Original style theme | Hologram roads, green route chevrons, evening sky |
| Demo drive | `?demo=1`: simulated drive Khalifa City → Yas on a real OSRM route |
| Vehicle: 5 generic body types, 8 colours, own .glb model | Implemented; no licensed brand models bundled |
| Camera modes: behind car, driver, 3D elevated, 2D | Implemented |
| Speed limit | OSM `maxspeed`, unverified |
| Speed cameras | OSM `highway=speed_camera`, community data, incomplete |
| Capture speed | Abu Dhabi limit + 1; Dubai Police radar table; others "unconfirmed" |
| Live traffic | Not implemented (needs a licensed provider such as TomTom) |
| Native app, Live Activity | Not implemented |

## Architecture

```
index.html          UI shell, HUD, sheets
js/geo.js           pure geo logic (tested): distance, bearing, local frame, projection, lanes, bridge heights, guidance text
js/world3d.js       three.js custom layer inside MapLibre: road ribbons, bridges, route ribbon, vehicle
js/app.js           GPS, smoothing, map matching, cameras, search, routing, guidance, voice, radar, settings
tests/geo.test.mjs  node --test tests/geo.test.mjs
```

Flow: GPS → snap to route → smoothed position → vehicle + camera → MapLibre map with 3D layer. Roads within 900 m are loaded from Overpass and rebuilt after you move 420 m.

## Data providers

| Need | Used now | Licence / limits | Production path |
| --- | --- | --- | --- |
| Map tiles | OpenFreeMap (OSM) | ODbL attribution, free | Same, or self-hosted tiles |
| Satellite | Esri World Imagery | attribution; check terms for commercial use | Licensed imagery |
| Roads for 3D | Overpass API | fair use, rate limited | Own OSM extract + tile server |
| Routing | OSRM demo server | demo only, not for production | Self-hosted OSRM/Valhalla or a commercial API |
| Search | Photon | fair use | Self-hosted Photon/Nominatim or commercial |
| Traffic | none | — | TomTom / HERE (API key, server-side) |

No secret keys are in the frontend.

## Known limitations

- Road widths, lane counts (when OSM has no `lanes` tag) and bridge heights are estimated; the app shows a note when most roads are estimated.
- Tunnels are not drawn in 3D.
- Free public services can be slow or refuse requests at busy times.
- Not tested on a device by the developer; please report errors shown in the white box at the top.

## Realistic buildings: provider assessment

- Google Photorealistic 3D Tiles: the only source that shows real building appearance. Paid (API key + billing), Google logo and attribution required, caching restricted. Reported in 2023 to lack 3D buildings for Dubai; Abu Dhabi coverage unconfirmed. Not enabled: needs owner approval, a server-side key and a coverage test.
- Overture Maps / OpenStreetMap: free, real footprints and heights; facade/roof colour and material fields exist but are rarely filled in the UAE.
- Mapbox Standard: stylised, not photoreal; needs a Mapbox token.

## Testing

1. `node --test tests/geo.test.mjs`
2. Open the live link in Safari, tap Start, allow location.
3. Search a destination, pick a route, check the route ribbon, turn card, voice and rerouting.
