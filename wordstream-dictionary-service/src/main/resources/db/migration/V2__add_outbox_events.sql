CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,
    aggregate_id VARCHAR(255) NOT NULL,
    type VARCHAR(255) NOT NULL,
    payload TEXT NOT NULL,
    topic VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    processed_at TIMESTAMP,
    status VARCHAR(20) NOT NULL
);

CREATE INDEX idx_outbox_status_created ON outbox_events(status, created_at);
