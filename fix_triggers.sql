-- Retired: the original trigger repair can undo Careline account protections.
-- Install the complete root database.sql instead. See docs/DEPLOYMENT.md.
DO $$ BEGIN
  RAISE EXCEPTION 'This script is retired. Run the complete Careline database.sql; see docs/DEPLOYMENT.md.';
END $$;
