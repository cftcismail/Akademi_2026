import { format, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'
import { AYLAR, BADGE_VARIANTS, VARSAYILAN_KURLAR } from '../data/constants'

function buildTrainingKey(item) {
  return `${normalizeSignatureText(item?.egitimKodu)}::${normalizeSignatureText(item?.egitimAdi)}`
}

function createCoverageRow(item, availablePlanCount) {
  const matchedPlanCount = Math.min(item.talep, availablePlanCount)

  return {
    ...item,
    plan: matchedPlanCount,
    toplamPlan: availablePlanCount,
    acik: Math.max(item.talep - matchedPlanCount, 0),
    coverageRate: item.talep ? (matchedPlanCount / item.talep) * 100 : 0,
  }
}

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
  const totalOriginalCost = Number(plan?.toplamMaliyet ?? plan?.maliyet ?? 0)
  const shareCount = Math.max(1, Number(plan?.butcePaylasimAdedi || 1))
  const originalCost = totalOriginalCost / shareCount
  const rate = Number(plan?.dovizKuru || getExchangeRate(currency, currencyRates) || 1)

  return currency === 'TRY' ? originalCost : originalCost * rate
}

export function formatPlanOriginalCost(plan) {
  const currency = `${plan?.maliyetParaBirimi || 'TRY'}`.trim().toUpperCase()
  const totalOriginalCost = Number(plan?.toplamMaliyet ?? plan?.maliyet ?? 0)
  const shareCount = Math.max(1, Number(plan?.butcePaylasimAdedi || 1))
  const originalCost = totalOriginalCost / shareCount
  return formatCurrency(originalCost, currency)
}

export function formatPlanTotalBudget(plan) {
  const currency = `${plan?.maliyetParaBirimi || 'TRY'}`.trim().toUpperCase()
  return formatCurrency(Number(plan?.toplamMaliyet ?? plan?.maliyet ?? 0), currency)
}

export function getPlanOriginalCostShare(plan) {
  const totalOriginalCost = Number(plan?.toplamMaliyet ?? plan?.maliyet ?? 0)
  const shareCount = Math.max(1, Number(plan?.butcePaylasimAdedi || 1))
  return totalOriginalCost / shareCount
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
    payload.talepKaynagi || 'Yıllık Talep',
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

export function getTalepKaynagiLabel(talep) {
  return `${talep?.talepKaynagi || 'Yıllık Talep'}`.trim() || 'Yıllık Talep'
}

export function getLokasyonLabel(record) {
  return `${record?.calisanLokasyon || ''}`.trim() || 'Lokasyon Yok'
}

export function summarizeDemandCoverage(talepler = [], planlar = []) {
  const normalizedTalepler = talepler.map((talep) => ({
    ...talep,
    talepKaynagi: getTalepKaynagiLabel(talep),
  }))

  const annualRequestRows = Object.values(
    normalizedTalepler
      .filter((talep) => talep.talepKaynagi === 'Yıllık Talep')
      .flatMap((talep) => talep.egitimler || [])
      .reduce((accumulator, egitim) => {
        const trainingKey = buildTrainingKey(egitim)

        if (!accumulator[trainingKey]) {
          accumulator[trainingKey] = {
            key: trainingKey,
            egitimKodu: egitim.egitimKodu || '',
            egitimAdi: egitim.egitimAdi || '',
            kategori: egitim.kategori || 'Teknik',
            talep: 0,
          }
        }

        accumulator[trainingKey].talep += 1
        return accumulator
      }, {}),
  )

  const planRowsByTraining = Object.values(
    planlar.reduce((accumulator, plan) => {
      const trainingKey = buildTrainingKey(plan)

      if (!accumulator[trainingKey]) {
        accumulator[trainingKey] = {
          key: trainingKey,
          egitimKodu: plan.egitimKodu || '',
          egitimAdi: plan.egitimAdi || '',
          kategori: plan.kategori || 'Teknik',
          plan: 0,
        }
      }

      accumulator[trainingKey].plan += 1
      return accumulator
    }, {}),
  )

  const planCountByTraining = planRowsByTraining.reduce((accumulator, item) => {
    accumulator.set(item.key, item.plan)
    return accumulator
  }, new Map())

  const annualCoverageRows = annualRequestRows
    .map((item) => createCoverageRow(item, planCountByTraining.get(item.key) || 0))
    .sort((left, right) => right.acik - left.acik || right.talep - left.talep)

  const annualRequestKeys = new Set(annualRequestRows.map((item) => item.key))
  const externalPlanRows = planRowsByTraining
    .filter((item) => !annualRequestKeys.has(item.key))
    .sort((left, right) => right.plan - left.plan || left.egitimAdi.localeCompare(right.egitimAdi, 'tr'))

  const annualDemandCount = annualCoverageRows.reduce((total, item) => total + item.talep, 0)
  const annualCoveredDemandCount = annualCoverageRows.reduce((total, item) => total + item.plan, 0)
  const annualCoverageRate = annualDemandCount ? (annualCoveredDemandCount / annualDemandCount) * 100 : 0
  const annualCoveredTitleCount = annualCoverageRows.filter((item) => item.plan > 0).length
  const individualRequestCount = normalizedTalepler.filter((talep) => talep.talepKaynagi === 'Bireysel Talep').length
  const individualDemandCount = normalizedTalepler
    .filter((talep) => talep.talepKaynagi === 'Bireysel Talep')
    .reduce((total, talep) => total + (talep.egitimler?.length || 0), 0)
  const individualPlannedCount = planlar.filter((plan) => {
    const sourceRequest = normalizedTalepler.find((talep) => talep.id === plan.talepId)
    return sourceRequest?.talepKaynagi === 'Bireysel Talep'
  }).length

  return {
    annualCoverageRows,
    externalPlanRows,
    annualRequestTitleCount: annualCoverageRows.length,
    annualCoveredTitleCount,
    annualDemandCount,
    annualCoveredDemandCount,
    annualCoverageRate,
    externalPlannedCount: externalPlanRows.reduce((total, item) => total + item.plan, 0),
    externalPlannedTitleCount: externalPlanRows.length,
    individualRequestCount,
    individualDemandCount,
    individualPlannedCount,
  }
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