/*
  # Create RLS policies for templates table

  1. Security Policies
    - Allow users to SELECT their own templates
    - Allow users to INSERT templates with themselves as creator
    - Allow users to UPDATE their own templates
    - Allow users to DELETE their own templates

  2. Changes
    - Creates ownership-based access policies for the templates table
    - Ensures users can only access templates they created
*/

-- Allow users to SELECT their own templates
CREATE POLICY "Allow select own templates"
ON templates
FOR SELECT
USING (created_by = auth.uid());

-- Allow users to INSERT templates and set themselves as creator
CREATE POLICY "Allow insert own templates"
ON templates
FOR INSERT
WITH CHECK (created_by = auth.uid());

-- Allow users to UPDATE their own templates
CREATE POLICY "Allow update own templates"
ON templates
FOR UPDATE
USING (created_by = auth.uid());

-- Allow users to DELETE their own templates
CREATE POLICY "Allow delete own templates"
ON templates
FOR DELETE
USING (created_by = auth.uid());