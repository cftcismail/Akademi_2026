# Eğitim Planı Yönetim Sistemi

Şirket içi eğitim biriminin talepleri toplamasını, eğitim planına dönüştürmesini ve üst yönetime raporlamasını sağlayan React tabanlı tek sayfa uygulaması.

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
- localStorage tabanlı kalıcı tarayıcı verisi
- Docker ile üretim yayını

## Yerel Kurulum

```bash
npm install
npm run dev
```

Uygulama varsayılan olarak http://localhost:5173 adresinde açılır.

## Docker ile Kurulum

```bash
docker compose up --build
```

Uygulama http://localhost:8080 adresinde yayınlanır.

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
- React Router DOM
- Recharts
- Tailwind CSS v4
- Radix Dialog
- date-fns
- lucide-react
- react-hot-toast

## Veri Yapısı

Veriler tarayıcı localStorage üzerinde aşağıdaki anahtarlarla saklanır:

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
- `Çalışan Adı`
- `Çalışan Sicil No`
- `Çalışan Kullanıcı Kodu`
- `Notlar`
- `Eğitim 1 Adı`, `Eğitim 1 Kategori`
- `Eğitim 2 Adı`, `Eğitim 2 Kategori`
- `Eğitim 3 Adı`, `Eğitim 3 Kategori`
- `Eğitim 4 Adı`, `Eğitim 4 Kategori`

## Notlar

- İlk açılışta örnek kayıt yüklenmez; ekranlar boş başlar.
- Tarayıcı verisi temizlenirse kayıtlar silinir.
- Aynı çalışan ve aynı içerik tekrar eklenirse kayıt atlanır ve uyarı listesinde gösterilir.
- Admin ekranından GMY listesi eklenebilir, güncellenebilir ve kullanılmayan kayıtlar kaldırılabilir.
- Çok kullanıcılı kullanım için ileride Supabase entegrasyonu eklenebilir.
