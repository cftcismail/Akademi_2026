# Eğitim Planı Yönetim Sistemi

Şirket içi eğitim biriminin talepleri toplamasını, eğitim planına dönüştürmesini ve üst yönetime raporlamasını sağlayan React tabanlı tek sayfa uygulaması. Bu sürümde sistem merkezî Node API ve PostgreSQL ile ortak veri modeli üzerinden çalışır.

## Özellikler

- Dashboard KPI kartları ve grafikler
- İç eğitmen dashboard ekranı ve ödül adaylığı görünümü
- Eğitim talebi oluşturma, detay izleme ve plana dönüştürme
- Excel ile toplu talep içeri aktarma
- Kurum ve iç eğitmen listeleri için Excel ile toplu içeri aktarma
- Mükerrer satırlar için kapatılabilir popup uyarısı
- İç eğitim ve dış kurum ayrımıyla tekli ve toplu planlama
- Çalışan detay görünümü
- Yönetim raporları, CSV dışa aktarma ve PDF alma
- `/adminakademi` adresinde şifre korumalı admin ekranı
- Node API + PostgreSQL ile ortak veri katmanı
- Docker Compose ile tam production stack yayını
- API erişilemediğinde localStorage fallback davranışı

## Yerel Kurulum

```bash
npm install
npm run dev
```

Uygulama varsayılan olarak http://localhost:5173 adresinde açılır.

Merkezî API ile yerelde çalışmak için ayrı terminalde:

```bash
npm run dev:server
```

API varsayılan olarak http://localhost:3001 adresinde açılır. Frontend geliştirme ortamında API kullanmak için `.env` içinde şu değeri tanımlayabilirsiniz:

```bash
VITE_API_BASE_URL=http://localhost:3001/api
```

## Docker ile Kurulum

```bash
docker compose up --build
```

Uygulama http://localhost:8080 adresinde yayınlanır.

Docker Compose aşağıdaki servisleri ayağa kaldırır:

- `egitim-plani`: Nginx üzerinden servis edilen React frontend
- `api`: Express tabanlı Node API
- `postgres`: PostgreSQL veri tabanı

Admin ekranı: `http://localhost:8080/adminakademi`

İç eğitmen dashboard: `http://localhost:8080/ic-egitmen-dashboard`

Admin şifresi: `Akademi.123`

Arka planda çalıştırmak için:

```bash
docker compose up --build -d
```

Servis durumunu görmek için:

```bash
docker compose ps
```

Servisi durdurmak için:

```bash
docker compose down
```

## Teknoloji Yığını

- React 19
- Vite
- Express 5
- PostgreSQL 16
- React Router DOM
- Recharts
- Tailwind CSS v4
- Radix Dialog
- date-fns
- lucide-react
- react-hot-toast

## Veri Yapısı

Veriler PostgreSQL içinde ilişkisel tablolar üzerinde merkezî olarak saklanır. Kullanılan ana tablolar: `catalog`, `exchange_rates`, `gmy_list`, `institutions`, `plans`, `request_trainings`, `requests`, `trainers`, `training_categories`. Frontend çevrimdışı/fallback amaçlı aynı verileri tarayıcıda da aşağıdaki anahtarlarla önbelleğe alır:

- `egitim-plani:katalog`
- `egitim-plani:talepler`
- `egitim-plani:planlar`
- `egitim-plani:kurum-listesi`
- `egitim-plani:egitmen-listesi`
- `egitim-plani:kur-bilgileri`

## Excel İçeri Aktarma

Talepler ekranındaki yükleme alanı `.xlsx`, `.xls` ve `.csv` dosyalarını kabul eder. İlk sayfadaki veriler aşağıdaki kolon isimleriyle okunur:

- Hazır örnek dosya: `public/ornek-talep-aktarim.xlsx`
- Kurum örnek dosyası: `public/ornek-kurum-listesi.xlsx`
- İç eğitmen örnek dosyası: `public/ornek-ic-egitmen-listesi.xlsx`

- `Yönetici Adı`
- `Yönetici E-posta`
- `GMY`
- `Lokasyon`
- `Çalışan Adı`
- `Çalışan Sicil No`
- `Çalışan Kullanıcı Kodu`
- `Notlar`
- `Eğitim 1 Kodu`, `Eğitim 1 Adı`, `Eğitim 1 Kategori`
- `Eğitim 2 Kodu`, `Eğitim 2 Adı`, `Eğitim 2 Kategori`
- `Eğitim 3 Kodu`, `Eğitim 3 Adı`, `Eğitim 3 Kategori`
- `Eğitim 4 Kodu`, `Eğitim 4 Adı`, `Eğitim 4 Kategori`

Lokasyon bilgisi talep, planlama, dashboard ve raporlarda birlikte kullanılır. Planlama ekranında girilen bütçe artık kişi başı değil, ilgili planlama işleminin toplam bütçesi olarak saklanır; dashboard ve raporlar bu toplamı seçili kayıt adedine göre dağıtarak gösterir.

## Notlar

- İlk açılışta örnek kayıt yüklenmez; ekranlar boş başlar.
- PostgreSQL çalışan sürece veriler tarayıcıdan bağımsız olarak tüm kullanıcılara ortak görünür.
- API geçici olarak erişilemezse uygulama tarayıcıdaki son yerel kopya ile çalışmaya devam eder.
- Aynı çalışan ve aynı içerik tekrar eklenirse kayıt atlanır ve uyarı listesinde gösterilir.
- Admin ekranından GMY listesi eklenebilir, güncellenebilir ve kullanılmayan kayıtlar kaldırılabilir.
- Gelişmiş kimlik doğrulama, kullanıcı yetkileri ve denetim izi için bir sonraki adım API tarafında rol bazlı auth eklemektir.
