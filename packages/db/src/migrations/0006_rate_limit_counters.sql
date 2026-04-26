CREATE TABLE rate_limit_counters (
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

CREATE INDEX rate_limit_window_idx ON rate_limit_counters (window_start);
