/*
  # Fix template permissions and foreign key constraints

  1. Changes
    - Drop foreign key constraints from template_shares.user_id and template_reviews.reviewer_id that reference auth.users
    - Add RLS policies to allow authenticated users to select from template_shares and template_reviews
    - Ensure proper permissions for template queries

  2. Security
    - Enable RLS on template_shares and template_reviews if not already enabled
    - Add policies for authenticated users to read template shares and reviews
*/

-- Drop foreign key constraints that reference auth.users
DO $$
BEGIN
  -- Drop foreign key constraint from template_shares.user_id if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'template_shares_user_id_fkey' 
    AND table_name = 'template_shares'
  ) THEN
    ALTER TABLE template_shares DROP CONSTRAINT template_shares_user_id_fkey;
  END IF;

  -- Drop foreign key constraint from template_reviews.reviewer_id if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'template_reviews_reviewer_id_fkey' 
    AND table_name = 'template_reviews'
  ) THEN
    ALTER TABLE template_reviews DROP CONSTRAINT template_reviews_reviewer_id_fkey;
  END IF;
END $$;

-- Ensure RLS is enabled on template_shares
ALTER TABLE template_shares ENABLE ROW LEVEL SECURITY;

-- Ensure RLS is enabled on template_reviews  
ALTER TABLE template_reviews ENABLE ROW LEVEL SECURITY;

-- Add policy for authenticated users to select from template_shares
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'template_shares' 
    AND policyname = 'Authenticated users can read template shares'
  ) THEN
    CREATE POLICY "Authenticated users can read template shares"
      ON template_shares
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Add policy for authenticated users to select from template_reviews
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'template_reviews' 
    AND policyname = 'Authenticated users can read template reviews'
  ) THEN
    CREATE POLICY "Authenticated users can read template reviews"
      ON template_reviews
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;