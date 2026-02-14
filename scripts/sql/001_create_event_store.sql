-- Create event_store table for event-driven automations
CREATE TABLE IF NOT EXISTS event_store (
  id uuid PRIMARY KEY,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz NULL,
  attempts integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_event_store_status ON event_store(status);
CREATE INDEX IF NOT EXISTS idx_event_store_created_at ON event_store(created_at);
