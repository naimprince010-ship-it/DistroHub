-- Market Routes (Area/Bazar) Master
-- Adds market_routes table and links retailers to market_routes

CREATE TABLE IF NOT EXISTS market_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    sub_area VARCHAR(255),
    market_day VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_routes_name ON market_routes(name);
CREATE INDEX IF NOT EXISTS idx_market_routes_market_day ON market_routes(market_day);

ALTER TABLE retailers
ADD COLUMN IF NOT EXISTS market_route_id UUID REFERENCES market_routes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_retailers_market_route_id ON retailers(market_route_id);
