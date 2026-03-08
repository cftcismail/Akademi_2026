import { useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { DURUM_LISTESI, EGITIM_TURLERI } from '../../data/constants'
import { formatDate, formatEgitimLabel, getEmployeeRoute } from '../../utils/helpers'
import Badge from '../ui/Badge'
import Card from '../ui/Card'
import EmptyState from '../ui/EmptyState'
import Modal from '../ui/Modal'

function createPlanningDraft() {
  return {
    egitimTuru: EGITIM_TURLERI[0],
    egitimTarihi: new Date().toISOString().slice(0, 10),
    sure: '1 gün',
    egitimci: 'İç Eğitim',
    maliyet: 0,
    durum: DURUM_LISTESI[0],
    notlar: '',
  }
}

function getSelectionKey(row) {
  return `${row.talep.id}::${row.egitim.egitimId}`
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

  return formatEgitimLabel(left).localeCompare(formatEgitimLabel(right), 'tr')
}

function getTrainingDisplayName(training) {
  return training?.egitimAdi || '-'
}

function TrainingPlanningModal({ requestRows, open, onOpenChange, onSaveSingle, onSaveBatch }) {
  const [draft, setDraft] = useState(createPlanningDraft())

  if (!requestRows.length) {
    return null
  }

  const isBulk = requestRows.length > 1
  const primaryRow = requestRows[0]

  function handleSave() {
    const ortakAlanlar = {
      planlanmaTarihi: new Date().toISOString().slice(0, 10),
      egitimTarihi: draft.egitimTarihi,
      egitimTuru: draft.egitimTuru,
      sure: draft.sure,
      egitimci: draft.egitimci,
      maliyet: draft.maliyet,
      durum: draft.durum,
      notlar: draft.notlar,
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
      </div>

      <div className="employee-preview-list">
        {requestRows.map((row) => (
          <div key={getSelectionKey(row)} className="employee-preview-item">
            <strong>{row.talep.calisanAdi}</strong>
            <span>{`${row.talep.calisanSicil} • ${row.talep.calisanKullaniciKodu || '-'}`}</span>
          </div>
        ))}
      </div>

      <div className="form-grid">
        <label>
          <span>Eğitim Türü</span>
          <select value={draft.egitimTuru} onChange={(event) => setDraft({ ...draft, egitimTuru: event.target.value })}>
            {EGITIM_TURLERI.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Eğitim Tarihi</span>
          <input type="date" value={draft.egitimTarihi} onChange={(event) => setDraft({ ...draft, egitimTarihi: event.target.value })} />
        </label>
        <label>
          <span>Süre</span>
          <input value={draft.sure} onChange={(event) => setDraft({ ...draft, sure: event.target.value })} />
        </label>
        <label>
          <span>Eğitimci</span>
          <input value={draft.egitimci} onChange={(event) => setDraft({ ...draft, egitimci: event.target.value })} />
        </label>
        <label>
          <span>Durum</span>
          <select value={draft.durum} onChange={(event) => setDraft({ ...draft, durum: event.target.value })}>
            {DURUM_LISTESI.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Maliyet</span>
          <input type="number" min="0" value={draft.maliyet} onChange={(event) => setDraft({ ...draft, maliyet: Number(event.target.value) })} />
        </label>
        <label className="form-grid--full">
          <span>Notlar</span>
          <textarea rows={4} value={draft.notlar} onChange={(event) => setDraft({ ...draft, notlar: event.target.value })} />
        </label>
      </div>
    </Modal>
  )
}

export default function EgitimPlaniPage({ talepler, planlar, planTalep, planTalepler }) {
  const activeTalepYili = Math.max(...talepler.map((talep) => Number(talep.talepYili || new Date().getFullYear())), new Date().getFullYear())
  const activeTalepler = talepler.filter((talep) => Number(talep.talepYili || new Date().getFullYear()) === activeTalepYili)

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

  const trainingGroups = Object.values(trainingMap)
    .map((group) => {
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
      }
    })
    .sort(sortTrainingGroups)

  const [trainingSearch, setTrainingSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Tümü')
  const [selectedPlanFilter, setSelectedPlanFilter] = useState('Tümü')
  const [selectedTrainingName, setSelectedTrainingName] = useState(trainingGroups[0]?.trainingKey || '')
  const [selectedRequestKeys, setSelectedRequestKeys] = useState([])
  const [planningRows, setPlanningRows] = useState([])

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
    })
  }, [selectedCategory, selectedPlanFilter, trainingGroups, trainingSearch])

  const activeTrainingName = filteredTrainingGroups.some((item) => item.trainingKey === selectedTrainingName)
    ? selectedTrainingName
    : filteredTrainingGroups[0]?.trainingKey || ''

  const selectedTraining = filteredTrainingGroups.find((item) => item.trainingKey === activeTrainingName)
  const requestRows = (selectedTraining?.talepler || []).map((entry) => {
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
  })

  const pendingRows = requestRows.filter((row) => !row.relatedPlan)
  const selectedRows = pendingRows.filter((row) => selectedRequestKeys.includes(getSelectionKey(row)))
  const bekleyenCount = pendingRows.length
  const allPendingSelected = pendingRows.length > 0 && selectedRows.length === pendingRows.length

  function handleToggleRow(row) {
    const key = getSelectionKey(row)

    setSelectedRequestKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key],
    )
  }

  function handleToggleAll() {
    setSelectedRequestKeys((current) => {
      if (allPendingSelected) {
        return current.filter((key) => !pendingRows.some((row) => getSelectionKey(row) === key))
      }

      const nextKeys = new Set(current)
      pendingRows.forEach((row) => {
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
          <Card>
            <div className="section-heading section-heading--tight">
              <div>
                <h3>Eğitim Listesi</h3>
                <p>Eğitim adına göre arayın, kategori veya plan durumuna göre filtreleyin.</p>
              </div>
            </div>

            <div className="filter-panel training-list-filters">
              <label>
                <span>Eğitim Ara</span>
                <input
                  type="search"
                  placeholder="Eğitim adı, kategori veya kod ile ara"
                  value={trainingSearch}
                  onChange={(event) => setTrainingSearch(event.target.value)}
                />
              </label>
              <label>
                <span>Kategori</span>
                <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
                  {availableCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Plan Durumu</span>
                <select value={selectedPlanFilter} onChange={(event) => setSelectedPlanFilter(event.target.value)}>
                  <option value="Tümü">Tümü</option>
                  <option value="Bekleyenler">Bekleyenler</option>
                  <option value="Planlananlar">Planlananlar</option>
                </select>
              </label>
              <div className="training-list-summary">
                <span>Gösterilen Eğitim</span>
                <strong>{filteredTrainingGroups.length}</strong>
              </div>
            </div>

            {!filteredTrainingGroups.length ? (
              <EmptyState
                title="Filtreye uygun eğitim bulunamadı"
                description="Arama metnini veya filtreleri değiştirerek tekrar deneyin."
              />
            ) : (
              <div className="training-list">
                {filteredTrainingGroups.map((group) => (
                  <button
                    key={group.trainingKey}
                    className={`training-list-item ${activeTrainingName === group.trainingKey ? 'active' : ''}`.trim()}
                    onClick={() => setSelectedTrainingName(group.trainingKey)}
                  >
                    <div className="training-list-item__main">
                      <strong>{getTrainingDisplayName(group)}</strong>
                      <span>{group.kategori}</span>
                    </div>
                    <div className="training-list-item__stats">
                      <small>{`${group.pendingCount} bekleyen`}</small>
                      <small>{`${group.plannedCount} planlandı`}</small>
                      <small>{`${group.employeeCount} çalışan`}</small>
                      <small>{`${group.talepler.length} toplam talep`}</small>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {filteredTrainingGroups.length ? (
            <>
              <section className="stats-grid stats-grid--compact">
                <Card className="mini-stat">
                  <span>Seçili Eğitim</span>
                  <strong>{getTrainingDisplayName(selectedTraining)}</strong>
                </Card>
                <Card className="mini-stat">
                  <span>Talep Eden Çalışan</span>
                  <strong>{requestRows.length}</strong>
                </Card>
                <Card className="mini-stat">
                  <span>Bekleyen Planlama</span>
                  <strong>{bekleyenCount}</strong>
                </Card>
                <Card className="mini-stat">
                  <span>Toplu Seçim</span>
                  <strong>{selectedRows.length}</strong>
                </Card>
              </section>

              <Card>
                <div className="section-heading">
                  <div>
                    <h3>{getTrainingDisplayName(selectedTraining)}</h3>
                    <p>Bu eğitim için çalışan seçin ve plan durumunu takip edin</p>
                  </div>
                  <div className="selection-toolbar">
                    <button className="button button--secondary" onClick={handleToggleAll}>
                      {allPendingSelected ? 'Seçimi Temizle' : 'Tüm Bekleyenleri Seç'}
                    </button>
                    <button className="button" disabled={!selectedRows.length} onClick={openBulkPlanner}>
                      {selectedRows.length ? `${selectedRows.length} Kişiyi Toplu Planla` : 'Toplu Planla'}
                    </button>
                  </div>
                </div>
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
                        <th>GMY</th>
                        <th>Yönetici</th>
                        <th>Notlar</th>
                        <th>Plan Durumu</th>
                        <th>İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requestRows.map((row) => {
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
              </Card>
            </>
          ) : null}

          <TrainingPlanningModal
            key={planningRows.length ? planningRows.map(getSelectionKey).join('|') : 'planning-modal'}
            requestRows={planningRows}
            open={Boolean(planningRows.length)}
            onOpenChange={closePlanner}
            onSaveSingle={planTalep}
            onSaveBatch={planTalepler}
          />
        </>
      )}
    </div>
  )
}
