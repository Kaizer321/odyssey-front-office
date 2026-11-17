import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'

config({ path: process.env.ENV_FILE ?? '.env.scripts' })

const url = process.env.SUPABASE_URL ?? ''
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const file = process.argv[2]
const limit = Number(process.argv[3] ?? 5)
if (!file) throw new Error('Usage: npm run attach-audio -- <path-to-mp3> [count]')
const supabase = createClient(url, key)
const bytes = await readFile(file)
const { data: client, error: clientError } = await supabase.from('clients').select('id').eq('name', 'Harbour City Plumbing').single()
if (clientError) throw clientError
const { data: calls, error: callsError } = await supabase.from('calls').select('id,client_id').eq('client_id', client.id).order('started_at', { ascending: false }).limit(limit)
if (callsError) throw callsError
for (const call of calls ?? []) {
  const path = `${call.client_id}/${call.id}.mp3`
  const { error: uploadError } = await supabase.storage.from('recordings').upload(path, bytes, { contentType: 'audio/mpeg', upsert: true })
  if (uploadError) throw uploadError
  const { error: updateError } = await supabase.from('calls').update({ recording_url: path }).eq('id', call.id)
  if (updateError) throw updateError
  console.log(`Attached ${path}`)
}
