const COLUMN_ALIASES = {
    yoneticiadi: 'yoneticiAdi',
    yoneticiad: 'yoneticiAdi',
    yneticiadi: 'yoneticiAdi',
    yneticiad: 'yoneticiAdi',
    yoneticiadisoyadi: 'yoneticiAdi',
    yonetici: 'yoneticiAdi',
    mudur: 'yoneticiAdi',
    yoneticieposta: 'yoneticiEmail',
    yoneticiep: 'yoneticiEmail',
    yoneticiemail: 'yoneticiEmail',
    yneticieposta: 'yoneticiEmail',
    yneticiemail: 'yoneticiEmail',
    yoneticimail: 'yoneticiEmail',
    gmy: 'gmy',
    genelmuduryardimcisi: 'gmy',
    lokasyon: 'calisanLokasyon',
    calisanlokasyon: 'calisanLokasyon',
    alanlokasyon: 'calisanLokasyon',
    lokasyonbilgisi: 'calisanLokasyon',
    sube: 'calisanLokasyon',
    bolge: 'calisanLokasyon',
    calisanadi: 'calisanAdi',
    calisanad: 'calisanAdi',
    calisanadisoyadi: 'calisanAdi',
    alanadi: 'calisanAdi',
    alanad: 'calisanAdi',
    personeladi: 'calisanAdi',
    personelad: 'calisanAdi',
    personeladisoyadi: 'calisanAdi',
    adsoyad: 'calisanAdi',
    adisoyadi: 'calisanAdi',
    isim: 'calisanAdi',
    calisankullanicikodu: 'calisanKullaniciKodu',
    calisankul: 'calisanKullaniciKodu',
    alankullanicikodu: 'calisanKullaniciKodu',
    alankullanickodu: 'calisanKullaniciKodu',
    alankullanckodu: 'calisanKullaniciKodu',
    calisankod: 'calisanKullaniciKodu',
    kullanicikodu: 'calisanKullaniciKodu',
    calisansicil: 'calisanSicil',
    calisansicilno: 'calisanSicil',
    calisansic: 'calisanSicil',
    alansicil: 'calisanSicil',
    alansicilno: 'calisanSicil',
    sicil: 'calisanSicil',
    sicilno: 'calisanSicil',
    sicilnumarasi: 'calisanSicil',
    notlar: 'notlar',
    not: 'notlar',
    aciklama: 'notlar',
    aciklamalar: 'notlar',
}

function normalizeImportHeader(value) {
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
            calisanLokasyon: '',
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

            const egitimMatch = key.match(/^(?:egitim|eitim|gitim)([1-4])?(adi|ad|kategori|kat|ka|kodu|kod|ko)$/)
            if (!egitimMatch) {
                return
            }

            const egitimIndex = egitimMatch[1] ? Number(egitimMatch[1]) - 1 : 0
            const egitimField = egitimMatch[2]
            const nextEgitim = mapped.egitimler[egitimIndex] || {
                egitimKodu: '',
                egitimAdi: '',
                kategori: 'Teknik',
            }

            if (egitimField === 'kodu' || egitimField === 'kod' || egitimField === 'ko') {
                nextEgitim.egitimKodu = `${value || ''}`.trim()
            }

            if (egitimField === 'adi' || egitimField === 'ad') {
                nextEgitim.egitimAdi = `${value || ''}`.trim()
            }

            if (egitimField === 'kategori' || egitimField === 'kat' || egitimField === 'ka') {
                nextEgitim.kategori = `${value || ''}`.trim() || 'Teknik'
            }

            mapped.egitimler[egitimIndex] = nextEgitim
        })

        mapped.egitimler = mapped.egitimler.filter(Boolean)
        return mapped
    })
}
