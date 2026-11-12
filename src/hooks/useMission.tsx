/**
 * Mission Control UI state: selection, focus, open tool, layer visibility,
 * monitored site and basemap connectivity. One reducer, one context.
 */
import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react'
import type { SiteId } from '@/types/domain'
import { DEFAULT_LAYERS, type LayerId, type LayerVisibility } from '@/data/mapLayers'
import { getSlope } from '@/data/slopes'

export type Tool = 'layers' | 'search' | 'sensors' | 'risk' | 'satellite'

/** What the shared map should emphasise for the current route. */
export type MapView =
  | { kind: 'mission' }
  /**
   * footprintSites: areas whose illustrative change footprint is available at the replay
   * date (hindsight lock — always drawn as post-event evidence). Carried per site so a
   * site switch can never flash another area's footprint early.
   */
  | { kind: 'replay'; footprintSites: readonly SiteId[] }
  /** ids in priority order; existing = ids that already carry a simulated demo node; hovered = map/list hover sync. */
  | { kind: 'deploy'; ids: readonly string[]; existing: readonly string[]; hovered: string | null }
  | { kind: 'method' }
export type RemoteStatus = 'loading' | 'online' | 'offline'

/** What the slope drawer / sheet shows: the live overview, or the Evidence Chain. */
export type DrawerView = 'overview' | 'evidence'

export interface MissionState {
  site: SiteId
  selectedSlopeId: string | null
  focus: boolean
  tool: Tool | null
  layers: LayerVisibility
  basemap: RemoteStatus
  terrain: RemoteStatus
  /** Bumped to ask the map to re-frame the current site. */
  viewNonce: number
  view: MapView
  drawerView: DrawerView
  /** The resident warning can be minimised to a banner; it re-opens on each new run. */
  warningCollapsed: boolean
}

export type MissionAction =
  | { type: 'select'; id: string | null }
  | { type: 'focus'; on: boolean }
  | { type: 'tool'; tool: Tool | null }
  /** Non-toggling variant used by the guided demo. */
  | { type: 'setTool'; tool: Tool | null }
  | { type: 'layer'; id: LayerId; on: boolean }
  | { type: 'site'; site: SiteId }
  | { type: 'basemap'; status: RemoteStatus }
  | { type: 'terrain'; status: RemoteStatus }
  | { type: 'resetView' }
  | { type: 'escape' }
  | { type: 'view'; view: MapView }
  | { type: 'drawerView'; view: DrawerView }
  /** Deployment planner: hovering a map marker or a list row highlights its partner. */
  | { type: 'deployHover'; id: string | null }
  | { type: 'warningCollapsed'; collapsed: boolean }

export const initialMissionState: MissionState = {
  site: 'chattogram',
  selectedSlopeId: null,
  focus: false,
  tool: null,
  layers: DEFAULT_LAYERS,
  basemap: 'loading',
  terrain: 'loading',
  viewNonce: 0,
  view: { kind: 'mission' },
  drawerView: 'overview',
  warningCollapsed: false,
}

/** Pure; exported for tests. */
export function missionReducer(state: MissionState, action: MissionAction): MissionState {
  switch (action.type) {
    case 'select': {
      if (action.id === state.selectedSlopeId) return state
      const slope = getSlope(action.id)
      if (!slope) return { ...state, selectedSlopeId: null, focus: false, drawerView: 'overview' }
      return { ...state, selectedSlopeId: slope.id, site: slope.site }
    }
    case 'focus':
      if (action.on && !state.selectedSlopeId) return state
      return { ...state, focus: action.on, tool: action.on ? null : state.tool }
    case 'tool':
      return { ...state, tool: state.tool === action.tool ? null : action.tool }
    case 'setTool':
      return state.tool === action.tool ? state : { ...state, tool: action.tool }
    case 'layer':
      return { ...state, layers: { ...state.layers, [action.id]: action.on } }
    case 'site':
      return {
        ...state,
        site: action.site,
        selectedSlopeId: null,
        focus: false,
        drawerView: 'overview',
        viewNonce: state.viewNonce + 1,
      }
    case 'basemap':
      return state.basemap === action.status ? state : { ...state, basemap: action.status }
    case 'terrain':
      return state.terrain === action.status ? state : { ...state, terrain: action.status }
    case 'resetView':
      return { ...state, focus: false, viewNonce: state.viewNonce + 1 }
    case 'view':
      // Changing route clears per-view interaction (selection, tool, focus) so each view starts clean.
      if (action.view.kind !== state.view.kind) {
        return { ...state, view: action.view, tool: null, focus: false, selectedSlopeId: null, drawerView: 'overview' }
      }
      if (action.view.kind === state.view.kind && (action.view.kind === 'mission' || action.view.kind === 'method')) return state
      return { ...state, view: action.view }
    case 'drawerView':
      return state.drawerView === action.view ? state : { ...state, drawerView: action.view }
    case 'warningCollapsed':
      return state.warningCollapsed === action.collapsed ? state : { ...state, warningCollapsed: action.collapsed }
    case 'deployHover':
      if (state.view.kind !== 'deploy' || state.view.hovered === action.id) return state
      return { ...state, view: { ...state.view, hovered: action.id } }
    case 'escape':
      if (state.tool) return { ...state, tool: null }
      if (state.focus) return { ...state, focus: false }
      if (state.drawerView === 'evidence' && state.selectedSlopeId) return { ...state, drawerView: 'overview' }
      if (state.selectedSlopeId) return { ...state, selectedSlopeId: null }
      return state
  }
}

interface MissionContextValue {
  state: MissionState
  dispatch: Dispatch<MissionAction>
}

const MissionContext = createContext<MissionContextValue | null>(null)

export function MissionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(missionReducer, initialMissionState)
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <MissionContext.Provider value={value}>{children}</MissionContext.Provider>
}

export function useMission(): MissionContextValue {
  const ctx = useContext(MissionContext)
  if (!ctx) throw new Error('useMission must be used inside <MissionProvider>')
  return ctx
}
