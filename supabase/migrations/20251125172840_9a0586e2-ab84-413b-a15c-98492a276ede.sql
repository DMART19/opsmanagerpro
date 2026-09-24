-- Allow decimal values for sort_key in requirement_definitions
ALTER TABLE requirement_definitions 
ALTER COLUMN sort_key TYPE NUMERIC USING sort_key::NUMERIC;