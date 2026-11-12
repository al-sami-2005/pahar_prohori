import { useMemo, useState, type KeyboardEvent } from 'react'
import { Search } from 'lucide-react'
import { useMission } from '@/hooks/useMission'
import { cn } from '@/lib/cn'
import { useLang } from '@/lib/i18n'
import { SITE_ORDER } from '@/data/sites'
import { localityName, slopeName, slopes } from '@/data/slopes'
import { PanelHeader } from './PanelHeader'

export function SearchPanel() {
  const { dispatch } = useMission()
  const { t, lang } = useLang()
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return slopes
      .filter(
        (s) =>
          s.id.toLowerCase().includes(q) ||
          s.locality.toLowerCase().includes(q) ||
          localityName(s.locality, 'bn').includes(q),
      )
      .slice(0, 7)
  }, [query])

  // A search is finished once a result is picked: close it so the slope takes the stage.
  const choose = (id: string) => {
    dispatch({ type: 'select', id })
    dispatch({ type: 'setTool', tool: null })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(results.length - 1, c + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(0, c - 1))
    } else if (e.key === 'Enter') {
      const hit = results[cursor]
      if (hit) choose(hit.id)
    }
  }

  return (
    <div>
      <PanelHeader title={t('rail.search')} />
      <div className="px-3 pb-2">
        <label className="flex items-center gap-2 rounded-lg border border-hairline bg-canvas/60 px-2.5 focus-within:border-satellite/50">
          <Search size={14} strokeWidth={1.75} className="shrink-0 text-muted" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setCursor(0)
            }}
            onKeyDown={onKeyDown}
            placeholder={t('search.placeholder')}
            aria-label={t('search.placeholder')}
            className="h-9 w-full bg-transparent text-sm text-fg placeholder:text-faint focus:outline-none"
          />
        </label>
      </div>

      {query.trim() === '' ? (
        <div className="px-1.5 pb-2">
          <p className="px-2.5 pt-1 pb-1.5 text-2xs text-muted">{t('search.sites')}</p>
          {SITE_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => dispatch({ type: 'site', site: id })}
              className="flex w-full items-center rounded-lg px-2.5 py-2 text-left text-sm text-fg transition-colors hover:bg-fg/[0.04]"
            >
              {t(`site.${id}`)}
            </button>
          ))}
        </div>
      ) : results.length === 0 ? (
        <p className="px-4 pt-1 pb-4 text-sm text-muted">{t('search.empty', { q: query.trim() })}</p>
      ) : (
        <ul role="listbox" aria-label={t('search.slopes')} className="px-1.5 pb-2">
          {results.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === cursor}>
              <button
                type="button"
                onClick={() => choose(s.id)}
                onMouseEnter={() => setCursor(i)}
                className={cn(
                  'flex w-full items-baseline gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                  i === cursor ? 'bg-fg/[0.05]' : 'hover:bg-fg/[0.04]',
                )}
              >
                <span className="numeric w-16 shrink-0 text-2xs text-muted">{s.id}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-fg">{slopeName(s, lang)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
