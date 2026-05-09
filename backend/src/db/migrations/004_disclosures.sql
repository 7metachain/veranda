CREATE TABLE IF NOT EXISTS disclosures (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id               UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    candidate_index          INTEGER NOT NULL,
    candidate_agent_wallet   TEXT NOT NULL,
    paid_usdc                BIGINT NOT NULL,
    tx_signature             TEXT NOT NULL,
    paid_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS disclosures_session_idx ON disclosures(session_id);
CREATE TABLE IF NOT EXISTS messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    sender_wallet   TEXT NOT NULL,
    receiver_wallet TEXT NOT NULL,
    body            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
