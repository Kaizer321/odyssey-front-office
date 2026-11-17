import { supabase } from '@/lib/supabase'
export type BestCatch = { job_number: string | null; title: string | null; value: number; customer: string | null; received_at: string; call_id: string | null; kind: 'after_hours' | 'overflow' }
export type ReportNotes = { changes: string[]; suggestions: string[] }
export async function fetchBestCatches(start: Date, end: Date, limit = 5) { const { data, error } = await supabase.rpc('report_best_catches', { p_start: start.toISOString(), p_end: end.toISOString(), p_limit: limit }); if (error) throw error; return data as BestCatch[] }
export async function fetchReportNotes(monthKey: string) { const { data, error } = await supabase.from('report_notes').select('changes,suggestions').eq('month', monthKey).maybeSingle(); if (error) throw error; return (data as ReportNotes) ?? null }
