CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE orgs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE org_role AS ENUM ('admin', 'broker', 'viewer');

CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE offer_status AS ENUM (
  'new', 'negotiating', 'accepted', 'ordered', 'in_transit', 'delivered'
);

CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  status offer_status NOT NULL DEFAULT 'new',
  source_type TEXT NOT NULL CHECK (source_type IN ('email', 'excel', 'manual')),
  raw_content TEXT,
  parsed_json JSONB,
  document_id UUID,
  valid_until TIMESTAMPTZ,
  lead_time_days INT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE offer_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  sku TEXT,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'ea',
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC NOT NULL CHECK (total_price >= 0),
  moq NUMERIC,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE order_status AS ENUM ('draft', 'confirmed', 'shipped', 'delivered', 'cancelled');

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE RESTRICT,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  status order_status NOT NULL DEFAULT 'draft',
  total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  offer_item_id UUID NOT NULL REFERENCES offer_items(id) ON DELETE RESTRICT,
  sku TEXT,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'ea',
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC NOT NULL CHECK (total_price >= 0),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE shipment_status AS ENUM (
  'pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'
);

CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  carrier TEXT,
  tracking_number TEXT,
  status shipment_status NOT NULL DEFAULT 'pending',
  estimated_delivery TIMESTAMPTZ,
  last_lat NUMERIC,
  last_lng NUMERIC,
  last_location_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shipment_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT,
  location_name TEXT,
  lat NUMERIC,
  lng NUMERIC,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT,
  size_bytes BIGINT,
  linked_type TEXT CHECK (linked_type IN ('offer', 'order', 'shipment')),
  linked_id UUID,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common filters
CREATE INDEX idx_org_members_org_user ON org_members(org_id, user_id);
CREATE INDEX idx_offers_org_status ON offers(org_id, status);
CREATE INDEX idx_orders_org ON orders(org_id);
CREATE INDEX idx_shipments_org ON shipments(org_id);
CREATE INDEX idx_shipment_events_shipment ON shipment_events(shipment_id);

-- Trigger: update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orgs_updated_at BEFORE UPDATE ON orgs FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER org_members_updated_at BEFORE UPDATE ON org_members FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER vendors_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER offers_updated_at BEFORE UPDATE ON offers FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER offer_items_updated_at BEFORE UPDATE ON offer_items FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER order_items_updated_at BEFORE UPDATE ON order_items FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER shipments_updated_at BEFORE UPDATE ON shipments FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
