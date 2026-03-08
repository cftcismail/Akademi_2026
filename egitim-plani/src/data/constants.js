export const GMY_LISTESI = [
  'Mali Yönetim Direktörlüğü',
  'İnsan Kaynakları Direktörlüğü',
  'KKST GMY',
  'SOPT GMY',
  'BİT GMY',
  'KG GMY',
  'UİGP GMY',

]

export const EGITIM_KATEGORILERI = [
  'Teknik Eğitimler',
  'Kişisel Gelişim Eğitimleri',
  'Mesleki Gelişim Eğitimleri',
  'Sertifika',
  'Konferans',
]

export const EGITIM_TURLERI = ['Yıllık Plan', 'Yıllık Plan Dışı']

export const PARA_BIRIMLERI = ['TRY', 'USD', 'EUR', 'GBP']

export const VARSAYILAN_KURLAR = {
  TRY: 1,
  USD: 38,
  EUR: 41,
  GBP: 48,
}

export const VARSAYILAN_EGITMENLER = [
  {
    id: 'trainer-ic-egitim',
    ad: 'İç Eğitim',
    kurum: 'Şirket İçi',
    email: '',
    uzmanlik: 'Genel Eğitim',
  },
]

export const DURUM_LISTESI = [
  'planlandı',
  'tamamlandı',
  'iptal edildi',
  'ertelendi',
]

export const TALEP_DURUMLARI = ['beklemede', 'plana_eklendi']

export const AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

export const KPI_KARTLARI = [
  { key: 'toplam', label: 'Toplam Planlanan Eğitim' },
  { key: 'yillikPlan', label: 'Yıllık Plan İçindeki' },
  { key: 'planDisi', label: 'Yıllık Plan Dışındaki' },
  { key: 'calisan', label: 'Toplam Eğitim Alan Çalışan' },
]

export const BADGE_VARIANTS = {
  beklemede: 'warning',
  plana_eklendi: 'info',
  planlandı: 'info',
  tamamlandı: 'success',
  'iptal edildi': 'danger',
  ertelendi: 'warning',
  'Yıllık Plan': 'primary',
  'Yıllık Plan Dışı': 'accent',
}

export const ROUTE_BASLIKLARI = {
  '/': {
    title: 'Dashboard',
    description: 'Eğitim planının genel görünümü ve yönetim KPI göstergeleri.',
  },
  '/talepler': {
    title: 'Eğitim Talepleri',
    description: 'Yöneticilerden gelen talepleri takip edin ve plana dönüştürün.',
  },
  '/plan': {
    title: 'Eğitim Planı',
    description: 'Yıllık plan içi ve dışı tüm eğitim kayıtlarını yönetin.',
  },
  '/raporlar': {
    title: 'Raporlar',
    description: 'Yönetim sunumuna uygun özet veriler ve ihracat araçları.',
  },
}

export const LOCAL_STORAGE_KEYS = {
  katalog: 'egitim-plani:katalog',
  talepler: 'egitim-plani:talepler',
  planlar: 'egitim-plani:planlar',
  gmyList: 'egitim-plani:gmy-list',
  egitimKategorileri: 'egitim-plani:egitim-kategorileri',
  egitmenListesi: 'egitim-plani:egitmen-listesi',
  kurBilgileri: 'egitim-plani:kur-bilgileri',
}

export const ADMIN_ROUTE = '/adminakademi'