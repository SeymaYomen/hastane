/*
  # Add insert policy for users table
  
  1. Changes
    - Add insert policy to allow new user registration
    - Users can insert their own data during registration
*/

CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Public users can insert data during registration"
  ON users
  FOR INSERT
  TO anon
  WITH CHECK (true);