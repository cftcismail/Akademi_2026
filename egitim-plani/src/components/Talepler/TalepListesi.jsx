import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { FileSpreadsheet, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'
import Badge from '../ui/Badge'
import Card from '../ui/Card'
import EmptyState from '../ui/EmptyState'
import PlanEkleModal from '../EgitimPlani/PlanEkleModal'
import { formatEgitimLabel, getEmployeeRoute, getTalepKaynagiLabel } from '../../utils/helpers'
import { mapExcelRowsToTalepler } from '../../utils/talepImport'
import TalepDetay from './TalepDetay'
import TalepForm from './TalepForm'

const IMPORT_BATCH_SIZE = 250
const MAX_VISIBLE_IMPORT_ISSUES = 250
const PAGE_SIZE_OPTIONS = [50, 100, 150, 200]
const DEFAULT_TALEP_PAGE_SIZE = 50

function buildPageNumbers(currentPage, pageCount, windowSize = 7) {
  const safeWindowSize = Math.max(3, windowSize)
  const halfWindow = Math.floor(safeWindowSize / 2)
  const startPage = Math.max(1, Math.min(currentPage - halfWindow, pageCount - safeWindowSize + 1))
  const endPage = Math.min(pageCount, startPage + safeWindowSize - 1)
  return Array.from({ length: endPage - startPage + 1 }, (_, index) => startPage + index)
}

export default function TaleplerPage({
  talepler,
  planTalep,
  addTalep,
  importTalepler,
  egitmenListesi,
  kurumListesi,
  kurBilgileri,
  katalog,
  gmyList,
  egitimKategorileri,
}) {
  const [selectedTalep, setSelectedTalep] = useState(null)
  const [planningTalep, setPlanningTalep] = useState(null)
  const [showTalepForm, setShowTalepForm] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ processed: 0, total: 0 })
  const [validationIssues, setValidationIssues] = useState([])
  const [hiddenValidationIssueCount, setHiddenValidationIssueCount] = useState(0)
  const fileInputRef = useRef(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedManager, setSelectedManager] = useState('Tümü')
  const [selectedLocation, setSelectedLocation] = useState('Tümü')
  const [selectedSource, setSelectedSource] = useState('Tümü')
  const [selectedStatus, setSelectedStatus] = useState('Tümü')
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_TALEP_PAGE_SIZE)
  const [currentPage, setCurrentPage] = useState(1)
  const talepYillari = useMemo(
    () => [...new Set(talepler.map((talep) => talep.talepYili || new Date().getFullYear()))].sort((a, b) => b - a),
    [talepler],
  )
  const [selectedYear, setSelectedYear] = useState(talepYillari[0] || new Date().getFullYear())

  const activeYear = talepYillari.includes(selectedYear) ? selectedYear : talepYillari[0] || new Date().getFullYear()
  const yearTalepler = talepler.filter((talep) => (talep.talepYili || new Date().getFullYear()) === activeYear)

  async function handleImportFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setIsImporting(true)
    setImportProgress({ processed: 0, total: 0 })
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
      const sheetName = workbook.SheetNames[0]
      if (!sheetName) throw new Error('Excel dosyasında okunacak sayfa bulunamadı.')
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '', raw: true })
      setImportProgress({ processed: 0, total: rows.length })
      const result = await importTalepler(
        mapExcelRowsToTalepler(rows).map((payload) => ({ ...payload, talepYili: activeYear })),
        { batchSize: IMPORT_BATCH_SIZE, maxIssues: MAX_VISIBLE_IMPORT_ISSUES, onProgress: setImportProgress },
      )
      setValidationIssues(result.issues || [])
      setHiddenValidationIssueCount(result.hiddenIssueCount || 0)
      if (result.importedCount > 0 && result.totalIssueCount > 0) {
        toast(`${result.importedCount} talep aktarıldı, ${result.totalIssueCount} satır uyarıya düştü.`, { icon: '!' })
      } else if (result.importedCount > 0) {
        toast.success(`${result.importedCount} talep Excel dosyasından içeri aktarıldı.`)
      } else {
        toast.error('Geçerli kayıt eklenemedi. Uyarılı satırları kontrol edin.')
      }
    } catch (error) {
      toast.error(error.message || 'Excel dosyası içeri aktarılamadı.')
    } finally {
      event.target.value = ''
      setIsImporting(false)
      setImportProgress({ processed: 0, total: 0 })
    }
  }
  const managerOptions = useMemo(() => ['Tümü', ...new Set(yearTalepler.map((talep) => talep.yoneticiAdi).filter(Boolean))], [yearTalepler])
  const locationOptions = useMemo(() => ['Tümü', ...new Set(yearTalepler.map((talep) => talep.calisanLokasyon).filter(Boolean))], [yearTalepler])
  const activeManager = selectedManager === 'Tümü' || managerOptions.includes(selectedManager) ? selectedManager : 'Tümü'
  const activeLocation = selectedLocation === 'Tümü' || locationOptions.includes(selectedLocation) ? selectedLocation : 'Tümü'
  const visibleTalepler = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('tr-TR')

    return yearTalepler.filter((talep) => {
      const matchesManager = activeManager === 'Tümü' || talep.yoneticiAdi === activeManager
      const matchesLocation = activeLocation === 'Tümü' || (talep.calisanLokasyon || '') === activeLocation
      const matchesSource = selectedSource === 'Tümü' || getTalepKaynagiLabel(talep) === selectedSource
      const matchesStatus = selectedStatus === 'Tümü' || talep.durum === selectedStatus

      if (!matchesManager || !matchesLocation || !matchesSource || !matchesStatus) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      return [
        talep.calisanAdi,
        talep.calisanSicil,
        talep.calisanKullaniciKodu,
        talep.yoneticiAdi,
        talep.yoneticiEmail,
        talep.gmy,
        talep.calisanLokasyon,
        ...talep.egitimler.map((egitim) => formatEgitimLabel(egitim)),
      ].some((value) => `${value || ''}`.toLocaleLowerCase('tr-TR').includes(normalizedQuery))
    })
  }, [activeLocation, activeManager, searchQuery, selectedSource, selectedStatus, yearTalepler])

  const bekleyenTalepSayisi = visibleTalepler.filter((talep) => talep.durum === 'beklemede').length
  const planlananTalepSayisi = visibleTalepler.filter((talep) => talep.durum === 'plana_eklendi').length
  const yillikTalepSayisi = visibleTalepler.filter((talep) => getTalepKaynagiLabel(talep) === 'Yıllık Talep').length
  const bireyselTalepSayisi = visibleTalepler.filter((talep) => getTalepKaynagiLabel(talep) === 'Bireysel Talep').length
  const pageCount = Math.max(1, Math.ceil(visibleTalepler.length / rowsPerPage))
  const safePage = Math.min(currentPage, pageCount)
  const pageNumbers = useMemo(() => buildPageNumbers(safePage, pageCount), [safePage, pageCount])
  const paginatedTalepler = useMemo(() => {
    const startIndex = (safePage - 1) * rowsPerPage
    return visibleTalepler.slice(startIndex, startIndex + rowsPerPage)
  }, [rowsPerPage, safePage, visibleTalepler])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeYear, rowsPerPage, searchQuery, selectedManager, selectedLocation, selectedSource, selectedStatus])

  return (
    <div className="page-stack">
      <section className="page-toolbar">
        <Card className="surface-card--accent">
          <span className="eyebrow">Talep Yönetimi</span>
          <h2>Yıllara göre yüklenen talepleri yönetin</h2>
          <p>Yıllık yönetici taleplerini ve çalışanlardan gelen bireysel talepleri aynı ekranda izleyin, gerektiğinde doğrudan yeni talep açın.</p>
        </Card>
        <div className="toolbar-actions">
          <button className="button" onClick={() => setShowTalepForm(true)}>
            Yeni Talep Ekle
          </button>
          <a className="button button--secondary" href="/ornek-talep-aktarim.xlsx" download>
            <FileSpreadsheet size={16} /> Örnek Excel
          </a>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="sr-only"
            onChange={handleImportFile}
          />
          <button
            className="button button--secondary"
            disabled={isImporting}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={16} />
            {isImporting ? `Yükleniyor (${importProgress.processed}/${importProgress.total})` : 'Excel İle Toplu Yükle'}
          </button>
          <Card className="mini-stat">
            <span>Bekleyen Talep</span>
            <strong>{bekleyenTalepSayisi}</strong>
          </Card>
          <Card className="mini-stat">
            <span>Planlanan Talep</span>
            <strong>{planlananTalepSayisi}</strong>
          </Card>
          <Card className="mini-stat">
            <span>Yıllık Talep</span>
            <strong>{yillikTalepSayisi}</strong>
          </Card>
          <Card className="mini-stat">
            <span>Bireysel Talep</span>
            <strong>{bireyselTalepSayisi}</strong>
          </Card>
        </div>
      </section>

      <section className="year-filter-row">
        {talepYillari.map((year) => (
          <button
            key={year}
            className={`year-chip ${activeYear === year ? 'is-active' : ''}`.trim()}
            onClick={() => setSelectedYear(year)}
          >
            {year}
          </button>
        ))}
      </section>

      <section className="filter-panel">
        <label>
          <span>Talep Ara</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Çalışan, yönetici, lokasyon veya eğitim ara"
          />
        </label>
        <label>
          <span>Yönetici</span>
          <select value={activeManager} onChange={(event) => setSelectedManager(event.target.value)}>
            {managerOptions.map((manager) => (
              <option key={manager} value={manager}>
                {manager}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Lokasyon</span>
          <select value={activeLocation} onChange={(event) => setSelectedLocation(event.target.value)}>
            {locationOptions.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Kaynak</span>
          <select value={selectedSource} onChange={(event) => setSelectedSource(event.target.value)}>
            <option value="Tümü">Tümü</option>
            <option value="Yıllık Talep">Yıllık Talep</option>
            <option value="Bireysel Talep">Bireysel Talep</option>
          </select>
        </label>
        <label>
          <span>Durum</span>
          <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)}>
            <option value="Tümü">Tümü</option>
            <option value="beklemede">Beklemede</option>
            <option value="plana_eklendi">Plana Eklendi</option>
          </select>
        </label>
      </section>

      {visibleTalepler.length ? (
        <Card>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Talep Yılı</th>
                  <th>Kaynak</th>
                  <th>Çalışan Adı</th>
                  <th>Sicil No</th>
                  <th>Kullanıcı Kodu</th>
                  <th>Lokasyon</th>
                  <th>GMY</th>
                  <th>Yönetici</th>
                  <th>Talep Edilen Eğitimler</th>
                  <th>Durum</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTalepler.map((talep) => (
                  <tr key={talep.id}>
                    <td>{talep.talepYili}</td>
                    <td>
                      <Badge value={getTalepKaynagiLabel(talep)} />
                    </td>
                    <td>
                      <Link className="table-link" to={getEmployeeRoute(talep.calisanSicil)}>
                        {talep.calisanAdi}
                      </Link>
                    </td>
                    <td>{talep.calisanSicil}</td>
                    <td>{talep.calisanKullaniciKodu || '-'}</td>
                    <td>{talep.calisanLokasyon || '-'}</td>
                    <td>{talep.gmy}</td>
                    <td>{talep.yoneticiAdi || '-'}</td>
                    <td>
                      <div className="chip-list">
                        {talep.egitimler.map((egitim) => (
                          <span key={egitim.egitimId} className="chip">
                            {formatEgitimLabel(egitim)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <Badge value={talep.durum === 'plana_eklendi' ? 'plana_eklendi' : 'beklemede'} />
                    </td>
                    <td>
                      <div className="action-row">
                        <button className="button button--secondary" onClick={() => setSelectedTalep(talep)}>
                          Detay Gör
                        </button>
                        <button className="button" onClick={() => setPlanningTalep(talep)}>
                          Plana Ekle
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination-bar">
            <label className="page-size-control">
              <span>Satır</span>
              <select value={rowsPerPage} onChange={(event) => setRowsPerPage(Number(event.target.value))}>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <button className="button button--secondary" disabled={safePage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
              Önceki
            </button>
            <div className="pagination-pages">
              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  className={`button button--secondary ${pageNumber === safePage ? 'is-active' : ''}`.trim()}
                  onClick={() => setCurrentPage(pageNumber)}
                >
                  {pageNumber}
                </button>
              ))}
            </div>
            <button
              className="button button--secondary"
              disabled={safePage >= pageCount}
              onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}
            >
              Sonraki
            </button>
          </div>
        </Card>
      ) : (
        <EmptyState
          title="Filtreye uygun talep bulunmuyor"
          description="Arama ve filtreleri değiştirin ya da bu yıl için yeni talep ekleyin."
        />
      )}
      {validationIssues.length > 0 && (
        <Card>
          <div className="import-issues">
            <h3 className="text-warning">İçeri Aktarma Uyarıları</h3>
            <button className="button button--secondary button--sm" onClick={() => { setValidationIssues([]); setHiddenValidationIssueCount(0) }}>
              Uyarıları Kapat
            </button>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Satır</th>
                  <th>Çalışan</th>
                  <th>Eğitimler</th>
                  <th>Neden</th>
                </tr>
              </thead>
              <tbody>
                {validationIssues.map((issue, i) => (
                  <tr key={i}>
                    <td>{issue.sourceLabel}</td>
                    <td>{issue.calisanAdi || '-'}</td>
                    <td>{issue.egitimler || '-'}</td>
                    <td>{issue.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hiddenValidationIssueCount > 0 && (
            <p className="text-muted">…ve {hiddenValidationIssueCount} ek uyarı gizlendi.</p>
          )}
        </Card>
      )}
      <TalepDetay open={Boolean(selectedTalep)} onOpenChange={() => setSelectedTalep(null)} talep={selectedTalep} />
      <TalepForm
        key={showTalepForm ? 'talepler-form-open' : 'talepler-form-closed'}
        open={showTalepForm}
        onOpenChange={setShowTalepForm}
        katalog={katalog}
        gmyList={gmyList}
        kategoriList={egitimKategorileri}
        onSubmit={addTalep}
        defaultTalepKaynagi="Bireysel Talep"
        title="Yeni talep oluştur"
        description="Çalışanın bireysel veya yıllık talebini doğrudan bu ekrandan sisteme kaydedin."
      />
      <PlanEkleModal
        key={planningTalep?.id || 'plan-modal'}
        open={Boolean(planningTalep)}
        onOpenChange={() => setPlanningTalep(null)}
        talep={planningTalep}
        onSubmit={planTalep}
        egitmenListesi={egitmenListesi}
        kurumListesi={kurumListesi}
        kurBilgileri={kurBilgileri}
      />
    </div>
  )
}