CREATE TABLE public.upgrade_requests (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  plan_label TEXT NOT NULL,
  price TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '',
  method TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  user_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  message_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.upgrade_requests TO service_role;
ALTER TABLE public.upgrade_requests ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (server-side) accesses this table.