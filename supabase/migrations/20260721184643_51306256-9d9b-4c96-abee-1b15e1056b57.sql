
-- custom_fields: scope by workspace of created_by
DROP POLICY IF EXISTS "Admins can manage custom fields" ON public.custom_fields;
DROP POLICY IF EXISTS "Users can view own custom fields" ON public.custom_fields;

CREATE POLICY "Workspace members can view custom fields"
  ON public.custom_fields FOR SELECT
  USING (created_by = auth.uid() OR public.is_in_workspace(created_by) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Workspace admins can manage custom fields"
  ON public.custom_fields FOR ALL
  USING (
    (public.is_in_workspace(created_by) AND public.has_workspace_permission(created_by, 'manage_custom_fields'))
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    (public.is_in_workspace(created_by) AND public.has_workspace_permission(created_by, 'manage_custom_fields'))
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- warehouses: scope by is_in_workspace(created_by)
DROP POLICY IF EXISTS "Managers and admins can manage warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Managers and admins can view warehouses" ON public.warehouses;

CREATE POLICY "Workspace members can view warehouses"
  ON public.warehouses FOR SELECT
  USING (
    public.is_in_workspace(created_by)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Workspace managers can manage warehouses"
  ON public.warehouses FOR ALL
  USING (
    (public.is_in_workspace(created_by) AND (
      public.has_workspace_permission(created_by, 'manage_warehouses')
      OR created_by = auth.uid()
    ))
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    (public.is_in_workspace(created_by) AND (
      public.has_workspace_permission(created_by, 'manage_warehouses')
      OR created_by = auth.uid()
    ))
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- warehouse_twin_objects: scope via parent warehouse
DROP POLICY IF EXISTS "Authenticated users can view twin objects" ON public.warehouse_twin_objects;
DROP POLICY IF EXISTS "Managers and admins can manage twin objects" ON public.warehouse_twin_objects;

CREATE POLICY "Workspace members can view twin objects"
  ON public.warehouse_twin_objects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.warehouses w
      WHERE w.id = warehouse_twin_objects.warehouse_id
        AND (public.is_in_workspace(w.created_by) OR public.has_role(auth.uid(), 'super_admin'::app_role))
    )
  );

CREATE POLICY "Workspace managers can manage twin objects"
  ON public.warehouse_twin_objects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.warehouses w
      WHERE w.id = warehouse_twin_objects.warehouse_id
        AND (
          (public.is_in_workspace(w.created_by) AND (
            public.has_workspace_permission(w.created_by, 'manage_warehouses')
            OR w.created_by = auth.uid()
          ))
          OR public.has_role(auth.uid(), 'super_admin'::app_role)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.warehouses w
      WHERE w.id = warehouse_twin_objects.warehouse_id
        AND (
          (public.is_in_workspace(w.created_by) AND (
            public.has_workspace_permission(w.created_by, 'manage_warehouses')
            OR w.created_by = auth.uid()
          ))
          OR public.has_role(auth.uid(), 'super_admin'::app_role)
        )
    )
  );

-- warehouse_placements: scope via parent warehouse
DROP POLICY IF EXISTS "Authenticated users can view placements" ON public.warehouse_placements;
DROP POLICY IF EXISTS "Managers and admins can manage placements" ON public.warehouse_placements;

CREATE POLICY "Workspace members can view placements"
  ON public.warehouse_placements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.warehouses w
      WHERE w.id = warehouse_placements.warehouse_id
        AND (public.is_in_workspace(w.created_by) OR public.has_role(auth.uid(), 'super_admin'::app_role))
    )
  );

CREATE POLICY "Workspace managers can manage placements"
  ON public.warehouse_placements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.warehouses w
      WHERE w.id = warehouse_placements.warehouse_id
        AND (
          (public.is_in_workspace(w.created_by) AND (
            public.has_workspace_permission(w.created_by, 'manage_warehouses')
            OR w.created_by = auth.uid()
          ))
          OR public.has_role(auth.uid(), 'super_admin'::app_role)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.warehouses w
      WHERE w.id = warehouse_placements.warehouse_id
        AND (
          (public.is_in_workspace(w.created_by) AND (
            public.has_workspace_permission(w.created_by, 'manage_warehouses')
            OR w.created_by = auth.uid()
          ))
          OR public.has_role(auth.uid(), 'super_admin'::app_role)
        )
    )
  );

-- Storage: remove public read on 'uploads' bucket; require owner or workspace membership
DROP POLICY IF EXISTS "Anyone can view uploads" ON storage.objects;

CREATE POLICY "Workspace members can view uploads"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'uploads'
    AND auth.uid() IS NOT NULL
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_in_workspace(((storage.foldername(name))[1])::uuid)
    )
  );
