import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { ChevronDown, ChevronUp, Download, FileSpreadsheet, KeyRound, LogOut, Plus, Save, ShieldCheck, Trash2, Upload, Users } from 'lucide-react'
import * as XLSX from 'xlsx'
import Card from '../ui/Card'
import TalepForm from '../Talepler/TalepForm'
import Modal from '../ui/Modal'
import { PARA_BIRIMLERI } from '../../data/constants'

const CATALOG_PAGE_SIZE = 8
const TRAINER_PAGE_SIZE = 10
const MAX_VISIBLE_IMPORT_ISSUES = 250

const ADMIN_PASSWORD = 'Akademi.123'

function buildDraftMap(gmyList) {
  return Object.fromEntries(gmyList.map((gmy) => [gmy, gmy]))
}

function buildCatalogDraftMap(katalog) {
  return Object.fromEntries(
    katalog.map((item) => [
      item.id,
      {
        kod: item.kod || '',
        ad: item.ad || '',
        kategori: item.kategori || '',
        sure: item.sure || '1 gün',
        aciklama: item.aciklama || '',
      },
    ]),
  )
}

function buildInstitutionDraftMap(kurumListesi) {
  return Object.fromEntries(
    kurumListesi.map((item) => [
      item.id,
      {
        ad: item.ad || '',
        email: item.email || '',
        uzmanlik: item.uzmanlik || '',
      },
    ]),
  )
}

function buildInternalTrainerDraftMap(egitmenListesi) {
  return Object.fromEntries(
    egitmenListesi.map((item) => [
      item.id,
      {
        ad: item.ad || '',
        birim: item.birim || '',
        email: item.email || '',
        uzmanlik: item.uzmanlik || '',
      },
    ]),
  )
}

function getPageCount(total, pageSize) {
  return Math.max(1, Math.ceil(total / pageSize))
}

function paginate(items, page, pageSize) {
  const startIndex = (page - 1) * pageSize
  return items.slice(startIndex, startIndex + pageSize)
}

function mapExcelRowsToKurumlar(rows) {
  return rows.map((row) => ({
    ad: `${row.Kurum || row.KurumAdi || row['Kurum Adı'] || row.Firma || row.Sirket || row.Şirket || ''}`.trim(),
    email: `${row.Email || row.Eposta || row['E-Posta'] || ''}`.trim(),
    uzmanlik: `${row.Uzmanlik || row.Uzmanlık || row.HizmetAlani || row['Hizmet Alanı'] || ''}`.trim(),
  }))
}

function mapExcelRowsToEgitmenler(rows) {
  return rows.map((row) => ({
    ad: `${row.Egitimci || row.Eğitimci || row.Ad || row.Adi || row.AdSoyad || row['Ad Soyad'] || ''}`.trim(),
    birim: `${row.Birim || row.Departman || row.Kurum || row.Sirket || row.Şirket || ''}`.trim(),
    email: `${row.Email || row.Eposta || row['E-Posta'] || ''}`.trim(),
    uzmanlik: `${row.Uzmanlik || row.Uzmanlık || row.Brans || row.Brans || ''}`.trim(),
  }))
}

export default function AdminPage({
  talepler,
  planlar,
  gmyList,
  egitimKategorileri,
  katalog,
  kurumListesi,
  egitmenListesi,
  kurBilgileri,
  addTalep,
  importTaleplerFromExcelFile,
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
  clearAllPlans,
  deleteTalepYear,
  isAdminAuthenticated,
  onAuthenticatedChange,
}) {
  const [password, setPassword] = useState('')
  const [newGmy, setNewGmy] = useState('')
  const [newKategori, setNewKategori] = useState('')
  const [isCatalogOpen, setIsCatalogOpen] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState('')
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState('Tümü')
  const [catalogPage, setCatalogPage] = useState(1)
  const [newCatalogItem, setNewCatalogItem] = useState({
    kod: '',
    ad: '',
    kategori: egitimKategorileri[0] || 'Teknik',
    sure: '1 gün',
    aciklama: '',
  })
  const [trainerSearch, setTrainerSearch] = useState('')
  const [trainerPage, setTrainerPage] = useState(1)
  const [newTrainer, setNewTrainer] = useState({
    ad: '',
    email: '',
    uzmanlik: '',
  })
  const [internalTrainerSearch, setInternalTrainerSearch] = useState('')
  const [internalTrainerPage, setInternalTrainerPage] = useState(1)
  const [newInternalTrainer, setNewInternalTrainer] = useState({
    ad: '',
    birim: '',
    email: '',
    uzmanlik: '',
  })
  const [selectedTalepYear, setSelectedTalepYear] = useState(new Date().getFullYear())
  const [showTalepForm, setShowTalepForm] = useState(false)
  const [validationIssues, setValidationIssues] = useState([])
  const [hiddenValidationIssueCount, setHiddenValidationIssueCount] = useState(0)
  const [showClearPlansModal, setShowClearPlansModal] = useState(false)
  const [yearToDelete, setYearToDelete] = useState(null)
  const [gmyDrafts, setGmyDrafts] = useState(() => buildDraftMap(gmyList))
  const [kategoriDrafts, setKategoriDrafts] = useState(() => buildDraftMap(egitimKategorileri))
  const [catalogDrafts, setCatalogDrafts] = useState(() => buildCatalogDraftMap(katalog))
  const [trainerDrafts, setTrainerDrafts] = useState(() => buildInstitutionDraftMap(kurumListesi))
  const [internalTrainerDrafts, setInternalTrainerDrafts] = useState(() => buildInternalTrainerDraftMap(egitmenListesi))
  const [rateDrafts, setRateDrafts] = useState(() => ({ ...kurBilgileri }))
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ processed: 0, total: 0 })
  const fileInputRef = useRef(null)
  const trainerFileInputRef = useRef(null)
  const internalTrainerFileInputRef = useRef(null)

  useEffect(() => {
    setGmyDrafts(buildDraftMap(gmyList))
  }, [gmyList])

  useEffect(() => {
    setKategoriDrafts(buildDraftMap(egitimKategorileri))
  }, [egitimKategorileri])

  useEffect(() => {
    setCatalogDrafts(buildCatalogDraftMap(katalog))
  }, [katalog])

  useEffect(() => {
    setTrainerDrafts(buildInstitutionDraftMap(kurumListesi))
  }, [kurumListesi])

  useEffect(() => {
    setInternalTrainerDrafts(buildInternalTrainerDraftMap(egitmenListesi))
  }, [egitmenListesi])

  useEffect(() => {
    setRateDrafts({ ...kurBilgileri })
  }, [kurBilgileri])

  useEffect(() => {
    if (!egitimKategorileri.length) {
      return
    }

    setNewCatalogItem((current) =>
      egitimKategorileri.includes(current.kategori)
        ? current
        : {
          ...current,
          kategori: egitimKategorileri[0],
        },
    )
  }, [egitimKategorileri])

  const usageByGmy = useMemo(() => {
    return gmyList.reduce((accumulator, gmy) => {
      accumulator[gmy] = {
        talep: talepler.filter((item) => item.gmy === gmy).length,
        plan: planlar.filter((item) => item.gmy === gmy).length,
      }
      return accumulator
    }, {})
  }, [gmyList, planlar, talepler])

  const usageByCatalog = useMemo(
    () =>
      katalog.reduce((accumulator, item) => {
        accumulator[item.id] = {
          talep: talepler.filter((talep) =>
            talep.egitimler.some(
              (egitim) =>
                (egitim.egitimId && egitim.egitimId === item.id) ||
                (`${egitim.egitimKodu || ''}`.trim() === `${item.kod || ''}`.trim() && egitim.egitimAdi === item.ad),
            ),
          ).length,
          plan: planlar.filter(
            (plan) => `${plan.egitimKodu || ''}`.trim() === `${item.kod || ''}`.trim() && plan.egitimAdi === item.ad,
          ).length,
        }
        return accumulator
      }, {}),
    [katalog, planlar, talepler],
  )

  const filteredCatalog = useMemo(() => {
    const normalizedQuery = catalogSearch.trim().toLocaleLowerCase('tr-TR')

    return katalog.filter((item) => {
      const matchesCategory = selectedCatalogCategory === 'Tümü' || item.kategori === selectedCatalogCategory

      if (!matchesCategory) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      return [item.kod, item.ad, item.kategori, item.sure, item.aciklama]
        .some((value) => `${value || ''}`.toLocaleLowerCase('tr-TR').includes(normalizedQuery))
    })
  }, [catalogSearch, katalog, selectedCatalogCategory])

  const catalogPageCount = getPageCount(filteredCatalog.length, CATALOG_PAGE_SIZE)
  const paginatedCatalog = useMemo(
    () => paginate(filteredCatalog, Math.min(catalogPage, catalogPageCount), CATALOG_PAGE_SIZE),
    [catalogPage, catalogPageCount, filteredCatalog],
  )

  const filteredTrainers = useMemo(() => {
    const normalizedQuery = trainerSearch.trim().toLocaleLowerCase('tr-TR')

    return kurumListesi.filter((item) => {
      if (!normalizedQuery) {
        return true
      }

      return [item.ad, item.email, item.uzmanlik]
        .some((value) => `${value || ''}`.toLocaleLowerCase('tr-TR').includes(normalizedQuery))
    })
  }, [kurumListesi, trainerSearch])

  const trainerPageCount = getPageCount(filteredTrainers.length, TRAINER_PAGE_SIZE)
  const paginatedTrainers = useMemo(
    () => paginate(filteredTrainers, Math.min(trainerPage, trainerPageCount), TRAINER_PAGE_SIZE),
    [filteredTrainers, trainerPage, trainerPageCount],
  )

  const filteredInternalTrainers = useMemo(() => {
    const normalizedQuery = internalTrainerSearch.trim().toLocaleLowerCase('tr-TR')

    return egitmenListesi.filter((item) => {
      if (!normalizedQuery) {
        return true
      }

      return [item.ad, item.birim, item.email, item.uzmanlik]
        .some((value) => `${value || ''}`.toLocaleLowerCase('tr-TR').includes(normalizedQuery))
    })
  }, [egitmenListesi, internalTrainerSearch])

  const internalTrainerPageCount = getPageCount(filteredInternalTrainers.length, TRAINER_PAGE_SIZE)
  const paginatedInternalTrainers = useMemo(
    () => paginate(filteredInternalTrainers, Math.min(internalTrainerPage, internalTrainerPageCount), TRAINER_PAGE_SIZE),
    [filteredInternalTrainers, internalTrainerPage, internalTrainerPageCount],
  )

  const talepYearSummary = useMemo(
    () =>
      Object.values(
        talepler.reduce((accumulator, talep) => {
          const year = talep.talepYili || new Date().getFullYear()

          if (!accumulator[year]) {
            accumulator[year] = {
              year,
              talep: 0,
              bekleyen: 0,
              planlanan: 0,
            }
          }

          accumulator[year].talep += 1
          accumulator[year].bekleyen += talep.durum === 'beklemede' ? 1 : 0
          accumulator[year].planlanan += talep.durum === 'plana_eklendi' ? 1 : 0
          return accumulator
        }, {}),
      ).sort((left, right) => right.year - left.year),
    [talepler],
  )

  function handleLogin(event) {
    event.preventDefault()

    if (password !== ADMIN_PASSWORD) {
      toast.error('Admin şifresi hatalı.')
      return
    }

    onAuthenticatedChange(true)
    setPassword('')
    toast.success('Admin ekranına giriş yapıldı.')
  }

  function handleAddGmy() {
    try {
      addGmy(newGmy)
      setNewGmy('')
      toast.success('Yeni GMY eklendi.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  function handleAddKategori() {
    try {
      addEgitimKategorisi(newKategori)
      setNewKategori('')
      toast.success('Yeni eğitim kategorisi eklendi.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  function handleAddTrainer() {
    try {
      addKurum(newTrainer)
      setNewTrainer({
        ad: '',
        email: '',
        uzmanlik: '',
      })
      toast.success('Kurum listeye eklendi.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  function handleAddInternalTrainer() {
    try {
      addEgitmen(newInternalTrainer)
      setNewInternalTrainer({
        ad: '',
        birim: '',
        email: '',
        uzmanlik: '',
      })
      toast.success('İç eğitmen listeye eklendi.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  function handleAddCatalogItem() {
    try {
      addKatalogItem(newCatalogItem)
      setNewCatalogItem({
        kod: '',
        ad: '',
        kategori: egitimKategorileri[0] || 'Teknik',
        sure: '1 gün',
        aciklama: '',
      })
      toast.success('Katalog eğitimi eklendi.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  function handleCreateTalep(payload) {
    const result = addTalep({
      ...payload,
      talepYili: selectedTalepYear,
    })

    setValidationIssues(result?.issues || [])
    return result
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setIsImporting(true)
    setImportProgress({ processed: 0, total: 1 })

    try {
      const result = await importTaleplerFromExcelFile(file, {
        talepYili: selectedTalepYear,
        maxIssues: MAX_VISIBLE_IMPORT_ISSUES,
      })
      setImportProgress({ processed: 1, total: 1 })

      setValidationIssues(result.issues || [])
      setHiddenValidationIssueCount(result.hiddenIssueCount || 0)

      if (result.importedCount > 0 && result.totalIssueCount > 0) {
        toast(`${result.importedCount} talep aktarıldı, ${result.totalIssueCount} satır uyarıya düştü.`, {
          icon: '!',
        })
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

  async function handleTrainerImport(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
      const sheetName = workbook.SheetNames[0]

      if (!sheetName) {
        throw new Error('Excel dosyasında okunacak sayfa bulunamadı.')
      }

      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        defval: '',
        raw: true,
      })

      const imported = importKurumlar(mapExcelRowsToKurumlar(rows))
      toast.success(`${imported.length} kurum listeye yüklendi.`)
    } catch (error) {
      toast.error(error.message || 'Kurum listesi içeri aktarılamadı.')
    } finally {
      event.target.value = ''
    }
  }

  async function handleInternalTrainerImport(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
      const sheetName = workbook.SheetNames[0]

      if (!sheetName) {
        throw new Error('Excel dosyasında okunacak sayfa bulunamadı.')
      }

      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        defval: '',
        raw: true,
      })

      const imported = importEgitmenler(mapExcelRowsToEgitmenler(rows))
      toast.success(`${imported.length} iç eğitmen listeye yüklendi.`)
    } catch (error) {
      toast.error(error.message || 'İç eğitmen listesi içeri aktarılamadı.')
    } finally {
      event.target.value = ''
    }
  }

  function handleRenameGmy(currentName) {
    try {
      updateGmy(currentName, gmyDrafts[currentName])
      toast.success('GMY güncellendi.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  function handleRenameKategori(currentName) {
    try {
      updateEgitimKategorisi(currentName, kategoriDrafts[currentName])
      toast.success('Eğitim kategorisi güncellendi.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  function handleSaveCatalogItem(itemId) {
    try {
      updateKatalogItem(itemId, catalogDrafts[itemId])
      toast.success('Katalog kaydı güncellendi.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  function handleSaveTrainer(itemId) {
    try {
      updateKurum(itemId, trainerDrafts[itemId])
      toast.success('Kurum kaydı güncellendi.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  function handleSaveInternalTrainer(itemId) {
    try {
      updateEgitmen(itemId, internalTrainerDrafts[itemId])
      toast.success('İç eğitmen kaydı güncellendi.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  function handleDeleteGmy(name) {
    try {
      deleteGmy(name)
      toast.success('GMY kaldırıldı.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  function handleDeleteKategori(name) {
    try {
      deleteEgitimKategorisi(name)
      toast.success('Eğitim kategorisi kaldırıldı.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  function handleDeleteCatalogItem(itemId) {
    try {
      deleteKatalogItem(itemId)
      toast.success('Katalog kaydı kaldırıldı.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  function handleDeleteTrainer(itemId) {
    try {
      deleteKurum(itemId)
      toast.success('Kurum kaydı kaldırıldı.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  function handleDeleteInternalTrainer(itemId) {
    try {
      deleteEgitmen(itemId)
      toast.success('İç eğitmen kaydı kaldırıldı.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  function handleSaveRates() {
    updateKurBilgileri(rateDrafts)
    toast.success('Kur bilgileri güncellendi.')
  }

  function handleIssuesModal(nextOpen) {
    if (!nextOpen) {
      setValidationIssues([])
      setHiddenValidationIssueCount(0)
    }
  }

  function handleClearAllPlans() {
    const result = clearAllPlans()
    setShowClearPlansModal(false)

    if (!result.removedPlanCount) {
      toast('Silinecek plan kaydı bulunmuyor.', { icon: '!' })
      return
    }

    toast.success(`${result.removedPlanCount} plan ve ${result.removedTalepCount} ilişkili talep silindi.`)
  }

  function handleDeleteTalepYear() {
    const result = deleteTalepYear(yearToDelete)
    const deletedYear = yearToDelete
    setYearToDelete(null)

    if (!result.removedTalepCount) {
      toast('Silinecek yıl arşivi bulunamadı.', { icon: '!' })
      return
    }

    toast.success(`${deletedYear} yılına ait ${result.removedTalepCount} talep ve ${result.removedPlanCount} plan silindi.`)
  }

  useEffect(() => {
    setCatalogPage(1)
  }, [catalogSearch, selectedCatalogCategory])

  useEffect(() => {
    setTrainerPage(1)
  }, [trainerSearch])

  useEffect(() => {
    setInternalTrainerPage(1)
  }, [internalTrainerSearch])

  if (!isAdminAuthenticated) {
    return (
      <div className="page-stack">
        <Card className="admin-auth-card">
          <div className="admin-auth-card__icon">
            <ShieldCheck size={28} />
          </div>
          <span className="eyebrow">Admin Akademi</span>
          <h2>Yönetim ekranına giriş yapın</h2>
          <p>Bu alan şifre korumalıdır. Yetkisiz kullanıcılar içeriği görüntüleyemez.</p>

          <form className="admin-auth-form" onSubmit={handleLogin}>
            <label>
              <span>Admin Şifresi</span>
              <div className="admin-password-row">
                <KeyRound size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Şifreyi girin"
                  required
                />
              </div>
            </label>
            <button className="button" type="submit">
              Giriş Yap
            </button>
          </form>
        </Card>
      </div>
    )
  }

  return (
    <div className="page-stack">
      <section className="page-toolbar">
        <Card className="surface-card--accent">
          <span className="eyebrow">Admin Akademi</span>
          <h2>Sistem ayarlarını ve GMY listesini yönetin</h2>
          <p>Yeni GMY ekleyebilir, isimlerini değiştirebilir ve kullanılmayan kayıtları kaldırabilirsiniz.</p>
        </Card>
        <div className="toolbar-actions">
          <Card className="mini-stat">
            <span>Aktif GMY</span>
            <strong>{gmyList.length}</strong>
          </Card>
          <Card className="mini-stat">
            <span>Toplam Plan</span>
            <strong>{planlar.length}</strong>
          </Card>
          <Card className="mini-stat">
            <span>Kurum Havuzu</span>
            <strong>{kurumListesi.length}</strong>
          </Card>
          <Card className="mini-stat">
            <span>İç Eğitmen</span>
            <strong>{egitmenListesi.length}</strong>
          </Card>
          <button
            className="button button--ghost"
            onClick={() => setShowClearPlansModal(true)}
            disabled={!planlar.length}
          >
            <Trash2 size={16} />
            Tüm Planları Sil
          </button>
          <button className="button button--secondary" onClick={() => onAuthenticatedChange(false)}>
            <LogOut size={16} />
            Çıkış Yap
          </button>
        </div>
      </section>

      <Card>
        <div className="section-heading section-heading--tight">
          <div>
            <h3>Eğitim kategorileri</h3>
            <p>Talep formunda ve raporlarda kullanılan eğitim kategorilerini yönetin.</p>
          </div>
        </div>
        <div className="admin-add-row">
          <input
            value={newKategori}
            onChange={(event) => setNewKategori(event.target.value)}
            placeholder="Örn. Liderlik"
          />
          <button className="button" onClick={handleAddKategori}>
            <Plus size={16} />
            Kategori Ekle
          </button>
        </div>
        <div className="admin-grid">
          {egitimKategorileri.map((kategori) => (
            <Card key={kategori} className="admin-gmy-card">
              <div className="admin-gmy-card__meta">
                <span className="eyebrow">Kategori</span>
                <strong>{kategori}</strong>
                <small>Talep formu ve katalog kategorisi olarak kullanılır</small>
              </div>
              <label>
                <span>Yeni Ad</span>
                <input
                  value={kategoriDrafts[kategori] || ''}
                  onChange={(event) => setKategoriDrafts((current) => ({ ...current, [kategori]: event.target.value }))}
                />
              </label>
              <div className="admin-gmy-card__actions">
                <button className="button" onClick={() => handleRenameKategori(kategori)}>
                  <Save size={16} />
                  Kaydet
                </button>
                <button className="button button--ghost" onClick={() => handleDeleteKategori(kategori)}>
                  <Trash2 size={16} />
                  Sil
                </button>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      <Card className="catalog-shell-card">
        <button className="catalog-toggle-card" onClick={() => setIsCatalogOpen((current) => !current)}>
          <div>
            <span className="eyebrow">Katalog Yönetimi</span>
            <h3>{`${katalog.length} eğitim kaydı yönetiliyor`}</h3>
            <p>{`${filteredCatalog.length} kayıt filtreye uyuyor. Büyük kataloglarda bu alanı açıp detay yönetin.`}</p>
          </div>
          <div className="catalog-toggle-card__meta">
            <strong>{`${egitimKategorileri.length} kategori`}</strong>
            <span>{isCatalogOpen ? 'Kapat' : 'Aç'}</span>
            {isCatalogOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>

        {isCatalogOpen ? (
          <div className="page-stack">
            <div className="filter-row">
              <label>
                <span>Katalog Ara</span>
                <input
                  value={catalogSearch}
                  onChange={(event) => setCatalogSearch(event.target.value)}
                  placeholder="Kod, eğitim adı veya açıklama ile ara"
                />
              </label>
              <label>
                <span>Kategori Filtresi</span>
                <select
                  value={selectedCatalogCategory}
                  onChange={(event) => setSelectedCatalogCategory(event.target.value)}
                >
                  <option value="Tümü">Tümü</option>
                  {egitimKategorileri.map((kategori) => (
                    <option key={kategori} value={kategori}>
                      {kategori}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-grid">
              <label>
                <span>Eğitim Kodu</span>
                <input
                  value={newCatalogItem.kod}
                  onChange={(event) => setNewCatalogItem((current) => ({ ...current, kod: event.target.value.toUpperCase() }))}
                  placeholder="Örn. TE_001"
                />
              </label>
              <label>
                <span>Eğitim Adı</span>
                <input
                  value={newCatalogItem.ad}
                  onChange={(event) => setNewCatalogItem((current) => ({ ...current, ad: event.target.value }))}
                  placeholder="Örn. Temel Network"
                />
              </label>
              <label>
                <span>Kategori</span>
                <select
                  value={newCatalogItem.kategori}
                  onChange={(event) => setNewCatalogItem((current) => ({ ...current, kategori: event.target.value }))}
                >
                  {egitimKategorileri.map((kategori) => (
                    <option key={kategori} value={kategori}>
                      {kategori}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Süre</span>
                <input
                  value={newCatalogItem.sure}
                  onChange={(event) => setNewCatalogItem((current) => ({ ...current, sure: event.target.value }))}
                  placeholder="Örn. 2 gün"
                />
              </label>
              <label className="form-grid--full">
                <span>Açıklama</span>
                <textarea
                  rows={3}
                  value={newCatalogItem.aciklama}
                  onChange={(event) => setNewCatalogItem((current) => ({ ...current, aciklama: event.target.value }))}
                  placeholder="Opsiyonel katalog açıklaması"
                />
              </label>
            </div>
            <div className="admin-gmy-card__actions">
              <button className="button" onClick={handleAddCatalogItem}>
                <Plus size={16} />
                Kataloğa Ekle
              </button>
            </div>
            <div className="section-heading section-heading--tight">
              <div>
                <h3>Katalog Listesi</h3>
                <p>{`${filteredCatalog.length} kayıt görüntüleniyor`}</p>
              </div>
            </div>
            <div className="admin-grid">
              {paginatedCatalog.map((item) => (
                <Card key={item.id} className="admin-gmy-card">
                  <div className="admin-gmy-card__meta">
                    <span className="eyebrow">Katalog</span>
                    <strong>{`${item.kod ? `${item.kod} • ` : ''}${item.ad}`}</strong>
                    <small>{`${usageByCatalog[item.id]?.talep || 0} talep • ${usageByCatalog[item.id]?.plan || 0} plan`}</small>
                  </div>
                  <label>
                    <span>Eğitim Kodu</span>
                    <input
                      value={catalogDrafts[item.id]?.kod || ''}
                      onChange={(event) =>
                        setCatalogDrafts((current) => ({
                          ...current,
                          [item.id]: { ...current[item.id], kod: event.target.value.toUpperCase() },
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Eğitim Adı</span>
                    <input
                      value={catalogDrafts[item.id]?.ad || ''}
                      onChange={(event) =>
                        setCatalogDrafts((current) => ({
                          ...current,
                          [item.id]: { ...current[item.id], ad: event.target.value },
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Kategori</span>
                    <select
                      value={catalogDrafts[item.id]?.kategori || egitimKategorileri[0] || 'Teknik'}
                      onChange={(event) =>
                        setCatalogDrafts((current) => ({
                          ...current,
                          [item.id]: { ...current[item.id], kategori: event.target.value },
                        }))
                      }
                    >
                      {egitimKategorileri.map((kategori) => (
                        <option key={kategori} value={kategori}>
                          {kategori}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Süre</span>
                    <input
                      value={catalogDrafts[item.id]?.sure || ''}
                      onChange={(event) =>
                        setCatalogDrafts((current) => ({
                          ...current,
                          [item.id]: { ...current[item.id], sure: event.target.value },
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Açıklama</span>
                    <textarea
                      rows={3}
                      value={catalogDrafts[item.id]?.aciklama || ''}
                      onChange={(event) =>
                        setCatalogDrafts((current) => ({
                          ...current,
                          [item.id]: { ...current[item.id], aciklama: event.target.value },
                        }))
                      }
                    />
                  </label>
                  <div className="admin-gmy-card__actions">
                    <button className="button" onClick={() => handleSaveCatalogItem(item.id)}>
                      <Save size={16} />
                      Kaydet
                    </button>
                    <button className="button button--ghost" onClick={() => handleDeleteCatalogItem(item.id)}>
                      <Trash2 size={16} />
                      Sil
                    </button>
                  </div>
                </Card>
              ))}
            </div>
            <div className="pagination-bar">
              <button className="button button--secondary" disabled={catalogPage <= 1} onClick={() => setCatalogPage((page) => Math.max(1, page - 1))}>
                Önceki
              </button>
              <span>{`Sayfa ${Math.min(catalogPage, catalogPageCount)} / ${catalogPageCount}`}</span>
              <button className="button button--secondary" disabled={catalogPage >= catalogPageCount} onClick={() => setCatalogPage((page) => Math.min(catalogPageCount, page + 1))}>
                Sonraki
              </button>
            </div>
          </div>
        ) : null}
      </Card>

      <section className="dashboard-grid dashboard-grid--bottom">
        <Card>
          <div className="section-heading section-heading--tight">
            <div>
              <h3>Kurum Yönetimi</h3>
              <p>Dış eğitim kurumlarını yükleyin, arayın ve kullanıcıların bulamadığı kurumları elle ekleyin.</p>
            </div>
            <div className="admin-controls-row">
              <button className="button button--secondary" onClick={() => trainerFileInputRef.current?.click()}>
                <Upload size={16} />
                Kurum Listesi Yükle
              </button>
              <a className="button button--secondary" href="/ornek-kurum-listesi.xlsx" download>
                <Download size={16} />
                Örnek Excel
              </a>
              <input
                ref={trainerFileInputRef}
                className="sr-only"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleTrainerImport}
              />
            </div>
          </div>

          <div className="filter-row">
            <label>
              <span>Kurum Ara</span>
              <input
                value={trainerSearch}
                onChange={(event) => setTrainerSearch(event.target.value)}
                placeholder="Kurum adı, e-posta veya uzmanlık ile ara"
              />
            </label>
          </div>

          <div className="form-grid">
            <label>
              <span>Kurum</span>
              <input value={newTrainer.ad} onChange={(event) => setNewTrainer((current) => ({ ...current, ad: event.target.value }))} placeholder="Örn. ABC Akademi" />
            </label>
            <label>
              <span>E-posta</span>
              <input value={newTrainer.email} onChange={(event) => setNewTrainer((current) => ({ ...current, email: event.target.value }))} placeholder="ornek@firma.com" />
            </label>
            <label>
              <span>Hizmet Alanı</span>
              <input value={newTrainer.uzmanlik} onChange={(event) => setNewTrainer((current) => ({ ...current, uzmanlik: event.target.value }))} placeholder="Örn. Liderlik" />
            </label>
          </div>
          <div className="admin-gmy-card__actions">
            <button className="button" onClick={handleAddTrainer}>
              <Plus size={16} />
              Kurum Ekle
            </button>
          </div>

          <div className="admin-grid">
            {paginatedTrainers.map((trainer) => (
              <Card key={trainer.id} className="admin-gmy-card">
                <div className="admin-gmy-card__meta">
                  <span className="eyebrow">Kurum</span>
                  <strong>{trainer.ad}</strong>
                  <small>{trainer.uzmanlik || trainer.email || 'Ek bilgi yok'}</small>
                </div>
                <label>
                  <span>Kurum</span>
                  <input value={trainerDrafts[trainer.id]?.ad || ''} onChange={(event) => setTrainerDrafts((current) => ({ ...current, [trainer.id]: { ...current[trainer.id], ad: event.target.value } }))} />
                </label>
                <label>
                  <span>E-posta</span>
                  <input value={trainerDrafts[trainer.id]?.email || ''} onChange={(event) => setTrainerDrafts((current) => ({ ...current, [trainer.id]: { ...current[trainer.id], email: event.target.value } }))} />
                </label>
                <label>
                  <span>Hizmet Alanı</span>
                  <input value={trainerDrafts[trainer.id]?.uzmanlik || ''} onChange={(event) => setTrainerDrafts((current) => ({ ...current, [trainer.id]: { ...current[trainer.id], uzmanlik: event.target.value } }))} />
                </label>
                <div className="admin-gmy-card__actions">
                  <button className="button" onClick={() => handleSaveTrainer(trainer.id)}>
                    <Save size={16} />
                    Kaydet
                  </button>
                  <button className="button button--ghost" onClick={() => handleDeleteTrainer(trainer.id)}>
                    <Trash2 size={16} />
                    Sil
                  </button>
                </div>
              </Card>
            ))}
          </div>

          <div className="pagination-bar">
            <button className="button button--secondary" disabled={trainerPage <= 1} onClick={() => setTrainerPage((page) => Math.max(1, page - 1))}>
              Önceki
            </button>
            <span>{`Sayfa ${Math.min(trainerPage, trainerPageCount)} / ${trainerPageCount}`}</span>
            <button className="button button--secondary" disabled={trainerPage >= trainerPageCount} onClick={() => setTrainerPage((page) => Math.min(trainerPageCount, page + 1))}>
              Sonraki
            </button>
          </div>
        </Card>

        <Card>
          <div className="section-heading section-heading--tight">
            <div>
              <h3>İç Eğitmen Yönetimi</h3>
              <p>İç eğitmen havuzunu yükleyin, elle ekleyin ve dashboard ödül akışı için güncel tutun.</p>
            </div>
            <div className="admin-controls-row">
              <button className="button button--secondary" onClick={() => internalTrainerFileInputRef.current?.click()}>
                <Upload size={16} />
                İç Eğitmen Listesi Yükle
              </button>
              <a className="button button--secondary" href="/ornek-ic-egitmen-listesi.xlsx" download>
                <Download size={16} />
                Örnek Excel
              </a>
              <input
                ref={internalTrainerFileInputRef}
                className="sr-only"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleInternalTrainerImport}
              />
            </div>
          </div>

          <div className="filter-row">
            <label>
              <span>İç Eğitmen Ara</span>
              <input
                value={internalTrainerSearch}
                onChange={(event) => setInternalTrainerSearch(event.target.value)}
                placeholder="Ad, birim, e-posta veya uzmanlık ile ara"
              />
            </label>
          </div>

          <div className="form-grid">
            <label>
              <span>İç Eğitmen Adı</span>
              <input value={newInternalTrainer.ad} onChange={(event) => setNewInternalTrainer((current) => ({ ...current, ad: event.target.value }))} placeholder="Örn. Ayşe Demir" />
            </label>
            <label>
              <span>Birim</span>
              <input value={newInternalTrainer.birim} onChange={(event) => setNewInternalTrainer((current) => ({ ...current, birim: event.target.value }))} placeholder="Örn. BT Akademi" />
            </label>
            <label>
              <span>E-posta</span>
              <input value={newInternalTrainer.email} onChange={(event) => setNewInternalTrainer((current) => ({ ...current, email: event.target.value }))} placeholder="ornek@firma.com" />
            </label>
            <label>
              <span>Uzmanlık</span>
              <input value={newInternalTrainer.uzmanlik} onChange={(event) => setNewInternalTrainer((current) => ({ ...current, uzmanlik: event.target.value }))} placeholder="Örn. Veri Analitiği" />
            </label>
          </div>
          <div className="admin-gmy-card__actions">
            <button className="button" onClick={handleAddInternalTrainer}>
              <Plus size={16} />
              İç Eğitmen Ekle
            </button>
          </div>

          <div className="admin-grid">
            {paginatedInternalTrainers.map((trainer) => (
              <Card key={trainer.id} className="admin-gmy-card">
                <div className="admin-gmy-card__meta">
                  <span className="eyebrow">İç Eğitmen</span>
                  <strong>{trainer.ad}</strong>
                  <small>{trainer.birim || trainer.uzmanlik || 'Ek bilgi yok'}</small>
                </div>
                <label>
                  <span>Ad</span>
                  <input value={internalTrainerDrafts[trainer.id]?.ad || ''} onChange={(event) => setInternalTrainerDrafts((current) => ({ ...current, [trainer.id]: { ...current[trainer.id], ad: event.target.value } }))} />
                </label>
                <label>
                  <span>Birim</span>
                  <input value={internalTrainerDrafts[trainer.id]?.birim || ''} onChange={(event) => setInternalTrainerDrafts((current) => ({ ...current, [trainer.id]: { ...current[trainer.id], birim: event.target.value } }))} />
                </label>
                <label>
                  <span>E-posta</span>
                  <input value={internalTrainerDrafts[trainer.id]?.email || ''} onChange={(event) => setInternalTrainerDrafts((current) => ({ ...current, [trainer.id]: { ...current[trainer.id], email: event.target.value } }))} />
                </label>
                <label>
                  <span>Uzmanlık</span>
                  <input value={internalTrainerDrafts[trainer.id]?.uzmanlik || ''} onChange={(event) => setInternalTrainerDrafts((current) => ({ ...current, [trainer.id]: { ...current[trainer.id], uzmanlik: event.target.value } }))} />
                </label>
                <div className="admin-gmy-card__actions">
                  <button className="button" onClick={() => handleSaveInternalTrainer(trainer.id)}>
                    <Save size={16} />
                    Kaydet
                  </button>
                  <button className="button button--ghost" onClick={() => handleDeleteInternalTrainer(trainer.id)}>
                    <Trash2 size={16} />
                    Sil
                  </button>
                </div>
              </Card>
            ))}
          </div>

          <div className="pagination-bar">
            <button className="button button--secondary" disabled={internalTrainerPage <= 1} onClick={() => setInternalTrainerPage((page) => Math.max(1, page - 1))}>
              Önceki
            </button>
            <span>{`Sayfa ${Math.min(internalTrainerPage, internalTrainerPageCount)} / ${internalTrainerPageCount}`}</span>
            <button className="button button--secondary" disabled={internalTrainerPage >= internalTrainerPageCount} onClick={() => setInternalTrainerPage((page) => Math.min(internalTrainerPageCount, page + 1))}>
              Sonraki
            </button>
          </div>
        </Card>

        <Card>
          <div className="section-heading section-heading--tight">
            <div>
              <h3>Kur Yönetimi</h3>
              <p>Maliyet girişlerinde kullanılacak para birimi kurlarını buradan güncelleyin.</p>
            </div>
          </div>
          <div className="admin-rate-grid">
            {PARA_BIRIMLERI.map((currency) => (
              <label key={currency}>
                <span>{currency}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rateDrafts[currency] ?? ''}
                  disabled={currency === 'TRY'}
                  onChange={(event) =>
                    setRateDrafts((current) => ({
                      ...current,
                      [currency]: currency === 'TRY' ? 1 : Number(event.target.value),
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <div className="admin-gmy-card__actions">
            <button className="button" onClick={handleSaveRates}>
              <Save size={16} />
              Kurları Kaydet
            </button>
          </div>
        </Card>
      </section>

      <Card className="import-panel">
        <div className="import-panel__content">
          <div>
            <span className="eyebrow">Talep Girişi</span>
            <h3>Talep yüklemelerini admin ekranından yönetin</h3>
            <p>Yıllık talep yüklerini burada saklayın. Dashboard geçmiş yılları görür, planlama ekranı en güncel talep yılı ile çalışır.</p>
          </div>
          <div className="admin-controls-row">
            <label className="admin-year-select">
              <span>Talep Yılı</span>
              <input
                type="number"
                min="2024"
                max="2100"
                value={selectedTalepYear}
                onChange={(event) => setSelectedTalepYear(Number(event.target.value))}
              />
            </label>
            <a className="button button--secondary" href="/ornek-talep-aktarim.xlsx" download>
              <Download size={16} />
              Örnek Excel İndir
            </a>
            <button className="button button--secondary" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
              <Upload size={16} />
              {isImporting
                ? `İçe aktarılıyor${importProgress.total ? ` (%${Math.round((importProgress.processed / importProgress.total) * 100)})` : '...'}`
                : 'Excel Yükle'}
            </button>
            <button className="button" onClick={() => setShowTalepForm(true)}>
              <Plus size={16} />
              Yeni Talep Ekle
            </button>
            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportFile}
            />
          </div>
        </div>
        <div className="import-panel__hint">
          <FileSpreadsheet size={18} />
          <span>{`${selectedTalepYear} yılı için yüklenen talepler arşivde tutulur.`}</span>
        </div>
      </Card>

      <Card>
        <div className="section-heading section-heading--tight">
          <div>
            <h3>Yıllık Talep Arşivi</h3>
            <p>Her yıl yüklenen talepler ayrı listelenir ve geçmiş yıllar saklanır.</p>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Yıl</th>
                <th>Toplam Talep</th>
                <th>Bekleyen</th>
                <th>Planlanan</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {talepYearSummary.map((item) => (
                <tr key={item.year}>
                  <td>{item.year}</td>
                  <td>{item.talep}</td>
                  <td>{item.bekleyen}</td>
                  <td>{item.planlanan}</td>
                  <td>
                    <div className="action-row">
                      <button className="button button--ghost" onClick={() => setYearToDelete(item.year)}>
                        <Trash2 size={16} />
                        Yılı Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="admin-grid">
        <Card className="admin-gmy-card">
          <div className="admin-gmy-card__meta">
            <span className="eyebrow">GMY</span>
            <strong>Yeni GMY ekle</strong>
            <small>Eklenen GMY anında talep formları ve raporlarda kullanılabilir</small>
          </div>
          <label>
            <span>GMY Adı</span>
            <input
              value={newGmy}
              onChange={(event) => setNewGmy(event.target.value)}
              placeholder="Örn. Pazarlama GMY"
            />
          </label>
          <div className="admin-gmy-card__actions">
            <button className="button" onClick={handleAddGmy}>
              <Plus size={16} />
              GMY Ekle
            </button>
          </div>
        </Card>

        {gmyList.map((gmy) => (
          <Card key={gmy} className="admin-gmy-card">
            <div className="admin-gmy-card__meta">
              <span className="eyebrow">GMY</span>
              <strong>{gmy}</strong>
              <small>{`${usageByGmy[gmy]?.talep || 0} talep • ${usageByGmy[gmy]?.plan || 0} plan`}</small>
            </div>
            <label>
              <span>Yeni Ad</span>
              <input
                value={gmyDrafts[gmy] || ''}
                onChange={(event) => setGmyDrafts((current) => ({ ...current, [gmy]: event.target.value }))}
              />
            </label>
            <div className="admin-gmy-card__actions">
              <button className="button" onClick={() => handleRenameGmy(gmy)}>
                <Save size={16} />
                Kaydet
              </button>
              <button className="button button--ghost" onClick={() => handleDeleteGmy(gmy)}>
                <Trash2 size={16} />
                Sil
              </button>
            </div>
          </Card>
        ))}
      </div>

      <TalepForm
        key={showTalepForm ? 'talep-form-open' : 'talep-form-closed'}
        open={showTalepForm}
        onOpenChange={setShowTalepForm}
        katalog={katalog}
        gmyList={gmyList}
        kategoriList={egitimKategorileri}
        onSubmit={handleCreateTalep}
        onIssues={setValidationIssues}
        defaultTalepKaynagi="Yıllık Talep"
      />
      <Modal
        open={Boolean(validationIssues.length)}
        onOpenChange={handleIssuesModal}
        title="Uyarılı Satırlar"
        description="Eklenmeyen veya atlanan kayıtlar aşağıda listelenir."
        maxWidth={920}
      >
        {hiddenValidationIssueCount > 0 ? (
          <p className="modal-description">
            {`Performans için yalnızca ilk ${validationIssues.length} uyarı gösteriliyor. ${hiddenValidationIssueCount} ek satır daha uyarıya düştü.`}
          </p>
        ) : null}
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Yıl</th>
                <th>Kaynak</th>
                <th>Çalışan</th>
                <th>Sicil</th>
                <th>Kullanıcı Kodu</th>
                <th>Eğitimler</th>
                <th>Sorun</th>
              </tr>
            </thead>
            <tbody>
              {validationIssues.map((issue, index) => (
                <tr key={`${issue.sourceLabel}-${issue.calisanSicil}-${index}`}>
                  <td>{issue.talepYili}</td>
                  <td>{issue.sourceLabel}</td>
                  <td>{issue.calisanAdi || '-'}</td>
                  <td>{issue.calisanSicil || '-'}</td>
                  <td>{issue.calisanKullaniciKodu || '-'}</td>
                  <td>{issue.egitimler || '-'}</td>
                  <td>{issue.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
      <Modal
        open={showClearPlansModal}
        onOpenChange={setShowClearPlansModal}
        title="Tüm Planları Sil"
        description="Bu işlem tüm plan kayıtlarını ve bu planlarla ilişkili talepleri kalıcı olarak siler."
        footer={
          <>
            <button className="button button--secondary" onClick={() => setShowClearPlansModal(false)}>
              Vazgeç
            </button>
            <button className="button button--ghost" onClick={handleClearAllPlans}>
              <Trash2 size={16} />
              Evet, Tümünü Sil
            </button>
          </>
        }
      >
        <div className="page-stack">
          <p>
            Sistemdeki <strong>{planlar.length}</strong> plan kaydının tamamı ve bu planlara bağlı talepler silinecek.
          </p>
          <p>Bu işlem geri alınamaz.</p>
        </div>
      </Modal>
      <Modal
        open={Boolean(yearToDelete)}
        onOpenChange={(nextOpen) => setYearToDelete(nextOpen ? yearToDelete : null)}
        title="Talep Yılı Arşivini Sil"
        description="Bu işlem seçilen yıla ait tüm talepleri ve bu taleplere bağlı tüm planları kalıcı olarak siler."
        footer={
          <>
            <button className="button button--secondary" onClick={() => setYearToDelete(null)}>
              Vazgeç
            </button>
            <button className="button button--ghost" onClick={handleDeleteTalepYear}>
              <Trash2 size={16} />
              Evet, Yılı Sil
            </button>
          </>
        }
      >
        <div className="page-stack">
          <p>
            <strong>{yearToDelete || '-'}</strong> yılına ait tüm talepler ve bağlantılı planlar silinecek.
          </p>
          <p>Bu yıl sistemden tamamen kaldırılır ve işlem geri alınamaz.</p>
        </div>
      </Modal>
    </div>
  )
}