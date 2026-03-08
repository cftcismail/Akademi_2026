# Eğitim Planı Yönetim Sistemi

Şirket içi eğitim biriminin talepleri toplamasını, eğitim planına dönüştürmesini ve üst yönetime raporlamasını sağlayan React tabanlı tek sayfa uygulaması.

## Özellikler

- Dashboard KPI kartları ve grafikler
- Eğitim talebi oluşturma, detay izleme ve plana dönüştürme
- Eğitim planı master tablosu, filtreleme, düzenleme ve silme
- Çalışan detay görünümü
- Yönetim raporları ve CSV dışa aktarma
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

## Notlar

- İlk açılışta örnek veriler yüklenir.
- Tarayıcı verisi temizlenirse kayıtlar silinir.
- Çok kullanıcılı kullanım için ileride Supabase entegrasyonu eklenebilir.
