import { useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { format } from 'date-fns'
import { EGITIM_KATEGORILERI, GMY_LISTESI, LOCAL_STORAGE_KEYS } from '../data/constants'
import { initialCatalog, initialPlanlar, initialTalepler } from '../data/initialData'
import { buildTalepDuplicateKey, normalizeSignatureText } from '../utils/helpers'
import useLocalStorage from './useLocalStorage'

function getToday() {
  return format(new Date(), 'yyyy-MM-dd')
}

function getCurrentYear() {
  return new Date().getFullYear()
}

function getPlanDateFields(egitimTarihi) {
  const planDate = new Date(egitimTarihi)

  return {
    egitimAyi: planDate.getMonth() + 1,
    egitimYili: planDate.getFullYear(),
  }
}

function syncCatalogEntries(currentCatalog, egitimler) {
  const existingNames = new Map(
    currentCatalog.map((item, index) => [item.ad.toLocaleLowerCase('tr-TR'), index]),
  )
  const nextCatalog = [...currentCatalog]

  egitimler.forEach((egitim) => {
    const normalizedName = egitim.egitimAdi.trim().toLocaleLowerCase('tr-TR')

    if (!normalizedName) {
      return
    }

    if (existingNames.has(normalizedName)) {
      const currentIndex = existingNames.get(normalizedName)
      const currentItem = nextCatalog[currentIndex]
      const nextCode = `${egitim.egitimKodu || ''}`.trim()

      if (currentItem && nextCode && currentItem.kod !== nextCode) {
        nextCatalog[currentIndex] = {
          ...currentItem,
          kod: nextCode,
          kategori: egitim.kategori || currentItem.kategori,
        }
      }

      return
    }

    existingNames.set(normalizedName, nextCatalog.length)
    nextCatalog.push({
      id: egitim.egitimId || uuidv4(),
      kod: `${egitim.egitimKodu || ''}`.trim(),
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
    talepYili: Number(talep.talepYili || getCurrentYear()),
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
        egitimKodu: `${egitim.egitimKodu || ''}`.trim(),
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
    egitimKodu: `${plan.egitimKodu || ''}`.trim(),
    kategori: plan.kategori || 'Teknik',
    notlar: plan.notlar || '',
  }
}

function normalizeCatalogItem(item) {
  return {
    id: item.id,
    kod: `${item.kod || ''}`.trim(),
    ad: `${item.ad || ''}`.trim(),
    kategori: item.kategori || 'Teknik',
    sure: item.sure || '1 gün',
    aciklama: item.aciklama || '',
  }
}

function matchesCatalogTraining(egitim, catalogItem) {
  if (!egitim || !catalogItem) {
    return false
  }

  if (egitim.egitimId && catalogItem.id && egitim.egitimId === catalogItem.id) {
    return true
  }

  const sameName = normalizeSignatureText(egitim.egitimAdi) === normalizeSignatureText(catalogItem.ad)
  const sameCode = normalizeSignatureText(egitim.egitimKodu) === normalizeSignatureText(catalogItem.kod)

  return sameName && sameCode
}

function isSeededSampleId(id, pattern) {
  return pattern.test(id || '')
}

function normalizeGmyList(gmyList, talepler, planlar) {
  const values = [...(gmyList?.length ? gmyList : GMY_LISTESI), ...talepler.map((item) => item.gmy), ...planlar.map((item) => item.gmy)]

  return values.reduce((accumulator, value) => {
    const normalized = `${value || ''}`.trim()

    if (!normalized || accumulator.includes(normalized)) {
      return accumulator
    }

    accumulator.push(normalized)
    return accumulator
  }, [])
}

function collectActiveCategories(katalog, talepler, planlar) {
  return [
    ...katalog.map((item) => item.kategori),
    ...talepler.flatMap((item) => item.egitimler.map((egitim) => egitim.kategori)),
    ...planlar.map((item) => item.kategori),
  ]
}

function normalizeKategoriList(kategoriList, katalog, talepler, planlar) {
  const baseValues = kategoriList?.length ? kategoriList : EGITIM_KATEGORILERI
  const values = [...baseValues, ...collectActiveCategories(katalog, talepler, planlar)]

  return values.reduce((accumulator, value) => {
    const normalized = `${value || ''}`.trim()

    if (!normalized || accumulator.includes(normalized)) {
      return accumulator
    }

    accumulator.push(normalized)
    return accumulator
  }, [])
}

function syncKategoriEntries(currentKategoriList, egitimler) {
  const existingValues = new Set(currentKategoriList)
  const nextList = [...currentKategoriList]

  egitimler.forEach((egitim) => {
    const normalizedCategory = `${egitim.kategori || ''}`.trim()

    if (!normalizedCategory || existingValues.has(normalizedCategory)) {
      return
    }

    existingValues.add(normalizedCategory)
    nextList.push(normalizedCategory)
  })

  return nextList
}

function isEmptyTalepPayload(payload) {
  return ![
    payload.talepYili,
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
    talepYili: Number(payload.talepYili || getCurrentYear()),
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

function getPlanKey(talepId, egitimAdi, egitimKodu = '') {
  return `${talepId}::${normalizeSignatureText(egitimKodu)}::${normalizeSignatureText(egitimAdi)}`
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
      egitimKodu: `${egitim.egitimKodu || ''}`.trim(),
      egitimAdi: egitim.egitimAdi.trim(),
      kategori: egitim.kategori,
    }))

  if (validEgitimler.length < 1 || validEgitimler.length > 4) {
    throw new Error('En az 1, en fazla 4 eğitim olmalıdır.')
  }

  const talep = {
    id: uuidv4(),
    talepYili: Number(payload.talepYili || getCurrentYear()),
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
    .filter((egitim) => !existingPlanKeys.has(getPlanKey(talep.id, egitim.egitimAdi, egitim.egitimKodu)))
    .map((egitim) => ({
      id: uuidv4(),
      talepId: talep.id,
      calisanAdi: talep.calisanAdi,
      calisanSicil: talep.calisanSicil,
      calisanKullaniciKodu: talep.calisanKullaniciKodu,
      gmy: talep.gmy,
      egitimKodu: `${egitim.egitimKodu || ''}`.trim(),
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
  const [gmyList, setGmyList] = useLocalStorage(LOCAL_STORAGE_KEYS.gmyList, GMY_LISTESI)
  const [egitimKategorileri, setEgitimKategorileri] = useLocalStorage(
    LOCAL_STORAGE_KEYS.egitimKategorileri,
    EGITIM_KATEGORILERI,
  )

  useEffect(() => {
    setGmyList((current) => {
      const cleaned = normalizeGmyList(current, talepler, planlar)
      return JSON.stringify(cleaned) === JSON.stringify(current) ? current : cleaned
    })

    setEgitimKategorileri((current) => {
      const cleaned = normalizeKategoriList(current, katalog, talepler, planlar)
      return JSON.stringify(cleaned) === JSON.stringify(current) ? current : cleaned
    })

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
  }, [katalog, planlar, setEgitimKategorileri, setGmyList, setKatalog, setPlanlar, setTalepler, talepler])

  function addGmy(name) {
    const nextName = `${name || ''}`.trim()

    if (!nextName) {
      throw new Error('GMY adı boş olamaz.')
    }

    if (gmyList.includes(nextName)) {
      throw new Error('Aynı isimde GMY zaten mevcut.')
    }

    setGmyList((current) => [...current, nextName])
    return nextName
  }

  function addEgitimKategorisi(name) {
    const nextName = `${name || ''}`.trim()

    if (!nextName) {
      throw new Error('Kategori adı boş olamaz.')
    }

    if (egitimKategorileri.includes(nextName)) {
      throw new Error('Aynı isimde kategori zaten mevcut.')
    }

    setEgitimKategorileri((current) => [...current, nextName])
    return nextName
  }

  function updateGmy(previousName, nextName) {
    const previous = `${previousName || ''}`.trim()
    const next = `${nextName || ''}`.trim()

    if (!previous || !next) {
      throw new Error('GMY adı boş olamaz.')
    }

    if (previous === next) {
      return next
    }

    if (gmyList.includes(next)) {
      throw new Error('Bu isimde başka bir GMY zaten var.')
    }

    setGmyList((current) => current.map((item) => (item === previous ? next : item)))
    setTalepler((current) => current.map((item) => (item.gmy === previous ? { ...item, gmy: next } : item)))
    setPlanlar((current) => current.map((item) => (item.gmy === previous ? { ...item, gmy: next } : item)))

    return next
  }

  function updateEgitimKategorisi(previousName, nextName) {
    const previous = `${previousName || ''}`.trim()
    const next = `${nextName || ''}`.trim()

    if (!previous || !next) {
      throw new Error('Kategori adı boş olamaz.')
    }

    if (previous === next) {
      return next
    }

    if (egitimKategorileri.includes(next)) {
      throw new Error('Bu isimde başka bir kategori zaten var.')
    }

    setEgitimKategorileri((current) => current.map((item) => (item === previous ? next : item)))
    setKatalog((current) => current.map((item) => (item.kategori === previous ? { ...item, kategori: next } : item)))
    setTalepler((current) =>
      current.map((item) => ({
        ...item,
        egitimler: item.egitimler.map((egitim) =>
          egitim.kategori === previous ? { ...egitim, kategori: next } : egitim,
        ),
      })),
    )
    setPlanlar((current) => current.map((item) => (item.kategori === previous ? { ...item, kategori: next } : item)))

    return next
  }

  function deleteGmy(name) {
    const target = `${name || ''}`.trim()

    if (!target) {
      throw new Error('Silinecek GMY bulunamadı.')
    }

    if (gmyList.length <= 1) {
      throw new Error('Sistemde en az 1 GMY kalmalıdır.')
    }

    const isUsed = talepler.some((item) => item.gmy === target) || planlar.some((item) => item.gmy === target)

    if (isUsed) {
      throw new Error('Bu GMY aktif kayıtlarda kullanılıyor. Önce başka bir GMY ile değiştirin.')
    }

    setGmyList((current) => current.filter((item) => item !== target))
  }

  function deleteEgitimKategorisi(name) {
    const target = `${name || ''}`.trim()

    if (!target) {
      throw new Error('Silinecek kategori bulunamadı.')
    }

    if (egitimKategorileri.length <= 1) {
      throw new Error('Sistemde en az 1 eğitim kategorisi kalmalıdır.')
    }

    const isUsedInCatalog = katalog.some((item) => item.kategori === target)
    const isUsedInTalepler = talepler.some((item) => item.egitimler.some((egitim) => egitim.kategori === target))
    const isUsedInPlanlar = planlar.some((item) => item.kategori === target)

    if (isUsedInCatalog || isUsedInTalepler || isUsedInPlanlar) {
      throw new Error('Bu kategori aktif kayıtlarda kullanılıyor. Önce başka bir kategoriye güncelleyin.')
    }

    setEgitimKategorileri((current) => current.filter((item) => item !== target))
  }

  function addKatalogItem(payload) {
    const nextItem = normalizeCatalogItem({
      id: uuidv4(),
      kod: payload.kod,
      ad: payload.ad,
      kategori: payload.kategori,
      sure: payload.sure,
      aciklama: payload.aciklama,
    })

    if (!nextItem.ad) {
      throw new Error('Eğitim adı boş olamaz.')
    }

    const duplicateNameExists = katalog.some(
      (item) => normalizeSignatureText(item.ad) === normalizeSignatureText(nextItem.ad),
    )

    if (duplicateNameExists) {
      throw new Error('Aynı isimde eğitim katalogda zaten mevcut.')
    }

    if (nextItem.kod) {
      const duplicateCodeExists = katalog.some(
        (item) => normalizeSignatureText(item.kod) === normalizeSignatureText(nextItem.kod),
      )

      if (duplicateCodeExists) {
        throw new Error('Aynı eğitim kodu katalogda zaten mevcut.')
      }
    }

    setKatalog((current) => [nextItem, ...current])
    setEgitimKategorileri((current) => syncKategoriEntries(current, [{ kategori: nextItem.kategori }]))
    return nextItem
  }

  function updateKatalogItem(itemId, payload) {
    const currentItem = katalog.find((item) => item.id === itemId)

    if (!currentItem) {
      throw new Error('Güncellenecek katalog kaydı bulunamadı.')
    }

    const nextItem = normalizeCatalogItem({
      ...currentItem,
      ...payload,
      id: currentItem.id,
    })

    if (!nextItem.ad) {
      throw new Error('Eğitim adı boş olamaz.')
    }

    const duplicateNameExists = katalog.some(
      (item) => item.id !== itemId && normalizeSignatureText(item.ad) === normalizeSignatureText(nextItem.ad),
    )

    if (duplicateNameExists) {
      throw new Error('Bu isimde başka bir katalog kaydı zaten var.')
    }

    if (nextItem.kod) {
      const duplicateCodeExists = katalog.some(
        (item) => item.id !== itemId && normalizeSignatureText(item.kod) === normalizeSignatureText(nextItem.kod),
      )

      if (duplicateCodeExists) {
        throw new Error('Bu eğitim kodu başka bir katalog kaydında kullanılıyor.')
      }
    }

    setKatalog((current) => current.map((item) => (item.id === itemId ? nextItem : item)))
    setTalepler((current) =>
      current.map((talep) => ({
        ...talep,
        egitimler: talep.egitimler.map((egitim) =>
          matchesCatalogTraining(egitim, currentItem)
            ? {
                ...egitim,
                egitimId: nextItem.id,
                egitimKodu: nextItem.kod,
                egitimAdi: nextItem.ad,
                kategori: nextItem.kategori,
              }
            : egitim,
        ),
      })),
    )
    setPlanlar((current) =>
      current.map((plan) => {
        const sameName = normalizeSignatureText(plan.egitimAdi) === normalizeSignatureText(currentItem.ad)
        const sameCode = normalizeSignatureText(plan.egitimKodu) === normalizeSignatureText(currentItem.kod)

        if (!sameName && !sameCode) {
          return plan
        }

        return {
          ...plan,
          egitimKodu: nextItem.kod,
          egitimAdi: nextItem.ad,
          kategori: nextItem.kategori,
        }
      }),
    )
    setEgitimKategorileri((current) => syncKategoriEntries(current, [{ kategori: nextItem.kategori }]))

    return nextItem
  }

  function deleteKatalogItem(itemId) {
    const targetItem = katalog.find((item) => item.id === itemId)

    if (!targetItem) {
      throw new Error('Silinecek katalog kaydı bulunamadı.')
    }

    const isUsedInTalepler = talepler.some((talep) =>
      talep.egitimler.some((egitim) => matchesCatalogTraining(egitim, targetItem)),
    )
    const isUsedInPlanlar = planlar.some((plan) => {
      const sameName = normalizeSignatureText(plan.egitimAdi) === normalizeSignatureText(targetItem.ad)
      const sameCode = normalizeSignatureText(plan.egitimKodu) === normalizeSignatureText(targetItem.kod)
      return sameName || sameCode
    })

    if (isUsedInTalepler || isUsedInPlanlar) {
      throw new Error('Bu katalog kaydı aktif talep veya planlarda kullanılıyor. Önce bağlantılı kayıtları güncelleyin.')
    }

    setKatalog((current) => current.filter((item) => item.id !== itemId))
  }

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
    setEgitimKategorileri((current) => syncKategoriEntries(current, nextRecord.egitimler))

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
      setEgitimKategorileri((current) =>
        records.reduce((categoryState, record) => syncKategoriEntries(categoryState, record.egitimler), current),
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

    const existingPlanKeys = new Set(planlar.map((plan) => getPlanKey(plan.talepId, plan.egitimAdi, plan.egitimKodu)))
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

    const existingPlanKeys = new Set(planlar.map((plan) => getPlanKey(plan.talepId, plan.egitimAdi, plan.egitimKodu)))
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
        existingPlanKeys.add(getPlanKey(plan.talepId, plan.egitimAdi, plan.egitimKodu))
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

  function clearAllPlans() {
    if (!planlar.length) {
      return {
        removedPlanCount: 0,
        removedTalepCount: 0,
      }
    }

    const affectedTalepIds = new Set(planlar.map((plan) => plan.talepId).filter(Boolean))
    const removedPlanCount = planlar.length
    const removedTalepCount = talepler.filter((talep) => affectedTalepIds.has(talep.id)).length

    setPlanlar([])

    if (affectedTalepIds.size) {
      setTalepler((current) => current.filter((talep) => !affectedTalepIds.has(talep.id)))
    }

    return {
      removedPlanCount,
      removedTalepCount,
    }
  }

  function deleteTalepYear(year) {
    const targetYear = Number(year)

    if (!Number.isFinite(targetYear)) {
      throw new Error('Silinecek talep yılı geçersiz.')
    }

    const targetTalepler = talepler.filter((talep) => Number(talep.talepYili) === targetYear)

    if (!targetTalepler.length) {
      return {
        removedTalepCount: 0,
        removedPlanCount: 0,
      }
    }

    const targetTalepIds = new Set(targetTalepler.map((talep) => talep.id))
    const removedPlanCount = planlar.filter((plan) => targetTalepIds.has(plan.talepId)).length
    const removedTalepCount = targetTalepler.length

    setTalepler((current) => current.filter((talep) => Number(talep.talepYili) !== targetYear))
    setPlanlar((current) => current.filter((plan) => !targetTalepIds.has(plan.talepId)))

    return {
      removedTalepCount,
      removedPlanCount,
    }
  }

  return {
    katalog,
    talepler,
    planlar,
    gmyList,
    egitimKategorileri,
    addTalep,
    importTalepler,
    planTalep,
    planTalepler,
    updatePlan,
    deletePlan,
    clearAllPlans,
    deleteTalepYear,
    addGmy,
    updateGmy,
    deleteGmy,
    addKatalogItem,
    updateKatalogItem,
    deleteKatalogItem,
    addEgitimKategorisi,
    updateEgitimKategorisi,
    deleteEgitimKategorisi,
  }
}