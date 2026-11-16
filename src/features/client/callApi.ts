import { supabase } from '@/lib/supabase'

export type TranscriptLine = { role?: string; speaker?: string; text?: string; content?: string; timestamp?: number; start?: number }
export type CallEvent = { event_type: string; detail: string | null; occurred_at: string }
export type CallJob = { external_job_number: string | null; external_url: string | null; status: string; scheduled_at: string | null; technician: string | null; value: number | null; title: string | null }
export type CallDetail = { id: string; client_id: string; started_at: string; duration_seconds: number; from_number: string | null; handling: string; transcript: TranscriptLine[]; recording_url: string | null; enquiry: { id: string; category: string; outcome: string; is_after_hours: boolean; contact_name: string | null; contact_phone: string | null; contact_address: string | null; summary: string | null; subject: string | null; job: CallJob | null } | null; events: CallEvent[] }
export type FlagRow = { id: string; reason: string | null; status: string; created_at: string }

const SELECT = 'id,client_id,started_at,duration_seconds,from_number,handling,transcript,recording_url,enquiries(id,category,outcome,is_after_hours,contact_name,contact_phone,contact_address,summary,subject,jobs(external_job_number,external_url,status,scheduled_at,technician,value,title)),post_call_events(event_type,detail,occurred_at)'
const first = (value: unknown) => (Array.isArray(value) ? value[0] : value) as Record<string, any> | null

export async function fetchCall(callId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(callId)) return null
  const { data, error } = await supabase.from('calls').select(SELECT).eq('id', callId).maybeSingle()
  if (error) throw error
  if (!data) return null
  const enquiry = first((data as any).enquiries)
  return { ...(data as any), transcript: Array.isArray((data as any).transcript) ? (data as any).transcript : [], enquiry: enquiry ? { ...enquiry, job: first(enquiry.jobs) } : null, events: ((data as any).post_call_events ?? []).sort((a: CallEvent, b: CallEvent) => a.occurred_at.localeCompare(b.occurred_at)) } as CallDetail
}

export async function fetchSignedUrl(path: string) { const { data, error } = await supabase.storage.from('recordings').createSignedUrl(path, 3600); if (error) throw error; return data.signedUrl }
export async function fetchPriorCount(phone: string | null, enquiryId: string) { if (!phone) return 0; const { count, error } = await supabase.from('enquiries').select('id', { count: 'exact', head: true }).eq('contact_phone', phone).neq('id', enquiryId); if (error) throw error; return count ?? 0 }
export async function fetchLatestFlag(callId: string) { const { data, error } = await supabase.from('flags').select('id,reason,status,created_at').eq('call_id', callId).order('created_at', { ascending: false }).limit(1).maybeSingle(); if (error) throw error; return data as FlagRow | null }
export async function createFlag(input: { clientId: string; callId: string; userId: string; reason: string }) { const { error } = await supabase.from('flags').insert({ client_id: input.clientId, call_id: input.callId, flagged_by: input.userId, reason: input.reason, source: 'client' }); if (error) throw error }
