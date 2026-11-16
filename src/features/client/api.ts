import { supabase } from '@/lib/supabase'

export type OverviewStats = { calls_total: number; calls_answered: number; enquiries: number; jobs_booked: number; after_hours_calls: number; emergencies: number; emergencies_ok: number; avg_time_to_log_seconds: number | null; recovered_jobs: number; avg_job_value: number | null; value_recovered: number; by_day: { day: string; business: number; after_hours: number }[]; by_channel: { channel: string; count: number }[]; outcomes: { outcome: string; count: number }[] }
export type Targets = { answer_rate?: number; time_to_log_seconds?: number; emergency_transfer_rate?: number }
export type ActivityRow = { id: string; channel: string; category: string; outcome: string; summary: string | null; contact_name: string | null; received_at: string; is_after_hours: boolean; call_id: string | null }
export type EmergencyRow = { id: string; trigger_phrase: string | null; transferred_to: string | null; transfer_succeeded: boolean; created_at: string; contact_name: string | null; contact_address: string | null; call_id: string | null }
const first = (value: unknown) => (Array.isArray(value) ? value[0] : value) as Record<string, any> | null

export async function fetchOverview(start: Date, end: Date) { const { data, error } = await supabase.rpc('overview_stats', { p_start: start.toISOString(), p_end: end.toISOString() }); if (error) throw error; return data as OverviewStats }
export async function fetchTargets() { const { data, error } = await supabase.from('clients').select('service_targets').single(); if (error) throw error; return (data?.service_targets ?? {}) as Targets }
export async function fetchRecentActivity(start: Date, end: Date, limit = 8) {
  const { data, error } = await supabase.from('enquiries').select('id,channel,category,outcome,summary,contact_name,received_at,is_after_hours,calls(id)').gte('received_at', start.toISOString()).lt('received_at', end.toISOString()).order('received_at', { ascending: false }).limit(limit)
  if (error) throw error
  return (data as any[]).map((row) => ({ ...row, call_id: first(row.calls)?.id ?? null })) as ActivityRow[]
}
export async function fetchEmergencies(start: Date, end: Date, limit = 5) {
  const { data, error } = await supabase.from('emergencies').select('id,trigger_phrase,transferred_to,transfer_succeeded,created_at,enquiries(contact_name,contact_address,calls(id))').gte('created_at', start.toISOString()).lt('created_at', end.toISOString()).order('created_at', { ascending: false }).limit(limit)
  if (error) throw error
  return (data as any[]).map((row) => { const enquiry = first(row.enquiries); return { id: row.id, trigger_phrase: row.trigger_phrase, transferred_to: row.transferred_to, transfer_succeeded: row.transfer_succeeded, created_at: row.created_at, contact_name: enquiry?.contact_name ?? null, contact_address: enquiry?.contact_address ?? null, call_id: first(enquiry?.calls)?.id ?? null } }) as EmergencyRow[]
}
