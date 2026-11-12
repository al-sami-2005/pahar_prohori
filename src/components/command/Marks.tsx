import { useLang } from '@/lib/i18n'
import { Tooltip } from '@/components/ui/Tooltip'

/**
 * Minimal Pahar Prohori mark: a hill ridge, a watch point and one radar arc.
 * No enclosing tile — the mark reads like a real product identity at small sizes.
 */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden className="shrink-0 overflow-visible">
      <path d="M3.5 24.5 10.5 13l4.1 6.1 5-8.1 8.9 13.5H3.5Z" fill="none" stroke="#274b40" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="19.6" cy="11" r="2.15" fill="#216c59" />
      <path d="M10.2 8.1a9.2 9.2 0 0 1 12.8 0" fill="none" stroke="#2b7899" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M12.4 10.4a6.1 6.1 0 0 1 4.2-1.7" fill="none" stroke="#2b7899" strokeWidth="1.15" strokeLinecap="round" opacity=".72" />
    </svg>
  )
}

export function DemoMark() {
  const { t } = useLang()
  return (
    <Tooltip content={t('demo.tooltip')} side="bottom">
      <span
        tabIndex={0}
        aria-label={t('demo.tooltip')}
        className="rounded-md border border-line bg-canvas px-2 py-1 text-[10px] font-semibold tracking-[0.05em] text-muted uppercase"
      >
        {t('demo.label')}
      </span>
    </Tooltip>
  )
}
