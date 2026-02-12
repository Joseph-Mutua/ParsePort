ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM public.org_members WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.user_org_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM public.org_members WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Orgs: members can read their org
CREATE POLICY orgs_select ON orgs FOR SELECT
  USING (id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid()));

-- Profiles: users can read/update own profile
CREATE POLICY profiles_select ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (id = auth.uid());

-- Org members: members can read members of their org
CREATE POLICY org_members_select ON org_members FOR SELECT
  USING (org_id = public.user_org_id());

-- Vendors: org-scoped; admin/broker can write, all can read
CREATE POLICY vendors_select ON vendors FOR SELECT
  USING (org_id = public.user_org_id());
CREATE POLICY vendors_insert ON vendors FOR INSERT
  WITH CHECK (org_id = public.user_org_id() AND public.user_org_role() IN ('admin', 'broker'));
CREATE POLICY vendors_update ON vendors FOR UPDATE
  USING (org_id = public.user_org_id() AND public.user_org_role() IN ('admin', 'broker'));
CREATE POLICY vendors_delete ON vendors FOR DELETE
  USING (org_id = public.user_org_id() AND public.user_org_role() IN ('admin', 'broker'));

-- Customers: same as vendors
CREATE POLICY customers_select ON customers FOR SELECT USING (org_id = public.user_org_id());
CREATE POLICY customers_insert ON customers FOR INSERT
  WITH CHECK (org_id = public.user_org_id() AND public.user_org_role() IN ('admin', 'broker'));
CREATE POLICY customers_update ON customers FOR UPDATE
  USING (org_id = public.user_org_id() AND public.user_org_role() IN ('admin', 'broker'));
CREATE POLICY customers_delete ON customers FOR DELETE
  USING (org_id = public.user_org_id() AND public.user_org_role() IN ('admin', 'broker'));

-- Offers: viewer read-only; admin/broker create/update
CREATE POLICY offers_select ON offers FOR SELECT USING (org_id = public.user_org_id());
CREATE POLICY offers_insert ON offers FOR INSERT
  WITH CHECK (org_id = public.user_org_id() AND public.user_org_role() IN ('admin', 'broker'));
CREATE POLICY offers_update ON offers FOR UPDATE
  USING (org_id = public.user_org_id() AND public.user_org_role() IN ('admin', 'broker'));
CREATE POLICY offers_delete ON offers FOR DELETE
  USING (org_id = public.user_org_id() AND public.user_org_role() IN ('admin', 'broker'));

-- Offer items: follow offer access (org)
CREATE POLICY offer_items_select ON offer_items FOR SELECT
  USING (offer_id IN (SELECT id FROM offers WHERE org_id = public.user_org_id()));
CREATE POLICY offer_items_insert ON offer_items FOR INSERT
  WITH CHECK (
    offer_id IN (SELECT id FROM offers WHERE org_id = public.user_org_id() AND public.user_org_role() IN ('admin', 'broker'))
  );
CREATE POLICY offer_items_update ON offer_items FOR UPDATE
  USING (offer_id IN (SELECT id FROM offers WHERE org_id = public.user_org_id() AND public.user_org_role() IN ('admin', 'broker')));
CREATE POLICY offer_items_delete ON offer_items FOR DELETE
  USING (offer_id IN (SELECT id FROM offers WHERE org_id = public.user_org_id() AND public.user_org_role() IN ('admin', 'broker')));

-- Orders
CREATE POLICY orders_select ON orders FOR SELECT USING (org_id = public.user_org_id());
CREATE POLICY orders_insert ON orders FOR INSERT
  WITH CHECK (org_id = public.user_org_id() AND public.user_org_role() IN ('admin', 'broker'));
CREATE POLICY orders_update ON orders FOR UPDATE
  USING (org_id = public.user_org_id() AND public.user_org_role() IN ('admin', 'broker'));
CREATE POLICY orders_delete ON orders FOR DELETE
  USING (org_id = public.user_org_id() AND public.user_org_role() IN ('admin', 'broker'));

-- Order items
CREATE POLICY order_items_select ON order_items FOR SELECT
  USING (order_id IN (SELECT id FROM orders WHERE org_id = public.user_org_id()));
CREATE POLICY order_items_insert ON order_items FOR INSERT
  WITH CHECK (order_id IN (SELECT id FROM orders WHERE org_id = public.user_org_id() AND public.user_org_role() IN ('admin', 'broker')));
CREATE POLICY order_items_update ON order_items FOR UPDATE
  USING (order_id IN (SELECT id FROM orders WHERE org_id = public.user_org_id() AND public.user_org_role() IN ('admin', 'broker')));
CREATE POLICY order_items_delete ON order_items FOR DELETE
  USING (order_id IN (SELECT id FROM orders WHERE org_id = public.user_org_id() AND public.user_org_role() IN ('admin', 'broker')));

-- Shipments
CREATE POLICY shipments_select ON shipments FOR SELECT USING (org_id = public.user_org_id());
CREATE POLICY shipments_insert ON shipments FOR INSERT
  WITH CHECK (org_id = public.user_org_id() AND public.user_org_role() IN ('admin', 'broker'));
CREATE POLICY shipments_update ON shipments FOR UPDATE
  USING (org_id = public.user_org_id() AND public.user_org_role() IN ('admin', 'broker'));
CREATE POLICY shipments_delete ON shipments FOR DELETE
  USING (org_id = public.user_org_id() AND public.user_org_role() IN ('admin', 'broker'));

-- Shipment events
CREATE POLICY shipment_events_select ON shipment_events FOR SELECT
  USING (shipment_id IN (SELECT id FROM shipments WHERE org_id = public.user_org_id()));
CREATE POLICY shipment_events_insert ON shipment_events FOR INSERT
  WITH CHECK (shipment_id IN (SELECT id FROM shipments WHERE org_id = public.user_org_id() AND public.user_org_role() IN ('admin', 'broker')));
CREATE POLICY shipment_events_update ON shipment_events FOR UPDATE
  USING (shipment_id IN (SELECT id FROM shipments WHERE org_id = public.user_org_id() AND public.user_org_role() IN ('admin', 'broker')));

-- Documents
CREATE POLICY documents_select ON documents FOR SELECT USING (org_id = public.user_org_id());
CREATE POLICY documents_insert ON documents FOR INSERT
  WITH CHECK (org_id = public.user_org_id() AND public.user_org_role() IN ('admin', 'broker'));
CREATE POLICY documents_update ON documents FOR UPDATE
  USING (org_id = public.user_org_id() AND public.user_org_role() IN ('admin', 'broker'));
CREATE POLICY documents_delete ON documents FOR DELETE
  USING (org_id = public.user_org_id() AND public.user_org_role() IN ('admin', 'broker'));
