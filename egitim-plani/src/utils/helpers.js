import { format, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'
import { AYLAR, BADGE_VARIANTS } from '../data/constants'

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

export function formatCurrency(value) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export function getMonthLabel(monthNumber) {
  return AYLAR[(monthNumber || 1) - 1]
}

export function getUniqueYears(planlar) {
  const years = new Set(planlar.map((plan) => plan.egitimYili))
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
      const egitimAdi = normalizeSignatureText(egitim.egitimAdi)
      const kategori = normalizeSignatureText(egitim.kategori)
      return `${egitimAdi}::${kategori}`
    })
    .sort((left, right) => left.localeCompare(right, 'tr'))
    .join('|')
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