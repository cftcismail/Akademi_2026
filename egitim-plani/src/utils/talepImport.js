const COLUMN_ALIASES = {
  yoneticiadi: 'yoneticiAdi',
  yoneticieposta: 'yoneticiEmail',
  yoneticiemail: 'yoneticiEmail',
  gmy: 'gmy',
  calisanadi: 'calisanAdi',
  calisankullanicikodu: 'calisanKullaniciKodu',
  calisankod: 'calisanKullaniciKodu',
  kullanicikodu: 'calisanKullaniciKodu',
  calisansicil: 'calisanSicil',
  calisansicilno: 'calisanSicil',
  notlar: 'notlar',
}

export function normalizeImportHeader(value) {
  return `${value || ''}`
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ı', 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

export function mapExcelRowsToTalepler(rows) {
  return rows.map((row, index) => {
    const mapped = {
      yoneticiAdi: '',
      yoneticiEmail: '',
      gmy: '',
      calisanAdi: '',
      calisanSicil: '',
      calisanKullaniciKodu: '',
      notlar: '',
      egitimler: [],
      rowNumber: index + 2,
    }

    Object.entries(row).forEach(([rawKey, rawValue]) => {
      const key = normalizeImportHeader(rawKey)
      const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue
      const directField = COLUMN_ALIASES[key]

      if (directField) {
        mapped[directField] = `${value || ''}`
        return
      }

      const egitimMatch = key.match(/^egitim([1-4])(adi|kategori|kodu)$/)

      if (!egitimMatch) {
        return
      }

      const egitimIndex = Number(egitimMatch[1]) - 1
      const egitimField = egitimMatch[2]
      const nextEgitim = mapped.egitimler[egitimIndex] || {
        egitimKodu: '',
        egitimAdi: '',
        kategori: 'Teknik',
      }

      if (egitimField === 'kodu') {
        nextEgitim.egitimKodu = `${value || ''}`.trim()
      }

      if (egitimField === 'adi') {
        nextEgitim.egitimAdi = `${value || ''}`.trim()
      }

      if (egitimField === 'kategori') {
        nextEgitim.kategori = `${value || ''}`.trim() || 'Teknik'
      }

      mapped.egitimler[egitimIndex] = nextEgitim
    })

    mapped.egitimler = mapped.egitimler.filter(Boolean)
    return mapped
  })
}