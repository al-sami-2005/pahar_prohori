/**
 * Shared layout geometry for overlays that must agree with the map camera
 * (so a selected slope is never framed underneath the drawer or sheet).
 *
 *   desktop ≥ 1024 px  — command capsule, side rail, right-hand drawer
 *   tablet  640–1023   — condensed capsule, icon rail, bottom sheet
 *   mobile  < 640      — compact capsule + menu, bottom toolbar, bottom sheet
 */
export type LayoutMode = 'desktop' | 'tablet' | 'mobile'

export function layoutMode(width: number): LayoutMode {
  if (width < 640) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

/** Bottom edge of the single app header. */
export function chromeTop(_width: number): number {
  return 64
}

/** Right-hand drawer width on desktop; 0 when the drawer becomes a bottom sheet. */
export function drawerWidth(viewportWidth: number): number {
  if (viewportWidth < 1024) return 0
  return viewportWidth >= 1400 ? 384 : 360
}

/** Height of the slope sheet that replaces the drawer on tablet and mobile. */
export function sheetHeight(width: number, height: number): number {
  if (layoutMode(width) === 'mobile') return Math.round(Math.min(height * 0.46, 420))
  return Math.round(Math.min(height * 0.58, 560))
}

/** Gap under the slope sheet: phones keep the tool bar visible beneath it. */
export function sheetBottom(width: number): number {
  return layoutMode(width) === 'mobile' ? 0 : 12
}

/** Distance from the bottom of the viewport to the top edge of the slope sheet. */
export function sheetEdge(width: number, height: number): number {
  return sheetBottom(width) + sheetHeight(width, height)
}

/**
 * Camera offset that keeps a selected slope in the visible map area:
 * shifted left of the drawer on desktop, centred between chrome and sheet on smaller screens.
 */
export function selectionOffset(width: number, height: number): [number, number] {
  const dw = drawerWidth(width)
  if (dw > 0) return [-dw / 2, 0]
  return [0, Math.round((chromeTop(width) - sheetEdge(width, height)) / 2)]
}

export const RAIL_WIDTH = { expanded: 212, collapsed: 56 } as const
export const TOOL_PANEL_WIDTH = 312

/** Labelled rail only where there is room for it; the user's choice wins when set. */
export function isRailExpanded(width: number, height: number, pref: boolean | null): boolean {
  if (layoutMode(width) !== 'desktop' || height < 820) return false
  return pref ?? width >= 1440
}

/** Right edge (px) of the open rail tool panel on desktop/tablet, or 0 when none is open. */
export function toolPanelRight(width: number, height: number, pref: boolean | null, toolOpen: boolean): number {
  if (!toolOpen || layoutMode(width) === 'mobile') return 0
  const rail = isRailExpanded(width, height, pref) ? RAIL_WIDTH.expanded : RAIL_WIDTH.collapsed
  return 12 + rail + 10 + TOOL_PANEL_WIDTH
}

/** Resident warning on tablet/phone: a bottom sheet that takes priority over the slope sheet. */
export function warningSheetHeight(width: number, height: number): number {
  return layoutMode(width) === 'mobile' ? Math.round(Math.min(352, height * 0.44)) : 232
}

/* ---------------- route overlays + camera framing ---------------- */

/** Bottom sheet used by Replay and Deployment on tablet and phone. */
export function routeSheetHeight(width: number, height: number): number {
  return Math.round(height * (layoutMode(width) === 'mobile' ? 0.5 : 0.45))
}

/**
 * Replay layout:
 *   dock  — desktop: question + knowledge column on the left, timeline dock along the bottom
 *   sheet — tablet / phone: map on top, one bottom sheet with a sticky date + timeline header
 */
export type ReplayLayout = 'dock' | 'sheet'
export function replayLayout(width: number): ReplayLayout {
  return layoutMode(width) === 'desktop' ? 'dock' : 'sheet'
}
/** Left replay column width on desktop. */
export function replayAsideWidth(width: number): number {
  return width >= 1280 ? 392 : 340
}
/** Height of the desktop timeline dock (its controls and legend wrap below ~1200 px). */
export function replayDockHeight(width: number): number {
  return width < 1200 ? 252 : 206
}

/** Desktop Deployment panel width. */
export function deployPanelWidth(width: number): number {
  return width >= 1400 ? 400 : 372
}

/** Space the location header (title, summary, site switch) takes below the command capsule. */
export function locationHeaderHeight(width: number): number {
  return layoutMode(width) === 'mobile' ? 48 : 76
}

export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

export type FrameKind = 'mission' | 'replay' | 'deploy' | 'method'

/**
 * The unobstructed part of the map for each view, as padding for camera fits.
 * Returns null where a curated camera is used instead (desktop Mission).
 */
export function frameInsets(kind: FrameKind, width: number, height: number): Insets | null {
  const mode = layoutMode(width)
  const top = chromeTop(width)
  const header = locationHeaderHeight(width)
  if (kind === 'mission') {
    if (mode === 'desktop') return null
    // Extra top room: locality labels hang above the northernmost slopes.
    if (mode === 'tablet') return { top: top + header + 32, right: 76, bottom: 120, left: 92 }
    return { top: top + header + 20, right: 64, bottom: 110, left: 20 }
  }
  if (kind === 'replay') {
    if (replayLayout(width) === 'dock') {
      // Zoom cluster sits top-right; the caption pill hangs under the capsule.
      return { top: top + 52, right: 72, bottom: replayDockHeight(width) + 12 + 28, left: 12 + replayAsideWidth(width) + 32 }
    }
    return { top: top + 56, right: 20, bottom: routeSheetHeight(width, height) + 32, left: 20 }
  }
  if (kind === 'deploy') {
    // (+28: locality labels hang above the northernmost chosen slopes.)
    // Right: clear of the panel and of the zoom cluster that sits beside it.
    if (mode === 'desktop') return { top: top + header + 36, right: deployPanelWidth(width) + 104, bottom: 64, left: 40 }
    // Phones carry the site switch inside the sheet, so the map starts right under the capsule.
    const headerSpace = mode === 'mobile' ? 44 : header + 36
    return { top: top + headerSpace, right: 20, bottom: routeSheetHeight(width, height) + 28, left: 20 }
  }
  return null
}
