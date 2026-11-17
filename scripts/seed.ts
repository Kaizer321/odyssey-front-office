import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

config({ path: process.env.ENV_FILE ?? '.env.scripts' })
const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the env file')
if (!/127\.0\.0\.1|localhost/.test(url) && process.env.CONFIRM_REMOTE !== 'yes') throw new Error(`Refusing to wipe and reseed the remote database ${url}. Use npm run seed:hosted.`)
console.log(`Target database: ${url}`)
const db = createClient(url, key, { auth: { persistSession: false } })

const DOMAIN = 'demo.odyssey.test'
const PASSWORD = 'Demo1234!'
const now = new Date()
const DAY = 86_400_000

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = rng(42)
const pick = <T>(values: T[]) => values[Math.floor(rand() * values.length)]
const int = (min: number, max: number) => Math.floor(min + rand() * (max - min + 1))
const weighted = (values: Record<string, number>) => {
  let n = rand() * Object.values(values).reduce((a, b) => a + b, 0)
  for (const [key, weight] of Object.entries(values)) if ((n -= weight) <= 0) return key
  return Object.keys(values)[0]
}

const firstNames = ['Sarah', 'James', 'Michael', 'Emma', 'Daniel', 'Olivia', 'Liam', 'Chloe', 'Ben', 'Mia', 'Jack', 'Grace', 'Tom', 'Zoe', 'Priya', 'Wei', 'Ahmed', 'Sofia']
const lastNames = ['Nguyen', 'Smith', 'Patel', 'Brown', 'Wilson', 'Taylor', 'Kelly', 'Martin', 'Chen', 'Anderson', 'Walker', 'Singh', 'Murphy', 'Clarke', 'Khan']
const suburbs = ['Parramatta', 'Bondi', 'Chatswood', 'Penrith', 'Manly', 'Newtown', 'Hornsby', 'Cronulla', 'Randwick', 'Ryde']
const streets = ['George St', 'Park Rd', 'High St', 'Victoria Ave', 'Church St', 'Station St', 'Elm Ct', 'Beach Rd']
const phases = ['Payment', 'Intake form', 'Agent configured', 'Integration connected', 'Test script', 'Go-live & handover']
const specs = [
  { slug: 'harbour', name: 'Harbour City Plumbing', trade: 'Plumbing', owner: 'Mark Reilly', manager: 'Julie Tran', scale: 1, avg: 420, fee: 499, status: 'active', techs: ['Dave Kowalski', 'Matt Reilly', 'Sam Torres'], urgent: ['gas leak', 'burst pipe', 'sewage backup'], quote: ['Bathroom renovation plumbing', 'Hot water system replacement'], booking: ['Blocked drain', 'Leaking tap', 'Hot water not working'], question: ['Do you service my suburb?', 'What are your call-out fees?'] },
  { slug: 'brightspark', name: 'Bright Spark Electrical', trade: 'Electrical', owner: 'Anna Lopez', manager: 'Kevin Wu', scale: .7, avg: 360, fee: 399, status: 'active', techs: ['Jordan Ellis', 'Raj Mehta'], urgent: ['sparking switchboard', 'burning smell from a powerpoint'], quote: ['Switchboard upgrade', 'EV charger install'], booking: ['Faulty powerpoint', 'Smoke alarm install'], question: ['Are you licensed for solar work?', 'Do you quote free?'] },
  { slug: 'coolflow', name: 'CoolFlow Air Conditioning', trade: 'HVAC', owner: 'Peter Hall', manager: 'Dana Cruz', scale: .5, avg: 540, fee: 349, status: 'error', techs: ['Luke Barrett', 'Omar Haddad'], urgent: ['no cooling during a heatwave', 'refrigerant leak'], quote: ['Ducted system install', 'Split system supply and install'], booking: ['Annual service', 'Split system not cooling'], question: ['Do you service all brands?', 'Do you offer finance?'] },
  { slug: 'summit', name: 'Summit Roofing', trade: 'Roofing', owner: 'Chris Doyle', manager: 'Amy Zhou', scale: 0, avg: 650, fee: 449, status: 'onboarding', techs: [], urgent: [], quote: [], booking: [], question: [] },
] as const

async function insert(table: string, rows: unknown[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db.from(table).insert(rows.slice(i, i + 500))
    if (error) throw new Error(`${table}: ${error.message}`)
  }
  console.log(`  ${table}: ${rows.length}`)
}

async function createUser(email: string, name: string) {
  const { data, error } = await db.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: name } })
  if (error) throw error
  return data.user.id
}

async function reset() {
  const { error } = await db.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) throw error
  const { data, error: listError } = await db.auth.admin.listUsers({ perPage: 1000 })
  if (listError) throw listError
  for (const user of data.users) if (user.email?.endsWith(`@${DOMAIN}`)) await db.auth.admin.deleteUser(user.id)
}

function transcript(business: string, name: string, issue: string, category: string) {
  return [
    { speaker: 'agent', text: `Hi, you've reached ${business}. I'm an AI assistant and this call is recorded. How can I help?`, t: 8 },
    { speaker: 'caller', text: `Hi, I'm ${name}. I need help with ${issue.toLowerCase()}.`, t: 19 },
    { speaker: 'agent', text: category === 'urgent' ? 'That sounds urgent. I will connect you to our on-call technician.' : 'I can help with that. Can I confirm your address?', t: 31 },
    { speaker: 'caller', text: `${int(1, 220)} ${pick(streets)}, ${pick(suburbs)} NSW.`, t: 43 },
    { speaker: 'agent', text: category === 'booking' ? 'You are booked in and I will send a confirmation SMS.' : 'Thanks, I have captured those details for the team.', t: 58 },
  ]
}

async function main() {
  console.log('Resetting demo data...')
  await reset()
  const clients: Record<string, unknown>[] = []
  const profiles: Record<string, unknown>[] = []
  const phasesRows: Record<string, unknown>[] = []
  const customers: Record<string, unknown>[] = []
  const enquiries: Record<string, unknown>[] = []
  const calls: Record<string, unknown>[] = []
  const jobs: Record<string, unknown>[] = []
  const emergencies: Record<string, unknown>[] = []
  const events: Record<string, unknown>[] = []
  const usage: Record<string, unknown>[] = []
  const tests: Record<string, unknown>[] = []
  const errors: Record<string, unknown>[] = []
  const flaggable: { client_id: string; call_id: string; owner: string }[] = []
  const reportNotes: any[] = []

  const adminId = await createUser(`admin@${DOMAIN}`, 'Odyssey Admin')
  profiles.push({ id: adminId, client_id: null, role: 'admin', full_name: 'Odyssey Admin', email: `admin@${DOMAIN}` })

  for (const spec of specs) {
    const clientId = randomUUID()
    clients.push({ id: clientId, name: spec.name, trade: spec.trade, timezone: 'Australia/Sydney', job_system: 'servicem8', avg_job_value: spec.avg, monthly_fee: spec.fee, agent_status: spec.status, business_hours: { weekdays: ['07:00', '17:00'] }, service_targets: { answer_rate: .98, time_to_log_seconds: 60 } })
    const ownerId = await createUser(`owner.${spec.slug}@${DOMAIN}`, spec.owner)
    const managerId = await createUser(`office.${spec.slug}@${DOMAIN}`, spec.manager)
    profiles.push({ id: ownerId, client_id: clientId, role: 'owner', full_name: spec.owner, email: `owner.${spec.slug}@${DOMAIN}` }, { id: managerId, client_id: clientId, role: 'office_manager', full_name: spec.manager, email: `office.${spec.slug}@${DOMAIN}` })
    phases.forEach((name, i) => { const done = spec.status !== 'onboarding' || i < 3; phasesRows.push({ client_id: clientId, phase: i + 1, name, status: done ? 'done' : i === 3 ? 'in_progress' : 'pending', completed_at: done ? new Date(now.getTime() - (90 - i * 4) * DAY).toISOString() : null }) })
    if (!spec.scale) continue

    const customerPool: { id: string; name: string; phone: string; address: string }[] = []
    const usageByDay = new Map<string, { minutes: number; sms: number }>()
    for (let day = 139; day >= 0; day--) {
      const date = new Date(now.getTime() - day * DAY)
      const count = Math.round(18 * spec.scale * (.8 + rand() * .5))
      for (let i = 0; i < count; i++) {
        const received = new Date(date.getTime() + int(7, 21) * 3_600_000 + int(0, 59) * 60_000)
        if (received > now) continue
        const channel = weighted({ call: 70, web_form: 18, email: 12 })
        const afterHours = received.getHours() >= 17 || received.getHours() < 7
        const category = weighted(afterHours ? { quote: 25, booking: 20, question: 15, urgent: 25, spam: 15 } : { quote: 30, booking: 28, question: 22, urgent: 8, spam: 12 })
        const isSpam = category === 'spam'
        let customer = isSpam ? null : (customerPool.length > 10 && rand() < .3 ? pick(customerPool) : null)
        if (!customer && !isSpam) { customer = { id: randomUUID(), name: `${pick(firstNames)} ${pick(lastNames)}`, phone: `04${int(10, 99)} ${int(100, 999)} ${int(100, 999)}`, address: `${int(1, 220)} ${pick(streets)}, ${pick(suburbs)} NSW` }; customerPool.push(customer); customers.push({ ...customer, client_id: clientId, created_at: received.toISOString() }) }
        const issue = category === 'urgent' ? pick(spec.urgent) : category === 'quote' ? pick(spec.quote) : category === 'booking' ? pick(spec.booking) : category === 'question' ? pick(spec.question) : 'a business energy plan'
        const outcome = ({ urgent: 'transferred', quote: 'quote_captured', booking: 'booked', question: 'info_provided', spam: 'spam' } as Record<string, string>)[category]
        const enquiryId = randomUUID()
        const logged = new Date(received.getTime() + int(5, 240) * 1000)
        enquiries.push({ id: enquiryId, client_id: clientId, customer_id: customer?.id ?? null, channel, category, outcome, is_after_hours: afterHours, contact_name: customer?.name ?? null, contact_phone: customer?.phone ?? `04${int(10, 99)} ${int(100, 999)} ${int(100, 999)}`, contact_address: customer?.address ?? null, subject: issue, details: isSpam ? null : `${issue} at ${customer?.address ?? 'the customer address'}.`, summary: isSpam ? 'Sales/spam contact.' : `${customer?.name} requested help with ${issue}.`, received_at: received.toISOString(), logged_at: logged.toISOString() })
        let jobId: string | null = null
        if (!isSpam && (category === 'booking' || (category === 'quote' && rand() < .35))) { jobId = randomUUID(); const scheduled = new Date(received.getTime() + int(1, 10) * DAY); jobs.push({ id: jobId, client_id: clientId, enquiry_id: enquiryId, customer_id: customer!.id, external_job_number: String(int(10000, 99999)), title: issue, status: category === 'quote' ? 'quote' : scheduled < now ? (rand() < .9 ? 'completed' : 'cancelled') : 'booked', scheduled_at: category === 'quote' ? null : scheduled.toISOString(), technician: category === 'quote' ? null : pick(spec.techs), value: Math.round(spec.avg * (.6 + rand() * 1.6)), created_at: logged.toISOString() }) }
        if (channel !== 'call') continue
        const callId = randomUUID(); const duration = int(45, 300); const transferOk = category !== 'urgent' || rand() < .92
        calls.push({ id: callId, client_id: clientId, enquiry_id: enquiryId, retell_call_id: `call_${randomUUID().slice(0, 12)}`, from_number: customer?.phone ?? '0400 000 000', started_at: received.toISOString(), duration_seconds: duration, answered: true, handling: afterHours ? 'after_hours' : rand() < .2 ? 'overflow' : 'answer_first', transcript: transcript(spec.name, customer?.name ?? 'Caller', issue, category), recording_url: null })
        flaggable.push({ client_id: clientId, call_id: callId, owner: ownerId })
        events.push({ client_id: clientId, call_id: callId, event_type: jobId ? 'job_created' : 'summary_emailed', detail: jobId ? 'ServiceM8 job created' : 'Summary emailed to the office', occurred_at: new Date(logged.getTime() + 5000).toISOString() })
        if (category === 'urgent') emergencies.push({ client_id: clientId, enquiry_id: enquiryId, trigger_phrase: issue, transferred_to: pick(spec.techs), transfer_succeeded: transferOk, owner_sms_sent: !transferOk, created_at: received.toISOString() })
        const dayKey = received.toISOString().slice(0, 10); const u = usageByDay.get(dayKey) ?? { minutes: 0, sms: 0 }; u.minutes += duration / 60; u.sms += category === 'question' ? 0 : 1; usageByDay.set(dayKey, u)
      }
    }
    const changes = [`Added "${spec.urgent[0] ?? 'emergency'}" wording to the emergency trigger phrases`, 'Updated the call-out fee answer so the agent quotes it consistently', 'Shortened the after-hours greeting so callers reach the address step faster', 'Added two new service-area suburbs to the agent knowledge base']
    const suggestions = ['Turn on ServiceM8 booking reminders to reduce no-shows', 'Add a Saturday-morning overflow window for busy periods', 'Enable review requests after completed jobs', 'Review quote follow-ups: quote requests are the biggest unconverted group']
    for (let back = 1; back <= 3; back++) reportNotes.push({ client_id: clientId, month: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1)).toISOString().slice(0, 10), changes: [0, 1, 2].map((k) => changes[(back + k) % changes.length]), suggestions: [0, 1, 2].map((k) => suggestions[(back + k) % suggestions.length]) })
    for (const [day, u] of usageByDay) usage.push({ client_id: clientId, day, retell_minutes: +u.minutes.toFixed(2), sms_count: u.sms, cost: +(u.minutes * .14 + u.sms * .04).toFixed(2) })
    for (let i = 29; i >= 0; i--) tests.push({ client_id: clientId, ran_at: new Date(now.getTime() - i * DAY).toISOString(), passed: spec.status !== 'error' || i > 1, details: spec.status === 'error' && i <= 1 ? 'Booking step timed out: ServiceM8 did not respond' : 'All 5 call flows passed' })
    if (spec.status === 'error') for (let i = 0; i < 3; i++) errors.push({ client_id: clientId, source: 'ServiceM8', message: 'API timeout while checking staff availability', occurred_at: new Date(now.getTime() - i * 5 * 3_600_000).toISOString(), resolved: false })
  }

  const reasons = ['Agent misheard the address', 'Wrong call-out fee quoted', 'Caller wanted a human', 'Great call, use as an example']
  const flags = flaggable.slice(0, 10).map((f, i) => ({ client_id: f.client_id, call_id: f.call_id, flagged_by: i < 6 ? f.owner : null, source: i < 6 ? 'client' : 'random_sample', reason: i < 6 ? pick(reasons) : null, status: i < 7 ? 'open' : 'reviewed', admin_notes: i < 7 ? null : 'Reviewed in demo seed.', created_at: new Date(now.getTime() - int(1, 20) * DAY).toISOString(), reviewed_at: i < 7 ? null : now.toISOString() }))
  console.log('Inserting...')
  await insert('clients', clients); await insert('report_notes', reportNotes); await insert('profiles', profiles); await insert('onboarding_phases', phasesRows); await insert('customers', customers); await insert('enquiries', enquiries); await insert('calls', calls); await insert('jobs', jobs); await insert('emergencies', emergencies); await insert('post_call_events', events); await insert('flags', flags); await insert('usage_daily', usage); await insert('test_runs', tests); await insert('integration_errors', errors)
  console.log(`\nDone. Demo password: ${PASSWORD}`)
  console.log(`Admin: admin@${DOMAIN}`)
  console.log(`Client owner: owner.harbour@${DOMAIN}`)
}

main().catch((error) => { console.error(error); process.exit(1) })
