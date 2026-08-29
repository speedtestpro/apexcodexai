CREATE TABLE public.usage_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source text NOT NULL DEFAULT 'web',
  model_id text NOT NULL,
  gateway_model text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'ok',
  error_message text,
  status_code integer,
  tokens integer NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 0,
  web_search boolean NOT NULL DEFAULT false,
  deep_think boolean NOT NULL DEFAULT false,
  api_key_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT ALL ON public.usage_events TO service_role;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX usage_events_created_at_idx ON public.usage_events (created_at DESC);