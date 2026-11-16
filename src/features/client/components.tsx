import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function KpiCard({ title, value, sub }: { title: string; value: ReactNode; sub?: string }) { return <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle></CardHeader><CardContent><div className="text-2xl font-semibold">{value}</div>{sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}</CardContent></Card> }
export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'bad' | 'warn' }) { const tones = { neutral: 'bg-muted text-foreground', good: 'bg-green-100 text-green-800', bad: 'bg-red-100 text-red-800', warn: 'bg-amber-100 text-amber-800' }; return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span> }
export function TargetRow({ name, actual, target, format, lowerIsBetter = false }: { name: string; actual: number | null; target: number | undefined; format: (n: number) => string; lowerIsBetter?: boolean }) {
  if (actual === null || target === undefined) return <div className="flex items-center justify-between py-2 text-sm"><span>{name}</span><span className="text-muted-foreground">No data</span></div>
  const met = lowerIsBetter ? actual <= target : actual >= target
  return <div className="flex items-center justify-between gap-4 py-2 text-sm"><div><div>{name}</div><div className="text-xs text-muted-foreground">Target {lowerIsBetter ? '≤' : '≥'} {format(target)}</div></div><div className="flex items-center gap-3"><span className="font-semibold">{format(actual)}</span><Pill tone={met ? 'good' : 'bad'}>{met ? 'On target' : 'Below target'}</Pill></div></div>
}
export function ChartEmpty() { return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No data for this period</div> }

export const outcomeTone = (outcome: string): 'neutral' | 'good' | 'bad' | 'warn' => outcome === 'spam' ? 'neutral' : outcome === 'message_taken' || outcome === 'missed' ? 'bad' : outcome === 'transferred' ? 'warn' : 'good'
