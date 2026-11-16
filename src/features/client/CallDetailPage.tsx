import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BellRing, Briefcase, CalendarClock, Flag, Mail, MessageSquare, PhoneForwarded } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/AuthProvider'
import { fetchCall, fetchLatestFlag, fetchPriorCount, fetchSignedUrl, createFlag } from './callApi'
import { formatTime, formatWhen, label, mmss } from '@/lib/format'

const eventMeta: Record<string, { icon: typeof Briefcase; label: string }> = { job_created: { icon: Briefcase, label: 'Job created' }, sms_sent: { icon: MessageSquare, label: 'SMS sent' }, summary_emailed: { icon: Mail, label: 'Summary emailed' }, reminder_scheduled: { icon: CalendarClock, label: 'Reminder scheduled' }, transfer: { icon: PhoneForwarded, label: 'Call transfer' }, owner_alert: { icon: BellRing, label: 'Owner alerted' } }

export default function CallDetailPage() {
  const { callId } = useParams()
  const navigate = useNavigate()
  const { client, profile } = useAuth()
  const [flagOpen, setFlagOpen] = useState(false)
  const [reason, setReason] = useState('')
  const queryClient = useQueryClient()
  const callQuery = useQuery({ queryKey: ['call', callId], queryFn: () => fetchCall(callId ?? ''), enabled: !!callId })
  const call = callQuery.data
  const enquiryId = call?.enquiry?.id
  const priorQuery = useQuery({ queryKey: ['prior-count', call?.enquiry?.contact_phone, enquiryId], queryFn: () => fetchPriorCount(call!.enquiry!.contact_phone, enquiryId!), enabled: !!enquiryId })
  const flagQuery = useQuery({ queryKey: ['flag', callId], queryFn: () => fetchLatestFlag(callId!), enabled: !!callId })
  const recordingQuery = useQuery({ queryKey: ['recording', call?.recording_url], queryFn: () => fetchSignedUrl(call!.recording_url!), enabled: !!call?.recording_url })
  const flagMutation = useMutation({ mutationFn: () => createFlag({ clientId: client!.id, callId: callId!, userId: profile!.id, reason: reason.trim() }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['flag', callId] }); setFlagOpen(false); setReason('') } })

  if (callQuery.isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading call…</div>
  if (callQuery.isError || !call || !call.enquiry) return <div className="space-y-4 p-6"><Button variant="ghost" onClick={() => navigate('/app/activity')}><ArrowLeft /> Back to activity</Button><Card><CardContent className="p-8 text-center"><h1 className="text-lg font-semibold">Call not found</h1><p className="mt-2 text-sm text-muted-foreground">This call may not exist or may belong to another client.</p></CardContent></Card></div>

  const e = call.enquiry
  const transcript = call.transcript
  const goBack = () => window.history.length > 1 ? navigate(-1) : navigate('/app/activity')
  return <div className="space-y-5 p-6">
    <div className="flex items-center justify-between gap-3"><Button variant="ghost" onClick={goBack}><ArrowLeft /> Back to activity</Button><Button variant={flagQuery.data ? 'secondary' : 'outline'} onClick={() => setFlagOpen(true)}><Flag /> {flagQuery.data ? 'Flagged' : 'Flag call'}</Button></div>
    <Card><CardContent className="space-y-4 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm text-muted-foreground">{formatWhen(call.started_at, client?.timezone ?? 'Australia/Sydney')} · {mmss(call.duration_seconds)}</p><h1 className="mt-1 text-2xl font-semibold">{e.contact_name || 'Unknown caller'}</h1><p className="mt-1 text-sm text-muted-foreground">{call.from_number || e.contact_phone || 'No phone number'}</p></div><div className="flex gap-2"><span className="rounded-full bg-muted px-3 py-1 text-xs">{label(e.category)}</span><span className="rounded-full bg-muted px-3 py-1 text-xs">{label(e.outcome)}</span>{e.is_after_hours && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-900">After hours</span>}</div></div><div className="rounded-lg bg-muted/50 p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">AI summary</p><p className="mt-2 text-sm leading-6">{e.summary || 'No summary available.'}</p></div></CardContent></Card>
    <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-5"><Card><CardHeader><CardTitle>Recording</CardTitle></CardHeader><CardContent>{!call.recording_url ? <p className="text-sm text-muted-foreground">No recording available.</p> : recordingQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading secure recording…</p> : recordingQuery.isError ? <p className="text-sm text-destructive">Unable to load recording.</p> : <audio className="w-full" controls src={recordingQuery.data} />}</CardContent></Card><Card><CardHeader><CardTitle>Transcript</CardTitle></CardHeader><CardContent className="space-y-3">{transcript.length ? transcript.map((line, i) => <div key={i} className={`max-w-[90%] rounded-xl p-3 text-sm ${line.role === 'user' || line.speaker === 'caller' ? 'bg-muted' : 'ml-auto bg-primary/10'}`}><div className="mb-1 text-xs font-medium text-muted-foreground">{label(line.role || line.speaker || 'assistant')}{typeof (line.timestamp ?? line.start) === 'number' && ` · ${mmss(line.timestamp ?? line.start ?? 0)}`}</div>{line.text || line.content || '—'}</div>) : <p className="text-sm text-muted-foreground">No transcript available.</p>}</CardContent></Card></div>
      <div className="space-y-5"><Card><CardHeader><CardTitle>Caller</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p className="font-medium">{e.contact_name || 'Unknown caller'}</p><p>{e.contact_phone || 'No phone number'}</p>{e.contact_address && <p>{e.contact_address}</p>}<p className="pt-2 text-muted-foreground">{priorQuery.isLoading ? 'Checking caller history…' : `${priorQuery.data ?? 0} previous enquiries`}</p></CardContent></Card>{e.job && <Card><CardHeader><CardTitle>Job</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p className="font-medium">{e.job.title || e.job.external_job_number || 'Booked job'}</p><p>{label(e.job.status)}{e.job.technician ? ` · ${e.job.technician}` : ''}</p>{e.job.scheduled_at && <p>{formatWhen(e.job.scheduled_at, client?.timezone ?? 'Australia/Sydney')}</p>}{e.job.external_url && <a className="text-primary underline" href={e.job.external_url} target="_blank" rel="noreferrer">Open in job system</a>}</CardContent></Card>}<Card><CardHeader><CardTitle>What happened after the call</CardTitle></CardHeader><CardContent>{call.events.length ? <div className="space-y-4">{call.events.map((event, i) => { const meta = eventMeta[event.event_type] ?? { icon: MessageSquare, label: label(event.event_type) }; const Icon = meta.icon; return <div className="flex gap-3" key={`${event.occurred_at}-${i}`}><Icon className="mt-0.5 size-4 text-primary" /><div><p className="text-sm font-medium">{meta.label}</p><p className="text-xs text-muted-foreground">{formatTime(event.occurred_at, client?.timezone ?? 'Australia/Sydney')}{event.detail ? ` · ${event.detail}` : ''}</p></div></div>})}</div> : <p className="text-sm text-muted-foreground">No follow-up events recorded.</p>}</CardContent></Card></div>
    </div>
    <Dialog open={flagOpen} onOpenChange={setFlagOpen}><DialogContent><DialogHeader><DialogTitle>Flag this call</DialogTitle><DialogDescription>Tell the Odyssey team what should be reviewed.</DialogDescription></DialogHeader><Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="What should we review?" /><DialogFooter><Button variant="outline" onClick={() => setFlagOpen(false)}>Cancel</Button><Button disabled={!reason.trim() || flagMutation.isPending} onClick={() => flagMutation.mutate()}>{flagMutation.isPending ? 'Saving…' : 'Submit flag'}</Button></DialogFooter></DialogContent></Dialog>
  </div>
}
