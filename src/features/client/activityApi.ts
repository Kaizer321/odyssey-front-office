import { supabase } from '@/lib/supabase'
import { addDays, zonedDayStartUtc } from '@/lib/format'

export type Tab = 'all' | 'calls' | 'web_forms' | 'emails' | 'emergencies'
export type ActivityFilters = { tab: Tab; q: string; outcome: string; from: string; to: string }
export type ActivityItem = { id: string; channel: string; category: string; outcome: string; is_after_hours: boolean; contact_name: string | null; contact_phone: string | null; subject: string | null; summary: string | null; received_at: string; call_id: string | null; job_number: string | null; job_status: string | null; job_url: string | null }
const SELECT = 'id,channel,category,outcome,is_after_hours,contact_name,contact_phone,subject,summary,received_at,calls(id),jobs(external_job_number,external_url,status)'
const first = (value: unknown) => (Array.isArray(value) ? value[0] : value) as Record<string, any> | null

function build(filters: ActivityFilters, tz: string) {
  let query: any = supabase.from('enquiries').select(SELECT, { count: 'exact' })
  if (filters.tab === 'calls') query = query.eq('channel', 'call')
  if (filters.tab === 'web_forms') query = query.eq('channel', 'web_form')
  if (filters.tab === 'emails') query = query.eq('channel', 'email')
  if (filters.tab === 'emergencies') query = query.eq('category', 'urgent')
  if (filters.outcome) query = query.eq('outcome', filters.outcome)
  if (filters.from) query = query.gte('received_at', zonedDayStartUtc(filters.from, tz).toISOString())
  if (filters.to) query = query.lt('received_at', zonedDayStartUtc(addDays(filters.to, 1), tz).toISOString())
  const term = filters.q.replace(/[,()%*\\"]/g, ' ').trim()
  if (term) query = query.or(`contact_name.ilike."%${term}%",contact_phone.ilike."%${term}%",summary.ilike."%${term}%",subject.ilike."%${term}%"`)
  return query.order('received_at', { ascending: false }).order('id')
}
function toItem(row: any): ActivityItem { const job = first(row.jobs); return { id: row.id, channel: row.channel, category: row.category, outcome: row.outcome, is_after_hours: row.is_after_hours, contact_name: row.contact_name, contact_phone: row.contact_phone, subject: row.subject, summary: row.summary, received_at: row.received_at, call_id: first(row.calls)?.id ?? null, job_number: job?.external_job_number ?? null, job_status: job?.status ?? null, job_url: job?.external_url ?? null } }
export async function fetchActivity(filters: ActivityFilters, tz: string, page: number, pageSize = 25) { const { data, error, count } = await build(filters, tz).range((page - 1) * pageSize, page * pageSize - 1); if (error) throw error; return { rows: (data as any[]).map(toItem), total: count ?? 0 } }
export async function fetchAllForExport(filters: ActivityFilters, tz: string, max = 5000) { const out: ActivityItem[] = []; for (let from = 0; from < max; from += 1000) { const { data, error } = await build(filters, tz).range(from, from + 999); if (error) throw error; out.push(...(data as any[]).map(toItem)); if ((data as any[]).length < 1000) break } return out }
