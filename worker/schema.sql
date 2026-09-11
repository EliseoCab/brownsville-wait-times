CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  bridge TEXT NOT NULL,
  lane TEXT NOT NULL,
  wait_min INTEGER NOT NULL,
  status TEXT NOT NULL,
  lat REAL,
  lng REAL,
  acc_m REAL,
  heading REAL,
  cbp_min INTEGER,
  low_acc INTEGER NOT NULL DEFAULT 0,
  ip_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_checkins_created ON checkins(created_at);
CREATE INDEX IF NOT EXISTS idx_checkins_bridge_lane ON checkins(bridge, lane, created_at);
CREATE INDEX IF NOT EXISTS idx_checkins_ip ON checkins(ip_hash, bridge, lane, created_at);
