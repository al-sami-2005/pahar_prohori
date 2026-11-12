import { useEffect, useMemo, useRef, useState } from 'react'
import { Map as MapLibreMap, Marker, type FilterSpecification, type LngLatLike, type MapMouseEvent } from 'maplibre-gl'
import { AnimatePresence, motion } from 'motion/react'
import { useMission } from '@/hooks/useMission'
import { readPrefs } from '@/hooks/usePrefs'
import { useLang } from '@/lib/i18n'
import { cn } from '@/lib/cn'
import {
  chromeTop,
  drawerWidth,
  frameInsets,
  locationHeaderHeight,
  selectionOffset,
  sheetEdge,
  toolPanelRight,
  type FrameKind,
} from '@/lib/layout'
import { mapDuration } from '@/lib/motion'
import { groundNodes, getNode } from '@/data/sensors'
import { unionBounds } from '@/lib/geo'
import { PLACE_LABELS } from '@/data/places'
import { SITES } from '@/data/sites'
import { getSlope, localityName, slopeName, slopes } from '@/data/slopes'
import { restAlerts } from '@/data/telemetry'
import {
  HATCH_IMAGE,
  HATCH_POST_IMAGE,
  NONE_FILTER,
  OPACITY,
  addOnlineBasemap,
  buildBaseStyle,
  makeHatchImage,
} from './mapStyle'
import './worker'
import { MapHud } from './MapHud'
import { ScenarioMapSync } from './ScenarioMapSync'
import { SlopeTooltip } from './SlopeTooltip'

/** Curated camera, zoomed out slightly on smaller viewports so the same area stays in frame. */
function siteCamera(site: keyof typeof SITES) {
  const cam = SITES[site].camera
  const scale = Math.min(window.innerWidth / 1440, window.innerHeight / 900)
  return { center: cam.center as LngLatLike, zoom: cam.zoom + Math.log2(Math.min(1, scale)) }
}

/**
 * Resting camera for a site in a given view: the curated camera on desktop Mission,
 * otherwise the site's slopes fitted into whatever part of the map the overlays leave free.
 */
function frameCamera(map: MapLibreMap, site: keyof typeof SITES, kind: FrameKind, focusIds?: readonly string[]) {
  const insets = frameInsets(kind, window.innerWidth, window.innerHeight)
  if (!insets) return siteCamera(site)
  // Deployment previews the chosen slopes of this site; otherwise frame the whole site.
  const chosen = (focusIds ?? []).flatMap((id) => {
    const sl = getSlope(id)
    return sl && sl.site === site ? [sl.bounds] : []
  })
  const bounds = chosen.length ? unionBounds(chosen) : SITES[site].bounds
  const cam = map.cameraForBounds(bounds, { padding: insets, maxZoom: 13.6 })
  if (!cam?.center || cam.zoom === undefined) return siteCamera(site)
  return { center: cam.center, zoom: cam.zoom }
}

const ALL_SLOPE_IDS = slopes.map((s) => s.id)

/** Where a crowded plan marker may step to (px), nearest first. [0, 0] = on its slope. */
const HOME_SPOT = [0, 0] as const
const DECLUTTER_SPOTS: ReadonlyArray<readonly [number, number]> = [
  HOME_SPOT,
  [22, -12],
  [-22, -12],
  [22, 12],
  [-22, 12],
  [0, -23],
  [0, 23],
]

interface DeployMarker {
  el: HTMLButtonElement
  body: HTMLSpanElement
  marker: Marker
  at: [number, number]
}

const idFilter = (key: 'id' | 'slopeId', id: string | null) =>
  id ? (['==', ['get', key], id] as FilterSpecification) : NONE_FILTER

export function MissionMap() {
  const { state, dispatch } = useMission()
  const { lang, t } = useLang()
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const stateRef = useRef(state)
  const hoverRef = useRef<string | null>(null)
  const prevSelected = useRef<string | null>(null)
  const preFocusCamera = useRef<{ center: LngLatLike; zoom: number } | null>(null)
  const nodeEls = useRef(new Map<string, HTMLButtonElement>())
  const labelEls = useRef<Array<{ el: HTMLDivElement; label: (typeof PLACE_LABELS)[number] }>>([])
  const deployEls = useRef(new Map<string, DeployMarker>())
  const deployOrder = useRef<readonly string[]>([])
  const deployActive = useRef<{ hovered: string | null; selected: string | null }>({ hovered: null, selected: null })
  const declutterRef = useRef<(() => void) | null>(null)
  const planHoverRef = useRef<string | null>(null)

  // Event handlers registered once read the latest state through this ref.
  useEffect(() => {
    stateRef.current = state
  })

  /* ---------------- init ---------------- */
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const m = new MapLibreMap({
      container,
      style: buildBaseStyle(),
      ...siteCamera(stateRef.current.site),
      minZoom: 7.5,
      maxZoom: 17,
      maxBounds: [
        [89.8, 19.6],
        [94.2, 24.2],
      ],
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      renderWorldCopies: false,
      fadeDuration: 120,
    })
    m.touchZoomRotate.disableRotation()
    m.keyboard.disableRotation()

    m.setMissingStyleImageResolver((id) => {
      if (id === HATCH_IMAGE && !m.hasImage(HATCH_IMAGE)) m.addImage(HATCH_IMAGE, makeHatchImage(), { pixelRatio: 2 })
      if (id === HATCH_POST_IMAGE && !m.hasImage(HATCH_POST_IMAGE)) {
        m.addImage(HATCH_POST_IMAGE, makeHatchImage(true), { pixelRatio: 2 })
      }
    })
    // Optional online sources fail quietly when offline; anything else is a real fault.
    m.on('error', (e) => {
      const msg = e.error?.message ?? ''
      if (/Failed to fetch|AJAXError|NetworkError/i.test(msg)) {
        if (import.meta.env.DEV) console.debug('[map] offline source:', msg)
      } else {
        console.error('[map]', msg)
      }
    })
    // Watchdog: never leave the presenter staring at an endless loader.
    const watchdog = window.setTimeout(() => {
      if (!m.loaded() && !m.isStyleLoaded()) setFailed(true)
    }, 12000)

    let disposeOnline = () => {}
    m.on('load', () => {
      window.clearTimeout(watchdog)
      setFailed(false)
      for (const [id, level] of restAlerts) m.setFeatureState({ source: 'slopes', id }, { alert: level })
      disposeOnline = addOnlineBasemap(m, {
        onVector: (status) => dispatch({ type: 'basemap', status }),
        onTerrain: (status) => dispatch({ type: 'terrain', status }),
      })
      setLoaded(true)
    })
    setMap(m)
    if (import.meta.env.DEV) (window as unknown as { __map?: MapLibreMap }).__map = m

    return () => {
      window.clearTimeout(watchdog)
      disposeOnline()
      m.remove()
      setMap(null)
      setLoaded(false)
    }
  }, [dispatch])

  /* ---------------- pointer interaction ---------------- */
  useEffect(() => {
    if (!map || !loaded) return
    const setHover = (id: string | null) => {
      if (id === hoverRef.current) return
      if (hoverRef.current) map.setFeatureState({ source: 'slopes', id: hoverRef.current }, { hover: false })
      if (id) map.setFeatureState({ source: 'slopes', id }, { hover: true })
      hoverRef.current = id
      setHoverId(id)
      map.getCanvas().style.cursor = id ? 'pointer' : ''
    }
    const onMove = (e: MapMouseEvent) => {
      const f = map.queryRenderedFeatures(e.point, { layers: ['slope-hit'] })[0]
      setHover(typeof f?.properties?.id === 'string' ? f.properties.id : null)
      const el = tooltipRef.current
      if (el) {
        // Flip to the left of the cursor near the right edge so it never clips.
        const flip = e.point.x > map.getContainer().clientWidth - 300
        const x = flip ? e.point.x - 16 - el.offsetWidth : e.point.x + 16
        el.style.transform = `translate3d(${x}px, ${e.point.y + 16}px, 0)`
      }
    }
    const onOut = () => setHover(null)
    const onClick = (e: MapMouseEvent) => {
      const f = map.queryRenderedFeatures(e.point, { layers: ['slope-hit'] })[0]
      const id = typeof f?.properties?.id === 'string' ? f.properties.id : null
      const s = stateRef.current
      if (id) {
        dispatch({ type: 'select', id })
        return
      }
      if (s.tool) dispatch({ type: 'tool', tool: null })
      else if (!s.focus && s.selectedSlopeId) dispatch({ type: 'select', id: null })
    }
    map.on('mousemove', onMove)
    map.on('mouseout', onOut)
    map.on('click', onClick)
    return () => {
      map.off('mousemove', onMove)
      map.off('mouseout', onOut)
      map.off('click', onClick)
    }
  }, [map, loaded, dispatch])

  /* ---------------- ground-node markers ---------------- */
  useEffect(() => {
    if (!map || !loaded) return
    const els = nodeEls.current
    const markers = groundNodes.map((node) => {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = 'node-marker'
      el.dataset.link = node.link
      el.innerHTML =
        '<span class="node-marker__beat"></span><span class="node-marker__dot"></span>' +
        `<span class="node-marker__label">${node.id}<span>${node.lastSeenSec}s</span></span>`
      el.addEventListener('click', (ev) => {
        ev.stopPropagation()
        dispatch({ type: 'select', id: node.slopeId })
      })
      els.set(node.id, el)
      return new Marker({ element: el, anchor: 'center' }).setLngLat(node.coordinates).addTo(map)
    })
    return () => {
      markers.forEach((mk) => mk.remove())
      els.clear()
    }
  }, [map, loaded, dispatch])

  /* ---------------- place labels ---------------- */
  useEffect(() => {
    if (!map || !loaded) return
    const z0 = map.getZoom()
    const items = PLACE_LABELS.map((label) => {
      const el = document.createElement('div')
      el.className = 'place-label'
      el.dataset.kind = label.kind
      // Start in the right state so nothing fades out on first paint.
      el.dataset.hidden = String(z0 < label.minZoom || z0 > label.maxZoom)
      const marker = new Marker({
        element: el,
        anchor: label.anchor ?? 'center',
        offset: label.anchor === 'bottom' ? [0, -7] : [0, 0],
      })
        .setLngLat([label.lon, label.lat])
        .addTo(map)
      return { el, label, marker }
    })
    labelEls.current = items
    // Hide by zoom range, and keep secondary labels out from under the fixed chrome
    // (top bar + ribbon, bottom edge) so they never read as clutter behind controls.
    const update = () => {
      const z = map.getZoom()
      const vw = window.innerWidth
      const h = map.getContainer().clientHeight
      const s = stateRef.current
      // Bottom edge of the clear map: the slope sheet on tablet/phone, else the bottom controls.
      const sheetOpen = s.view.kind === 'mission' && !!s.selectedSlopeId && drawerWidth(vw) === 0
      const bottom = h - (sheetOpen ? sheetEdge(vw, window.innerHeight) : 0) - 72
      // The floating rail on tablet/desktop Mission.
      const railRight = s.view.kind === 'mission' && vw >= 640 ? 12 + 56 + 24 : 0
      // The location title + site switch block in the top-left corner.
      const headerShown = (s.view.kind === 'mission' && !s.focus) || (s.view.kind === 'deploy' && vw >= 640)
      const headerBottom = chromeTop(vw) + locationHeaderHeight(vw) + 4
      // Replay/Deployment park the zoom cluster + attribution top-right on sheets and the replay dock.
      const hudTopRight = s.view.kind === 'replay' || (s.view.kind === 'deploy' && drawerWidth(vw) === 0)
      for (const { el, label } of items) {
        let hidden = z < label.minZoom || z > label.maxZoom
        if (!hidden) {
          const p = map.project([label.lon, label.lat])
          if (headerShown && p.x < 290 && p.y < headerBottom) hidden = true
          else if (hudTopRight && p.x > vw - 220 && p.y < chromeTop(vw) + 230) hidden = true
          else if (label.kind === 'locality') {
            // Bottom-anchored: the text sits ~20 px above the point.
            hidden = p.y - 20 < chromeTop(vw) + 4 || p.x < 40 || p.x > vw - 40
          } else {
            hidden = p.y < chromeTop(vw) + 16 || p.y > bottom || p.x < Math.max(railRight, 56) || p.x > vw - 56
          }
        }
        el.dataset.hidden = String(hidden)
      }
    }
    update()
    map.on('move', update)
    return () => {
      map.off('move', update)
      items.forEach((i) => i.marker.remove())
      labelEls.current = []
    }
  }, [map, loaded])

  // Label text + node accessible names follow the UI language.
  useEffect(() => {
    for (const { el, label } of labelEls.current) {
      el.replaceChildren(
        label.kind === 'locality' && label.locality
          ? localityName(label.locality, lang)
          : lang === 'bn'
            ? label.textBn
            : label.text,
      )
    }
    for (const [id, el] of nodeEls.current) {
      const node = getNode(id)
      const slope = getSlope(node?.slopeId)
      el.setAttribute('aria-label', `${id} · ${slope ? localityName(slope.locality, lang) : ''} · ${t('drawer.online')}`)
    }
  }, [lang, t, loaded])

  /* ---------------- camera: site / reset / route (declared before focus on purpose) ---------------- */
  // Each route frames the site inside the space its own overlays leave free.
  const frameKind: FrameKind = state.view.kind
  // Deployment frames the chosen slopes; the replay frames the site's slope units (tighter than the site box).
  const frameIds = state.view.kind === 'deploy' ? state.view.ids : state.view.kind === 'replay' ? ALL_SLOPE_IDS : undefined
  const frameKey = frameIds?.filter((id) => getSlope(id)?.site === state.site).join(',') ?? ''
  const firstFrame = useRef(true)
  useEffect(() => {
    if (!map || !loaded) return
    const cam = frameCamera(map, stateRef.current.site, frameKind, frameKey ? frameKey.split(',') : undefined)
    preFocusCamera.current = null
    if (firstFrame.current) {
      // First paint happens under the loading veil, so settle without animating.
      firstFrame.current = false
      map.jumpTo(cam)
      return
    }
    if (frameKind === 'method') return
    map.flyTo({ ...cam, duration: 900, curve: 1.2, essential: true })
  }, [map, loaded, state.viewNonce, frameKind, frameKey])

  /* ---------------- selection ---------------- */
  useEffect(() => {
    if (!map || !loaded) return
    const id = state.selectedSlopeId
    if (prevSelected.current) map.setFeatureState({ source: 'slopes', id: prevSelected.current }, { selected: false })
    if (id) map.setFeatureState({ source: 'slopes', id }, { selected: true })
    prevSelected.current = id
    map.setFilter('slope-selected-line', idFilter('id', id))
    map.setFilter('slope-selected-ring', idFilter('id', id))
    map.setFilter('slope-halo', idFilter('id', id))
    for (const [nid, el] of nodeEls.current) el.setAttribute('data-selected', String(!!id && getNode(nid)?.slopeId === id))

    const slope = getSlope(id)
    for (const [sid, entry] of deployEls.current) entry.el.setAttribute('data-selected', String(sid === id))
    deployActive.current.selected = id
    declutterRef.current?.()
    if (!slope || stateRef.current.focus) return
    const container = map.getContainer()
    const vw = container.clientWidth
    const vh = container.clientHeight
    const p = map.project(slope.center)
    const offscreen = p.x < 0 || p.x > vw || p.y < 0 || p.y > vh
    const kind = stateRef.current.view.kind
    if (kind === 'replay' || kind === 'deploy') {
      // Route panels: move only if the slope sits outside the clear part of the map.
      const ins = frameInsets(kind, window.innerWidth, window.innerHeight)
      if (!ins) return
      const offset: [number, number] = [Math.round((ins.left - ins.right) / 2), Math.round((ins.top - ins.bottom) / 2)]
      const hidden = p.x < ins.left - 16 || p.x > vw - ins.right + 16 || p.y < ins.top - 16 || p.y > vh - ins.bottom + 16
      if (offscreen) {
        map.flyTo({ center: slope.center, zoom: Math.max(map.getZoom(), 12.6), offset, duration: 900, essential: true })
      } else if (hidden) {
        map.easeTo({ center: slope.center, offset, duration: mapDuration.flyTo, essential: true })
      }
      return
    }
    // Keep the selected slope clear of the drawer and chrome; move only if needed.
    const dw = drawerWidth(window.innerWidth)
    const sheet = dw > 0 ? 0 : sheetEdge(window.innerWidth, window.innerHeight)
    const s = stateRef.current
    const panelRight = toolPanelRight(window.innerWidth, window.innerHeight, readPrefs().railExpanded, !!s.tool)
    // Desktop: centre in the strip between an open tool panel and the drawer.
    const offset: [number, number] =
      dw > 0 ? [Math.round((panelRight + vw - dw) / 2 - vw / 2), 0] : selectionOffset(window.innerWidth, window.innerHeight)
    const safe = {
      left: dw > 0 ? Math.max(110, panelRight + 24) : 24,
      right: vw - dw - (dw > 0 ? 90 : 76),
      top: chromeTop(window.innerWidth) + 72,
      bottom: vh - Math.max(120, sheet + 24),
    }
    if (offscreen) {
      map.flyTo({ center: slope.center, zoom: Math.max(map.getZoom(), 13.2), offset, duration: 900, essential: true })
    } else if (p.x < safe.left || p.x > safe.right || p.y < safe.top || p.y > safe.bottom) {
      map.easeTo({ center: slope.center, offset, duration: mapDuration.flyTo, essential: true })
    }
  }, [map, loaded, state.selectedSlopeId])

  /* ---------------- focus mode ---------------- */
  useEffect(() => {
    if (!map || !loaded) return
    const slope = state.focus ? getSlope(state.selectedSlopeId) : undefined
    if (slope) {
      if (!preFocusCamera.current) preFocusCamera.current = { center: map.getCenter(), zoom: map.getZoom() }
      const zoom = window.innerWidth < 640 ? 14.6 : 14.3
      map.flyTo({
        center: slope.center,
        zoom,
        offset: selectionOffset(window.innerWidth, window.innerHeight),
        duration: 820,
        curve: 1.3,
        essential: true,
      })
    } else if (!state.focus && preFocusCamera.current) {
      const cam = preFocusCamera.current
      preFocusCamera.current = null
      map.flyTo({ ...cam, duration: mapDuration.flyTo, essential: true })
    }
    const focusId = slope?.id ?? null
    map.setFilter('risk-focus-fill', idFilter('id', focusId))
    map.setFilter('alert-focus-fill', idFilter('id', focusId))
    map.setFilter('nisar-focus-line', idFilter('slopeId', focusId))
    map.getContainer().classList.toggle('map-quiet', !!focusId)
    for (const [nid, el] of nodeEls.current) {
      const own = getNode(nid)?.slopeId === focusId
      el.setAttribute('data-dim', String(!!focusId && !own))
      el.setAttribute('data-emphasis', String(!!focusId && own))
    }
  }, [map, loaded, state.focus, state.selectedSlopeId])

  /* ---------------- layer visibility + dimming (with fades) ---------------- */
  // Route views override the user's toggles where honesty requires it:
  // the July replay has no ground nodes (none existed) and shows change evidence
  // only once its pair completes — and then only in the post-event treatment.
  const view = state.view
  const footprintSites = view.kind === 'replay' ? view.footprintSites : null
  const footprintKey = footprintSites?.join(',') ?? ''
  const layers = useMemo(() => {
    const eff = { ...state.layers, nisarPost: false }
    if (view.kind === 'replay') {
      eff.risk = true
      eff.nisar = false
      eff.nisarPost = view.footprintSites.length > 0
      eff.sensors = false
      eff.gpm = false
    }
    if (view.kind === 'deploy') {
      eff.risk = true
      eff.nisar = false
      eff.gpm = false
      eff.sensors = true
    }
    return eff
  }, [state.layers, view])
  const deployIds = view.kind === 'deploy' ? view.ids : null
  const deployExisting = view.kind === 'deploy' ? view.existing : null
  const deployHovered = view.kind === 'deploy' ? view.hovered : null

  // Hindsight lock, per area: only footprints whose pair has completed are drawable.
  useEffect(() => {
    if (!map || !loaded) return
    const sites = footprintKey ? footprintKey.split(',') : []
    const filter: FilterSpecification = sites.length ? ['in', ['get', 'site'], ['literal', sites]] : NONE_FILTER
    map.setFilter('nisar-post-fill', filter)
    map.setFilter('nisar-post-line', filter)
    map.setFilter('nisar-post-ring', filter)
  }, [map, loaded, footprintKey])

  useEffect(() => {
    if (!map || !loaded) return
    const focusing = state.focus && !!state.selectedSlopeId
    const dim = focusing || !!deployIds
    for (const [layerId, spec] of Object.entries(OPACITY)) {
      if (!map.getLayer(layerId)) continue
      const visible = spec.group ? layers[spec.group] : true
      if (visible) map.setLayoutProperty(layerId, 'visibility', 'visible')
      map.setPaintProperty(layerId, spec.prop, visible ? (dim ? spec.focus : spec.base) : 0)
    }
    if (map.getLayer('terrain-hillshade')) {
      map.setLayoutProperty('terrain-hillshade', 'visibility', layers.terrain ? 'visible' : 'none')
    }
    for (const el of nodeEls.current.values()) el.style.display = layers.sensors ? '' : 'none'
    const timer = window.setTimeout(() => {
      for (const [layerId, spec] of Object.entries(OPACITY)) {
        if (spec.group && !layers[spec.group] && map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', 'none')
        }
      }
    }, 360)
    return () => window.clearTimeout(timer)
  }, [map, loaded, layers, deployIds, state.focus, state.selectedSlopeId, state.terrain])

  /* ---------------- deployment planner: plan outline + numbered node markers ---------------- */
  useEffect(() => {
    if (!map || !loaded) return
    if (!deployIds || deployIds.length === 0) {
      map.setFilter('deploy-line', NONE_FILTER)
      if (!state.focus) map.setFilter('risk-focus-fill', NONE_FILTER)
    } else {
      const filter: FilterSpecification = ['in', ['get', 'id'], ['literal', [...deployIds]]]
      map.setFilter('deploy-line', filter)
      map.setFilter('risk-focus-fill', filter)
    }
    // A planned slope's simulated node is drawn as its numbered marker instead.
    const planned = new Set(deployIds ?? [])
    for (const [nid, el] of nodeEls.current) {
      const sid = getNode(nid)?.slopeId
      el.setAttribute('data-planned', String(!!sid && planned.has(sid)))
    }
  }, [map, loaded, deployIds, state.focus])

  // Markers are diffed in place: a budget change adds/removes only what changed,
  // and every surviving marker is renumbered — map number = list position.
  useEffect(() => {
    if (!map || !loaded) return
    const els = deployEls.current
    const ids = deployIds ?? []
    const keep = new Set(ids)
    const existing = new Set(deployExisting ?? [])
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    for (const [id, entry] of els) {
      if (keep.has(id)) continue
      els.delete(id)
      if (reduce) entry.marker.remove()
      else {
        entry.el.setAttribute('data-phase', 'leave')
        window.setTimeout(() => entry.marker.remove(), 170)
      }
    }
    ids.forEach((id, i) => {
      const slope = getSlope(id)
      if (!slope) return
      let entry = els.get(id)
      if (!entry) {
        const el = document.createElement('button')
        el.type = 'button'
        el.className = 'deploy-marker'
        el.setAttribute('data-slope', id)
        const body = document.createElement('span')
        body.className = 'deploy-marker__body'
        body.setAttribute('aria-hidden', 'true')
        el.appendChild(body)
        if (!reduce) {
          el.setAttribute('data-phase', 'enter')
          el.addEventListener('animationend', () => {
            if (el.getAttribute('data-phase') === 'enter') el.removeAttribute('data-phase')
          })
        }
        el.addEventListener('click', (ev) => {
          ev.stopPropagation()
          dispatch({ type: 'select', id })
        })
        el.addEventListener('mouseenter', () => dispatch({ type: 'deployHover', id }))
        el.addEventListener('mouseleave', () => dispatch({ type: 'deployHover', id: null }))
        el.addEventListener('focus', () => dispatch({ type: 'deployHover', id }))
        el.addEventListener('blur', () => dispatch({ type: 'deployHover', id: null }))
        const marker = new Marker({ element: el, anchor: 'center' }).setLngLat(slope.center).addTo(map)
        entry = { el, body, marker, at: slope.center }
        els.set(id, entry)
      }
      const n = i + 1
      const status = existing.has(id) ? 'existing' : 'proposed'
      entry.body.textContent = String(n)
      entry.el.setAttribute('data-status', status)
      entry.el.setAttribute('data-position', String(n))
      entry.el.setAttribute('data-active', String(deployActive.current.hovered === id))
      entry.el.setAttribute('data-selected', String(deployActive.current.selected === id))
      // Higher priority paints on top.
      entry.el.style.zIndex = String(200 - n)
      entry.el.setAttribute(
        'aria-label',
        t('deploy.markerLabel', {
          n,
          name: slopeName(slope, lang),
          status: t(status === 'existing' ? 'deploy.row.existing' : 'deploy.row.proposed'),
        }),
      )
    })
    deployOrder.current = ids
    declutterRef.current?.()
  }, [map, loaded, deployIds, deployExisting, dispatch, lang, t])

  // Leaving the map (or the app) removes whatever markers remain.
  useEffect(() => {
    const els = deployEls.current
    return () => {
      for (const entry of els.values()) entry.marker.remove()
      els.clear()
    }
  }, [map])

  // Priority decides who keeps the spot when markers would overlap at low zoom: a
  // lower-priority marker first steps to a nearby free spot, and only hides if none is
  // free. The hovered and selected markers always keep their own place.
  useEffect(() => {
    if (!map || !loaded) return
    const run = () => {
      const els = deployEls.current
      const { hovered, selected } = deployActive.current
      const pinned = [hovered, selected].filter((id): id is string => !!id && els.has(id))
      const placed: Array<{ x: number; y: number }> = []
      const seen = new Set<string>()
      const free = (x: number, y: number) => !placed.some((q) => Math.abs(q.x - x) < 23 && Math.abs(q.y - y) < 22)
      for (const id of [...pinned, ...deployOrder.current]) {
        if (seen.has(id)) continue
        seen.add(id)
        const entry = els.get(id)
        if (!entry) continue
        const p = map.project(entry.at)
        const spot = pinned.includes(id) ? HOME_SPOT : DECLUTTER_SPOTS.find(([dx, dy]) => free(p.x + dx, p.y + dy))
        entry.el.setAttribute('data-hidden', String(!spot))
        const [dx, dy] = spot ?? HOME_SPOT
        const cur = entry.marker.getOffset()
        if (cur.x !== dx || cur.y !== dy) entry.marker.setOffset([dx, dy])
        if (spot) placed.push({ x: p.x + dx, y: p.y + dy })
      }
    }
    declutterRef.current = run
    run()
    map.on('move', run)
    return () => {
      map.off('move', run)
      declutterRef.current = null
    }
  }, [map, loaded])

  // Hover sync: list row ⇄ map marker ⇄ slope outline (feature-state, no re-render of layers).
  useEffect(() => {
    if (!map || !loaded) return
    const id = deployHovered
    if (planHoverRef.current && planHoverRef.current !== id) {
      map.setFeatureState({ source: 'slopes', id: planHoverRef.current }, { planHover: false })
    }
    if (id) map.setFeatureState({ source: 'slopes', id }, { planHover: true })
    planHoverRef.current = id
    for (const [sid, entry] of deployEls.current) entry.el.setAttribute('data-active', String(sid === id))
    deployActive.current.hovered = id
    declutterRef.current?.()
  }, [map, loaded, deployHovered])

  // Hovering a planned slope on the map highlights its list row too.
  useEffect(() => {
    const v = stateRef.current.view
    if (v.kind !== 'deploy') return
    if (hoverId && v.ids.includes(hoverId)) {
      if (v.hovered !== hoverId) dispatch({ type: 'deployHover', id: hoverId })
      return
    }
    // Moving onto a marker is not leaving the slope.
    if (map?.getContainer().querySelector('.deploy-marker:hover')) return
    if (v.hovered && !hoverId) dispatch({ type: 'deployHover', id: null })
  }, [hoverId, map, dispatch])

  const hoverSlope = hoverId && hoverId !== state.selectedSlopeId ? getSlope(hoverId) : undefined
  const focusing = state.focus && !!state.selectedSlopeId

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-sea"
      data-view={view.kind}
      data-replay-footprint={view.kind === 'replay' ? footprintKey || 'none' : undefined}
      data-deploy-count={deployIds ? deployIds.length : undefined}
    >
      {/* MapLibre's own CSS sets .maplibregl-map { position: relative }, so size the container explicitly. */}
      <div className="absolute inset-0">
        <div ref={containerRef} className="h-full w-full" aria-label="Map of monitored hill slopes" role="region" />
      </div>

      {/* Resting edge falloff keeps the eye on the monitored area (very low contrast). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 78% 82% at 50% 52%, transparent 62%, rgb(245 247 250 / 0.34) 100%)' }}
      />

      {/* Focus vignette — quiets the periphery without hiding it */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 transition-opacity duration-700 ease-out',
          focusing ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          background: 'radial-gradient(ellipse 60% 70% at 38% 52%, transparent 34%, rgb(245 247 250 / 0.82) 100%)',
        }}
      />

      <SlopeTooltip ref={tooltipRef} slope={hoverSlope} />

      {map && loaded ? <MapHud map={map} /> : null}
      {map && loaded ? <ScenarioMapSync map={map} nodeEls={nodeEls} /> : null}

      <AnimatePresence>
        {!loaded ? (
          <motion.div
            key="loading"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            className="absolute inset-0 flex justify-center bg-sea pt-[34vh]"
          >
            {failed ? (
              <div className="flex max-w-xs flex-col items-center gap-3 text-center">
                <span className="text-sm text-fg">{t('map.failed')}</span>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-md border border-hairline px-3 py-1.5 text-sm text-muted transition-colors hover:bg-fg/[0.05] hover:text-fg"
                >
                  {t('map.reload')}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <span className="text-sm text-muted">{t('map.loading')}</span>
                <span className="relative block h-px w-32 overflow-hidden bg-hairline">
                  <span className="absolute inset-y-0 left-0 w-1/3 animate-[loading-sweep_1.4s_var(--ease-in-out)_infinite] bg-satellite/60" />
                </span>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
