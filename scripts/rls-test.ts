import { config } from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

config({ path: '.env.scripts' })
const url = process.env.SUPABASE_URL!
const anon = process.env.SUPABASE_ANON_KEY!
const PASSWORD = 'Demo1234!'
const DOMAIN = 'demo.odyssey.test'

async function as(email?: string) {
  const client = createClient(url, anon, { auth: { persistSession: false } })
  if (email) { const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD }); if (error) throw error }
  return client
}
async function count(client: SupabaseClient, table: string) { const { count, error } = await client.from(table).select('*', { count: 'exact', head: true }); return error ? -1 : count ?? 0 }
let failed = 0
function check(name: string, ok: boolean, info = '') { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${info}`); if (!ok) failed++ }

async function main() {
  const visitor = await as()
  check('Logged-out visitor sees no clients', await count(visitor, 'clients') === 0)
  check('Logged-out visitor sees no enquiries', await count(visitor, 'enquiries') === 0)
  const owner = await as(`owner.harbour@${DOMAIN}`)
  const { data: ownClient } = await owner.from('clients').select('id')
  check('Owner sees exactly 1 client', ownClient?.length === 1)
  const clientId = ownClient?.[0]?.id
  const { data: rows } = await owner.from('enquiries').select('client_id').limit(1000)
  check('Owner sees only own enquiries', !!rows?.length && rows.every((row) => row.client_id === clientId), `(${rows?.length ?? 0} rows)`)
  check('Owner cannot read usage_daily', await count(owner, 'usage_daily') === 0)
  check('Owner cannot read test_runs', await count(owner, 'test_runs') === 0)
  const { error: enquiryError } = await owner.from('enquiries').insert({ client_id: clientId, channel: 'call', category: 'spam', outcome: 'spam' })
  check('Owner cannot insert enquiries', !!enquiryError)
  const admin = await as(`admin@${DOMAIN}`)
  check('Admin sees all 4 clients', await count(admin, 'clients') === 4)
  check('Admin reads usage_daily', await count(admin, 'usage_daily') > 0)
  check('Admin reads test_runs', await count(admin, 'test_runs') > 0)
  const { data: { user } } = await owner.auth.getUser()
  const { data: otherCall } = await admin.from('calls').select('id, client_id').neq('client_id', clientId).limit(1).single()
  const { error: crossError } = await owner.from('flags').insert({ client_id: otherCall?.client_id, call_id: otherCall?.id, flagged_by: user?.id, source: 'client', reason: 'rls test' })
  check('Owner cannot flag another client call', !!crossError)
  const { data: ownCall } = await owner.from('calls').select('id').limit(1).single()
  const { data: flag, error: ownError } = await owner.from('flags').insert({ client_id: clientId, call_id: ownCall?.id, flagged_by: user?.id, source: 'client', reason: 'rls test' }).select('id').single()
  check('Owner can flag own call', !ownError)
  if (flag) await admin.from('flags').delete().eq('id', flag.id)
  console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll RLS checks passed')
  process.exit(failed ? 1 : 0)
}
main().catch((error) => { console.error(error); process.exit(1) })
