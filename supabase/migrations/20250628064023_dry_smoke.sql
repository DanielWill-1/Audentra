/*
  # Add RLS policy for users table

  1. Security Changes
    - Enable RLS on users table if not already enabled
    - Add policy for authenticated users to read user data
    - This allows the templates query to access user information for shared templates and reviews

  2. Notes
    - This policy allows authenticated users to read basic user information
    - Required for template sharing and review functionality to work properly
    - Follows the principle of least privilege by only allowing SELECT operations
*/

-- Enable RLS on users table if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read user data
-- This is needed for template shares and reviews to display user information
CREATE POLICY "Authenticated users can read user data"
  ON users
  FOR SELECT
  TO authenticated
  USING (true);