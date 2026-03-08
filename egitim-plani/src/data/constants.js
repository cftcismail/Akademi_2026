export const GMY_LISTESI = [
  'Finans GMY',
  'İnsan Kaynakları GMY',
  'Operasyon GMY',
  'Satış GMY',
  'Teknoloji GMY',
  'Strateji GMY',
]

export const EGITIM_KATEGORILERI = [
  'Teknik',
  'Yönetim',
  'Uyum & Mevzuat',
  'Kişisel Gelişim',
  'Satış & Pazarlama',
  'Operasyon',
]

export const EGITIM_TURLERI = ['Yıllık Plan', 'Yıllık Plan Dışı']

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
}

export const ADMIN_ROUTE = '/adminakademi'