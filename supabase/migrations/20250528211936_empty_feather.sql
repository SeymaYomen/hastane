-- Add more doctors
INSERT INTO public.doctors (full_name, department, title, experience_years, education, languages, specialties, working_days)
VALUES
  ('Mehmet Yılmaz', 'Kardiyoloji', 'Prof. Dr.', 25, 'Hacettepe Üniversitesi Tıp Fakültesi', ARRAY['Türkçe', 'İngilizce', 'Almanca'], ARRAY['Koroner Arter Hastalıkları', 'Kalp Yetmezliği', 'Hipertansiyon'], ARRAY['Pazartesi', 'Çarşamba', 'Cuma']),
  
  ('Ayşe Demir', 'Nöroloji', 'Doç. Dr.', 15, 'Ankara Üniversitesi Tıp Fakültesi', ARRAY['Türkçe', 'İngilizce'], ARRAY['Migren', 'Epilepsi', 'Multiple Skleroz'], ARRAY['Salı', 'Perşembe', 'Cumartesi']),
  
  ('Ali Kaya', 'Ortopedi', 'Prof. Dr.', 22, 'İstanbul Üniversitesi Tıp Fakültesi', ARRAY['Türkçe', 'İngilizce', 'Fransızca'], ARRAY['Diz Protezi', 'Spor Yaralanmaları', 'Omurga Cerrahisi'], ARRAY['Pazartesi', 'Salı', 'Çarşamba']),
  
  ('Zeynep Öztürk', 'Göz Hastalıkları', 'Uzm. Dr.', 12, 'Ege Üniversitesi Tıp Fakültesi', ARRAY['Türkçe', 'İngilizce'], ARRAY['Katarakt', 'Retina Hastalıkları', 'Glokom'], ARRAY['Çarşamba', 'Perşembe', 'Cuma']),
  
  ('Mustafa Aydın', 'Kulak Burun Boğaz', 'Prof. Dr.', 20, 'Gazi Üniversitesi Tıp Fakültesi', ARRAY['Türkçe', 'İngilizce'], ARRAY['Sinüzit', 'İşitme Kaybı', 'Horlama Cerrahisi'], ARRAY['Pazartesi', 'Çarşamba', 'Cuma']),
  
  ('Selin Arslan', 'Dermatoloji', 'Doç. Dr.', 14, 'Dokuz Eylül Üniversitesi Tıp Fakültesi', ARRAY['Türkçe', 'İngilizce', 'İspanyolca'], ARRAY['Akne', 'Egzama', 'Cilt Kanseri'], ARRAY['Salı', 'Perşembe', 'Cumartesi']),
  
  ('Ahmet Çelik', 'Üroloji', 'Prof. Dr.', 23, 'Marmara Üniversitesi Tıp Fakültesi', ARRAY['Türkçe', 'İngilizce'], ARRAY['Prostat Cerrahisi', 'Böbrek Taşı', 'Üroonkoloji'], ARRAY['Pazartesi', 'Salı', 'Çarşamba']),
  
  ('Elif Yıldız', 'Endokrinoloji', 'Doç. Dr.', 16, 'Cerrahpaşa Tıp Fakültesi', ARRAY['Türkçe', 'İngilizce', 'Almanca'], ARRAY['Diyabet', 'Tiroid Hastalıkları', 'Obezite'], ARRAY['Çarşamba', 'Perşembe', 'Cuma']),
  
  ('Burak Şahin', 'Gastroenteroloji', 'Prof. Dr.', 21, 'Ankara Üniversitesi Tıp Fakültesi', ARRAY['Türkçe', 'İngilizce'], ARRAY['Endoskopi', 'Karaciğer Hastalıkları', 'Ülser'], ARRAY['Pazartesi', 'Çarşamba', 'Cuma']),
  
  ('Deniz Korkmaz', 'Romatoloji', 'Uzm. Dr.', 11, 'Hacettepe Üniversitesi Tıp Fakültesi', ARRAY['Türkçe', 'İngilizce'], ARRAY['Romatoid Artrit', 'Lupus', 'Vaskülitler'], ARRAY['Salı', 'Perşembe', 'Cumartesi']),
  
  ('Canan Özkan', 'Nefroloji', 'Doç. Dr.', 17, 'İstanbul Üniversitesi Tıp Fakültesi', ARRAY['Türkçe', 'İngilizce', 'Fransızca'], ARRAY['Böbrek Yetmezliği', 'Diyaliz', 'Hipertansiyon'], ARRAY['Pazartesi', 'Salı', 'Çarşamba']),
  
  ('Murat Güneş', 'Psikiyatri', 'Prof. Dr.', 19, 'Gazi Üniversitesi Tıp Fakültesi', ARRAY['Türkçe', 'İngilizce'], ARRAY['Depresyon', 'Anksiyete', 'Bipolar Bozukluk'], ARRAY['Çarşamba', 'Perşembe', 'Cuma']),
  
  ('Esra Yalçın', 'Çocuk Sağlığı', 'Doç. Dr.', 13, 'Ege Üniversitesi Tıp Fakültesi', ARRAY['Türkçe', 'İngilizce', 'İtalyanca'], ARRAY['Çocuk Gelişimi', 'Alerji', 'Astım'], ARRAY['Pazartesi', 'Çarşamba', 'Cuma']),
  
  ('Kemal Doğan', 'Beyin Cerrahisi', 'Prof. Dr.', 24, 'Hacettepe Üniversitesi Tıp Fakültesi', ARRAY['Türkçe', 'İngilizce'], ARRAY['Beyin Tümörleri', 'Omurilik Cerrahisi', 'Travma'], ARRAY['Salı', 'Perşembe', 'Cumartesi']),
  
  ('Aylin Tekin', 'Kadın Hastalıkları', 'Uzm. Dr.', 10, 'Ankara Üniversitesi Tıp Fakültesi', ARRAY['Türkçe', 'İngilizce'], ARRAY['Doğum', 'İnfertilite', 'Jinekolojik Onkoloji'], ARRAY['Pazartesi', 'Salı', 'Çarşamba']);