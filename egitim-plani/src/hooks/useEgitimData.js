import { useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { format } from 'date-fns'
import { LOCAL_STORAGE_KEYS } from '../data/constants'
import { initialCatalog, initialPlanlar, initialTalepler } from '../data/initialData'
import { buildTalepDuplicateKey, normalizeSignatureText } from '../utils/helpers'
import useLocalStorage from './useLocalStorage'

function getToday() {
  return format(new Date(), 'yyyy-MM-dd')
}

function getPlanDateFields(egitimTarihi) {
  const planDate = new Date(egitimTarihi)

  return {
    egitimAyi: planDate.getMonth() + 1,
    egitimYili: planDate.getFullYear(),
  }
}

function syncCatalogEntries(currentCatalog, egitimler) {
  const existingNames = new Set(currentCatalog.map((item) => item.ad.toLocaleLowerCase('tr-TR')))
  const nextCatalog = [...currentCatalog]

  egitimler.forEach((egitim) => {
    const normalizedName = egitim.egitimAdi.trim().toLocaleLowerCase('tr-TR')

    if (!normalizedName || existingNames.has(normalizedName)) {
      return
    }

    existingNames.add(normalizedName)
    nextCatalog.push({
      id: egitim.egitimId || uuidv4(),
      ad: egitim.egitimAdi.trim(),
      kategori: egitim.kategori,
      sure: egitim.sure || '1 gün',
      aciklama: '',
    })
  })

  return nextCatalog
}

function normalizeTalep(talep) {
  return {
    id: talep.id,
    yoneticiAdi: talep.yoneticiAdi || '',
    yoneticiEmail: talep.yoneticiEmail || '',
    gmy: talep.gmy || '',
    calisanAdi: talep.calisanAdi || '',
    calisanSicil: talep.calisanSicil || '',
    calisanKullaniciKodu: talep.calisanKullaniciKodu || '',
    egitimler: (talep.egitimler || [])
      .filter((egitim) => egitim?.egitimAdi)
      .slice(0, 4)
      .map((egitim) => ({
        egitimId: egitim.egitimId || uuidv4(),
        egitimAdi: egitim.egitimAdi,
        kategori: egitim.kategori || 'Teknik',
      })),
    notlar: talep.notlar || '',
    durum: talep.durum || 'beklemede',
  }
}

function normalizePlan(plan) {
  return {
    ...plan,
    calisanKullaniciKodu: plan.calisanKullaniciKodu || '',
    gmy: plan.gmy || '',
    kategori: plan.kategori || 'Teknik',
    notlar: plan.notlar || '',
  }
}

function normalizeCatalogItem(item) {
  return {
    id: item.id,
    ad: item.ad,
    kategori: item.kategori || 'Teknik',
    sure: item.sure || '1 gün',
    aciklama: item.aciklama || '',
  }
}

function isSeededSampleId(id, pattern) {
  return pattern.test(id || '')
}

function isEmptyTalepPayload(payload) {
  return ![
    payload.yoneticiAdi,
    payload.yoneticiEmail,
    payload.gmy,
    payload.calisanAdi,
    payload.calisanSicil,
    payload.calisanKullaniciKodu,
    payload.notlar,
    ...(payload.egitimler || []).map((egitim) => egitim.egitimAdi),
  ].some((value) => `${value || ''}`.trim())
}

function getPayloadSourceLabel(payload) {
  return payload.rowNumber ? `Satır ${payload.rowNumber}` : 'Form girişi'
}

function getIssueDetails(payload, reason) {
  return {
    rowNumber: payload.rowNumber || 0,
    sourceLabel: getPayloadSourceLabel(payload),
    calisanAdi: `${payload.calisanAdi || ''}`.trim(),
    calisanSicil: `${payload.calisanSicil || ''}`.trim(),
    calisanKullaniciKodu: `${payload.calisanKullaniciKodu || ''}`.trim(),
    egitimler: (payload.egitimler || [])
      .filter((egitim) => egitim?.egitimAdi)
      .map((egitim) => egitim.egitimAdi.trim())
      .join(', '),
    reason,
  }
}

function getPlanKey(talepId, egitimAdi) {
  return `${talepId}::${normalizeSignatureText(egitimAdi)}`
}

function createTalepRecord(payload) {
  if (isEmptyTalepPayload(payload)) {
    return null
  }

  const validEgitimler = (payload.egitimler || [])
    .filter((egitim) => egitim.egitimAdi.trim())
    .slice(0, 4)
    .map((egitim) => ({
      egitimId: egitim.egitimId || uuidv4(),
      egitimAdi: egitim.egitimAdi.trim(),
      kategori: egitim.kategori,
    }))

  if (validEgitimler.length < 1 || validEgitimler.length > 4) {
    throw new Error('En az 1, en fazla 4 eğitim olmalıdır.')
  }

  const talep = {
    id: uuidv4(),
    yoneticiAdi: `${payload.yoneticiAdi || ''}`.trim(),
    yoneticiEmail: `${payload.yoneticiEmail || ''}`.trim(),
    gmy: `${payload.gmy || ''}`.trim(),
    calisanAdi: `${payload.calisanAdi || ''}`.trim(),
    calisanSicil: `${payload.calisanSicil || ''}`.trim(),
    calisanKullaniciKodu: `${payload.calisanKullaniciKodu || ''}`.trim(),
    egitimler: validEgitimler,
    notlar: `${payload.notlar || ''}`.trim(),
    durum: 'beklemede',
  }

  return {
    talep,
    egitimler: validEgitimler,
    duplicateKey: buildTalepDuplicateKey(talep),
  }
}

function buildPlanEntries({ talep, selectedEgitimIds, ortakAlanlar, existingPlanKeys }) {
  if (!selectedEgitimIds.length) {
    throw new Error('En az bir eğitim seçilmelidir.')
  }

  const planlanmaTarihi = ortakAlanlar.planlanmaTarihi || getToday()
  const egitimTarihi = ortakAlanlar.egitimTarihi || getToday()

  return talep.egitimler
    .filter((egitim) => selectedEgitimIds.includes(egitim.egitimId))
    .filter((egitim) => !existingPlanKeys.has(getPlanKey(talep.id, egitim.egitimAdi)))
    .map((egitim) => ({
      id: uuidv4(),
      talepId: talep.id,
      calisanAdi: talep.calisanAdi,
      calisanSicil: talep.calisanSicil,
      calisanKullaniciKodu: talep.calisanKullaniciKodu,
      gmy: talep.gmy,
      egitimAdi: egitim.egitimAdi,
      kategori: egitim.kategori,
      egitimTuru: ortakAlanlar.egitimTuru,
      planlanmaTarihi,
      egitimTarihi,
      ...getPlanDateFields(egitimTarihi),
      sure: ortakAlanlar.sure,
      egitimci: ortakAlanlar.egitimci,
      maliyet: Number(ortakAlanlar.maliyet || 0),
      durum: ortakAlanlar.durum,
      notlar: ortakAlanlar.notlar.trim(),
    }))
}

export default function useEgitimData() {
  const [katalog, setKatalog] = useLocalStorage(LOCAL_STORAGE_KEYS.katalog, initialCatalog)
  const [talepler, setTalepler] = useLocalStorage(LOCAL_STORAGE_KEYS.talepler, initialTalepler)
  const [planlar, setPlanlar] = useLocalStorage(LOCAL_STORAGE_KEYS.planlar, initialPlanlar)

  useEffect(() => {
    setKatalog((current) => {
      const cleaned = current
        .filter((item) => !isSeededSampleId(item.id, /^catalog-\d+$/))
        .map((item) => normalizeCatalogItem(item))

      return JSON.stringify(cleaned) === JSON.stringify(current) ? current : cleaned
    })

    setTalepler((current) => {
      const cleaned = current
        .filter((item) => !isSeededSampleId(item.id, /^talep-\d+$/))
        .map((item) => normalizeTalep(item))

      return JSON.stringify(cleaned) === JSON.stringify(current) ? current : cleaned
    })

    setPlanlar((current) => {
      const cleaned = current
        .filter((item) => !isSeededSampleId(item.id, /^plan-\d+$|^legacy-/))
        .map((item) => normalizePlan(item))

      return JSON.stringify(cleaned) === JSON.stringify(current) ? current : cleaned
    })
  }, [setKatalog, setPlanlar, setTalepler])

  function addTalep(payload) {
    const nextRecord = createTalepRecord(payload)

    if (!nextRecord) {
      throw new Error('Kaydedilecek talep verisi bulunamadı.')
    }

    const duplicateExists = talepler.some((item) => buildTalepDuplicateKey(item) === nextRecord.duplicateKey)

    if (duplicateExists) {
      return {
        addedCount: 0,
        issues: [
          getIssueDetails(payload, 'Aynı çalışan ve aynı talep içeriğine sahip mükerrer kayıt bulundu.'),
        ],
      }
    }

    setTalepler((current) => [nextRecord.talep, ...current])
    setKatalog((current) => syncCatalogEntries(current, nextRecord.egitimler))

    return {
      addedCount: 1,
      issues: [],
      talep: nextRecord.talep,
    }
  }

  function importTalepler(payloads) {
    const existingKeys = new Set(talepler.map((talep) => buildTalepDuplicateKey(talep)))
    const importedKeys = new Set()
    const records = []
    const issues = []

    payloads.forEach((payload) => {
      try {
        const record = createTalepRecord(payload)

        if (!record) {
          return
        }

        if (existingKeys.has(record.duplicateKey) || importedKeys.has(record.duplicateKey)) {
          issues.push(
            getIssueDetails(payload, 'Mükerrer satır bulundu. Aynı kayıt daha önce sisteme eklenmiş veya dosyada tekrar ediyor.'),
          )
          return
        }

        importedKeys.add(record.duplicateKey)
        records.push(record)
      } catch (error) {
        issues.push(getIssueDetails(payload, error.message || 'Satır işlenemedi.'))
      }
    })

    if (!records.length && !issues.length) {
      throw new Error('Excel dosyasında içeri aktarılacak geçerli satır bulunamadı.')
    }

    if (records.length) {
      setTalepler((current) => [...records.map((record) => record.talep), ...current])
      setKatalog((current) =>
        records.reduce((catalogState, record) => syncCatalogEntries(catalogState, record.egitimler), current),
      )
    }

    return {
      importedCount: records.length,
      issues,
    }
  }

  function planTalep({ talepId, selectedEgitimIds, ortakAlanlar }) {
    const talep = talepler.find((item) => item.id === talepId)

    if (!talep) {
      throw new Error('Planlanacak talep bulunamadı.')
    }

    const existingPlanKeys = new Set(planlar.map((plan) => getPlanKey(plan.talepId, plan.egitimAdi)))
    const nextPlanlar = buildPlanEntries({
      talep,
      selectedEgitimIds,
      ortakAlanlar,
      existingPlanKeys,
    })

    if (!nextPlanlar.length) {
      throw new Error('Seçili eğitimler için zaten plan kaydı mevcut.')
    }

    setPlanlar((current) => [...nextPlanlar, ...current])
    setTalepler((current) =>
      current.map((item) =>
        item.id === talepId
          ? {
              ...item,
              durum: 'plana_eklendi',
            }
          : item,
      ),
    )

    return nextPlanlar
  }

  function planTalepler({ selections, ortakAlanlar }) {
    if (!selections?.length) {
      throw new Error('Toplu planlama için en az bir çalışan seçilmelidir.')
    }

    const existingPlanKeys = new Set(planlar.map((plan) => getPlanKey(plan.talepId, plan.egitimAdi)))
    const talepIdsToUpdate = new Set()
    const nextPlanlar = []

    selections.forEach((selection) => {
      const talep = talepler.find((item) => item.id === selection.talepId)

      if (!talep) {
        return
      }

      const createdPlans = buildPlanEntries({
        talep,
        selectedEgitimIds: selection.selectedEgitimIds,
        ortakAlanlar,
        existingPlanKeys,
      })

      createdPlans.forEach((plan) => {
        existingPlanKeys.add(getPlanKey(plan.talepId, plan.egitimAdi))
      })

      if (createdPlans.length) {
        talepIdsToUpdate.add(talep.id)
        nextPlanlar.push(...createdPlans)
      }
    })

    if (!nextPlanlar.length) {
      throw new Error('Seçili çalışanlar için yeni plan kaydı üretilemedi.')
    }

    setPlanlar((current) => [...nextPlanlar, ...current])
    setTalepler((current) =>
      current.map((item) =>
        talepIdsToUpdate.has(item.id)
          ? {
              ...item,
              durum: 'plana_eklendi',
            }
          : item,
      ),
    )

    return nextPlanlar
  }

  function updatePlan(planId, updates) {
    setPlanlar((current) =>
      current.map((plan) => {
        if (plan.id !== planId) {
          return plan
        }

        const nextPlan = {
          ...plan,
          ...updates,
        }

        if (updates.egitimTarihi) {
          return {
            ...nextPlan,
            ...getPlanDateFields(updates.egitimTarihi),
          }
        }

        return nextPlan
      }),
    )
  }

  function deletePlan(planId) {
    const targetPlan = planlar.find((plan) => plan.id === planId)

    setPlanlar((current) => current.filter((plan) => plan.id !== planId))

    if (!targetPlan?.talepId) {
      return
    }

    const remainingPlanExists = planlar.some(
      (plan) => plan.id !== planId && plan.talepId === targetPlan.talepId,
    )

    if (!remainingPlanExists) {
      setTalepler((current) =>
        current.map((talep) =>
          talep.id === targetPlan.talepId
            ? {
                ...talep,
                durum: 'beklemede',
              }
            : talep,
        ),
      )
    }
  }

  return {
    katalog,
    talepler,
    planlar,
    addTalep,
    importTalepler,
    planTalep,
    planTalepler,
    updatePlan,
    deletePlan,
  }
}