"""
Deterministic demo data for the Pahar Prohori prototype.

EVERYTHING produced here is SIMULATED:
  * slope-unit polygons are illustrative shapes placed near real hill localities
    (positions approximate) — replace with DEM-derived slope units
  * Relative Risk Index values are placeholders — replace with model output
  * NISAR change footprints are illustrative — replace with GCOV change detection
  * sensor nodes and their readings are simulated

Seeded so the output never changes between runs.
Usage: python3 scripts/generate_demo_data.py
"""
import json, math, os, random
from shapely.geometry import Polygon, Point, mapping

R = random.Random(20261113)
HERE = os.path.dirname(__file__)
GEO = os.path.join(HERE, '..', 'src', 'data', 'geo')
DATA = os.path.join(HERE, '..', 'src', 'data')
os.makedirs(GEO, exist_ok=True)

# site, locality, lat, lon, slope count, ridge bearing (deg), locality risk bias
CLUSTERS = [
    ('chattogram', "Foy's Lake",      22.3702, 91.7918, 2, 165, 0.62),
    ('chattogram', 'Batali Hill',     22.3470, 91.8160, 2, 150, 0.72),
    ('chattogram', 'Motijharna',      22.3446, 91.8230, 2, 155, 0.66),
    ('chattogram', 'Khulshi Hills',   22.3607, 91.8066, 3, 160, 0.55),
    ('chattogram', 'Akbar Shah',      22.3792, 91.7727, 3, 170, 0.64),
    ('chattogram', 'Lebubagan',       22.3850, 91.7832, 2, 165, 0.48),
    ('chattogram', 'Shere Shah',      22.3962, 91.7985, 3, 160, 0.52),
    ('chattogram', 'Jalalabad',       22.4035, 91.8098, 3, 155, 0.45),
    ('chattogram', 'Jangal Salimpur', 22.4262, 91.7648, 4, 170, 0.60),
    ('ukhiya-teknaf', 'Kutupalong',   21.2140, 92.1585, 4, 175, 0.66),
    ('ukhiya-teknaf', 'Lambashia',    21.2035, 92.1498, 3, 170, 0.58),
    ('ukhiya-teknaf', 'Balukhali',    21.1885, 92.1570, 4, 165, 0.63),
    ('ukhiya-teknaf', 'Jamtoli',      21.1732, 92.1472, 3, 170, 0.50),
    ('ukhiya-teknaf', 'Thaingkhali',  21.1605, 92.1540, 3, 165, 0.47),
    ('ukhiya-teknaf', 'Hakimpara',    21.1472, 92.1612, 2, 170, 0.44),
    ('ukhiya-teknaf', 'Shamlapur',    21.0470, 92.1640, 2, 160, 0.38),
    ('ukhiya-teknaf', 'Leda',         21.0080, 92.2172, 2, 165, 0.42),
    ('ukhiya-teknaf', 'Nayapara',     20.9602, 92.2262, 3, 160, 0.54),
]

HERO = 'CTG-S03'
HERO_RRI = 0.84

def m2deg(lat, dx, dy):
    return dx / (111320 * math.cos(math.radians(lat))), dy / 111320

def lobe(lat, lon, length, width, bearing):
    """Irregular elongated slope-unit outline (length along downslope bearing)."""
    p1, p2 = R.uniform(0, 6.28), R.uniform(0, 6.28)
    a1, a2 = R.uniform(0.06, 0.13), R.uniform(0.03, 0.08)
    b = math.radians(bearing)
    pts = []
    n = 22
    for i in range(n):
        t = 2 * math.pi * i / n
        # superellipse-ish base, fuller than an ellipse
        ex = math.copysign(abs(math.cos(t)) ** 0.8, math.cos(t)) * length / 2
        ey = math.copysign(abs(math.sin(t)) ** 0.8, math.sin(t)) * width / 2
        k = 1 + a1 * math.sin(3 * t + p1) + a2 * math.sin(5 * t + p2)
        ex, ey = ex * k, ey * k
        # rotate: x along bearing (clockwise from north)
        dx = ex * math.sin(b) + ey * math.cos(b)
        dy = ex * math.cos(b) - ey * math.sin(b)
        dlon, dlat = m2deg(lat, dx, dy)
        pts.append((round(lon + dlon, 6), round(lat + dlat, 6)))
    return Polygon(pts)

def band(v):
    return 'critical' if v >= 0.8 else 'high' if v >= 0.6 else 'moderate' if v >= 0.4 else 'low'

slopes, localities = [], []
counters = {'chattogram': 0, 'ukhiya-teknaf': 0}
for site, name, lat, lon, n, bearing, bias in CLUSTERS:
    localities.append({'name': name, 'site': site, 'lon': lon, 'lat': lat})
    placed = []
    tries = 0
    while len(placed) < n and tries < 500:
        tries += 1
        ang = R.uniform(0, 2 * math.pi)
        dist = R.uniform(0, 420) if placed else R.uniform(0, 120)
        dlon, dlat = m2deg(lat, dist * math.cos(ang), dist * math.sin(ang))
        L, W = R.uniform(300, 560), R.uniform(150, 260)
        poly = lobe(lat + dlat, lon + dlon, L, W, bearing + R.uniform(-35, 35))
        if any(poly.buffer(0.0006).intersects(p) for p in placed):
            continue
        placed.append(poly)
    for poly in placed:
        counters[site] += 1
        prefix = 'CTG' if site == 'chattogram' else 'UKH'
        sid = f'{prefix}-S{counters[site]:02d}'
        rri = max(0.08, min(0.97, bias + R.gauss(0, 0.13)))
        if sid == HERO:
            rri = HERO_RRI
        slopes.append({
            'id': sid,
            'site': site,
            'locality': name,
            'sector': counters[site],
            'rri': round(rri, 2),
            'band': band(rri),
            'slopeDeg': round(R.uniform(17, 41), 0),
            'geom': poly,
        })

# Keep the hero clearly near the top but not first (it is a *relative* ranking).
by_rri = sorted([s for s in slopes if s['site'] == 'chattogram'], key=lambda s: -s['rri'])
top_ids = [s['id'] for s in by_rri[:2]]
for s in slopes:
    if s['id'] in top_ids and s['id'] != HERO and s['rri'] <= HERO_RRI:
        s['rri'] = round(min(0.95, HERO_RRI + 0.05 + 0.03 * top_ids.index(s['id'])), 2)
        s['band'] = band(s['rri'])

# --- NISAR change footprints (illustrative) --------------------------------
PAIRS = {
    'chattogram': {'track': '069', 'direction': 'ascending', 'before': '2026-06-30', 'after': '2026-07-24', 'product': 'GCOV'},
    'ukhiya-teknaf': {'track': '069', 'direction': 'ascending', 'before': '2026-06-30', 'after': '2026-07-12', 'product': 'GCOV'},
}
change_slopes = [HERO, 'CTG-S08', 'CTG-S12', 'CTG-S23', 'UKH-S02', 'UKH-S09', 'UKH-S10', 'UKH-S24']
changes = []
for i, sid in enumerate(change_slopes):
    s = next((x for x in slopes if x['id'] == sid), None)
    if not s:
        continue
    c = s['geom'].centroid
    lat, lon = c.y, c.x
    minx, miny, maxx, maxy = s['geom'].bounds
    # offset toward the lower part of the slope unit
    off_lon = (maxx - minx) * R.uniform(-0.18, 0.18)
    off_lat = (maxy - miny) * R.uniform(-0.25, -0.05)
    fp = lobe(lat + off_lat, lon + off_lon, R.uniform(120, 210), R.uniform(70, 120), R.uniform(140, 190))
    fp = fp.intersection(s['geom'].buffer(0.0004))
    changes.append({
        'type': 'Feature',
        'properties': {
            'id': f'NC-{i + 1:02d}',
            'slopeId': sid,
            'site': s['site'],
            'kind': 'scar' if i % 3 == 0 else 'surface-change',
            **{k: v for k, v in PAIRS[s['site']].items()},
        },
        'geometry': mapping(fp.simplify(0.00002)),
    })
changed = {c['properties']['slopeId'] for c in changes}

# --- Sensor nodes (simulated) ----------------------------------------------
NODES = [
    ('NODE-01', 'CTG-S01', 91, 'good', -88, 6),
    ('NODE-02', 'CTG-S07', 78, 'good', -94, 11),
    ('NODE-03', HERO,       86, 'good', -97, 8),
    ('NODE-04', 'CTG-S23', 64, 'fair', -109, 14),
    ('NODE-05', 'UKH-S02', 82, 'good', -91, 9),
    ('NODE-06', 'UKH-S10', 71, 'fair', -104, 17),
]
REST = {  # rest-state readings before any scenario (calm monsoon day)
    'NODE-01': dict(rainRate=1.4, rain24h=31.0, soilTop=52, soilDeep=44, tiltDelta=0.01),
    'NODE-02': dict(rainRate=1.8, rain24h=34.5, soilTop=55, soilDeep=47, tiltDelta=0.00),
    'NODE-03': dict(rainRate=2.1, rain24h=38.2, soilTop=58, soilDeep=49, tiltDelta=0.01),
    'NODE-04': dict(rainRate=1.2, rain24h=27.6, soilTop=49, soilDeep=41, tiltDelta=0.02),
    'NODE-05': dict(rainRate=0.9, rain24h=22.4, soilTop=46, soilDeep=40, tiltDelta=0.00),
    'NODE-06': dict(rainRate=1.1, rain24h=24.8, soilTop=48, soilDeep=42, tiltDelta=0.01),
}
sensors = []
for nid, sid, batt, link, rssi, seen in NODES:
    s = next(x for x in slopes if x['id'] == sid)
    minx, miny, maxx, maxy = s['geom'].bounds
    # upslope part of the unit, guaranteed inside
    pt = None
    for _ in range(200):
        p = Point(R.uniform(minx, maxx), R.uniform(miny + (maxy - miny) * 0.45, maxy))
        if s['geom'].buffer(-0.0003).contains(p):
            pt = p
            break
    pt = pt or s['geom'].representative_point()
    sensors.append({
        'id': nid,
        'slopeId': sid,
        'coordinates': [round(pt.x, 6), round(pt.y, 6)],
        'batteryPct': batt,
        'link': link,
        'rssi': rssi,
        'lastSeenSec': seen,
        'rest': REST[nid],
    })
instrumented = {n['slopeId']: n['id'] for n in sensors}

features = []
for s in slopes:
    conf = 'high' if (s['id'] in instrumented and s['id'] in changed) else ('low' if s['rri'] < 0.35 else 'medium')
    features.append({
        'type': 'Feature',
        'properties': {
            'id': s['id'],
            'site': s['site'],
            'locality': s['locality'],
            'sector': s['sector'],
            'rri': s['rri'],
            'band': s['band'],
            'confidence': conf,
            'slopeDeg': s['slopeDeg'],
            'nisar': 'detected' if s['id'] in changed else 'none',
            'sensorId': instrumented.get(s['id']),
        },
        'geometry': mapping(s['geom']),
    })

meta = {
    'generator': 'scripts/generate_demo_data.py',
    'seed': 20261113,
    'provenance': 'simulated',
}
json.dump({'type': 'FeatureCollection', 'meta': meta, 'features': features},
          open(os.path.join(GEO, 'slopes.json'), 'w'), separators=(',', ':'))
json.dump({'type': 'FeatureCollection', 'meta': meta, 'features': changes},
          open(os.path.join(GEO, 'nisar-change.json'), 'w'), separators=(',', ':'))
json.dump(localities, open(os.path.join(GEO, 'localities.json'), 'w'), indent=1)
json.dump({'meta': meta, 'nodes': sensors}, open(os.path.join(DATA, 'sensors.json'), 'w'), indent=1)

print('slopes', len(features), counters)
print('changes', len(changes), 'sensors', len(sensors))
top = sorted(features, key=lambda f: -f['properties']['rri'])[:8]
print('top', [(f['properties']['id'], f['properties']['rri']) for f in top])
print('hero', next(f['properties'] for f in features if f['properties']['id'] == HERO))
