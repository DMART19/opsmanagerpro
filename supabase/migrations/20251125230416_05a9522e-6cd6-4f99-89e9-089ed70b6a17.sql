-- Add custom_data field to requirement_definitions for flexible custom fields
ALTER TABLE requirement_definitions 
ADD COLUMN IF NOT EXISTS custom_data jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN requirement_definitions.custom_data IS 'Flexible JSON storage for custom requirement fields from Excel imports or manual entry';