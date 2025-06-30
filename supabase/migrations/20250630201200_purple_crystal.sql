/*
  # Create doctors table and related tables

  1. New Tables
    - `departments`
      - `id` (uuid, primary key)
      - `name` (text, department name)
      - `description` (text, department description)
      - `created_at` (timestamp)
    - `doctors`
      - `id` (uuid, primary key)
      - `name` (text, doctor name)
      - `specialization` (text, doctor specialization)
      - `department_id` (uuid, foreign key to departments)
      - `experience_years` (integer, years of experience)
      - `phone` (text, contact phone)
      - `email` (text, contact email)
      - `image_url` (text, profile image URL)
      - `bio` (text, doctor biography)
      - `available_days` (text array, available days)
      - `available_hours` (text, available time range)
      - `created_at` (timestamp)
    - `appointments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `doctor_id` (uuid, foreign key to doctors)
      - `appointment_date` (date)
      - `appointment_time` (time)
      - `status` (text, appointment status)
      - `notes` (text, appointment notes)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to read departments and doctors
    - Add policies for users to manage their own appointments
*/

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create doctors table
CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  specialization text NOT NULL,
  department_id uuid REFERENCES departments(id),
  experience_years integer DEFAULT 0,
  phone text,
  email text,
  image_url text,
  bio text,
  available_days text[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  available_hours text DEFAULT '09:00-17:00',
  created_at timestamptz DEFAULT now()
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  doctor_id uuid REFERENCES doctors(id),
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  status text DEFAULT 'scheduled',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create policies for departments
CREATE POLICY "Anyone can read departments"
  ON departments
  FOR SELECT
  TO public
  USING (true);

-- Create policies for doctors
CREATE POLICY "Anyone can read doctors"
  ON doctors
  FOR SELECT
  TO public
  USING (true);

-- Create policies for appointments
CREATE POLICY "Users can read their own appointments"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own appointments"
  ON appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own appointments"
  ON appointments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own appointments"
  ON appointments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert sample departments
INSERT INTO departments (name, description) VALUES
  ('Kardiyoloji', 'Kalp ve damar hastalıkları uzmanı'),
  ('Nöroloji', 'Sinir sistemi hastalıkları uzmanı'),
  ('Ortopedi', 'Kemik ve eklem hastalıkları uzmanı'),
  ('Dahiliye', 'İç hastalıkları uzmanı'),
  ('Göz Hastalıkları', 'Göz sağlığı uzmanı'),
  ('Kulak Burun Boğaz', 'KBB uzmanı')
ON CONFLICT DO NOTHING;

-- Insert sample doctors
INSERT INTO doctors (name, specialization, department_id, experience_years, phone, email, bio) VALUES
  ('Dr. Mehmet Yılmaz', 'Kardiyolog', (SELECT id FROM departments WHERE name = 'Kardiyoloji' LIMIT 1), 15, '+90 555 123 4567', 'mehmet.yilmaz@hastane.com', 'Kardiyoloji alanında 15 yıllık deneyime sahip uzman doktor.'),
  ('Dr. Ayşe Kaya', 'Nörolog', (SELECT id FROM departments WHERE name = 'Nöroloji' LIMIT 1), 12, '+90 555 234 5678', 'ayse.kaya@hastane.com', 'Nöroloji alanında uzman, migren ve epilepsi tedavisinde deneyimli.'),
  ('Dr. Ali Demir', 'Ortopedist', (SELECT id FROM departments WHERE name = 'Ortopedi' LIMIT 1), 18, '+90 555 345 6789', 'ali.demir@hastane.com', 'Ortopedi ve travmatoloji uzmanı, spor yaralanmaları konusunda deneyimli.'),
  ('Dr. Fatma Özkan', 'Dahiliye Uzmanı', (SELECT id FROM departments WHERE name = 'Dahiliye' LIMIT 1), 10, '+90 555 456 7890', 'fatma.ozkan@hastane.com', 'İç hastalıkları uzmanı, diyabet ve hipertansiyon tedavisinde deneyimli.'),
  ('Dr. Hasan Çelik', 'Göz Doktoru', (SELECT id FROM departments WHERE name = 'Göz Hastalıkları' LIMIT 1), 8, '+90 555 567 8901', 'hasan.celik@hastane.com', 'Göz hastalıkları uzmanı, katarakt ve retina cerrahisinde deneyimli.'),
  ('Dr. Zeynep Arslan', 'KBB Uzmanı', (SELECT id FROM departments WHERE name = 'Kulak Burun Boğaz' LIMIT 1), 14, '+90 555 678 9012', 'zeynep.arslan@hastane.com', 'KBB uzmanı, sinüzit ve işitme problemleri tedavisinde deneyimli.')
ON CONFLICT DO NOTHING;