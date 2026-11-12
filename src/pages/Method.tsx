import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { ArrowRight, Check, CircleDashed, Info } from 'lucide-react'
import { useViewport } from '@/hooks/useViewport'
import { ALERT_META } from '@/lib/alertLevels'
import { cn } from '@/lib/cn'
import { useLang } from '@/lib/i18n'
import { chromeTop } from '@/lib/layout'
import { PROVENANCE_META, type ProvenanceLabel } from '@/lib/provenance'
import { toneText } from '@/lib/tones'
import { ProvenanceTag } from '@/components/ui/ProvenanceTag'
import { ALERT_RULES, CHAIN, LIMITS, NEXT, REAL, SIMULATED, SOURCES } from '@/content/method'

const LABEL_ORDER: ProvenanceLabel[] = ['nasa', 'derived', 'simulated', 'lab', 'illustrative', 'reported', 'post-event', 'stale', 'validation-pending', 'prototype-backtest']

function Accordion({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <details className="border-t border-line">
      <summary className="cursor-pointer list-none py-4 marker:hidden">
        <span className="block text-base font-semibold text-fg">{title}</span>
        {subtitle ? <span className="mt-0.5 block text-sm text-muted">{subtitle}</span> : null}
      </summary>
      <div className="pb-5">{children}</div>
    </details>
  )
}

/** M8 simplified method page: plain-language first, technical provenance on demand. */
export default function Method() {
  const { t, lang } = useLang()
  const { width } = useViewport()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22 }}
      className="absolute inset-0 z-30 overflow-y-auto bg-canvas"
    >
      <article className="mx-auto max-w-[900px] px-5 pb-24 md:px-8" style={{ paddingTop: chromeTop(width) + 32 }}>
        <header className="pb-8">
          <p className="text-sm font-medium text-accent">{t('method.eyebrow')}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-fg md:text-4xl">{t('method.title')}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-fg/85">{t('method.lead')}</p>
          {lang === 'bn' && t('method.bnNote') ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted"><Info size={14} aria-hidden />{t('method.bnNote')}</p>
          ) : null}
        </header>

        <section className="border-t border-line pt-6">
          <h2 className="text-xl font-semibold text-fg">How it works</h2>
          <p className="mt-1 text-sm text-muted">Four steps. Each one answers a different question.</p>
          <ol className="mt-5 grid gap-3 md:grid-cols-4" aria-label="Space → AI → Ground → Human action">
            {CHAIN.map((c, i) => (
              <li key={c.key} className="relative border-l-2 border-line pl-3 pr-2 py-1">
                <p className={cn('flex items-center gap-2 text-sm font-semibold', toneText[c.tone])}>
                  <c.icon size={17} strokeWidth={1.9} aria-hidden />
                  {c.step}
                </p>
                <p className="mt-2 text-sm font-medium leading-snug text-fg">{c.question}</p>
                {i < CHAIN.length - 1 ? <ArrowRight size={15} aria-hidden className="absolute top-1/2 -right-[10px] hidden -translate-y-1/2 text-muted md:block" /> : null}
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8 border-t border-line pt-6">
          <h2 className="text-xl font-semibold text-fg">Alert levels</h2>
          <p className="mt-1 text-sm text-muted">The alert only changes when evidence changes. Evacuate needs two independent ground signals.</p>
          <ul className="mt-4 divide-y divide-line">
            {ALERT_RULES.map((r) => {
              const m = ALERT_META[r.level]
              return (
                <li key={r.level} className="grid gap-2 py-3 md:grid-cols-[150px_1fr] md:gap-5">
                  <p className={cn('flex items-center gap-2 text-base font-semibold', toneText[m.tone])}>
                    <m.icon size={18} strokeWidth={2} aria-hidden />
                    {lang === 'bn' ? m.labelBn : m.label}
                  </p>
                  <div>
                    <p className="text-sm leading-relaxed text-fg/90">{r.when}</p>
                    <p className="mt-1 text-xs text-muted">Action: {r.action}</p>
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 flex items-start gap-2 border-l-2 border-warning/50 pl-3 text-sm text-muted">
            <Info size={15} aria-hidden className="mt-0.5 shrink-0" />
            Illustrative demo thresholds — not operational.
          </p>
        </section>

        <div className="mt-8 flex flex-col">
          <Accordion title="Data sources" subtitle="Where the map, rainfall, risk and sensor values come from">
            <div className="overflow-x-auto rounded-2xl ring-1 ring-line">
              <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                <thead className="bg-elevated/70">
                  <tr className="border-b border-line text-xs text-muted">
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">What it gives</th>
                    <th className="px-4 py-3 font-medium">Prototype status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {SOURCES.map((r) => (
                    <tr key={r.source} className="align-top">
                      <th className="px-4 py-3 font-medium text-fg">{r.source}</th>
                      <td className="px-4 py-3 leading-relaxed text-fg/85">{r.gives}</td>
                      <td className="px-4 py-3">
                        <p className="leading-relaxed text-muted">{r.status}</p>
                        <div className="mt-2 flex flex-wrap gap-1">{r.labels.map((l) => <ProvenanceTag key={l} label={l} />)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Accordion>

          <Accordion title="Real data vs simulated data" subtitle="Nothing simulated is presented as measured">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-satellite/[0.05] ring-1 ring-satellite/20 p-4">
                <h3 className="flex items-center gap-2 font-semibold text-satellite"><Check size={17} aria-hidden />Real in this demo</h3>
                <ul className="mt-3 flex flex-col gap-2 text-sm text-fg/90">{REAL.map((r) => <li key={r}>{r}</li>)}</ul>
              </div>
              <div className="rounded-2xl bg-elevated/45 ring-1 ring-line p-4">
                <h3 className="flex items-center gap-2 font-semibold text-fg"><CircleDashed size={17} aria-hidden />Simulated or illustrative</h3>
                <ul className="mt-3 flex flex-col gap-2 text-sm text-fg/90">{SIMULATED.map((r) => <li key={r}>{r}</li>)}</ul>
              </div>
            </div>
          </Accordion>

          <Accordion title="What the labels mean" subtitle="NASA DATA, SIMULATED, ILLUSTRATIVE and other provenance labels">
            <ul className="grid gap-x-8 gap-y-4 md:grid-cols-2">
              {LABEL_ORDER.map((l) => (
                <li key={l} className="flex items-start gap-3">
                  <ProvenanceTag label={l} className="mt-0.5" />
                  <p className="text-sm leading-relaxed text-fg/85">{PROVENANCE_META[l].description}</p>
                </li>
              ))}
            </ul>
          </Accordion>

          <Accordion title="Limits and next steps" subtitle="What this prototype cannot claim yet">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="font-semibold text-fg">Limits</h3>
                <ul className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-fg/85">{LIMITS.map((l) => <li key={l}>{l}</li>)}</ul>
              </div>
              <div>
                <h3 className="font-semibold text-fg">Next</h3>
                <ol className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-fg/85">
                  {NEXT.map((n, i) => <li key={n}><span className="mr-2 font-semibold text-accent">{i + 1}.</span>{n}</li>)}
                </ol>
              </div>
            </div>
          </Accordion>
        </div>
      </article>
    </motion.div>
  )
}
