import { makeEntry, type InboxEntry } from './inbox'

/** Per-device connection to a tiny Supabase "mailbox" that the iPhone Shortcut posts payments to. */
export interface CloudCfg {
  url: string // https://xxxx.supabase.co
  key: string // publishable (sb_publishable_) or legacy anon key
  token: string // secret that identifies this user's mailbox
}

const KEY = 'cashflow:cloud'
// Public client configuration for the Cash Flow mailbox. The publishable key is
// intentionally shipped to browsers and is not secret; each installation's
// high-entropy mailbox token is what separates users' inboxes.
export const SUPABASE_URL = 'https://idoxobvrpwbpfsddkxay.supabase.co'
export const SUPABASE_KEY = 'sb_publishable_U-GY_owMfF8-ub0LqxaXbg_lrZhLIX8'

export const genToken = () => {
  const b = new Uint8Array(24)
  crypto.getRandomValues(b)
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
}

export function loadCfg(): CloudCfg {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<CloudCfg>
    const cfg = { url: SUPABASE_URL, key: SUPABASE_KEY, token: c.token || genToken() }
    if (!c.token) saveCfg(cfg)
    return cfg
  } catch {
    return { url: SUPABASE_URL, key: SUPABASE_KEY, token: genToken() }
  }
}

export function saveCfg(c: CloudCfg) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ token: c.token }))
  } catch {
    /* ignore */
  }
}

export const isConfigured = (c: CloudCfg) => c.token.trim().length >= 24

async function rpc<T>(c: CloudCfg, fn: string, body: unknown): Promise<T> {
  const key = c.key.trim()
  // New publishable keys are not JWTs, so Supabase requires them only in apikey.
  // Legacy anon keys are JWTs and can also be sent as the Authorization bearer.
  const headers: Record<string, string> = { apikey: key, 'Content-Type': 'application/json' }
  if (!key.startsWith('sb_publishable_')) headers.Authorization = `Bearer ${key}`
  const res = await fetch(`${c.url.trim().replace(/\/+$/, '')}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${res.status}`)
  return (res.status === 204 ? undefined : await res.json().catch(() => undefined)) as T
}

interface Row { id: number; paid_at: string; amount: string; merchant: string }

export async function pullPayments(c: CloudCfg): Promise<{ entries: InboxEntry[]; ids: number[]; invalid: number }> {
  const rows = (await rpc<Row[]>(c, 'pull_payments', { p_token: c.token })) ?? []
  const entries: InboxEntry[] = []
  let invalid = 0
  for (const r of rows) {
    const e = makeEntry(`sb:${r.id}`, r.paid_at, r.amount, r.merchant)
    if (e) entries.push(e)
    else invalid++
  }
  return { entries, ids: rows.map((r) => r.id), invalid }
}

export const ackPayments = (c: CloudCfg, ids: number[]) => (ids.length ? rpc<void>(c, 'ack_payments', { p_token: c.token, p_ids: ids }) : Promise.resolve())

export const SETUP_SQL = `create table if not exists payments_inbox (
  id bigint generated always as identity primary key,
  token text not null,
  paid_at text not null,
  amount text not null,
  merchant text not null default '',
  created_at timestamptz not null default now()
);
-- no policies: the table cannot be read or written directly, only through the functions below
alter table payments_inbox enable row level security;

create or replace function public.add_payment(p_token text, p_date text, p_amount text, p_merchant text)
returns void language sql security definer set search_path = '' as $$
  insert into public.payments_inbox(token, paid_at, amount, merchant)
  select p_token, p_date, p_amount, left(coalesce(p_merchant, ''), 300)
  where length(p_token) between 24 and 256 and length(p_date) <= 64 and length(p_amount) <= 32;
$$;

create or replace function public.pull_payments(p_token text)
returns table(id bigint, paid_at text, amount text, merchant text)
language sql security definer set search_path = '' as $$
  select p.id, p.paid_at, p.amount, p.merchant from public.payments_inbox p
  where p.token = p_token and length(p_token) between 24 and 256 order by p.id;
$$;

create or replace function public.ack_payments(p_token text, p_ids bigint[])
returns void language sql security definer set search_path = '' as $$
  delete from public.payments_inbox where token = p_token and id = any(p_ids) and length(p_token) between 24 and 256;
$$;

revoke all on function public.add_payment(text, text, text, text) from public;
revoke all on function public.pull_payments(text) from public;
revoke all on function public.ack_payments(text, bigint[]) from public;
grant execute on function public.add_payment(text, text, text, text) to anon, authenticated;
grant execute on function public.pull_payments(text) to anon, authenticated;
grant execute on function public.ack_payments(text, bigint[]) to anon, authenticated;`
