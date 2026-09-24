-- 1. certifications: scope SELECT to staff owner
DROP POLICY IF EXISTS "Certifications viewable by all authenticated users" ON public.certifications;
CREATE POLICY "Users can view own staff certifications"
ON public.certifications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM staff s
    WHERE s.id = certifications.staff_id AND (s.user_id = auth.uid() OR s.created_by = auth.uid())
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 2. equipment_checkouts: scope SELECT to equipment owner
DROP POLICY IF EXISTS "Checkouts viewable by all authenticated users" ON public.equipment_checkouts;
CREATE POLICY "Users can view own equipment checkouts"
ON public.equipment_checkouts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM equipment e
    WHERE e.id = equipment_checkouts.equipment_id AND e.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 3. shipments: scope SELECT to creator/owner
DROP POLICY IF EXISTS "Shipments viewable by all authenticated users" ON public.shipments;
CREATE POLICY "Users can view own shipments"
ON public.shipments FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 4. shipment_items: scope SELECT via shipment owner
DROP POLICY IF EXISTS "Shipment items viewable by all authenticated users" ON public.shipment_items;
CREATE POLICY "Users can view own shipment items"
ON public.shipment_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM shipments s
    WHERE s.id = shipment_items.shipment_id AND s.created_by = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 5. cache_inventory: remove overly broad INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert cache inventory" ON public.cache_inventory;

-- 6. admin_messages: tighten INSERT to enforce user_id match
DROP POLICY IF EXISTS "Authenticated users can submit messages" ON public.admin_messages;
CREATE POLICY "Authenticated users can submit own messages"
ON public.admin_messages FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- 7. support_messages: tighten INSERT to enforce user_id match
DROP POLICY IF EXISTS "Authenticated users can create support messages" ON public.support_messages;
CREATE POLICY "Users can create own support messages"
ON public.support_messages FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- 8. demo_feedback: restrict to authenticated (already done but ensure no anon)
DROP POLICY IF EXISTS "Anyone can submit demo feedback" ON public.demo_feedback;
DROP POLICY IF EXISTS "Authenticated users can submit demo feedback" ON public.demo_feedback;
CREATE POLICY "Authenticated users can submit demo feedback"
ON public.demo_feedback FOR INSERT
TO authenticated
WITH CHECK (true);