import { makeEntry, type InboxEntry } from './inbox'
import { parseMessage } from './message'

/** Per-device connection to a tiny Supabase "mailbox" that the iPhone Shortcut posts payments to. */
export interface CloudCfg {
  url: string // https://xxxx.supabase.co
  key: string // anon (public) key
  token: string // secret that identifies this user's mailbox
}

const KEY = 'cashflow:cloud'

export const genToken = () => {
  const b = new Uint8Array(24)
  crypto.getRandomValues(b)
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
}

export function loadCfg(): CloudCfg {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<CloudCfg>
    return { url: c.url ?? '', key: c.key ?? '', token: c.token || genToken() }
  } catch {
    return { url: '', key: '', token: genToken() }
  }
}

export function saveCfg(c: CloudCfg) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c))
  } catch {
    /* ignore */
  }
}

export const isConfigured = (c: CloudCfg) => /^https:\/\/[^/\s]+$/.test(c.url.trim().replace(/\/+$/, '')) && c.key.trim().length > 20

async function rpc<T>(c: CloudCfg, fn: string, body: unknown): Promise<T> {
  const res = await fetch(`${c.url.trim().replace(/\/+$/, '')}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: c.key.trim(), Authorization: `Bearer ${c.key.trim()}`, 'Content-Type': 'application/json' },
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
    // rows from the share-sheet shortcut carry the raw message text in `merchant` and no amount
    const e = makeEntry(`sb:${r.id}`, r.paid_at, r.amount, r.merchant) ?? parseMessage(`sb:${r.id}`, r.paid_at, r.merchant)
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

create or replace function add_payment(p_token text, p_date text, p_amount text, p_merchant text)
returns void language sql security definer set search_path = public as $$
  insert into payments_inbox(token, paid_at, amount, merchant)
  select p_token, p_date, p_amount, coalesce(p_merchant, '') where length(p_token) >= 24;
$$;

create or replace function pull_payments(p_token text)
returns table(id bigint, paid_at text, amount text, merchant text)
language sql security definer set search_path = public as $$
  select id, paid_at, amount, merchant from payments_inbox
  where token = p_token and length(p_token) >= 24 order by id;
$$;

create or replace function ack_payments(p_token text, p_ids bigint[])
returns void language sql security definer set search_path = public as $$
  delete from payments_inbox where token = p_token and id = any(p_ids);
$$;`
