CREATE TABLE IF NOT EXISTS matches (
    id                      UUID PRIMARY KEY,
    agent_wallet            TEXT NOT NULL,
    scenarios               TEXT[] NOT NULL,
    round                   INTEGER DEFAULT 0,
    progress                DOUBLE PRECISION DEFAULT 0,
    eta_seconds             INTEGER DEFAULT 0,
    status                  TEXT DEFAULT 'pending',
    merkle_root_round1      TEXT,
    merkle_root_round2      TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS match_candidates (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id               UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    round                    INTEGER NOT NULL,
    idx                      INTEGER NOT NULL,
    candidate_agent_wallet   TEXT NOT NULL,
    score                    INTEGER,
    teaser                   TEXT,
    UNIQUE(session_id, round, idx)
);

CREATE INDEX IF NOT EXISTS match_candidates_session_idx ON match_candidates(session_id, round);
