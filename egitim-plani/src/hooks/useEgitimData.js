import { useEffect, useMemo, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { format } from 'date-fns'
import {
  EGITIM_KATEGORILERI,
  GMY_LISTESI,
  PARA_BIRIMLERI,
  VARSAYILAN_KURUMLAR,
  VARSAYILAN_EGITMENLER,
  VARSAYILAN_KURLAR,
} from '../data/constants'
import { initialCatalog, initialPlanlar, initialTalepler } from '../data/initialData'
import {
  fetchRemoteAppState,
  hasMeaningfulAppState,
  isRemoteSyncEnabled,
  readLocalAppState,
  replaceRemoteAppState,
  uploadTaleplerExcel,
  writeLocalAppState,
} from '../services/appStateApi'
import { buildTalepDuplicateKey, normalizeSignatureText } from '../utils/helpers'

function getToday() {
  return format(new Date(), 'yyyy-MM-dd')
}

function getCurrentYear() {
  return new Date().getFullYear()
}

function yieldToMainThread() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0)
  })
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
    talepKaynagi: `${talep.talepKaynagi || 'Yıllık Talep'}`.trim() || 'Yıllık Talep',
    yoneticiAdi: talep.yoneticiAdi || '',
    yoneticiEmail: talep.yoneticiEmail || '',
    gmy: talep.gmy || '',
    calisanLokasyon: talep.calisanLokasyon || '',
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
  const legacyProvider = `${plan.egitimci || ''}`.trim()
  const kurum = `${plan.kurum || ''}`.trim()
  const icEgitim = Boolean(
    plan.icEgitim ?? (!kurum && normalizeSignatureText(legacyProvider) === normalizeSignatureText('İç Eğitim')),
  )

  return {
    ...plan,
    calisanKullaniciKodu: plan.calisanKullaniciKodu || '',
    gmy: plan.gmy || '',
    calisanLokasyon: plan.calisanLokasyon || '',
    egitimKodu: `${plan.egitimKodu || ''}`.trim(),
    kategori: plan.kategori || 'Teknik',
    icEgitim,
    egitimci: icEgitim ? legacyProvider || 'İç Eğitim' : '',
    kurum: icEgitim ? '' : kurum || legacyProvider,
    notlar: plan.notlar || '',
    maliyet: Number(plan.maliyet || 0),
    toplamMaliyet: Number((plan.toplamMaliyet ?? plan.maliyet) || 0),
    butcePaylasimAdedi: Math.max(1, Number(plan.butcePaylasimAdedi || 1)),
    planGrubuId: plan.planGrubuId || plan.id,
    maliyetParaBirimi: `${plan.maliyetParaBirimi || 'TRY'}`.trim().toUpperCase(),
    dovizKuru: Number(plan.dovizKuru || 1),
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

function normalizeTrainerItem(item) {
  return {
    id: item.id || uuidv4(),
    ad: `${item.ad || item.egitimci || ''}`.trim(),
    birim: `${item.birim || item.kurum || ''}`.trim(),
    email: `${item.email || ''}`.trim(),
    uzmanlik: `${item.uzmanlik || ''}`.trim(),
  }
}

function normalizeInstitutionItem(item) {
  return {
    id: item.id || uuidv4(),
    ad: `${item.ad || item.kurum || item.egitimci || ''}`.trim(),
    email: `${item.email || ''}`.trim(),
    uzmanlik: `${item.uzmanlik || item.hizmetAlani || ''}`.trim(),
  }
}

function normalizeTrainerList(trainerList) {
  const baseList = Array.isArray(trainerList) ? trainerList : VARSAYILAN_EGITMENLER
  return baseList
    .map((item) => normalizeTrainerItem(item))
    .filter((item) => item.ad)
}

function normalizeInstitutionList(kurumListesi) {
  const baseList = Array.isArray(kurumListesi) ? kurumListesi : VARSAYILAN_KURUMLAR
  return baseList
    .map((item) => normalizeInstitutionItem(item))
    .filter((item) => item.ad)
}

function normalizeCurrencyRates(currencyRates) {
  return PARA_BIRIMLERI.reduce((accumulator, currency) => {
    accumulator[currency] = currency === 'TRY' ? 1 : Number(currencyRates?.[currency] || VARSAYILAN_KURLAR[currency] || 1)
    return accumulator
  }, {})
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
  const baseValues = Array.isArray(gmyList) ? gmyList : GMY_LISTESI
  const values = [...baseValues, ...talepler.map((item) => item.gmy), ...planlar.map((item) => item.gmy)]

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
  const baseValues = Array.isArray(kategoriList) ? kategoriList : EGITIM_KATEGORILERI
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
    payload.talepKaynagi,
    payload.yoneticiAdi,
    payload.yoneticiEmail,
    payload.gmy,
    payload.calisanLokasyon,
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
    calisanLokasyon: `${payload.calisanLokasyon || ''}`.trim(),
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
    talepKaynagi: `${payload.talepKaynagi || 'Yıllık Talep'}`.trim() || 'Yıllık Talep',
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

function countPlanEntries({ talep, selectedEgitimIds, existingPlanKeys }) {
  return talep.egitimler
    .filter((egitim) => selectedEgitimIds.includes(egitim.egitimId))
    .filter((egitim) => !existingPlanKeys.has(getPlanKey(talep.id, egitim.egitimAdi, egitim.egitimKodu))).length
}

function buildPlanEntries({ talep, selectedEgitimIds, ortakAlanlar, existingPlanKeys, planGrubuId, butcePaylasimAdedi }) {
  if (!selectedEgitimIds.length) {
    throw new Error('En az bir eğitim seçilmelidir.')
  }

  if (ortakAlanlar.icEgitim && !`${ortakAlanlar.egitimci || ''}`.trim()) {
    throw new Error('İç eğitim için bir iç eğitmen seçin veya yazın.')
  }

  if (!ortakAlanlar.icEgitim && !`${ortakAlanlar.kurum || ''}`.trim()) {
    throw new Error('Dış eğitim için bir kurum seçin veya yazın.')
  }

  const planlanmaTarihi = ortakAlanlar.planlanmaTarihi || getToday()
  const egitimTarihi = ortakAlanlar.egitimTarihi || getToday()

  return talep.egitimler
    .filter((egitim) => selectedEgitimIds.includes(egitim.egitimId))
    .filter((egitim) => !existingPlanKeys.has(getPlanKey(talep.id, egitim.egitimAdi, egitim.egitimKodu)))
    .map((egitim) => ({
      id: uuidv4(),
      planGrubuId: planGrubuId || uuidv4(),
      talepId: talep.id,
      calisanAdi: talep.calisanAdi,
      calisanSicil: talep.calisanSicil,
      calisanKullaniciKodu: talep.calisanKullaniciKodu,
      gmy: talep.gmy,
      calisanLokasyon: talep.calisanLokasyon || '',
      egitimKodu: `${egitim.egitimKodu || ''}`.trim(),
      egitimAdi: egitim.egitimAdi,
      kategori: egitim.kategori,
      egitimTuru: ortakAlanlar.egitimTuru,
      planlanmaTarihi,
      egitimTarihi,
      ...getPlanDateFields(egitimTarihi),
      sure: ortakAlanlar.sure,
      icEgitim: Boolean(ortakAlanlar.icEgitim),
      egitimci: ortakAlanlar.icEgitim ? ortakAlanlar.egitimci : '',
      kurum: ortakAlanlar.icEgitim ? '' : ortakAlanlar.kurum,
      maliyet: Number(ortakAlanlar.maliyet || 0),
      toplamMaliyet: Number(ortakAlanlar.maliyet || 0),
      butcePaylasimAdedi: Math.max(1, Number(butcePaylasimAdedi || selectedEgitimIds.length || 1)),
      maliyetParaBirimi: `${ortakAlanlar.maliyetParaBirimi || 'TRY'}`.trim().toUpperCase(),
      dovizKuru: Number(ortakAlanlar.dovizKuru || 1),
      durum: ortakAlanlar.durum,
      notlar: ortakAlanlar.notlar.trim(),
    }))
}

const DEFAULT_APP_STATE = {
  katalog: initialCatalog,
  talepler: initialTalepler,
  planlar: initialPlanlar,
  gmyList: GMY_LISTESI,
  egitimKategorileri: EGITIM_KATEGORILERI,
  kurumListesi: VARSAYILAN_KURUMLAR,
  egitmenListesi: VARSAYILAN_EGITMENLER,
  kurBilgileri: VARSAYILAN_KURLAR,
}

export default function useEgitimData() {
  const initialLocalStateRef = useRef(null)

  if (!initialLocalStateRef.current) {
    initialLocalStateRef.current = readLocalAppState(DEFAULT_APP_STATE)
  }

  const [katalog, setKatalog] = useState(initialLocalStateRef.current.katalog)
  const [talepler, setTalepler] = useState(initialLocalStateRef.current.talepler)
  const [planlar, setPlanlar] = useState(initialLocalStateRef.current.planlar)
  const [gmyList, setGmyList] = useState(initialLocalStateRef.current.gmyList)
  const [egitimKategorileri, setEgitimKategorileri] = useState(initialLocalStateRef.current.egitimKategorileri)
  const [kurumListesi, setKurumListesi] = useState(initialLocalStateRef.current.kurumListesi)
  const [egitmenListesi, setEgitmenListesi] = useState(initialLocalStateRef.current.egitmenListesi)
  const [kurBilgileri, setKurBilgileri] = useState(initialLocalStateRef.current.kurBilgileri)
  const [syncStatus, setSyncStatus] = useState({
    isLoading: isRemoteSyncEnabled(),
    mode: isRemoteSyncEnabled() ? 'remote' : 'local',
    error: '',
  })
  const hasHydratedRef = useRef(false)
  const lastSyncedStateRef = useRef('')

  const appStateSnapshot = useMemo(
    () => ({
      katalog,
      talepler,
      planlar,
      gmyList,
      egitimKategorileri,
      kurumListesi,
      egitmenListesi,
      kurBilgileri,
    }),
    [katalog, talepler, planlar, gmyList, egitimKategorileri, kurumListesi, egitmenListesi, kurBilgileri],
  )
  const serializedAppState = useMemo(() => JSON.stringify(appStateSnapshot), [appStateSnapshot])

  function applyAppStateSnapshot(snapshot) {
    setKatalog(snapshot.katalog)
    setTalepler(snapshot.talepler)
    setPlanlar(snapshot.planlar)
    setGmyList(snapshot.gmyList)
    setEgitimKategorileri(snapshot.egitimKategorileri)
    setKurumListesi(snapshot.kurumListesi)
    setEgitmenListesi(snapshot.egitmenListesi)
    setKurBilgileri(snapshot.kurBilgileri)
  }

  useEffect(() => {
    let isCancelled = false

    async function hydrateFromRemote() {
      if (!isRemoteSyncEnabled()) {
        hasHydratedRef.current = true
        setSyncStatus({
          isLoading: false,
          mode: 'local',
          error: '',
        })
        return
      }

      try {
        const remoteState = await fetchRemoteAppState(DEFAULT_APP_STATE)
        const localState = initialLocalStateRef.current
        const shouldPromoteLocalState =
          !hasMeaningfulAppState(remoteState, DEFAULT_APP_STATE) && hasMeaningfulAppState(localState, DEFAULT_APP_STATE)
        const activeState = shouldPromoteLocalState
          ? await replaceRemoteAppState(localState, DEFAULT_APP_STATE)
          : remoteState

        if (isCancelled) {
          return
        }

        applyAppStateSnapshot(activeState)
        lastSyncedStateRef.current = JSON.stringify(activeState)
        hasHydratedRef.current = true
        setSyncStatus({
          isLoading: false,
          mode: 'remote',
          error: '',
        })
      } catch (error) {
        if (isCancelled) {
          return
        }

        hasHydratedRef.current = true
        setSyncStatus({
          isLoading: false,
          mode: 'local',
          error: error.message || 'Merkezi veri servisine ulaşılamadı.',
        })
      }
    }

    hydrateFromRemote()

    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    writeLocalAppState(appStateSnapshot, DEFAULT_APP_STATE)
  }, [appStateSnapshot, serializedAppState])

  useEffect(() => {
    if (!hasHydratedRef.current || !isRemoteSyncEnabled()) {
      return undefined
    }

    if (serializedAppState === lastSyncedStateRef.current) {
      return undefined
    }

    const syncTimer = window.setTimeout(async () => {
      try {
        const persistedState = await replaceRemoteAppState(appStateSnapshot, DEFAULT_APP_STATE)
        lastSyncedStateRef.current = JSON.stringify(persistedState)
        setSyncStatus((current) => ({
          ...current,
          mode: 'remote',
          error: '',
        }))
      } catch (error) {
        setSyncStatus((current) => ({
          ...current,
          mode: 'local',
          error: error.message || 'Merkezi veri servisine ulaşılamadı.',
        }))
      }
    }, 1500)

    return () => {
      window.clearTimeout(syncTimer)
    }
  }, [appStateSnapshot, serializedAppState])

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

    setEgitmenListesi((current) => {
      const cleaned = normalizeTrainerList(current)
      return JSON.stringify(cleaned) === JSON.stringify(current) ? current : cleaned
    })

    setKurumListesi((current) => {
      const cleaned = normalizeInstitutionList(current)
      return JSON.stringify(cleaned) === JSON.stringify(current) ? current : cleaned
    })

    setKurBilgileri((current) => {
      const cleaned = normalizeCurrencyRates(current)
      return JSON.stringify(cleaned) === JSON.stringify(current) ? current : cleaned
    })
  }, [
    katalog,
    planlar,
    setEgitimKategorileri,
    setEgitmenListesi,
    setGmyList,
    setKatalog,
    setKurumListesi,
    setKurBilgileri,
    setPlanlar,
    setTalepler,
    talepler,
  ])

  function addKurum(payload) {
    const nextInstitution = normalizeInstitutionItem({ id: uuidv4(), ...payload })

    if (!nextInstitution.ad) {
      throw new Error('Kurum adı boş olamaz.')
    }

    const duplicateExists = kurumListesi.some(
      (item) => normalizeSignatureText(item.ad) === normalizeSignatureText(nextInstitution.ad),
    )

    if (duplicateExists) {
      throw new Error('Bu isimde bir kurum zaten kayıtlı.')
    }

    setKurumListesi((current) => [nextInstitution, ...current])
    return nextInstitution
  }

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

  function addEgitmen(payload) {
    const nextTrainer = normalizeTrainerItem({
      id: uuidv4(),
      ...payload,
    })

    if (!nextTrainer.ad) {
      throw new Error('İç eğitmen adı boş olamaz.')
    }

    const duplicateExists = egitmenListesi.some(
      (item) => normalizeSignatureText(item.ad) === normalizeSignatureText(nextTrainer.ad),
    )

    if (duplicateExists) {
      throw new Error('Bu isimde bir iç eğitmen zaten kayıtlı.')
    }

    setEgitmenListesi((current) => [nextTrainer, ...current])
    return nextTrainer
  }

  function updateEgitmen(trainerId, payload) {
    const currentTrainer = egitmenListesi.find((item) => item.id === trainerId)

    if (!currentTrainer) {
      throw new Error('Güncellenecek iç eğitmen bulunamadı.')
    }

    const nextTrainer = normalizeTrainerItem({
      ...currentTrainer,
      ...payload,
      id: currentTrainer.id,
    })

    if (!nextTrainer.ad) {
      throw new Error('İç eğitmen adı boş olamaz.')
    }

    const duplicateExists = egitmenListesi.some(
      (item) => item.id !== trainerId && normalizeSignatureText(item.ad) === normalizeSignatureText(nextTrainer.ad),
    )

    if (duplicateExists) {
      throw new Error('Bu isimde başka bir iç eğitmen zaten kayıtlı.')
    }

    setEgitmenListesi((current) => current.map((item) => (item.id === trainerId ? nextTrainer : item)))
    setPlanlar((current) =>
      current.map((item) =>
        item.icEgitim && normalizeSignatureText(item.egitimci) === normalizeSignatureText(currentTrainer.ad)
          ? { ...item, egitimci: nextTrainer.ad }
          : item,
      ),
    )

    return nextTrainer
  }

  function deleteEgitmen(trainerId) {
    const targetTrainer = egitmenListesi.find((item) => item.id === trainerId)

    if (!targetTrainer) {
      throw new Error('Silinecek iç eğitmen bulunamadı.')
    }

    const isUsed = planlar.some(
      (item) => item.icEgitim && normalizeSignatureText(item.egitimci) === normalizeSignatureText(targetTrainer.ad),
    )

    if (isUsed) {
      throw new Error('Bu iç eğitmen aktif planlarda kullanılıyor. Önce plan kayıtlarını güncelleyin.')
    }

    setEgitmenListesi((current) => current.filter((item) => item.id !== trainerId))
  }

  function importEgitmenler(payloads) {
    const existingNames = new Set(egitmenListesi.map((item) => normalizeSignatureText(item.ad)))
    const records = []

    payloads.forEach((payload) => {
      const nextTrainer = normalizeTrainerItem({ id: uuidv4(), ...payload })
      const normalizedName = normalizeSignatureText(nextTrainer.ad)

      if (!nextTrainer.ad || existingNames.has(normalizedName)) {
        return
      }

      existingNames.add(normalizedName)
      records.push(nextTrainer)
    })

    if (!records.length) {
      throw new Error('İçe aktarılacak yeni iç eğitmen bulunamadı.')
    }

    setEgitmenListesi((current) => [...records, ...current])
    return records
  }

  function updateKurum(kurumId, payload) {
    const currentInstitution = kurumListesi.find((item) => item.id === kurumId)

    if (!currentInstitution) {
      throw new Error('Güncellenecek kurum bulunamadı.')
    }

    const nextInstitution = normalizeInstitutionItem({
      ...currentInstitution,
      ...payload,
      id: currentInstitution.id,
    })

    if (!nextInstitution.ad) {
      throw new Error('Kurum adı boş olamaz.')
    }

    const duplicateExists = kurumListesi.some(
      (item) => item.id !== kurumId && normalizeSignatureText(item.ad) === normalizeSignatureText(nextInstitution.ad),
    )

    if (duplicateExists) {
      throw new Error('Bu isimde başka bir kurum zaten kayıtlı.')
    }

    setKurumListesi((current) => current.map((item) => (item.id === kurumId ? nextInstitution : item)))
    setPlanlar((current) =>
      current.map((item) =>
        !item.icEgitim && normalizeSignatureText(item.kurum) === normalizeSignatureText(currentInstitution.ad)
          ? { ...item, kurum: nextInstitution.ad }
          : item,
      ),
    )

    return nextInstitution
  }

  function deleteKurum(kurumId) {
    const targetInstitution = kurumListesi.find((item) => item.id === kurumId)

    if (!targetInstitution) {
      throw new Error('Silinecek kurum bulunamadı.')
    }

    const isUsed = planlar.some(
      (item) => !item.icEgitim && normalizeSignatureText(item.kurum) === normalizeSignatureText(targetInstitution.ad),
    )

    if (isUsed) {
      throw new Error('Bu kurum aktif planlarda kullanılıyor. Önce plan kayıtlarını güncelleyin.')
    }

    setKurumListesi((current) => current.filter((item) => item.id !== kurumId))
  }

  function importKurumlar(payloads) {
    const existingNames = new Set(kurumListesi.map((item) => normalizeSignatureText(item.ad)))
    const records = []

    payloads.forEach((payload) => {
      const nextInstitution = normalizeInstitutionItem({ id: uuidv4(), ...payload })
      const normalizedName = normalizeSignatureText(nextInstitution.ad)

      if (!nextInstitution.ad || existingNames.has(normalizedName)) {
        return
      }

      existingNames.add(normalizedName)
      records.push(nextInstitution)
    })

    if (!records.length) {
      throw new Error('İçe aktarılacak yeni kurum bulunamadı.')
    }

    setKurumListesi((current) => [...records, ...current])
    return records
  }

  function updateKurBilgileri(nextRates) {
    setKurBilgileri((current) => normalizeCurrencyRates({ ...current, ...nextRates }))
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

    const fallbackCategory = egitimKategorileri.find((item) => item !== target)

    if (!fallbackCategory) {
      throw new Error('Sistemde en az 1 eğitim kategorisi kalmalıdır.')
    }

    setKatalog((current) =>
      current.map((item) => (item.kategori === target ? { ...item, kategori: fallbackCategory } : item)),
    )

    setTalepler((current) =>
      current.map((item) => ({
        ...item,
        egitimler: item.egitimler.map((egitim) =>
          egitim.kategori === target ? { ...egitim, kategori: fallbackCategory } : egitim,
        ),
      })),
    )

    setPlanlar((current) =>
      current.map((item) => (item.kategori === target ? { ...item, kategori: fallbackCategory } : item)),
    )

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

  async function importTalepler(payloads, options = {}) {
    const batchSize = Math.max(50, Number(options.batchSize || 250))
    const maxIssues = Math.max(0, Number(options.maxIssues || 250))
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null
    const existingKeys = new Set(talepler.map((talep) => buildTalepDuplicateKey(talep)))
    const importedKeys = new Set()
    const records = []
    const issues = []
    let hiddenIssueCount = 0

    for (let startIndex = 0; startIndex < payloads.length; startIndex += batchSize) {
      const batch = payloads.slice(startIndex, startIndex + batchSize)

      batch.forEach((payload) => {
        try {
          const record = createTalepRecord(payload)

          if (!record) {
            return
          }

          if (existingKeys.has(record.duplicateKey) || importedKeys.has(record.duplicateKey)) {
            if (issues.length < maxIssues) {
              issues.push(
                getIssueDetails(payload, 'Mükerrer satır bulundu. Aynı kayıt daha önce sisteme eklenmiş veya dosyada tekrar ediyor.'),
              )
            } else {
              hiddenIssueCount += 1
            }
            return
          }

          importedKeys.add(record.duplicateKey)
          records.push(record)
        } catch (error) {
          if (issues.length < maxIssues) {
            issues.push(getIssueDetails(payload, error.message || 'Satır işlenemedi.'))
          } else {
            hiddenIssueCount += 1
          }
        }
      })

      onProgress?.({
        processed: Math.min(startIndex + batch.length, payloads.length),
        total: payloads.length,
      })

      if (startIndex + batch.length < payloads.length) {
        await yieldToMainThread()
      }
    }

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
      hiddenIssueCount,
      totalIssueCount: issues.length + hiddenIssueCount,
    }
  }

  async function importTaleplerFromExcelFile(file, options = {}) {
    if (!isRemoteSyncEnabled()) {
      throw new Error('Sunucu üzerinden import için merkezi veri servisi aktif olmalıdır.')
    }

    const result = await uploadTaleplerExcel(file, {
      talepYili: options.talepYili,
      maxIssues: options.maxIssues,
    })

    const refreshedState = await fetchRemoteAppState(DEFAULT_APP_STATE)
    applyAppStateSnapshot(refreshedState)
    lastSyncedStateRef.current = JSON.stringify(refreshedState)
    setSyncStatus((current) => ({
      ...current,
      mode: 'remote',
      error: '',
    }))

    return result
  }

  function planTalep({ talepId, selectedEgitimIds, ortakAlanlar }) {
    const talep = talepler.find((item) => item.id === talepId)

    if (!talep) {
      throw new Error('Planlanacak talep bulunamadı.')
    }

    const existingPlanKeys = new Set(planlar.map((plan) => getPlanKey(plan.talepId, plan.egitimAdi, plan.egitimKodu)))
    const planGrubuId = uuidv4()
    const butcePaylasimAdedi = countPlanEntries({
      talep,
      selectedEgitimIds,
      existingPlanKeys,
    })
    const nextPlanlar = buildPlanEntries({
      talep,
      selectedEgitimIds,
      ortakAlanlar,
      existingPlanKeys,
      planGrubuId,
      butcePaylasimAdedi,
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
    const planGrubuId = uuidv4()
    const butcePaylasimAdedi = selections.reduce((total, selection) => {
      const talep = talepler.find((item) => item.id === selection.talepId)

      if (!talep) {
        return total
      }

      return total + countPlanEntries({
        talep,
        selectedEgitimIds: selection.selectedEgitimIds,
        existingPlanKeys,
      })
    }, 0)

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
        planGrubuId,
        butcePaylasimAdedi,
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

        const icEgitim = Boolean(updates.icEgitim ?? plan.icEgitim)

        const nextPlan = {
          ...plan,
          ...updates,
          icEgitim,
          egitimci: icEgitim
            ? (`${updates.egitimci ?? (plan.egitimci || 'İç Eğitim')}`.trim() || 'İç Eğitim')
            : '',
          kurum: icEgitim ? '' : `${updates.kurum ?? (plan.kurum || plan.egitimci || '')}`.trim(),
          maliyet: Number((updates.maliyet ?? plan.maliyet) || 0),
          toplamMaliyet: Number((updates.toplamMaliyet ?? updates.maliyet ?? plan.toplamMaliyet ?? plan.maliyet) || 0),
          butcePaylasimAdedi: Math.max(1, Number((updates.butcePaylasimAdedi ?? plan.butcePaylasimAdedi) || 1)),
          planGrubuId: updates.planGrubuId ?? plan.planGrubuId ?? plan.id,
          maliyetParaBirimi: `${updates.maliyetParaBirimi || plan.maliyetParaBirimi || 'TRY'}`.trim().toUpperCase(),
          dovizKuru: Number((updates.dovizKuru ?? plan.dovizKuru) || 1),
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
    kurumListesi,
    egitmenListesi,
    kurBilgileri,
    syncStatus,
    addTalep,
    importTalepler,
    importTaleplerFromExcelFile,
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
    addKurum,
    updateKurum,
    deleteKurum,
    importKurumlar,
    addEgitmen,
    updateEgitmen,
    deleteEgitmen,
    importEgitmenler,
    updateKurBilgileri,
  }
}