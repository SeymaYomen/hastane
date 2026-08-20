# AI Safety Principles

Bu proje içinde kullanılan yapay zekâ özellikleri aşağıdaki kurallara uymalıdır.

## 1. AI tıbbi otorite değildir

AI tanı koymaz.

AI doktor tarafından oluşturulmamış tedavi, ilaç veya bakım talimatı üretmez.

AI mevcut ve doğrulanmış sistem verisini düzenleyebilir, özetleyebilir ve kullanıcı için anlaşılır hale getirebilir.

## 2. AI iş kuralı üretmez

Randevu uygunluğu, doluluk kontrolü, slot seçimi, laboratuvar referans aralıkları ve benzeri işlemler uygulamanın gerçek iş kurallarından alınır.

AI kendi başına randevu saati, doktor, bölüm veya klinik veri uyduramaz.

AI tarafından döndürülen bölüm, doktor, randevu ve diğer sistem değerleri veritabanındaki gerçek kayıtlarla doğrulanmalıdır.

## 3. Kritik sağlık kuralları deterministik olmalıdır

Acil veya kritik belirtilerin kontrolü yalnızca LLM kararına bırakılmaz.

Gerekli güvenlik kuralları uygulama tarafından ayrıca kontrol edilir.

## 4. AI çıktıları yapılandırılmış olmalıdır

Mümkün olduğunda serbest metin yerine doğrulanabilir yapılandırılmış veri kullanılmalıdır.

Örnek:

{
  "message": "...",
  "suggestedDepartment": "...",
  "urgency": "..."
}

Bu veriler kullanılmadan önce uygulama tarafından doğrulanır.

## 5. AI çağrıları sınırsız değildir

Her AI isteği:

- kimlik doğrulama,
- rol ve yetki kontrolü,
- mesaj uzunluğu kontrolü,
- rate limit,
- kullanıcı/klinik kullanım kotası,
- gerekli veri doğrulaması

aşamalarından geçmelidir.

## 6. Hassas sağlık verileri gereksiz yere kaydedilmez

AI kullanım kayıtlarında mümkün olduğunca mesaj içeriği yerine:

- kullanıcı,
- klinik,
- özellik türü,
- kullanılan model,
- token miktarı,
- yanıt süresi,
- durum

gibi teknik kullanım bilgileri tutulur.

## 7. Tek iş kuralı, tek kaynak

Aynı iş kuralı farklı AI özelliklerinde yeniden yazılmaz.

Örneğin randevu önerisi için tek bir ortak slot öneri motoru kullanılmalıdır.

Randevu sayfası ve sağlık asistanı aynı motoru çağırmalıdır.

## 8. AI yazma işlemleri açık onay gerektirir

AI ilk aşamada salt-okunur çalışır.

Randevu oluşturma, değiştirme veya başka bir veritabanı yazma işlemi ileride eklendiğinde kullanıcıya işlem öncesinde açık bir özet gösterilmelidir.

Kullanıcının açık onayı olmadan işlem gerçekleştirilmez.

## 9. Doktor AI çıktısını onaylar

İleride klinik not, dikte veya doktor asistanı özellikleri eklendiğinde AI çıktısı taslak niteliğindedir.

Doktor onaylamadan kalıcı klinik kayıt haline gelmez.