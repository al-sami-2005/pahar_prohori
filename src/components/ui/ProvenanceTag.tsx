import type { DataProvenance } from '@/types/domain'
import { cn } from '@/lib/cn'
import { PROVENANCE_META, provenanceLabels, type ProvenanceLabel } from '@/lib/provenance'
import { toneBorder, toneText } from '@/lib/tones'

interface ProvenanceTagProps {
  label: ProvenanceLabel
  className?: string
}

/**
 * Explicit data-origin label. Dashed outline = not a measurement
 * (simulated / illustrative / pending); solid = published or measured.
 */
export function ProvenanceTag({ label, className }: ProvenanceTagProps) {
  const meta = PROVENANCE_META[label]
  const Icon = meta.icon
  const textTone = meta.tone === 'neutral' ? 'text-fg/85' : toneText[meta.tone]
  return (
    <span
      title={meta.description}
      className={cn(
        'label-micro inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-xs border bg-canvas/40 px-1.5',
        meta.dashed ? 'border-dashed' : 'border-solid',
        toneBorder[meta.tone],
        textTone,
        className,
      )}
    >
      <Icon size={11} strokeWidth={2.25} aria-hidden className="shrink-0" />
      {meta.label}
    </span>
  )
}

interface ProvenanceTagsProps {
  provenance: DataProvenance
  className?: string
}

/** All labels implied by a provenance record (kind + stale + validation). */
export function ProvenanceTags({ provenance, className }: ProvenanceTagsProps) {
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1', className)}>
      {provenanceLabels(provenance).map((l) => (
        <ProvenanceTag key={l} label={l} />
      ))}
    </span>
  )
}
