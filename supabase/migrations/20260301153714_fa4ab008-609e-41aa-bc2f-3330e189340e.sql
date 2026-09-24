
-- Function to calculate nesting depth of a container
CREATE OR REPLACE FUNCTION public.get_container_depth(p_container_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  depth integer := 0;
  current_id uuid := p_container_id;
  parent_id uuid;
BEGIN
  LOOP
    SELECT container_id INTO parent_id
    FROM cache_inventory
    WHERE id = current_id;
    
    IF parent_id IS NULL THEN
      RETURN depth;
    END IF;
    
    depth := depth + 1;
    current_id := parent_id;
    
    -- Safety: prevent infinite loops
    IF depth > 10 THEN
      RETURN depth;
    END IF;
  END LOOP;
END;
$$;

-- Trigger function to validate container nesting rules
CREATE OR REPLACE FUNCTION public.validate_container_nesting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_type text;
  current_id uuid;
  depth integer;
  child_depth integer;
BEGIN
  -- Rule 1: Items cannot contain anything (enforced by schema — items don't get assigned as parents)
  -- Rule 2: Prevent self-parent assignment
  IF NEW.container_id IS NOT NULL AND NEW.container_id = NEW.id THEN
    RAISE EXCEPTION 'An asset cannot be its own container';
  END IF;
  
  -- Only validate further if container_id is being set
  IF NEW.container_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Rule 3: Parent must be a container, not an item
  SELECT asset_type INTO parent_type
  FROM cache_inventory
  WHERE id = NEW.container_id;
  
  IF parent_type IS NULL THEN
    RAISE EXCEPTION 'Parent container not found';
  END IF;
  
  IF parent_type != 'container' THEN
    RAISE EXCEPTION 'Items cannot contain other assets. Only containers can hold items or other containers.';
  END IF;
  
  -- Rule 4: Prevent circular nesting (check if NEW.container_id is a descendant of NEW.id)
  IF NEW.asset_type = 'container' THEN
    current_id := NEW.container_id;
    depth := 0;
    LOOP
      IF current_id IS NULL THEN
        EXIT;
      END IF;
      IF current_id = NEW.id THEN
        RAISE EXCEPTION 'Circular nesting detected. This container is already nested inside the target.';
      END IF;
      depth := depth + 1;
      IF depth > 10 THEN
        EXIT;
      END IF;
      SELECT container_id INTO current_id
      FROM cache_inventory
      WHERE id = current_id;
    END LOOP;
  END IF;
  
  -- Rule 5: Prevent nesting beyond 4 levels
  -- Calculate depth of parent
  depth := get_container_depth(NEW.container_id) + 1;
  
  -- If this item is a container, also account for its deepest child
  IF NEW.asset_type = 'container' THEN
    -- Find the max depth of children below this container
    WITH RECURSIVE descendants AS (
      SELECT id, 1 as child_depth
      FROM cache_inventory
      WHERE container_id = NEW.id
      UNION ALL
      SELECT ci.id, d.child_depth + 1
      FROM cache_inventory ci
      JOIN descendants d ON ci.container_id = d.id
      WHERE d.child_depth < 10
    )
    SELECT COALESCE(MAX(child_depth), 0) INTO child_depth FROM descendants;
    
    IF (depth + child_depth) > 4 THEN
      RAISE EXCEPTION 'Maximum nesting depth of 4 levels exceeded. Current placement would create % levels.', depth + child_depth;
    END IF;
  ELSE
    IF depth > 4 THEN
      RAISE EXCEPTION 'Maximum nesting depth of 4 levels exceeded.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_validate_container_nesting ON public.cache_inventory;

-- Create trigger on INSERT and UPDATE
CREATE TRIGGER trg_validate_container_nesting
  BEFORE INSERT OR UPDATE OF container_id
  ON public.cache_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_container_nesting();
