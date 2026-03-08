# 🎓 Eğitim Planı Yönetim Sistemi — Geliştirme Kılavuzu

> Bu dosyayı VS Code'da GitHub Copilot, Cursor veya Claude uzantısına şu şekilde kullanabilirsiniz:
> "Bu dosyadaki talimatlara göre React uygulamasını adım adım oluştur" diyerek yapıştırın.

---

## 📌 Proje Özeti

Şirket içi eğitim biriminin yöneticilerden gelen eğitim taleplerini takip etmesini, eğitim planına kayıt etmesini ve yöneticilere/üst yönetime görsel dashboard ile raporlama sunmasını sağlayan tek sayfalı (SPA) bir React web uygulaması.

---

## 🛠️ Teknoloji Seçimi

### Frontend
- **React** (Vite ile kurulum — `npm create vite@latest`)
- **React Router DOM** — sayfa geçişleri için
- **Recharts** — grafik ve dashboard için
- **Tailwind CSS** — hızlı ve güzel UI için
- **shadcn/ui** — hazır UI bileşenleri (tablo, modal, form vb.)
- **date-fns** — tarih formatlama
- **lucide-react** — ikonlar

### Veri Tabanı (Backend Yok — Tamamen Tarayıcıda Çalışır)
- **localStorage** kullanılacak (JSON formatında tarayıcıda saklanır)
- Kurulum gerektirmez, sunucu gerekmez
- İleride büyütmek istenirse **Supabase** (ücretsiz, PostgreSQL tabanlı) kolayca entegre edilebilir.

Docker ile kurulum yapmalısın.

> ⚠️ **Not:** Uygulama tek bir bilgisayarda çalışır. Birden fazla kişi kullanacaksa veya veriler kaybolmamalıysa ileride Supabase entegrasyonu eklenmeli.

---

## 📁 Proje Dizin Yapısı

```
egitim-plani/
├── public/
├── src/
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Sidebar.jsx          # Sol menü
│   │   │   └── Header.jsx           # Üst bar
│   │   ├── Dashboard/
│   │   │   ├── Dashboard.jsx        # Ana dashboard sayfası
│   │   │   ├── StatCard.jsx         # Özet sayı kartları
│   │   │   ├── EgitimDurumChart.jsx # Pasta grafik
│   │   │   ├── AylikPlanChart.jsx   # Aylık bar grafik
│   │   │   ├── GMYChart.jsx         # GMY bazlı grafik
│   │   │   └── TopEgitimlerChart.jsx# En çok talep edilen eğitimler
│   │   ├── Talepler/
│   │   │   ├── TalepListesi.jsx     # Tüm talepler tablosu
│   │   │   ├── TalepDetay.jsx       # Tekil talep detayı
│   │   │   └── TalepForm.jsx        # Yeni talep ekleme formu
│   │   ├── EgitimPlani/
│   │   │   ├── EgitimPlani.jsx      # Yıllık plan tablosu
│   │   │   ├── PlanEkleModal.jsx    # Plana kayıt modalı
│   │   │   └── PlanFiltrele.jsx     # Filtreleme paneli
│   │   ├── Raporlar/
│   │   │   └── Raporlar.jsx         # Detaylı raporlar sayfası
│   │   └── ui/                      # shadcn bileşenleri buraya gelir
│   ├── data/
│   │   ├── initialData.js           # Örnek başlangıç verisi
│   │   └── constants.js             # Sabit listeler (GMY isimleri, birimler vb.)
│   ├── hooks/
│   │   ├── useLocalStorage.js       # localStorage custom hook
│   │   └── useEgitimData.js         # Tüm veri işlemleri
│   ├── utils/
│   │   └── helpers.js               # Yardımcı fonksiyonlar
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── package.json
└── vite.config.js
```

---

## 🗃️ Veri Modelleri (localStorage'da JSON olarak saklanır)

### 1. Talep (Request)
```json
{
  "id": "uuid-string",
  "yoneticiAdi": "Ali Yılmaz",
  "yoneticiEmail": "ali.yilmaz@sirket.com",
  "gmy": "Finans GMY",
  "birim": "Muhasebe",
  "calisanAdi": "Ayşe Kaya",
  "calisanSicil": "12345",
  "egitimler": [
    {
      "egitimId": "uuid",
      "egitimAdi": "Excel İleri Düzey",
      "kategori": "Teknik",
      "oncelik": 1
    },
    {
      "egitimId": "uuid",
      "egitimAdi": "Liderlik Becerileri",
      "kategori": "Yönetim",
      "oncelik": 2
    }
  ],
  "talepTarihi": "2025-01-15",
  "notlar": "Çalışan Q2'de terfi edecek",
  "durum": "beklemede"
}
```
> **Kural:** `egitimler` dizisi minimum 1, maksimum 4 eleman içerebilir. Form validasyonunda bunu kontrol et.

### 2. Eğitim Planı Kaydı (TrainingPlan)
```json
{
  "id": "uuid-string",
  "talepId": "talep-uuid",
  "calisanAdi": "Ayşe Kaya",
  "calisanSicil": "12345",
  "gmy": "Finans GMY",
  "birim": "Muhasebe",
  "egitimAdi": "Excel İleri Düzey",
  "kategori": "Teknik",
  "egitimTuru": "Yıllık Plan",
  "planlanmaTarihi": "2025-03-10",
  "egitimTarihi": "2025-04-15",
  "egitimAyi": 4,
  "egitimYili": 2025,
  "sure": "2 gün",
  "egitimci": "İç Eğitim",
  "maliyet": 0,
  "durum": "planlandı",
  "notlar": ""
}
```

### 3. Eğitim Listesi (Catalog)
```json
{
  "id": "uuid-string",
  "ad": "Excel İleri Düzey",
  "kategori": "Teknik",
  "sure": "1 gün",
  "aciklama": ""
}
```

### 4. Sabit Listeler (constants.js)
```javascript
export const GMY_LISTESI = [
  "Finans GMY",
  "İnsan Kaynakları GMY",
  "Operasyon GMY",
  "Satış GMY",
  "Teknoloji GMY",
  "Strateji GMY"
  // Gerçek GMY isimlerini buraya ekle
];

export const EGITIM_KATEGORILERI = [
  "Teknik",
  "Yönetim",
  "Uyum & Mevzuat",
  "Kişisel Gelişim",
  "Satış & Pazarlama",
  "Operasyon"
];

export const EGITIM_TURLERI = [
  "Yıllık Plan",
  "Yıllık Plan Dışı"
];

export const DURUM_LISTESI = [
  "planlandı",
  "tamamlandı",
  "iptal edildi",
  "ertelendi"
];
```

---

## 📄 Sayfalar ve Özellikler

### 🏠 1. Dashboard (Ana Sayfa)

**URL:** `/`

**Üst Kısım — KPI Kartları (4 adet büyük kart):**
| Kart | Hesaplama |
|------|-----------|
| Toplam Planlanan Eğitim | Tüm plan kayıtları sayısı |
| Yıllık Plan İçindeki | `egitimTuru === "Yıllık Plan"` olanlar |
| Yıllık Plan Dışındaki | `egitimTuru === "Yıllık Plan Dışı"` olanlar |
| Toplam Eğitim Alan Çalışan | Benzersiz `calisanSicil` sayısı |

**Grafikler (alt kısım):**

1. **Aylık Dağılım Bar Grafik** (Recharts BarChart)
   - X ekseni: Aylar (Oca, Şub, Mar...)
   - Y ekseni: Eğitim sayısı
   - İki bar yan yana: "Yıllık Plan" (mavi) ve "Yıllık Plan Dışı" (turuncu)

2. **Eğitim Durumu Pasta Grafik** (Recharts PieChart)
   - Dilimler: planlandı / tamamlandı / iptal / ertelendi

3. **GMY Bazlı Bar Grafik** (Recharts BarChart, yatay)
   - Y ekseni: GMY isimleri
   - X ekseni: O GMY'e ait toplam eğitim sayısı
   - Hover'da: kaç çalışan, kaç farklı eğitim bilgisi göster

4. **En Çok Talep Edilen Eğitimler** (Recharts BarChart)
   - İlk 10 eğitimi göster
   - Talep sayısına göre sıralı

**Filtreler (dashboard üstünde):**
- Yıl seçici (varsayılan: aktif yıl)
- GMY filtresi (dropdown)

---

### 📥 2. Talepler Sayfası

**URL:** `/talepler`

**Amaç:** Yöneticilerden gelen eğitim taleplerini listele ve yeni talep ekle.

**Tablo Kolonları:**
| Kolon | Açıklama |
|-------|----------|
| Çalışan Adı | |
| Sicil No | |
| Birim | |
| GMY | |
| Talep Edilen Eğitimler | 1-4 arası eğitim listesi (etiket/chip olarak) |
| Talep Tarihi | |
| Durum | Plana Eklendi / Beklemede |
| İşlemler | Detay Gör, Plana Ekle butonu |

**"Plana Ekle" Butonu:**
- Tıklayınca `PlanEkleModal` açılır
- Modal içinde çalışan ve yönetici bilgileri otomatik dolu gelir
- Hangi eğitim(ler)in planlanacağı seçilir (o çalışanın talep ettiği eğitimlerden)
- Tarih, tür (Yıllık Plan / Dışı), süre, eğitimci bilgileri girilir
- Kaydet'e basınca hem plan tablosuna eklenir hem talebin durumu "Plana Eklendi" olur

**"Yeni Talep Ekle" Butonu:**
- `TalepForm` modalını açar
- Form alanları:
  - Yönetici Adı (text)
  - Yönetici E-posta (email)
  - GMY (dropdown — constants.js'den)
  - Birim (text)
  - Çalışan Adı (text)
  - Çalışan Sicil No (text)
  - Eğitimler (dinamik liste — min 1, maks 4)
    - Her eğitim için: Eğitim Adı (dropdown + serbest text), Kategori, Öncelik
    - "+ Eğitim Ekle" butonu (4'e ulaşınca devre dışı kalır)
  - Notlar (textarea)

---

### 📅 3. Eğitim Planı Sayfası

**URL:** `/plan`

**Amaç:** Yıl içinde planlanan tüm eğitimlerin master listesi.

**Filtreleme Paneli (sol veya üst):**
- Yıl
- Ay
- GMY
- Eğitim Türü (Yıllık Plan / Dışı)
- Durum
- Çalışan Adı (arama)

**Tablo Kolonları:**
| Kolon |
|-------|
| Çalışan Adı |
| Sicil |
| GMY |
| Birim |
| Eğitim Adı |
| Kategori |
| Eğitim Türü (Yıllık Plan / Dışı) — renkli badge |
| Planlanan Tarih |
| Ay |
| Süre |
| Eğitimci |
| Durum — renkli badge |
| İşlemler (Düzenle, Sil) |

**Sayfa altında özet satırı:** Filtreye göre toplam kayıt sayısı gösterilir.

---

### 👤 4. Çalışan Detay Görünümü

**URL:** `/calisanlar/:sicilNo`

**Amaç:** Tek bir çalışanın tüm eğitim geçmişi ve planı.

- Çalışan bilgi kartı (ad, sicil, birim, GMY)
- Kaç eğitim talep etmiş
- Kaçı plana eklenmiş
- Eğitimler tablosu (tarih, durum, tür)
- Mini timeline görünümü (opsiyonel)

---

### 📊 5. Raporlar Sayfası

**URL:** `/raporlar`

**Amaç:** Üst yönetime sunulacak özet veriler.

**Rapor Kartları:**

| Rapor Sorusu | Görünüm |
|--------------|---------|
| Yıl içinde kaç eğitim planlandı? | Büyük sayı + önceki yıl karşılaştırması |
| Kaçı yıllık plan içinde / dışında? | Yatay bar + yüzdeler |
| Toplamda kaç kişiye planlandı? | Büyük sayı |
| Hangi GMY için kaç eğitim planlandı? | Tablo + bar grafik |
| 1 çalışan için ortalama kaç eğitim? | Büyük sayı (toplam kayıt / benzersiz çalışan) |
| En çok eğitim planlanan çalışanlar | Top 10 tablo |
| Aya göre yük dağılımı | Isı haritası veya bar grafik |

**Export Butonu:** "Excel'e Aktar" (CSV olarak indir — `Papa Parse` veya `xlsx` kütüphanesi ile)

---

## 🎨 UI/UX Tasarım Direktifleri

### Renk Paleti
```css
:root {
  --primary: #1E3A5F;       /* Koyu lacivert — kurumsal */
  --primary-light: #2D5F8A;
  --accent: #F59E0B;        /* Amber — vurgu rengi */
  --success: #10B981;       /* Yeşil — tamamlandı */
  --warning: #F59E0B;       /* Sarı — beklemede */
  --danger: #EF4444;        /* Kırmızı — iptal */
  --bg: #F8FAFC;            /* Arka plan */
  --surface: #FFFFFF;       /* Kart yüzeyi */
  --border: #E2E8F0;
  --text-primary: #1A202C;
  --text-secondary: #64748B;
}
```

### Tipografi
- Başlıklar: `"Plus Jakarta Sans"` (Google Fonts)
- Gövde: `"Inter"` (Google Fonts)

### Genel UI Kuralları
- Sidebar sabit sol menü (collapsed/expanded toggle)
- Tüm kartlar `box-shadow: 0 1px 3px rgba(0,0,0,0.1)` ile hafif gölgeli
- Tablolar zebra stripe (her iki satırda bir hafif gri)
- Badge/chip renkleri: durum alanları için renkli arka planlı yuvarlak etiketler
- Responsive: tablet ve masaüstü öncelikli (mobil opsiyonel)
- Loading spinner: veri yüklenirken göster
- Toast notification: kayıt/silme işlemlerinden sonra göster (`react-hot-toast`)

---

## ⚙️ Kurulum Adımları (VS Code'da)

### 1. Projeyi Oluştur
```bash
npm create vite@latest egitim-plani -- --template react
cd egitim-plani
npm install
```

### 2. Bağımlılıkları Yükle
```bash
npm install react-router-dom recharts tailwindcss @tailwindcss/vite
npm install lucide-react date-fns react-hot-toast
npm install @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-dropdown-menu
npm install xlsx uuid
```

### 3. Tailwind Yapılandır
`vite.config.js` içine Tailwind plugin'i ekle.
`src/index.css` üstüne Tailwind direktiflerini ekle:
```css
@import "tailwindcss";
```

### 4. Uygulamayı Başlat
```bash
npm run dev
```
Tarayıcıda `http://localhost:5173` adresine git.

---

## 🤖 AI'ya Söylenecek Prompt Sırası

Bu dosyayı AI aracına (Cursor, GitHub Copilot, Claude) verdikten sonra şu sırayla isteyin:

1. **"Proje iskeletini ve klasör yapısını oluştur, boş dosyaları yarat"**
2. **"constants.js ve initialData.js dosyalarını örnek verilerle oluştur"**
3. **"useLocalStorage.js ve useEgitimData.js hook'larını yaz"**
4. **"Layout bileşenlerini (Sidebar ve Header) oluştur"**
5. **"Dashboard sayfasını ve tüm grafik bileşenlerini oluştur"**
6. **"Talepler sayfasını, TalepForm ve PlanEkleModal bileşenlerini oluştur"**
7. **"Eğitim Planı sayfasını ve filtrelerini oluştur"**
8. **"Raporlar sayfasını oluştur"**
9. **"CSV/Excel export özelliğini ekle"**
10. **"Genel UI iyileştirmeleri ve responsive düzeltmeleri yap"**

---

## 🔮 İleride Eklenebilecekler (Kapsam Dışı)

- **Supabase entegrasyonu:** Veriler bulutta, birden fazla kullanıcı
- **Kullanıcı girişi:** Kim hangi GMY'e ait talepleri görebilir
- **E-posta bildirimi:** Talep onaylandığında yöneticiye otomatik mail
- **Eğitim takvimi görünümü:** Aylık/haftalık calendar view
- **PDF rapor çıktısı:** Üst yönetime sunumu için otomatik PDF
- **Çoklu yıl karşılaştırması:** 2024 vs 2025 grafikleri

---

## ❓ Sık Sorulan Sorular

**S: Veriler kaybolur mu?**
localStorage kullanıldığı için tarayıcı verileri temizlenirse silinir. Düzenli CSV export ile yedek alınmalı.

**S: Birden fazla kişi aynı anda kullanabilir mi?**
Hayır. localStorage tek kullanıcılıdır. Çok kullanıcılı yapı için Supabase entegrasyonu gerekir.

**S: Mobilde çalışır mı?**
Temel düzeyde çalışır, ancak tablo ve grafikler masaüstü odaklı tasarlanmıştır.

---

*Bu dosya, uygulamanın tam spesifikasyonunu içermektedir. AI aracınıza "bu PRD dosyasına göre uygulamayı adım adım geliştir" diyerek başlayabilirsiniz.*