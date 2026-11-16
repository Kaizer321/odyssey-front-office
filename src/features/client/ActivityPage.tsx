import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/features/auth/AuthProvider'
import { downloadCsv, toCsv } from '@/lib/csv'
import { formatWhen, label } from '@/lib/format'
import { fetchActivity, fetchAllForExport, type ActivityFilters, type Tab } from './activityApi'
import { outcomeTone, Pill } from './components'

const PAGE_SIZE = 25
const tabs: { value: Tab; label: string }[] = [{ value: 'all', label: 'All' }, { value: 'calls', label: 'Calls' }, { value: 'web_forms', label: 'Web forms' }, { value: 'emails', label: 'Emails' }, { value: 'emergencies', label: 'Emergencies' }]
const outcomes = ['booked', 'quote_captured', 'info_provided', 'transferred', 'message_taken', 'spam', 'missed']
const selectClass = 'h-9 rounded-md border bg-background px-3 text-sm'

export default function ActivityPage() {
  const { client } = useAuth(); const tz = client?.timezone ?? 'Australia/Sydney'; const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'all'; const outcome = params.get('outcome') ?? ''; const from = params.get('from') ?? ''; const to = params.get('to') ?? ''; const q = params.get('q') ?? ''; const page = Math.max(1, Number(params.get('page') ?? 1)); const filters: ActivityFilters = { tab, q, outcome, from, to }
  const update = (changes: Record<string, string | null>) => { const next = new URLSearchParams(params); Object.entries(changes).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key)); if (!('page' in changes)) next.delete('page'); setParams(next, { replace: true }) }
  const [search, setSearch] = useState(q)
  useEffect(() => { const timer = setTimeout(() => { if (search !== q) update({ q: search || null }) }, 300); return () => clearTimeout(timer) }, [search]) // eslint-disable-line react-hooks/exhaustive-deps
  const { data, isLoading, isError, error, isFetching } = useQuery({ queryKey: ['activity', client?.id, tab, q, outcome, from, to, page], queryFn: () => fetchActivity(filters, tz, page, PAGE_SIZE), enabled: !!client?.id, placeholderData: keepPreviousData })
  const total = data?.total ?? 0; const pages = Math.max(1, Math.ceil(total / PAGE_SIZE)); const firstRow = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1; const lastRow = Math.min(page * PAGE_SIZE, total); const [exporting, setExporting] = useState(false)
  async function onExport() { setExporting(true); try { const rows = await fetchAllForExport(filters, tz); downloadCsv(`activity-${format(new Date(), 'yyyy-MM-dd')}.csv`, toCsv(['Received', 'Channel', 'Category', 'Outcome', 'After hours', 'Contact', 'Phone', 'Summary', 'Job number', 'Job status'], rows.map((row) => [formatWhen(row.received_at, tz), label(row.channel), label(row.category), label(row.outcome), row.is_after_hours ? 'Yes' : 'No', row.contact_name, row.contact_phone, row.summary, row.job_number, row.job_status]))) } finally { setExporting(false) } }
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Activity log</h1><p className="text-sm text-muted-foreground">Every call, web form and email in one place</p></div><Button variant="outline" size="sm" onClick={() => void onExport()} disabled={exporting || total === 0}><Download className="mr-2 h-4 w-4" />{exporting ? 'Exporting…' : 'Export CSV'}</Button></div>
    <Tabs value={tab} onValueChange={(value) => update({ tab: value === 'all' ? null : value })}><TabsList>{tabs.map((item) => <TabsTrigger key={item.value} value={item.value}>{item.label}</TabsTrigger>)}</TabsList></Tabs>
    <div className="flex flex-wrap items-center gap-2"><Input className="w-full sm:w-64" placeholder="Search name, phone or summary" value={search} onChange={(event) => setSearch(event.target.value)} /><select className={selectClass} value={outcome} onChange={(event) => update({ outcome: event.target.value || null })} aria-label="Outcome"><option value="">All outcomes</option>{outcomes.map((item) => <option key={item} value={item}>{label(item)}</option>)}</select><label className="flex items-center gap-1 text-sm text-muted-foreground">From <Input type="date" className="w-40" value={from} max={to || undefined} onChange={(event) => update({ from: event.target.value || null })} /></label><label className="flex items-center gap-1 text-sm text-muted-foreground">To <Input type="date" className="w-40" value={to} min={from || undefined} onChange={(event) => update({ to: event.target.value || null })} /></label>{(q || outcome || from || to) && <Button variant="ghost" size="sm" onClick={() => { setSearch(''); update({ q: null, outcome: null, from: null, to: null }) }}>Clear filters</Button>}</div>
    {isError && <p className="text-sm text-red-600">Could not load activity: {(error as Error).message}</p>}
    <Card><CardContent className={`overflow-x-auto pt-6 ${isFetching ? 'opacity-70' : ''}`}><Table><TableHeader><TableRow><TableHead>When</TableHead><TableHead>Channel</TableHead><TableHead>Contact</TableHead><TableHead>Summary</TableHead><TableHead>Outcome</TableHead><TableHead>Job</TableHead></TableRow></TableHeader><TableBody>{(data?.rows ?? []).map((row) => <TableRow key={row.id}><TableCell className="whitespace-nowrap">{formatWhen(row.received_at, tz)}{row.is_after_hours && <span className="ml-2"><Pill tone="warn">After hours</Pill></span>}</TableCell><TableCell>{label(row.channel)}</TableCell><TableCell className="whitespace-nowrap"><div>{row.contact_name ?? '—'}</div><div className="text-xs text-muted-foreground">{row.contact_phone}</div></TableCell><TableCell className="max-w-md">{row.call_id ? <Link to={`/app/calls/${row.call_id}`} className="line-clamp-2 hover:underline">{row.summary}</Link> : <span className="line-clamp-2">{row.summary}</span>}</TableCell><TableCell><Pill tone={outcomeTone(row.outcome)}>{label(row.outcome)}</Pill></TableCell><TableCell className="whitespace-nowrap">{row.job_number ? row.job_url ? <a href={row.job_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">#{row.job_number}</a> : <span title={row.job_status ? label(row.job_status) : undefined}>#{row.job_number}</span> : '—'}</TableCell></TableRow>)}{!isLoading && data?.rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No matching activity</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
    <div className="flex items-center justify-between text-sm text-muted-foreground"><span>{total === 0 ? 'No results' : `Showing ${firstRow}–${lastRow} of ${total}`}</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>Previous</Button><span>Page {page} of {pages}</span><Button variant="outline" size="sm" disabled={page >= pages} onClick={() => update({ page: String(page + 1) })}>Next</Button></div></div>
  </div>
}
