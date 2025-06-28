/*
  # Drop foreign key constraint from template_reviews table

  1. Changes
    - Drop the foreign key constraint between template_reviews.reviewer_id and users.id
    - This allows template reviews to work without requiring access to the users table
    - The reviewer information is already stored directly in the template_reviews table

  2. Security
    - RLS policies remain in place for template_reviews table
    - No changes to existing security model
*/

-- Drop the foreign key constraint to users table
ALTER TABLE template_reviews DROP CONSTRAINT IF EXISTS template_reviews_reviewer_id_fkey;