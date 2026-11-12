"""
Fetch real NASA Open Data Portal & NASA CMR catalog metadata, NISAR L2/L3 swath GeoJSONs,
GPM IMERG / NASADEM / LHASA metadata, and open SRTM/Terrarium DEM slope values for
Chattogram and Ukhiya–Teknaf.

All endpoints used here are unauthenticated public APIs:
  1. NASA Open Data Portal CKAN API:
     https://data.nasa.gov/api/3/action/package_search?q=nisar&sort=score+desc,metadata_modified+desc
  2. NASA Common Metadata Repository (CMR):
     https://cmr.earthdata.nasa.gov/search/granules.json
     - C2854338529-ASF  NISAR_L2_GCOV_PROVISIONAL_V1
     - C2854335566-ASF  NISAR_L2_GUNW_PROVISIONAL_V1
     - C2854344945-ASF  NISAR_L3_SME2_PROVISIONAL_V1
     - GPM_3IMERGHHE    GPM IMERG Early Precipitation L3 Half Hourly 0.1 deg V07
     - C2763264762-LPCLOUD  NASADEM_HGT.001
     - Global_Landslide_Nowcast  LHASA Landslide Nowcast
  3. AWS Open Data / Mapzen Terrarium 30 m DEM (SRTM-derived) tiles:
     https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png

Usage:
  python3 scripts/fetch_nasa_datasets.py
"""
from __future__ import annotations

import json
import math
import io
import os
import re
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
NASA_DIR = os.path.join(ROOT, 'src', 'data', 'nasa')
GEO_DIR = os.path.join(ROOT, 'src', 'data', 'geo')
os.makedirs(NASA_DIR, exist_ok=True)

ROI_BBOX = '91.55,20.65,92.50,22.80'
CTG_BBOX = '91.70,22.28,91.90,22.46'
UKH_BBOX = '92.10,20.92,92.26,21.25'
UA = {'User-Agent': 'pahar-prohori-nasa-fetch/1.0'}

GRANULE_RE = re.compile(
    r'^NISAR_L(?P<level>\d)_(?P<class>[A-Z]+)_(?P<product>[A-Z0-9]+)_(?P<cycle>\d{3})_(?P<track>\d{3})_(?P<direction>[AD])_'
)


def fetch_json(url: str, timeout: int = 25) -> dict:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode('utf-8'))


def write_json(path: str, data: object, compact: bool = False) -> None:
    with open(path, 'w', encoding='utf-8') as f:
        if compact:
            json.dump(data, f, separators=(',', ':'), ensure_ascii=False)
        else:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write('\n')


def parse_cmr_polygon(polys: list[list[str]] | None) -> list[list[list[float]]] | None:
    if not polys or not polys[0]:
        return None
    nums = [float(x) for x in polys[0][0].split()]
    if len(nums) < 8 or len(nums) % 2 != 0:
        return None
    # CMR stores polygons as [lat1, lon1, lat2, lon2, ...]
    ring = [[round(nums[i + 1], 5), round(nums[i], 5)] for i in range(0, len(nums), 2)]
    if ring[0] != ring[-1]:
        ring.append(ring[0])
    return [ring]


def parse_granule_fields(title: str) -> dict[str, object]:
    m = GRANULE_RE.match(title)
    if not m:
        return {}
    return {
        'level': int(m.group('level')),
        'product': m.group('product'),
        'cycle': int(m.group('cycle')),
        'track': m.group('track'),
        'direction': 'ascending' if m.group('direction') == 'A' else 'descending',
    }


def first_link(links: list[dict], rel_suffix: str, url_substr: str = '') -> str | None:
    for link in links:
        rel = link.get('rel', '')
        href = link.get('href', '')
        if rel.endswith(rel_suffix) and href.startswith('https://') and url_substr in href:
            return href
    return None


def fetch_cmr_all(params: dict[str, str], limit: int = 200) -> list[dict]:
    entries: list[dict] = []
    page = 1
    while len(entries) < limit:
        q = urllib.parse.urlencode({**params, 'page_size': '100', 'page_num': str(page)})
        url = f'https://cmr.earthdata.nasa.gov/search/granules.json?{q}'
        batch = fetch_json(url).get('feed', {}).get('entry', [])
        if not batch:
            break
        entries.extend(batch)
        if len(batch) < 100:
            break
        page += 1
    return entries[:limit]


def covers_bbox(ring: list[list[float]] | None, bbox: tuple[float, float, float, float]) -> bool:
    if not ring:
        return False
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    minx, miny, maxx, maxy = min(xs), min(ys), max(xs), max(ys)
    bx0, by0, bx1, by1 = bbox
    return not (maxx < bx0 or minx > bx1 or maxy < by0 or miny > by1)


def build_nisar_geojson(collection_id: str, short_name: str, temporal: str) -> dict:
    entries = fetch_cmr_all(
        {
            'collection_concept_id': collection_id,
            'bounding_box': ROI_BBOX,
            'temporal': temporal,
            'sort_key': 'start_date',
        },
        limit=250,
    )
    features = []
    for e in entries:
        title = e['title']
        poly = parse_cmr_polygon(e.get('polygons'))
        if not poly:
            continue
        ring = poly[0]
        links = e.get('links', [])
        parsed = parse_granule_fields(title)
        sites = []
        if covers_bbox(ring, (91.74, 22.32, 91.85, 22.44)):
            sites.append('chattogram')
        if covers_bbox(ring, (92.13, 20.95, 92.24, 21.23)):
            sites.append('ukhiya-teknaf')
        browse_url = first_link(links, '/browse#', '_LATLON.png') or first_link(links, '/browse#', '.png')
        data_url = first_link(links, '/data#', '.h5')
        size_mb = e.get('granule_size')
        features.append(
            {
                'type': 'Feature',
                'properties': {
                    'conceptId': e['id'],
                    'granuleTitle': title,
                    'collectionId': collection_id,
                    'collectionShortName': short_name,
                    'product': parsed.get('product', short_name.split('_')[2]),
                    'cycle': parsed.get('cycle'),
                    'track': parsed.get('track'),
                    'direction': parsed.get('direction'),
                    'timeStart': e.get('time_start'),
                    'timeEnd': e.get('time_end'),
                    'acqDate': (e.get('time_start') or '')[:10],
                    'updated': e.get('updated'),
                    'granuleSizeMb': round(float(size_mb), 2) if size_mb else None,
                    'sitesCovered': sites,
                    'dataUrl': data_url,
                    'browseUrl': browse_url,
                    'earthdataSearchUrl': f'https://search.earthdata.nasa.gov/search/granules?p={collection_id}',
                },
                'geometry': {'type': 'Polygon', 'coordinates': poly},
            }
        )
    return {
        'type': 'FeatureCollection',
        'meta': {
            'source': 'NASA CMR API (cmr.earthdata.nasa.gov)',
            'collectionId': collection_id,
            'collectionShortName': short_name,
            'boundingBox': ROI_BBOX,
            'temporal': temporal,
            'featureCount': len(features),
            'fetchedAt': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
            'provenance': 'nasa',
        },
        'features': features,
    }


def fetch_portal_nisar_catalog() -> dict:
    url = 'https://data.nasa.gov/api/3/action/package_search?q=nisar&sort=score+desc,metadata_modified+desc&rows=50'
    raw = fetch_json(url)
    res = raw.get('result', {})
    collections = []
    for pkg in res.get('results', []):
        resources = []
        cmr_id = None
        for r in pkg.get('resources', []):
            href = r.get('url', '')
            m = re.search(r'(C\d+-[A-Z0-9_]+)', href)
            if m and not cmr_id:
                cmr_id = m.group(1)
            resources.append({'format': r.get('format'), 'url': href})
        collections.append(
            {
                'name': pkg.get('name'),
                'title': pkg.get('title'),
                'cmrCollectionId': cmr_id,
                'metadataModified': pkg.get('metadata_modified'),
                'portalUrl': f"https://data.nasa.gov/dataset/{pkg.get('name')}",
                'resources': resources,
            }
        )
    return {
        'meta': {
            'source': 'NASA Open Data Portal CKAN API',
            'queryUrl': 'https://data.nasa.gov/dataset/?q=nisar&sort=score+desc%2C+metadata_modified+desc',
            'apiUrl': url,
            'totalMatches': res.get('count', len(collections)),
            'fetchedAt': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
            'provenance': 'nasa',
        },
        'datasets': collections,
    }


def fetch_gpm_event_catalog() -> dict:
    entries = fetch_cmr_all(
        {
            'short_name': 'GPM_3IMERGHHE',
            'temporal': '2026-07-05T00:00:00Z,2026-07-11T23:59:59Z',
            'sort_key': 'start_date',
        },
        limit=100,
    )
    granules = []
    for e in entries:
        data_url = first_link(e.get('links', []), '/data#')
        granules.append(
            {
                'conceptId': e['id'],
                'title': e['title'],
                'timeStart': e.get('time_start'),
                'timeEnd': e.get('time_end'),
                'granuleSizeMb': round(float(e['granule_size']), 2) if e.get('granule_size') else None,
                'dataUrl': data_url,
            }
        )
    return {
        'meta': {
            'source': 'NASA CMR API (cmr.earthdata.nasa.gov)',
            'shortName': 'GPM_3IMERGHHE',
            'version': '07',
            'temporal': '2026-07-05T00:00:00Z,2026-07-11T23:59:59Z',
            'note': 'Half-hourly GPM IMERG Early-Run catalog for the July 2026 Chattogram event window (HDF5 granules require Earthdata Login)',
            'granuleCountSampled': len(granules),
            'fetchedAt': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
            'provenance': 'nasa',
        },
        'granules': granules,
    }


def fetch_lhasa_catalog() -> dict:
    ckan = fetch_json('https://data.nasa.gov/api/3/action/package_search?q=LHASA&rows=10')
    datasets = []
    for pkg in ckan.get('result', {}).get('results', []):
        datasets.append(
            {
                'name': pkg.get('name'),
                'title': pkg.get('title'),
                'metadataModified': pkg.get('metadata_modified'),
                'portalUrl': f"https://data.nasa.gov/dataset/{pkg.get('name')}",
                'resources': [{'format': r.get('format'), 'url': r.get('url')} for r in pkg.get('resources', [])],
            }
        )
    cmr_sample = fetch_cmr_all({'short_name': 'Global_Landslide_Nowcast'}, limit=10)
    return {
        'meta': {
            'source': 'NASA Open Data Portal + NASA CMR',
            'note': 'NASA LHASA (Global Landslide Nowcast) metadata; baseline comparison pending',
            'fetchedAt': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
            'provenance': 'nasa',
        },
        'portalDatasets': datasets,
        'cmrSampleGranules': [
            {
                'conceptId': e['id'],
                'title': e['title'],
                'timeStart': e.get('time_start'),
                'dataUrl': first_link(e.get('links', []), '/data#'),
            }
            for e in cmr_sample
        ],
    }


def fetch_nasadem_and_update_slopes() -> dict:
    # 1. Fetch real NASADEM_HGT.001 tile catalog covering Chattogram + Ukhiya-Teknaf
    print('  Querying NASA CMR NASADEM_HGT.001 tiles...', flush=True)
    cmr_tiles = fetch_cmr_all(
        {
            'collection_concept_id': 'C2763264762-LPCLOUD',
            'bounding_box': ROI_BBOX,
        },
        limit=20,
    )
    print(f'  Found {len(cmr_tiles)} NASADEM_HGT.001 tiles.', flush=True)
    tiles = [
        {
            'conceptId': e['id'],
            'tileId': e['title'],
            'granuleSizeMb': round(float(e['granule_size']), 2) if e.get('granule_size') else None,
            'dataUrl': first_link(e.get('links', []), '/data#'),
        }
        for e in cmr_tiles
    ]

    # 2. Sample real elevation & steepest terrain slope inside each slope polygon
    # from the open AWS/Mapzen Terrarium 30 m SRTM-derived DEM tiles (same source used in mapStyle.ts).
    tile_cache: dict[tuple[int, int, int], np.ndarray] = {}

    def get_tile(z: int, tx: int, ty: int) -> np.ndarray:
        key = (z, tx, ty)
        if key not in tile_cache:
            u = f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{tx}/{ty}.png'
            req = urllib.request.Request(u, headers=UA)
            with urllib.request.urlopen(req, timeout=20) as resp:
                im = Image.open(io.BytesIO(resp.read())).convert('RGB')
            arr = np.asarray(im, dtype=np.float64)
            tile_cache[key] = (arr[:, :, 0] * 256.0 + arr[:, :, 1] + arr[:, :, 2] / 256.0) - 32768.0
        return tile_cache[key]

    def global_pixel(lat: float, lon: float, z: int) -> tuple[float, float]:
        n = 2**z
        gx = (lon + 180.0) / 360.0 * n * 256.0
        gy = (1.0 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2.0 * n * 256.0
        return gx, gy

    slopes_path = os.path.join(GEO_DIR, 'slopes.json')
    with open(slopes_path, 'r', encoding='utf-8') as f:
        slopes_doc = json.load(f)

    z = 14
    bounds_per_slope: list[tuple[int, int, int, int, float]] = []
    needed_tiles: set[tuple[int, int, int]] = set()
    for feat in slopes_doc['features']:
        ring = feat['geometry']['coordinates'][0]
        lons = [p[0] for p in ring]
        lats = [p[1] for p in ring]
        minx, maxx = min(lons), max(lons)
        miny, maxy = min(lats), max(lats)
        gx0, gy1 = global_pixel(miny, minx, z)
        gx1, gy0 = global_pixel(maxy, maxx, z)
        ix0, ix1 = int(math.floor(gx0)) - 1, int(math.ceil(gx1)) + 1
        iy0, iy1 = int(math.floor(gy0)) - 1, int(math.ceil(gy1)) + 1
        bounds_per_slope.append((ix0, ix1, iy0, iy1, (miny + maxy) / 2.0))
        for ty in range(iy0 // 256, iy1 // 256 + 1):
            for tx in range(ix0 // 256, ix1 // 256 + 1):
                needed_tiles.add((z, tx, ty))

    print(f'  Downloading {len(needed_tiles)} Terrarium DEM tiles (z={z})...', flush=True)
    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(lambda k: get_tile(*k), sorted(needed_tiles)))

    dem_records = []
    for feat, (ix0, ix1, iy0, iy1, cy) in zip(slopes_doc['features'], bounds_per_slope):
        w = ix1 - ix0 + 1
        h = iy1 - iy0 + 1
        patch = np.zeros((h, w), dtype=np.float64)
        for py in range(iy0, iy1 + 1):
            ty = py // 256
            ly = py % 256
            for px in range(ix0, ix1 + 1):
                tx = px // 256
                lx = px % 256
                patch[py - iy0, px - ix0] = tile_cache[(z, tx, ty)][ly, lx]

        cell_m = 40075016.686 * math.cos(math.radians(cy)) / (2**z * 256.0)
        dz_dx = (patch[1:-1, 2:] - patch[1:-1, :-2]) / (2.0 * cell_m)
        dz_dy = (patch[2:, 1:-1] - patch[:-2, 1:-1]) / (2.0 * cell_m)
        slope_deg = np.degrees(np.arctan(np.hypot(dz_dx, dz_dy)))
        max_slope = float(round(float(np.max(slope_deg)), 0))
        mean_elev = float(round(float(np.mean(patch)), 1))
        max_elev = float(round(float(np.max(patch)), 1))

        feat['properties']['slopeDeg'] = max_slope
        feat['properties']['elevationM'] = max_elev
        dem_records.append(
            {
                'slopeId': feat['properties']['id'],
                'locality': feat['properties']['locality'],
                'meanElevM': mean_elev,
                'maxElevM': max_elev,
                'maxSlopeDeg': max_slope,
            }
        )

    slopes_doc['meta'] = {
        'terrainSource': 'SRTM / Mapzen Terrarium 30 m DEM (AWS Open Data)',
        'nasaCatalogSource': 'NASADEM_HGT.001 (NASA CMR C2763264762-LPCLOUD)',
        'riskProvenance': 'simulated',
        'geometryProvenance': 'illustrative',
        'note': 'slopeDeg and elevationM derived from open SRTM/Terrarium DEM tiles; risk index and polygons remain prototype placeholders',
    }
    write_json(slopes_path, slopes_doc, compact=True)

    return {
        'meta': {
            'source': 'NASA CMR (NASADEM_HGT.001) + AWS Open Data Mapzen Terrarium SRTM DEM',
            'collectionId': 'C2763264762-LPCLOUD',
            'tileCount': len(tiles),
            'slopeSamples': len(dem_records),
            'fetchedAt': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
            'provenance': 'nasa',
        },
        'cmrTiles': tiles,
        'slopeElevationSummary': dem_records,
    }


def enrich_nisar_change_with_cmr(gcov_doc: dict) -> None:
    path = os.path.join(GEO_DIR, 'nisar-change.json')
    with open(path, 'r', encoding='utf-8') as f:
        change_doc = json.load(f)

    # Index GCOV features by (acqDate, track, site)
    def match_granule(date: str, track: str, site: str) -> dict | None:
        for feat in gcov_doc['features']:
            p = feat['properties']
            if p['acqDate'] == date and p['track'] == track and site in p['sitesCovered']:
                return p
        return None

    for feat in change_doc['features']:
        p = feat['properties']
        before_g = match_granule(p['before'], p['track'], p['site'])
        after_g = match_granule(p['after'], p['track'], p['site'])
        if before_g:
            p['beforeGranuleId'] = before_g['conceptId']
            p['beforeGranuleTitle'] = before_g['granuleTitle']
        if after_g:
            p['afterGranuleId'] = after_g['conceptId']
            p['afterGranuleTitle'] = after_g['granuleTitle']
            p['browseUrl'] = after_g['browseUrl']
        p['collectionId'] = 'C2854338529-ASF'
        p['collectionShortName'] = 'NISAR_L2_GCOV_PROVISIONAL_V1'

    change_doc['meta'] = {
        'catalogSource': 'NASA CMR NISAR_L2_GCOV_PROVISIONAL_V1 (C2854338529-ASF)',
        'provenance': 'illustrative',
        'note': 'Granule IDs and pass pairs are real NASA CMR metadata; scar polygons remain illustrative placeholders until GCOV HDF5 change detection runs',
    }
    write_json(path, change_doc, compact=True)


def main() -> None:
    print('Fetching NASA Open Data Portal NISAR catalog...', flush=True)
    portal = fetch_portal_nisar_catalog()
    write_json(os.path.join(NASA_DIR, 'DATA_NASA_GOV_NISAR_CATALOG.json'), portal)

    print('Fetching NISAR_L2_GCOV_PROVISIONAL_V1 (C2854338529-ASF) CMR granules...', flush=True)
    gcov = build_nisar_geojson('C2854338529-ASF', 'NISAR_L2_GCOV_PROVISIONAL_V1', '2026-06-01T00:00:00Z,2026-11-12T23:59:59Z')
    write_json(os.path.join(NASA_DIR, 'NISAR_L2_GCOV_PROVISIONAL_V1.json'), gcov, compact=True)

    print('Fetching NISAR_L2_GUNW_PROVISIONAL_V1 (C2854335566-ASF) CMR granules...', flush=True)
    gunw = build_nisar_geojson('C2854335566-ASF', 'NISAR_L2_GUNW_PROVISIONAL_V1', '2026-06-01T00:00:00Z,2026-11-12T23:59:59Z')
    write_json(os.path.join(NASA_DIR, 'NISAR_L2_GUNW_PROVISIONAL_V1.json'), gunw, compact=True)

    print('Fetching NISAR_L3_SME2_PROVISIONAL_V1 (C2854344945-ASF) CMR granules...', flush=True)
    sme2 = build_nisar_geojson('C2854344945-ASF', 'NISAR_L3_SME2_PROVISIONAL_V1', '2026-06-01T00:00:00Z,2026-11-12T23:59:59Z')
    write_json(os.path.join(NASA_DIR, 'NISAR_L3_SME2_PROVISIONAL_V1.json'), sme2, compact=True)

    print('Fetching GPM_3IMERGHHE V07 July 2026 event granule catalog...', flush=True)
    gpm = fetch_gpm_event_catalog()
    write_json(os.path.join(NASA_DIR, 'GPM_3IMERGHHE_V07.json'), gpm)

    print('Fetching NASADEM_HGT.001 + computing open Terrarium DEM slopes...', flush=True)
    dem = fetch_nasadem_and_update_slopes()
    write_json(os.path.join(NASA_DIR, 'NASADEM_HGT_V001.json'), dem)

    print('Fetching GLOBAL_LANDSLIDE_NOWCAST (LHASA) catalog...', flush=True)
    lhasa = fetch_lhasa_catalog()
    write_json(os.path.join(NASA_DIR, 'GLOBAL_LANDSLIDE_NOWCAST_LHASA.json'), lhasa)

    print('Enriching nisar-change.json metadata with real CMR granule IDs...', flush=True)
    enrich_nisar_change_with_cmr(gcov)

    print(
        f"Done: GCOV={len(gcov['features'])}, GUNW={len(gunw['features'])}, "
        f"SME2={len(sme2['features'])}, GPM={len(gpm['granules'])}, "
        f"NASADEM_tiles={len(dem['cmrTiles'])}, slopes_dem={len(dem['slopeElevationSummary'])}",
        flush=True,
    )


if __name__ == '__main__':
    main()
