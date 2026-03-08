import { v4 as uuidv4 } from 'uuid'
import { format } from 'date-fns'
import { LOCAL_STORAGE_KEYS } from '../data/constants'
import { initialCatalog, initialPlanlar, initialTalepler } from '../data/initialData'
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

export default function useEgitimData() {
  const [katalog, setKatalog] = useLocalStorage(LOCAL_STORAGE_KEYS.katalog, initialCatalog)
  const [talepler, setTalepler] = useLocalStorage(LOCAL_STORAGE_KEYS.talepler, initialTalepler)
  const [planlar, setPlanlar] = useLocalStorage(LOCAL_STORAGE_KEYS.planlar, initialPlanlar)

  function addTalep(payload) {
    const validEgitimler = payload.egitimler
      .filter((egitim) => egitim.egitimAdi.trim())
      .slice(0, 4)
      .map((egitim, index) => ({
        egitimId: egitim.egitimId || uuidv4(),
        egitimAdi: egitim.egitimAdi.trim(),
        kategori: egitim.kategori,
        oncelik: Number(egitim.oncelik || index + 1),
      }))

    if (validEgitimler.length < 1 || validEgitimler.length > 4) {
      throw new Error('Talep formunda en az 1, en fazla 4 eğitim olmalıdır.')
    }

    const nextTalep = {
      id: uuidv4(),
      yoneticiAdi: payload.yoneticiAdi.trim(),
      yoneticiEmail: payload.yoneticiEmail.trim(),
      gmy: payload.gmy,
      birim: payload.birim.trim(),
      calisanAdi: payload.calisanAdi.trim(),
      calisanSicil: payload.calisanSicil.trim(),
      egitimler: validEgitimler,
      talepTarihi: payload.talepTarihi || getToday(),
      notlar: payload.notlar.trim(),
      durum: 'beklemede',
    }

    setTalepler((current) => [nextTalep, ...current])
    setKatalog((current) => syncCatalogEntries(current, validEgitimler))

    return nextTalep
  }

  function planTalep({ talepId, selectedEgitimIds, ortakAlanlar }) {
    const talep = talepler.find((item) => item.id === talepId)

    if (!talep) {
      throw new Error('Planlanacak talep bulunamadı.')
    }

    if (!selectedEgitimIds.length) {
      throw new Error('En az bir eğitim seçilmelidir.')
    }

    const planlanmaTarihi = ortakAlanlar.planlanmaTarihi || getToday()
    const egitimTarihi = ortakAlanlar.egitimTarihi || getToday()
    const nextPlanlar = talep.egitimler
      .filter((egitim) => selectedEgitimIds.includes(egitim.egitimId))
      .map((egitim) => ({
        id: uuidv4(),
        talepId,
        calisanAdi: talep.calisanAdi,
        calisanSicil: talep.calisanSicil,
        gmy: talep.gmy,
        birim: talep.birim,
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
    planTalep,
    updatePlan,
    deletePlan,
  }
}