/*
  # Fix Templates Table RLS Policies

  1. Security Updates
    - Drop existing restrictive policies
    - Create proper RLS policies for authenticated users
    - Allow users to manage their own templates
    - Ensure proper access control based on created_by field

  2. Policies Created
    - INSERT: Users can create templates (created_by = auth.uid())
    - SELECT: Users can view their own templates
    - UPDATE: Users can update their own templates  
    - DELETE: Users can delete their own templates
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage own templates" ON templates;
DROP POLICY IF EXISTS "Users can view visible templates" ON templates;

-- Create comprehensive RLS policies for templates table

-- Allow authenticated users to insert templates they own
CREATE POLICY "Users can insert own templates"
  ON templates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Allow authenticated users to select their own templates
CREATE POLICY "Users can select own templates"
  ON templates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = created_by);

-- Allow authenticated users to update their own templates
CREATE POLICY "Users can update own templates"
  ON templates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Allow authenticated users to delete their own templates
CREATE POLICY "Users can delete own templates"
  ON templates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Ensure RLS is enabled on the templates table
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;