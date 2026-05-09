CREATE TABLE IF NOT EXISTS agents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_wallet    TEXT NOT NULL UNIQUE,
    commitment      TEXT,
    leaf_index      BIGINT,
    registered      BOOLEAN NOT NULL DEFAULT false,
    scenarios       TEXT[],
    profile_vector  JSONB,
    display_name    TEXT,
    photos          TEXT[],
    recordings      TEXT[],
    bio             TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agents_scenarios_gin ON agents USING gin (scenarios);
CREATE INDEX IF NOT EXISTS agents_registered_idx ON agents(registered);
