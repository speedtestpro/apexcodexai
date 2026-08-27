CREATE TABLE public.api_keys (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  plan_id text not null default 'free',
  upgrade_id text,
  label text not null default 'default',
  revoked boolean not null default false,
  requests_used integer not null default 0,
  tokens_used bigint not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);
CREATE INDEX api_keys_key_idx ON public.api_keys (key);
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;