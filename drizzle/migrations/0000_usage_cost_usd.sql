ALTER TABLE public.usage_events ADD COLUMN IF NOT EXISTS cost_usd numeric NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS usage_events_key_time_idx ON public.usage_events (api_key_id, created_at);