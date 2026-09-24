-- Add RLS policies for demo users to access demo warehouse data
-- Demo users should be able to manage data in their demo warehouse

-- Update warehouses policy to allow demo users to manage their demo warehouse
CREATE POLICY "Demo users can manage their demo warehouse"
ON public.warehouses
FOR ALL
USING (
  demo_session_id IN (
    SELECT id FROM public.demo_sessions 
    WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  demo_session_id IN (
    SELECT id FROM public.demo_sessions 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Allow demo users to create warehouse sections in their demo warehouse
CREATE POLICY "Demo users can manage sections in demo warehouse"
ON public.warehouse_sections
FOR ALL
USING (
  warehouse_id IN (
    SELECT id FROM public.warehouses 
    WHERE demo_session_id IN (
      SELECT id FROM public.demo_sessions 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
)
WITH CHECK (
  warehouse_id IN (
    SELECT id FROM public.warehouses 
    WHERE demo_session_id IN (
      SELECT id FROM public.demo_sessions 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

-- Allow demo users to manage equipment in demo warehouse
CREATE POLICY "Demo users can manage equipment in demo warehouse"
ON public.equipment
FOR ALL
USING (
  warehouse_id IN (
    SELECT id FROM public.warehouses 
    WHERE demo_session_id IN (
      SELECT id FROM public.demo_sessions 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
)
WITH CHECK (
  warehouse_id IN (
    SELECT id FROM public.warehouses 
    WHERE demo_session_id IN (
      SELECT id FROM public.demo_sessions 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

-- Allow demo users to manage employees (demo-created)
CREATE POLICY "Demo users can manage demo employees"
ON public.employees
FOR ALL
USING (
  created_by IN (
    SELECT user_id FROM public.demo_sessions 
    WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM public.demo_sessions 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Allow demo users to manage cache inventory
CREATE POLICY "Demo users can manage demo cache inventory"
ON public.cache_inventory
FOR ALL
USING (
  auth.uid() IN (
    SELECT user_id FROM public.demo_sessions 
    WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM public.demo_sessions 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Allow demo users to manage shipments
CREATE POLICY "Demo users can manage demo shipments"
ON public.shipments
FOR ALL
USING (
  created_by IN (
    SELECT user_id FROM public.demo_sessions 
    WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT user_id FROM public.demo_sessions 
    WHERE user_id = auth.uid() AND is_active = true
  )
);