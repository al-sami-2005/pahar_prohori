"""
Build the bundled offline basemap for the demo area.

Real geography only — no invented terrain:
  * geoBoundaries gbOpen BGD ADM3 (CC BY 4.0) — land + upazila/thana boundaries
  * Natural Earth 10m admin-0 countries + roads (public domain) — Myanmar land, highways

Usage:
  python3 scripts/build_basemap.py <dir-with-source-geojson>
Outputs src/data/geo/basemap.json and src/data/geo/places.json
"""
import json, sys, os
from shapely.geometry import shape, box, mapping, MultiPolygon, Polygon, LineString, MultiLineString
from shapely.ops import unary_union, linemerge

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
PLACES_OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'geo')
os.makedirs(OUT, exist_ok=True)
os.makedirs(PLACES_OUT, exist_ok=True)

BBOX = box(91.55, 20.65, 92.50, 22.80)
TOL = 0.0004  # ~40 m — keeps coast and river banks crisp at city zoom

def rnd(geom, nd=4):
    def r(c):
        if isinstance(c, (list, tuple)) and c and isinstance(c[0], (int, float)):
            return [round(c[0], nd), round(c[1], nd)]
        return [r(x) for x in c]
    m = mapping(geom)
    return {'type': m['type'], 'coordinates': r(m['coordinates'])}

adm = json.load(open(os.path.join(SRC, 'geoBoundaries-BGD-ADM3.geojson')))
units = []
for f in adm['features']:
    g = shape(f['geometry'])
    if g.intersects(BBOX):
        units.append((f['properties']['shapeName'], g.intersection(BBOX)))

land = unary_union([g for _, g in units]).simplify(TOL, preserve_topology=True)

# Upazila/thana boundaries as lines: interior shared edges only (coast is drawn from land)
# Simplify each unit first (the raw boundaries are ~1 m resolution), then merge shared edges.
simple_units = [g.simplify(TOL, preserve_topology=True) for _, g in units]
all_b = linemerge(unary_union([g.boundary for g in simple_units]))
coast = land.boundary
interior = all_b.difference(coast.buffer(0.0006))
interior = MultiLineString([l for l in getattr(interior, 'geoms', [interior]) if l.length > 0.002])

countries = json.load(open(os.path.join(SRC, 'ne_10m_admin_0_countries.geojson')))
foreign = []
for f in countries['features']:
    if f['properties'].get('ADM0_A3') in ('MMR', 'IND'):
        g = shape(f['geometry'])
        if g.intersects(BBOX):
            foreign.append(g.intersection(BBOX))
# Natural Earth borders are coarse against geoBoundaries; grow the neighbour land to close the
# slivers that would otherwise render as false water along the border, then cut BGD back out.
foreign_g = (
    unary_union(foreign).buffer(0.03).intersection(BBOX).difference(land).simplify(TOL * 2)
    if foreign
    else None
)

roads = json.load(open(os.path.join(SRC, 'ne_10m_roads.geojson')))
road_lines = []
for f in roads['features']:
    g = shape(f['geometry'])
    if g.intersects(BBOX):
        road_lines.append(g.intersection(BBOX))
road_g = unary_union(road_lines).simplify(TOL * 2) if road_lines else None

features = [{'type': 'Feature', 'properties': {'layer': 'land'}, 'geometry': rnd(land)}]
if foreign_g is not None and not foreign_g.is_empty:
    features.append({'type': 'Feature', 'properties': {'layer': 'foreign'}, 'geometry': rnd(foreign_g)})
features.append({'type': 'Feature', 'properties': {'layer': 'admin'}, 'geometry': rnd(interior)})
if road_g is not None and not road_g.is_empty:
    features.append({'type': 'Feature', 'properties': {'layer': 'road'}, 'geometry': rnd(road_g)})

basemap = {
    'type': 'FeatureCollection',
    'attribution': 'geoBoundaries (CC BY 4.0) · Natural Earth',
    'features': features,
}
json.dump(basemap, open(os.path.join(OUT, 'basemap.json'), 'w'), separators=(',', ':'))

# Label points for upazila/thana units (representative point inside each polygon)
places = []
for name, g in units:
    if g.area < 1e-5:
        continue
    p = g.representative_point()
    places.append({'name': name, 'lon': round(p.x, 4), 'lat': round(p.y, 4), 'area': round(g.area, 5)})
for p in places:
    print('label', p)  # copied by hand into src/data/places.ts
print('basemap bytes', os.path.getsize(os.path.join(OUT, 'basemap.json')))
print('units', len(units))
