/*
  # Add template sharing and review functionality

  1. New Tables
    - `template_shares`
      - `id` (uuid, primary key)
      - `template_id` (uuid, foreign key to templates)
      - `user_id` (uuid, nullable for email-based sharing)
      - `user_email` (text, for sharing with users not yet registered)
      - `user_name` (text, optional display name)
      - `role` (text, viewer/editor/admin)
      - `shared_by` (uuid, foreign key to users)
      - `shared_at` (timestamp)
      - `message` (text, optional sharing message)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `template_reviews`
      - `id` (uuid, primary key)
      - `template_id` (uuid, foreign key to templates)
      - `reviewer_id` (uuid, foreign key to users)
      - `reviewer_name` (text)
      - `reviewer_email` (text)
      - `rating` (integer, 1-5 stars)
      - `comment` (text, optional)
      - `status` (text, pending/approved/rejected/needs_changes)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own shares and reviews
    - Add policies for template owners to view shares of their templates

  3. Indexes
    - Add indexes for common query patterns
*/

-- Create template_shares table
CREATE TABLE IF NOT EXISTS template_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  user_name text DEFAULT '',
  role text NOT NULL DEFAULT 'viewer',
  shared_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_at timestamptz DEFAULT now(),
  message text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT template_shares_role_check CHECK (role = ANY (ARRAY['viewer'::text, 'editor'::text, 'admin'::text]))
);

-- Create template_reviews table
CREATE TABLE IF NOT EXISTS template_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewer_name text NOT NULL DEFAULT '',
  reviewer_email text NOT NULL DEFAULT '',
  rating integer NOT NULL,
  comment text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT template_reviews_rating_check CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT template_reviews_status_check CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'needs_changes'::text]))
);

-- Add indexes for template_shares
CREATE INDEX IF NOT EXISTS idx_template_shares_template_id ON template_shares(template_id);
CREATE INDEX IF NOT EXISTS idx_template_shares_user_email ON template_shares(user_email);
CREATE INDEX IF NOT EXISTS idx_template_shares_shared_by ON template_shares(shared_by);
CREATE INDEX IF NOT EXISTS idx_template_shares_role ON template_shares(role);

-- Add indexes for template_reviews
CREATE INDEX IF NOT EXISTS idx_template_reviews_template_id ON template_reviews(template_id);
CREATE INDEX IF NOT EXISTS idx_template_reviews_reviewer_id ON template_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_template_reviews_status ON template_reviews(status);
CREATE INDEX IF NOT EXISTS idx_template_reviews_rating ON template_reviews(rating);

-- Enable RLS
ALTER TABLE template_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for template_shares

-- Users can view shares for templates they own
CREATE POLICY "Template owners can view shares"
  ON template_shares
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM templates 
      WHERE templates.id = template_shares.template_id 
      AND templates.created_by = auth.uid()
    )
  );

-- Users can view shares where they are the recipient
CREATE POLICY "Users can view their own shares"
  ON template_shares
  FOR SELECT
  TO authenticated
  USING (
    user_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR user_id = auth.uid()
  );

-- Template owners can create shares
CREATE POLICY "Template owners can create shares"
  ON template_shares
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM templates 
      WHERE templates.id = template_shares.template_id 
      AND templates.created_by = auth.uid()
    )
  );

-- Template owners can update shares
CREATE POLICY "Template owners can update shares"
  ON template_shares
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM templates 
      WHERE templates.id = template_shares.template_id 
      AND templates.created_by = auth.uid()
    )
  );

-- Template owners can delete shares
CREATE POLICY "Template owners can delete shares"
  ON template_shares
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM templates 
      WHERE templates.id = template_shares.template_id 
      AND templates.created_by = auth.uid()
    )
  );

-- RLS Policies for template_reviews

-- Anyone can view reviews for visible templates
CREATE POLICY "Users can view template reviews"
  ON template_reviews
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM templates 
      WHERE templates.id = template_reviews.template_id 
      AND templates.visibility = 'visible'
    )
    OR EXISTS (
      SELECT 1 FROM templates 
      WHERE templates.id = template_reviews.template_id 
      AND templates.created_by = auth.uid()
    )
  );

-- Users can create reviews for templates they have access to
CREATE POLICY "Users can create reviews"
  ON template_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM templates 
        WHERE templates.id = template_reviews.template_id 
        AND templates.visibility = 'visible'
      )
      OR EXISTS (
        SELECT 1 FROM template_shares 
        WHERE template_shares.template_id = template_reviews.template_id 
        AND template_shares.user_id = auth.uid()
      )
    )
  );

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
  ON template_reviews
  FOR UPDATE
  TO authenticated
  USING (reviewer_id = auth.uid())
  WITH CHECK (reviewer_id = auth.uid());

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
  ON template_reviews
  FOR DELETE
  TO authenticated
  USING (reviewer_id = auth.uid());

-- Template owners can update reviews on their templates
CREATE POLICY "Template owners can update reviews"
  ON template_reviews
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM templates 
      WHERE templates.id = template_reviews.template_id 
      AND templates.created_by = auth.uid()
    )
  );

-- Add triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_template_shares_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_template_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_template_shares_updated_at
  BEFORE UPDATE ON template_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_template_shares_updated_at();

CREATE TRIGGER update_template_reviews_updated_at
  BEFORE UPDATE ON template_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_template_reviews_updated_at();