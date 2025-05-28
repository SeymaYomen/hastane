/*
  # Sağlık Takip Sistemi Veritabanı Şeması

  1. Yeni Tablolar
    - `users` (Kullanıcılar)
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `full_name` (text)
      - `phone` (text)
      - `tckn` (text)
      - `created_at` (timestamp)
    
    - `doctors` (Doktorlar)
      - `id` (uuid, primary key)
      - `full_name` (text)
      - `department` (text)
      - `title` (text)
      - `experience_years` (integer)
      - `education` (text)
      - `languages` (text[])
      - `specialties` (text[])
      - `working_days` (text[])
      - `created_at` (timestamp)
    
    - `appointments` (Randevular)
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `doctor_id` (uuid, foreign key)
      - `date` (date)
      - `time` (time)
      - `status` (text)
      - `notes` (text)
      - `price` (numeric)
      - `is_first_visit` (boolean)
      - `rating` (integer)
      - `created_at` (timestamp)

  2. Güvenlik
    - Tüm tablolarda RLS aktif
    - Kullanıcılar kendi verilerini okuyabilir/yazabilir
    - Doktor bilgileri herkes tarafından okunabilir
    - Randevular sadece ilgili kullanıcı tarafından görüntülenebilir
*/

-- Users tablosu
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text,
  tckn text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Doctors tablosu
CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  department text NOT NULL,
  title text NOT NULL,
  experience_years integer NOT NULL,
  education text NOT NULL,
  languages text[] NOT NULL,
  specialties text[] NOT NULL,
  working_days text[] NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read doctors data"
  ON doctors
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Appointments tablosu
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  doctor_id uuid REFERENCES doctors(id) NOT NULL,
  date date NOT NULL,
  time time NOT NULL,
  status text NOT NULL DEFAULT 'upcoming',
  notes text,
  price numeric NOT NULL,
  is_first_visit boolean NOT NULL DEFAULT true,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own appointments"
  ON appointments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own appointments"
  ON appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own appointments"
  ON appointments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);