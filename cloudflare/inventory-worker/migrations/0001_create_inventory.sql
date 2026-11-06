CREATE TABLE IF NOT EXISTS vn_inventory_products (
  product_id TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL CHECK (product_type IN ('POSTER', 'CD')),
  production_limit INTEGER NOT NULL CHECK (production_limit >= 0),
  produced_quantity INTEGER NOT NULL DEFAULT 0 CHECK (produced_quantity >= 0 AND produced_quantity <= production_limit),
  sold_quantity INTEGER NOT NULL DEFAULT 0 CHECK (sold_quantity >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (sold_quantity + reserved_quantity <= produced_quantity)
);

CREATE TABLE IF NOT EXISTS vn_inventory_events (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL UNIQUE,
  product_id TEXT NOT NULL REFERENCES vn_inventory_products(product_id),
  event_type TEXT NOT NULL CHECK (event_type IN ('production', 'sale')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vn_inventory_events_product_created
  ON vn_inventory_events(product_id, created_at DESC);

INSERT INTO vn_inventory_products (product_id, product_name, product_type, production_limit)
VALUES
  ('gta-love-poster-1', 'GTA LOVE Poster 01', 'POSTER', 800),
  ('gta-love-poster-2', 'GTA LOVE Poster 02', 'POSTER', 800),
  ('9ojeez9-classic-poster-01', '9OJEEZ9''s Classic Poster 01', 'POSTER', 800),
  ('9ojeez9-classic-poster-02', '9OJEEZ9''s Classic Poster 02', 'POSTER', 800),
  ('9ojeez9-classic-poster-03', '9OJEEZ9''s Classic Poster 03', 'POSTER', 800),
  ('vn-original-poster-01', 'VN Original Poster 01', 'POSTER', 800),
  ('jeep-callin-poster-01', 'JEEP CALLIN'' Poster 01', 'POSTER', 800),
  ('gta-love-custom-printed-cd', 'GTA LOVE (CUSTOM CD)', 'CD', 2500),
  ('igotti-standard-painted-cd', 'IGOTTI (STANDART CD)', 'CD', 1500),
  ('planetarium-original-cd', 'PLANETARIUM (ORIGINAL CD)', 'CD', 2500)
ON CONFLICT(product_id) DO NOTHING;