/*
  # Password Reset Implementation

  1. Changes
    - Add policy for password reset functionality
    - Ensure users can update their own passwords
*/

-- Add policy for password reset
CREATE POLICY "Enable password reset for users"
  ON auth.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add policy for email verification
CREATE POLICY "Enable email verification"
  ON auth.users
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);