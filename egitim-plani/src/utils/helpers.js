import { format, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'
import { AYLAR, BADGE_VARIANTS, VARSAYILAN_KURLAR } from '../data/constants'

export function formatDate(value) {
  if (!value) {
    return '-'
  }

  return format(parseISO(value), 'dd MMM yyyy', { locale: tr })
}

export function formatDateInput(value) {
  if (!value) {
    return ''
  }

  return format(parseISO(value), 'yyyy-MM-dd')
}

export function formatCurrency(value, currency = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export function getExchangeRate(currency, currencyRates = {}) {
  const normalizedCurrency = `${currency || 'TRY'}`.trim().toUpperCase()

  if (normalizedCurrency === 'TRY') {
    return 1
  }

  return Number(currencyRates[normalizedCurrency] || VARSAYILAN_KURLAR[normalizedCurrency] || 1)
}

export function getPlanCostInTry(plan, currencyRates = {}) {
  const currency = `${plan?.maliyetParaBirimi || 'TRY'}`.trim().toUpperCase()
  const originalCost = Number(plan?.maliyet || 0)
  const rate = Number(plan?.dovizKuru || getExchangeRate(currency, currencyRates) || 1)

  return currency === 'TRY' ? originalCost : originalCost * rate
}

export function formatPlanOriginalCost(plan) {
  const currency = `${plan?.maliyetParaBirimi || 'TRY'}`.trim().toUpperCase()
  const originalCost = Number(plan?.maliyet || 0)
  return formatCurrency(originalCost, currency)
}

export function getPlanProviderLabel(plan) {
  if (!plan) {
    return '-'
  }

  if (plan.icEgitim) {
    return `${plan.egitimci || 'İç Eğitmen'}`.trim() || 'İç Eğitmen'
  }

  return `${plan.kurum || plan.egitimci || 'Kurum atanmadı'}`.trim() || 'Kurum atanmadı'
}

export function getPlanProviderTypeLabel(plan) {
  return plan?.icEgitim ? 'İç Eğitim' : 'Dış Kurum'
}

export function getMonthLabel(monthNumber) {
  return AYLAR[(monthNumber || 1) - 1]
}

export function getUniqueYears(planlar = [], talepler = []) {
  const years = new Set([
    ...planlar.map((plan) => Number(plan.egitimYili)).filter(Number.isFinite),
    ...talepler.map((talep) => Number(talep.talepYili)).filter(Number.isFinite),
  ])
  years.add(new Date().getFullYear())
  return [...years].sort((left, right) => right - left)
}

export function normalizeText(value) {
  return `${value || ''}`.toLocaleLowerCase('tr-TR')
}

export function normalizeSignatureText(value) {
  return `${value || ''}`
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function buildEgitimSignature(egitimler = []) {
  return [...egitimler]
    .filter((egitim) => egitim?.egitimAdi)
    .map((egitim) => {
      const egitimKodu = normalizeSignatureText(egitim.egitimKodu)
      const egitimAdi = normalizeSignatureText(egitim.egitimAdi)
      const kategori = normalizeSignatureText(egitim.kategori)
      return `${egitimKodu}::${egitimAdi}::${kategori}`
    })
    .sort((left, right) => left.localeCompare(right, 'tr'))
    .join('|')
}

export function formatEgitimLabel(egitim) {
  if (!egitim) {
    return '-'
  }

  const kod = `${egitim.egitimKodu || egitim.kod || ''}`.trim()
  const ad = `${egitim.egitimAdi || egitim.ad || ''}`.trim()

  if (kod && ad) {
    return `${kod} • ${ad}`
  }

  return kod || ad || '-'
}

export function buildTalepDuplicateKey(payload) {
  return [
    payload.talepYili,
    payload.yoneticiAdi,
    payload.yoneticiEmail,
    payload.gmy,
    payload.calisanAdi,
    payload.calisanSicil,
    payload.calisanKullaniciKodu,
    payload.notlar,
    buildEgitimSignature(payload.egitimler),
  ]
    .map((value) => normalizeSignatureText(value))
    .join('||')
}

export function includesText(source, query) {
  return normalizeText(source).includes(normalizeText(query))
}

export function getBadgeVariant(value) {
  return BADGE_VARIANTS[value] || 'neutral'
}

export function getEmployeeRoute(sicilNo) {
  return `/calisanlar/${sicilNo}`
}

export function downloadCsv(filename, rows) {
  if (!rows.length) {
    return
  }

  const headers = Object.keys(rows[0])
  const csvRows = [headers.join(';')]

  rows.forEach((row) => {
    const values = headers.map((header) => {
      const cell = `${row[header] ?? ''}`.replaceAll('"', '""')
      return `"${cell}"`
    })

    csvRows.push(values.join(';'))
  })

  const blob = new Blob([`\uFEFF${csvRows.join('\n')}`], {
    type: 'text/csv;charset=utf-8;',
  })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}