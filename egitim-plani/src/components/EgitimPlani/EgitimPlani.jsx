import { useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { DURUM_LISTESI, EGITIM_TURLERI, PARA_BIRIMLERI } from '../../data/constants'
import { formatDate, getEmployeeRoute } from '../../utils/helpers'
import Badge from '../ui/Badge'
import Card from '../ui/Card'
import EmptyState from '../ui/EmptyState'
import Modal from '../ui/Modal'

const TRAINING_PAGE_SIZE = 12
const EMPLOYEE_PAGE_SIZE = 15

function createPlanningDraft() {
  return {
    egitimTuru: EGITIM_TURLERI[0],
    egitimTarihi: new Date().toISOString().slice(0, 10),
    sure: '1 gün',
    icEgitim: true,
    egitimci: 'İç Eğitim',
    kurum: '',
    maliyet: 0,
    maliyetParaBirimi: 'TRY',
    dovizKuru: 1,
    durum: DURUM_LISTESI[0],
    notlar: '',
  }
}

function getDefaultInternalTrainerName(egitmenListesi = []) {
  return egitmenListesi[0]?.ad || ''
}

function getDefaultInstitutionName(kurumListesi = []) {
  return kurumListesi[0]?.ad || ''
}

function getSelectionKey(row) {
  return `${row.talep.id}::${row.egitim.egitimId}`
}

function createDraftForPlanningRows(requestRows, egitmenListesi, kurumListesi, kurBilgileri, contextKey) {
  const baseDraft = createPlanningDraft()

  return {
    ...baseDraft,
    contextKey,
    egitimci: baseDraft.icEgitim ? baseDraft.egitimci || getDefaultInternalTrainerName(egitmenListesi) : '',
    kurum: baseDraft.icEgitim ? '' : getDefaultInstitutionName(kurumListesi),
    dovizKuru:
      baseDraft.maliyetParaBirimi === 'TRY'
        ? 1
        : Number(kurBilgileri?.[baseDraft.maliyetParaBirimi] || baseDraft.dovizKuru || 1),
  }
}

function sortTrainingGroups(left, right) {
  const leftHasPending = left.pendingCount > 0
  const rightHasPending = right.pendingCount > 0

  if (leftHasPending !== rightHasPending) {
    return leftHasPending ? -1 : 1
  }

  const categoryCompare = left.kategori.localeCompare(right.kategori, 'tr')

  if (categoryCompare !== 0) {
    return categoryCompare
  }

  if (right.pendingCount !== left.pendingCount) {
    return right.pendingCount - left.pendingCount
  }

  if (right.talepler.length !== left.talepler.length) {
    return right.talepler.length - left.talepler.length
  }

  return getTrainingDisplayName(left).localeCompare(getTrainingDisplayName(right), 'tr')
}

function getTrainingDisplayName(training) {
  return training?.egitimAdi || '-'
}

function sortTrainingGroupsBy(left, right, sortBy) {
  if (sortBy === 'ad') {
    return getTrainingDisplayName(left).localeCompare(getTrainingDisplayName(right), 'tr')
  }

  if (sortBy === 'calisan') {
    if (right.employeeCount !== left.employeeCount) {
      return right.employeeCount - left.employeeCount
    }

    return sortTrainingGroups(left, right)
  }

  if (sortBy === 'toplam') {
    if (right.talepler.length !== left.talepler.length) {
      return right.talepler.length - left.talepler.length
    }

    return sortTrainingGroups(left, right)
  }

  return sortTrainingGroups(left, right)
}

function sortRequestRows(left, right) {
  if (Boolean(left.relatedPlan) !== Boolean(right.relatedPlan)) {
    return left.relatedPlan ? 1 : -1
  }

  return left.talep.calisanAdi.localeCompare(right.talep.calisanAdi, 'tr')
}

function getPageCount(total, pageSize) {
  return Math.max(1, Math.ceil(total / pageSize))
}

function paginate(items, page, pageSize) {
  const startIndex = (page - 1) * pageSize
  return items.slice(startIndex, startIndex + pageSize)
}

function TrainingPlanningModal({
  requestRows,
  open,
  onOpenChange,
  onSaveSingle,
  onSaveBatch,
  egitmenListesi,
  kurumListesi,
  kurBilgileri,
}) {
  const contextKey = requestRows.length ? requestRows.map(getSelectionKey).join('|') : 'empty'
  const [draft, setDraft] = useState(() =>
    createDraftForPlanningRows(requestRows, egitmenListesi, kurumListesi, kurBilgileri, contextKey),
  )

  if (!requestRows.length) {
    return null
  }

  const activeDraft =
    draft.contextKey === contextKey
      ? draft
      : createDraftForPlanningRows(requestRows, egitmenListesi, kurumListesi, kurBilgileri, contextKey)

  function updateDraft(updater) {
    setDraft((current) => {
      const baseDraft =
        current.contextKey === contextKey
          ? current
          : createDraftForPlanningRows(requestRows, egitmenListesi, kurumListesi, kurBilgileri, contextKey)
      const nextDraft = typeof updater === 'function' ? updater(baseDraft) : updater

      return {
        ...nextDraft,
        contextKey,
      }
    })
  }

  const isBulk = requestRows.length > 1
  const primaryRow = requestRows[0]

  function handleSave() {
    const ortakAlanlar = {
      planlanmaTarihi: new Date().toISOString().slice(0, 10),
      egitimTarihi: activeDraft.egitimTarihi,
      egitimTuru: activeDraft.egitimTuru,
      sure: activeDraft.sure,
      icEgitim: activeDraft.icEgitim,
      egitimci: activeDraft.icEgitim ? activeDraft.egitimci : '',
      kurum: activeDraft.icEgitim ? '' : activeDraft.kurum,
      maliyet: activeDraft.maliyet,
      maliyetParaBirimi: activeDraft.maliyetParaBirimi,
      dovizKuru: activeDraft.maliyetParaBirimi === 'TRY' ? 1 : Number(activeDraft.dovizKuru || 1),
      durum: activeDraft.durum,
      notlar: activeDraft.notlar,
    }

    try {
      if (isBulk) {
        onSaveBatch({
          selections: requestRows.map((row) => ({
            talepId: row.talep.id,
            selectedEgitimIds: [row.egitim.egitimId],
          })),
          ortakAlanlar,
        })
      } else {
        onSaveSingle({
          talepId: primaryRow.talep.id,
          selectedEgitimIds: [primaryRow.egitim.egitimId],
          ortakAlanlar,
        })
      }

      toast.success(
        isBulk
          ? `${requestRows.length} çalışan için eğitim planı oluşturuldu.`
          : 'Eğitim planlaması oluşturuldu.',
      )
      onOpenChange(false)
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`${getTrainingDisplayName(primaryRow.egitim)} planla`}
      description={
        isBulk
          ? `${requestRows.length} çalışan için toplu eğitim planı oluşturun`
          : `${primaryRow.talep.calisanAdi} için eğitim planı oluşturun`
      }
      footer={
        <>
          <button className="button button--secondary" onClick={() => onOpenChange(false)}>
            Vazgeç
          </button>
          <button className="button" onClick={handleSave}>
            {isBulk ? 'Toplu Planı Kaydet' : 'Planı Kaydet'}
          </button>
        </>
      }
      maxWidth={860}
    >
      <div className="detail-grid detail-grid--compact">
        <div className="detail-card">
          <span>Eğitim</span>
          <strong>{getTrainingDisplayName(primaryRow.egitim)}</strong>
          <small>{primaryRow.egitim.kategori}</small>
        </div>
        <div className="detail-card">
          <span>Seçilen Çalışan</span>
          <strong>{requestRows.length}</strong>
          <small>{isBulk ? 'Toplu planlama akışı' : primaryRow.talep.calisanAdi}</small>
        </div>
        <div className="detail-card">
          <span>GMY Dağılımı</span>
          <strong>{new Set(requestRows.map((row) => row.talep.gmy)).size}</strong>
          <small>Benzersiz GMY sayısı</small>
        </div>
        <div className="detail-card">
          <span>Lokasyon Dağılımı</span>
          <strong>{new Set(requestRows.map((row) => row.talep.calisanLokasyon || 'Lokasyon Yok')).size}</strong>
          <small>Benzersiz lokasyon sayısı</small>
        </div>
      </div>

      <div className="employee-preview-list">
        {requestRows.map((row) => (
          <div key={getSelectionKey(row)} className="employee-preview-item">
            <strong>{row.talep.calisanAdi}</strong>
            <span>{`${row.talep.calisanSicil} • ${row.talep.calisanKullaniciKodu || '-'} • ${row.talep.calisanLokasyon || 'Lokasyon Yok'}`}</span>
          </div>
        ))}
      </div>

      <div className="form-grid">
        <label>
          <span>Eğitim Türü</span>
          <select value={activeDraft.egitimTuru} onChange={(event) => updateDraft((current) => ({ ...current, egitimTuru: event.target.value }))}>
            {EGITIM_TURLERI.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Eğitim Tarihi</span>
          <input type="date" value={activeDraft.egitimTarihi} onChange={(event) => updateDraft((current) => ({ ...current, egitimTarihi: event.target.value }))} />
        </label>
        <label>
          <span>Süre</span>
          <input value={activeDraft.sure} onChange={(event) => updateDraft((current) => ({ ...current, sure: event.target.value }))} />
        </label>
        <label>
          <span>İç Eğitim</span>
          <div className="checkbox-card checkbox-card--inline">
            <input
              type="checkbox"
              checked={activeDraft.icEgitim}
              onChange={(event) =>
                updateDraft((current) => ({
                  ...current,
                  icEgitim: event.target.checked,
                  egitimci: event.target.checked ? current.egitimci || getDefaultInternalTrainerName(egitmenListesi) : '',
                  kurum: event.target.checked ? '' : current.kurum || getDefaultInstitutionName(kurumListesi),
                }))
              }
            />
            <div>
              <strong>{activeDraft.icEgitim ? 'İç eğitmen seçilecek' : 'Dış kurum seçilecek'}</strong>
              <span>{activeDraft.icEgitim ? 'Kurum alanı pasif, iç eğitmen listesi aktif.' : 'İç eğitmen alanı pasif, kurum listesi aktif.'}</span>
            </div>
          </div>
        </label>
        <label>
          <span>İç Eğitmen</span>
          <select
              value={activeDraft.egitimci}
              disabled={!activeDraft.icEgitim}
              onChange={(event) => updateDraft((current) => ({ ...current, egitimci: event.target.value }))}
            >
              <option value="">İç eğitmen seçin</option>
              {egitmenListesi.map((trainer) => (
                <option key={trainer.id} value={trainer.ad}>{`${trainer.ad}${trainer.birim ? ` • ${trainer.birim}` : ''}`}</option>
              ))}
          </select>
        </label>
        <label>
          <span>Kurum</span>
          <select
              value={activeDraft.kurum}
              disabled={activeDraft.icEgitim}
              onChange={(event) => updateDraft((current) => ({ ...current, kurum: event.target.value }))}
            >
              <option value="">Kurum seçin</option>
              {kurumListesi.map((institution) => (
                <option key={institution.id} value={institution.ad}>{institution.ad}</option>
              ))}
          </select>
        </label>
        <label>
          <span>Durum</span>
          <select value={activeDraft.durum} onChange={(event) => updateDraft((current) => ({ ...current, durum: event.target.value }))}>
            {DURUM_LISTESI.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Toplam Bütçe</span>
          <input type="number" min="0" value={activeDraft.maliyet} onChange={(event) => updateDraft((current) => ({ ...current, maliyet: Number(event.target.value) }))} />
        </label>
        <label>
          <span>Para Birimi</span>
          <select
            value={activeDraft.maliyetParaBirimi}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                maliyetParaBirimi: event.target.value,
                dovizKuru: event.target.value === 'TRY' ? 1 : Number(kurBilgileri?.[event.target.value] || current.dovizKuru || 1),
              }))
            }
          >
            {PARA_BIRIMLERI.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Kur</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={activeDraft.dovizKuru}
            disabled={activeDraft.maliyetParaBirimi === 'TRY'}
            onChange={(event) => updateDraft((current) => ({ ...current, dovizKuru: Number(event.target.value) }))}
          />
        </label>
        <label className="form-grid--full">
          <span>Notlar</span>
          <textarea rows={4} value={activeDraft.notlar} onChange={(event) => updateDraft((current) => ({ ...current, notlar: event.target.value }))} />
        </label>
        <div className="form-grid--full detail-card">
          <span>Bütçe Notu</span>
          <small>Girilen bütçe toplu planlamanın toplam bütçesidir. Dashboard ve raporlar bu tutarı seçilen kişi ve filtre sayısına göre paylaştırır.</small>
        </div>
      </div>
    </Modal>
  )
}

export default function EgitimPlaniPage({
  talepler,
  planlar,
  planTalep,
  planTalepler,
  egitmenListesi,
  kurumListesi,
  kurBilgileri,
}) {
  const activeTalepYili = Math.max(...talepler.map((talep) => Number(talep.talepYili || new Date().getFullYear())), new Date().getFullYear())
  const activeTalepler = talepler.filter((talep) => Number(talep.talepYili || new Date().getFullYear()) === activeTalepYili)

  const trainingGroups = useMemo(() => {
    const trainingMap = activeTalepler.reduce((accumulator, talep) => {
      talep.egitimler.forEach((egitim) => {
        const trainingKey = `${egitim.egitimKodu || ''}::${egitim.egitimAdi}`

        if (!accumulator[trainingKey]) {
          accumulator[trainingKey] = {
            trainingKey,
            egitimKodu: egitim.egitimKodu || '',
            egitimAdi: egitim.egitimAdi,
            kategori: egitim.kategori,
            talepler: [],
          }
        }

        accumulator[trainingKey].talepler.push({ talep, egitim })
      })

      return accumulator
    }, {})

    return Object.values(trainingMap).map((group) => {
      const plannedCount = group.talepler.filter((entry) =>
        planlar.some(
          (plan) =>
            plan.talepId === entry.talep.id &&
            plan.egitimAdi === entry.egitim.egitimAdi &&
            (plan.egitimKodu || '') === (entry.egitim.egitimKodu || ''),
        ),
      ).length

      return {
        ...group,
        plannedCount,
        pendingCount: group.talepler.length - plannedCount,
        employeeCount: new Set(group.talepler.map((entry) => entry.talep.calisanSicil)).size,
        gmyCount: new Set(group.talepler.map((entry) => entry.talep.gmy)).size,
      }
    })
  }, [activeTalepler, planlar])

  const [trainingSearch, setTrainingSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Tümü')
  const [selectedPlanFilter, setSelectedPlanFilter] = useState('Tümü')
  const [trainingSort, setTrainingSort] = useState('bekleyen')
  const [trainingPage, setTrainingPage] = useState(1)
  const [selectedTrainingName, setSelectedTrainingName] = useState(trainingGroups[0]?.trainingKey || '')
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [selectedEmployeeStatus, setSelectedEmployeeStatus] = useState('Tümü')
  const [selectedEmployeeGmy, setSelectedEmployeeGmy] = useState('Tümü')
  const [employeePage, setEmployeePage] = useState(1)
  const [selectedRequestKeys, setSelectedRequestKeys] = useState([])
  const [planningRows, setPlanningRows] = useState([])

  const kpiSummary = useMemo(
    () => ({
      totalTrainings: trainingGroups.length,
      pendingRequests: trainingGroups.reduce((total, group) => total + group.pendingCount, 0),
      activeEmployees: new Set(activeTalepler.map((talep) => talep.calisanSicil)).size,
      unplannedTrainings: trainingGroups.filter((group) => group.plannedCount === 0).length,
    }),
    [activeTalepler, trainingGroups],
  )

  const availableCategories = useMemo(
    () => ['Tümü', ...new Set(trainingGroups.map((group) => group.kategori).filter(Boolean))],
    [trainingGroups],
  )

  const filteredTrainingGroups = useMemo(() => {
    const normalizedQuery = trainingSearch.trim().toLocaleLowerCase('tr-TR')

    return trainingGroups.filter((group) => {
      const matchesCategory = selectedCategory === 'Tümü' || group.kategori === selectedCategory
      const matchesPlanFilter =
        selectedPlanFilter === 'Tümü' ||
        (selectedPlanFilter === 'Bekleyenler' && group.pendingCount > 0) ||
        (selectedPlanFilter === 'Planlananlar' && group.plannedCount > 0)

      if (!matchesCategory || !matchesPlanFilter) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      return [group.egitimAdi, group.kategori, group.egitimKodu]
        .some((value) => `${value || ''}`.toLocaleLowerCase('tr-TR').includes(normalizedQuery))
    }).sort((left, right) => sortTrainingGroupsBy(left, right, trainingSort))
  }, [selectedCategory, selectedPlanFilter, trainingGroups, trainingSearch, trainingSort])

  const trainingPageCount = getPageCount(filteredTrainingGroups.length, TRAINING_PAGE_SIZE)
  const safeTrainingPage = Math.min(trainingPage, trainingPageCount)
  const paginatedTrainingGroups = useMemo(
    () => paginate(filteredTrainingGroups, safeTrainingPage, TRAINING_PAGE_SIZE),
    [filteredTrainingGroups, safeTrainingPage],
  )

  const activeTrainingName = filteredTrainingGroups.some((item) => item.trainingKey === selectedTrainingName)
    ? selectedTrainingName
    : filteredTrainingGroups[0]?.trainingKey || ''

  const selectedTraining = filteredTrainingGroups.find((item) => item.trainingKey === activeTrainingName)
  const requestRows = useMemo(
    () =>
      (selectedTraining?.talepler || []).map((entry) => {
        const relatedPlan = planlar.find(
          (plan) =>
            plan.talepId === entry.talep.id &&
            plan.egitimAdi === entry.egitim.egitimAdi &&
            (plan.egitimKodu || '') === (entry.egitim.egitimKodu || ''),
        )

        return {
          ...entry,
          relatedPlan,
        }
      }),
    [planlar, selectedTraining],
  )

  const employeeGmyOptions = useMemo(
    () => ['Tümü', ...new Set(requestRows.map((row) => row.talep.gmy).filter(Boolean))],
    [requestRows],
  )

  const filteredRequestRows = useMemo(() => {
    const normalizedQuery = employeeSearch.trim().toLocaleLowerCase('tr-TR')

    return requestRows.filter((row) => {
      const matchesStatus =
        selectedEmployeeStatus === 'Tümü' ||
        (selectedEmployeeStatus === 'Bekleyenler' && !row.relatedPlan) ||
        (selectedEmployeeStatus === 'Planlananlar' && Boolean(row.relatedPlan))
      const matchesGmy = selectedEmployeeGmy === 'Tümü' || row.talep.gmy === selectedEmployeeGmy

      if (!matchesStatus || !matchesGmy) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      return [
        row.talep.calisanAdi,
        row.talep.calisanSicil,
        row.talep.calisanKullaniciKodu,
        row.talep.calisanLokasyon,
        row.talep.yoneticiAdi,
        row.talep.gmy,
      ].some((value) => `${value || ''}`.toLocaleLowerCase('tr-TR').includes(normalizedQuery))
    }).sort(sortRequestRows)
  }, [employeeSearch, requestRows, selectedEmployeeGmy, selectedEmployeeStatus])

  const employeePageCount = getPageCount(filteredRequestRows.length, EMPLOYEE_PAGE_SIZE)
  const safeEmployeePage = Math.min(employeePage, employeePageCount)
  const paginatedRequestRows = useMemo(
    () => paginate(filteredRequestRows, safeEmployeePage, EMPLOYEE_PAGE_SIZE),
    [filteredRequestRows, safeEmployeePage],
  )

  const filteredPendingRows = filteredRequestRows.filter((row) => !row.relatedPlan)
  const selectedRows = filteredPendingRows.filter((row) => selectedRequestKeys.includes(getSelectionKey(row)))
  const bekleyenCount = filteredPendingRows.length
  const allPendingSelected =
    filteredPendingRows.length > 0 && filteredPendingRows.every((row) => selectedRequestKeys.includes(getSelectionKey(row)))

  function handleSelectTraining(trainingKey) {
    setSelectedTrainingName(trainingKey)
    setEmployeePage(1)
    setSelectedRequestKeys([])
  }

  function handleTrainingSearchChange(value) {
    setTrainingSearch(value)
    setTrainingPage(1)
  }

  function handleCategoryChange(value) {
    setSelectedCategory(value)
    setTrainingPage(1)
  }

  function handlePlanFilterChange(value) {
    setSelectedPlanFilter(value)
    setTrainingPage(1)
  }

  function handleTrainingSortChange(value) {
    setTrainingSort(value)
    setTrainingPage(1)
  }

  function handleEmployeeSearchChange(value) {
    setEmployeeSearch(value)
    setEmployeePage(1)
  }

  function handleEmployeeGmyChange(value) {
    setSelectedEmployeeGmy(value)
    setEmployeePage(1)
  }

  function handleEmployeeStatusChange(value) {
    setSelectedEmployeeStatus(value)
    setEmployeePage(1)
  }

  function handleToggleRow(row) {
    const key = getSelectionKey(row)

    setSelectedRequestKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    )
  }

  function handleToggleAll() {
    setSelectedRequestKeys((current) => {
      if (allPendingSelected) {
        return current.filter((key) => !filteredPendingRows.some((row) => getSelectionKey(row) === key))
      }

      const nextKeys = new Set(current)
      filteredPendingRows.forEach((row) => {
        nextKeys.add(getSelectionKey(row))
      })
      return [...nextKeys]
    })
  }

  function openBulkPlanner() {
    if (!selectedRows.length) {
      toast.error('Toplu planlama için en az bir çalışan seçin.')
      return
    }

    setPlanningRows(selectedRows)
  }

  function closePlanner() {
    setPlanningRows([])
  }

  return (
    <div className="page-stack">
      <section className="page-toolbar">
        <Card className="surface-card--accent">
          <span className="eyebrow">Eğitim Planlama</span>
          <h2>Çalışanları seçerek tekli veya toplu plan oluşturun</h2>
          <p>{`${activeTalepYili} yılına ait en güncel talepler üzerinden tekli veya toplu planlama yapın.`}</p>
        </Card>
      </section>

      {!trainingGroups.length ? (
        <EmptyState
          title="Planlanacak talep bulunmuyor"
          description="Önce Talepler ekranından yeni talep ekleyin veya Excel ile içeri aktarın."
        />
      ) : (
        <>
          <section className="stats-grid stats-grid--compact">
            <Card className="mini-stat">
              <span>Toplam Eğitim</span>
              <strong>{kpiSummary.totalTrainings}</strong>
            </Card>
            <Card className="mini-stat">
              <span>Bekleyen Talep</span>
              <strong>{kpiSummary.pendingRequests}</strong>
            </Card>
            <Card className="mini-stat">
              <span>Talep Eden Çalışan</span>
              <strong>{kpiSummary.activeEmployees}</strong>
            </Card>
            <Card className="mini-stat">
              <span>Hiç Planlanmamış Eğitim</span>
              <strong>{kpiSummary.unplannedTrainings}</strong>
            </Card>
          </section>

          <section className="planning-workspace">
            <Card className="planning-panel planning-panel--list">
              <div className="section-heading section-heading--tight">
                <div>
                  <h3>Eğitim Operasyon Listesi</h3>
                  <p>{`${activeTalepYili} yılı için eğitimleri filtreleyin, sıralayın ve bir eğitim seçin.`}</p>
                </div>
                <div className="planning-panel__summary">
                  <span>{`${filteredTrainingGroups.length} kayıt`}</span>
                  <strong>{`Sayfa ${safeTrainingPage} / ${trainingPageCount}`}</strong>
                </div>
              </div>

              <div className="filter-panel training-list-filters">
                <label>
                  <span>Eğitim Ara</span>
                  <input
                    type="search"
                    placeholder="Eğitim adı veya kodu ile ara"
                    value={trainingSearch}
                    onChange={(event) => handleTrainingSearchChange(event.target.value)}
                  />
                </label>
                <label>
                  <span>Kategori</span>
                  <select value={selectedCategory} onChange={(event) => handleCategoryChange(event.target.value)}>
                    {availableCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Plan Durumu</span>
                  <select value={selectedPlanFilter} onChange={(event) => handlePlanFilterChange(event.target.value)}>
                    <option value="Tümü">Tümü</option>
                    <option value="Bekleyenler">Bekleyenler</option>
                    <option value="Planlananlar">Planlananlar</option>
                  </select>
                </label>
                <label>
                  <span>Sıralama</span>
                  <select value={trainingSort} onChange={(event) => handleTrainingSortChange(event.target.value)}>
                    <option value="bekleyen">Bekleyen Talep</option>
                    <option value="toplam">Toplam Talep</option>
                    <option value="calisan">Çalışan Sayısı</option>
                    <option value="ad">Eğitim Adı</option>
                  </select>
                </label>
              </div>

              {!filteredTrainingGroups.length ? (
                <EmptyState
                  title="Filtreye uygun eğitim bulunamadı"
                  description="Arama metnini veya filtreleri değiştirerek tekrar deneyin."
                />
              ) : (
                <>
                  <div className="training-list training-list--table">
                    {paginatedTrainingGroups.map((group) => (
                      <button
                        key={group.trainingKey}
                        className={`training-list-row ${activeTrainingName === group.trainingKey ? 'active' : ''}`.trim()}
                        onClick={() => handleSelectTraining(group.trainingKey)}
                      >
                        <div className="training-list-row__title">
                          <strong>{getTrainingDisplayName(group)}</strong>
                          <small>{group.kategori}</small>
                        </div>

                        <div className="training-list-row__stats">
                          <div>
                            <span>Bekleyen</span>
                            <strong>{group.pendingCount}</strong>
                          </div>
                          <div>
                            <span>Planlanan</span>
                            <strong>{group.plannedCount}</strong>
                          </div>
                          <div>
                            <span>Çalışan</span>
                            <strong>{group.employeeCount}</strong>
                          </div>
                          <div>
                            <span>GMY</span>
                            <strong>{group.gmyCount}</strong>
                          </div>
                          <div>
                            <span>Toplam Talep</span>
                            <strong>{group.talepler.length}</strong>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="pagination-bar">
                    <button className="button button--secondary" disabled={safeTrainingPage <= 1} onClick={() => setTrainingPage((page) => Math.max(1, page - 1))}>
                      Önceki
                    </button>
                    <span>{`Sayfa ${safeTrainingPage} / ${trainingPageCount}`}</span>
                    <button
                      className="button button--secondary"
                      disabled={safeTrainingPage >= trainingPageCount}
                      onClick={() => setTrainingPage((page) => Math.min(trainingPageCount, page + 1))}
                    >
                      Sonraki
                    </button>
                  </div>
                </>
              )}
            </Card>

            <Card className="planning-panel planning-panel--detail">
              {!selectedTraining ? (
                <EmptyState
                  title="Eğitim seçin"
                  description="Soldaki listeden bir eğitim seçildiğinde çalışan talepleri burada gösterilir."
                />
              ) : (
                <>
                  <div className="section-heading planning-detail-header">
                    <div>
                      <h3>{getTrainingDisplayName(selectedTraining)}</h3>
                      <p>{`${selectedTraining.kategori} kategorisinde ${selectedTraining.talepler.length} talep kaydı bulunuyor.`}</p>
                    </div>
                    <div className="planning-panel__summary planning-panel__summary--inline">
                      <span>{`${bekleyenCount} bekleyen`}</span>
                      <strong>{`${selectedRows.length} seçili çalışan`}</strong>
                    </div>
                  </div>

                  <div className="detail-grid planning-detail-metrics">
                    <div className="detail-card detail-card--hero">
                      <span>Toplam Talep</span>
                      <strong>{requestRows.length}</strong>
                      <small>Seçilen eğitim için tüm kayıtlar</small>
                    </div>
                    <div className="detail-card detail-card--hero">
                      <span>Bekleyen</span>
                      <strong>{bekleyenCount}</strong>
                      <small>Henüz plana alınmamış çalışanlar</small>
                    </div>
                    <div className="detail-card detail-card--hero">
                      <span>GMY Dağılımı</span>
                      <strong>{employeeGmyOptions.length - 1}</strong>
                      <small>Bu eğitim talebinin geldiği GMY sayısı</small>
                    </div>
                    <div className="detail-card detail-card--hero">
                      <span>Planlanan</span>
                      <strong>{requestRows.length - bekleyenCount}</strong>
                      <small>Planı oluşturulmuş çalışanlar</small>
                    </div>
                  </div>

                  <div className="filter-panel planning-detail-filters">
                    <label>
                      <span>Çalışan Ara</span>
                      <input
                        type="search"
                        placeholder="Çalışan adı, sicil, kullanıcı kodu, lokasyon"
                        value={employeeSearch}
                        onChange={(event) => handleEmployeeSearchChange(event.target.value)}
                      />
                    </label>
                    <label>
                      <span>GMY</span>
                      <select value={selectedEmployeeGmy} onChange={(event) => handleEmployeeGmyChange(event.target.value)}>
                        {employeeGmyOptions.map((gmy) => (
                          <option key={gmy} value={gmy}>
                            {gmy}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Plan Durumu</span>
                      <select value={selectedEmployeeStatus} onChange={(event) => handleEmployeeStatusChange(event.target.value)}>
                        <option value="Tümü">Tümü</option>
                        <option value="Bekleyenler">Bekleyenler</option>
                        <option value="Planlananlar">Planlananlar</option>
                      </select>
                    </label>
                    <div className="training-list-summary">
                      <span>Filtrelenmiş Çalışan</span>
                      <strong>{filteredRequestRows.length}</strong>
                    </div>
                  </div>

                  <div className="selection-toolbar">
                    <button className="button button--secondary" onClick={handleToggleAll}>
                      {allPendingSelected ? 'Filtrelenmiş Seçimi Temizle' : 'Filtrelenmiş Bekleyenleri Seç'}
                    </button>
                    <button className="button" disabled={!selectedRows.length} onClick={openBulkPlanner}>
                      {selectedRows.length ? `${selectedRows.length} Kişiyi Toplu Planla` : 'Toplu Planla'}
                    </button>
                  </div>

                  {!filteredRequestRows.length ? (
                    <EmptyState
                      title="Çalışan bulunamadı"
                      description="Çalışan filtrelerini değiştirerek bu eğitim için farklı kayıtları görüntüleyin."
                    />
                  ) : (
                    <>
                      <div className="table-wrapper">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>
                                <input
                                  className="table-checkbox"
                                  type="checkbox"
                                  checked={allPendingSelected}
                                  onChange={handleToggleAll}
                                />
                              </th>
                              <th>Çalışan Adı</th>
                              <th>Sicil</th>
                              <th>Kullanıcı Kodu</th>
                              <th>Lokasyon</th>
                              <th>GMY</th>
                              <th>Yönetici</th>
                              <th>Notlar</th>
                              <th>Plan Durumu</th>
                              <th>İşlem</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedRequestRows.map((row) => {
                              const rowKey = getSelectionKey(row)

                              return (
                                <tr key={rowKey}>
                                  <td>
                                    <input
                                      className="table-checkbox"
                                      type="checkbox"
                                      checked={selectedRequestKeys.includes(rowKey)}
                                      disabled={Boolean(row.relatedPlan)}
                                      onChange={() => handleToggleRow(row)}
                                    />
                                  </td>
                                  <td>
                                    <Link className="table-link" to={getEmployeeRoute(row.talep.calisanSicil)}>
                                      {row.talep.calisanAdi}
                                    </Link>
                                  </td>
                                  <td>{row.talep.calisanSicil}</td>
                                  <td>{row.talep.calisanKullaniciKodu || '-'}</td>
                                  <td>{row.talep.calisanLokasyon || '-'}</td>
                                  <td>{row.talep.gmy}</td>
                                  <td>{row.talep.yoneticiAdi}</td>
                                  <td>{row.talep.notlar || '-'}</td>
                                  <td>
                                    {row.relatedPlan ? (
                                      <div className="stack-list stack-list--tight">
                                        <Badge value={row.relatedPlan.durum} />
                                        <span className="table-meta">{formatDate(row.relatedPlan.egitimTarihi)}</span>
                                      </div>
                                    ) : (
                                      <Badge value="beklemede" />
                                    )}
                                  </td>
                                  <td>
                                    <button
                                      className={`button ${row.relatedPlan ? 'button--secondary' : ''}`.trim()}
                                      disabled={Boolean(row.relatedPlan)}
                                      onClick={() => setPlanningRows([row])}
                                    >
                                      {row.relatedPlan ? 'Planlandı' : 'Tekli Planla'}
                                    </button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="pagination-bar pagination-bar--detail">
                        <button className="button button--secondary" disabled={safeEmployeePage <= 1} onClick={() => setEmployeePage((page) => Math.max(1, page - 1))}>
                          Önceki
                        </button>
                        <span>{`Sayfa ${safeEmployeePage} / ${employeePageCount}`}</span>
                        <button
                          className="button button--secondary"
                          disabled={safeEmployeePage >= employeePageCount}
                          onClick={() => setEmployeePage((page) => Math.min(employeePageCount, page + 1))}
                        >
                          Sonraki
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </Card>
          </section>

          <TrainingPlanningModal
            key={planningRows.length ? planningRows.map(getSelectionKey).join('|') : 'planning-modal'}
            requestRows={planningRows}
            open={Boolean(planningRows.length)}
            onOpenChange={closePlanner}
            onSaveSingle={planTalep}
            onSaveBatch={planTalepler}
            egitmenListesi={egitmenListesi}
            kurumListesi={kurumListesi}
            kurBilgileri={kurBilgileri}
          />
        </>
      )}
    </div>
  )
}
