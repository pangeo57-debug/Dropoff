import { makeEntry, type InboxEntry } from './inbox'
import { parseMessage } from './message'

/** Per-device connection to a tiny Supabase "mailbox" that the iPhone Shortcut posts payments to. */
export interface CloudCfg {
  url: string // https://xxxx.supabase.co
  key: string // publishable (sb_publishable_) or legacy anon key
  token: string // secret that identifies this user's mailbox (and synced data)
  sync?: boolean // keep all app data in sync through the same Supabase project
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
    return { url: c.url ?? '', key: c.key ?? '', token: c.token || genToken(), sync: !!c.sync }
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

export async function rpc<T>(c: CloudCfg, fn: string, body: unknown): Promise<T> {
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
grant execute on function public.ack_payments(text, bigint[]) to anon, authenticated;

-- ===== full data sync between devices (optional) =====
create table if not exists public.app_state (
  token text primary key,
  data jsonb not null,
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.app_state enable row level security;

create or replace function public.pull_state(p_token text)
returns table(out_data jsonb, out_version bigint)
language sql security definer set search_path = '' as $$
  select s.data, s.version from public.app_state s
  where s.token = p_token and length(p_token) between 24 and 256;
$$;

create or replace function public.push_state(p_token text, p_data jsonb, p_base bigint)
returns table(out_ok boolean, out_version bigint, out_data jsonb)
language plpgsql security definer set search_path = '' as $$
declare cur public.app_state%rowtype;
begin
  if length(p_token) not between 24 and 256 or pg_column_size(p_data) > 8000000 then
    return query select false, 0::bigint, null::jsonb;
    return;
  end if;
  select * into cur from public.app_state where token = p_token for update;
  if not found then
    insert into public.app_state(token, data, version) values (p_token, p_data, 1);
    return query select true, 1::bigint, p_data;
    return;
  end if;
  if cur.version <> p_base then
    return query select false, cur.version, cur.data;
    return;
  end if;
  update public.app_state set data = p_data, version = cur.version + 1, updated_at = now() where token = p_token;
  return query select true, cur.version + 1, p_data;
end;
$$;

revoke all on function public.pull_state(text) from public;
revoke all on function public.push_state(text, jsonb, bigint) from public;
grant execute on function public.pull_state(text) to anon, authenticated;
grant execute on function public.push_state(text, jsonb, bigint) to anon, authenticated;`