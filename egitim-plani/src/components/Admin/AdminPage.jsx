import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Download, FileSpreadsheet, KeyRound, LogOut, Plus, Save, ShieldCheck, Trash2, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'
import Card from '../ui/Card'
import TalepForm from '../Talepler/TalepForm'
import Modal from '../ui/Modal'
import { mapExcelRowsToTalepler } from '../../utils/talepImport'

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

export default function AdminPage({
  talepler,
  planlar,
  gmyList,
  egitimKategorileri,
  katalog,
  addTalep,
  importTalepler,
  addGmy,
  updateGmy,
  deleteGmy,
  addKatalogItem,
  updateKatalogItem,
  deleteKatalogItem,
  addEgitimKategorisi,
  updateEgitimKategorisi,
  deleteEgitimKategorisi,
  clearAllPlans,
  deleteTalepYear,
  isAdminAuthenticated,
  onAuthenticatedChange,
}) {
  const [password, setPassword] = useState('')
  const [newGmy, setNewGmy] = useState('')
  const [newKategori, setNewKategori] = useState('')
  const [newCatalogItem, setNewCatalogItem] = useState({
    kod: '',
    ad: '',
    kategori: egitimKategorileri[0] || 'Teknik',
    sure: '1 gün',
    aciklama: '',
  })
  const [selectedTalepYear, setSelectedTalepYear] = useState(new Date().getFullYear())
  const [showTalepForm, setShowTalepForm] = useState(false)
  const [validationIssues, setValidationIssues] = useState([])
  const [showClearPlansModal, setShowClearPlansModal] = useState(false)
  const [yearToDelete, setYearToDelete] = useState(null)
  const [gmyDrafts, setGmyDrafts] = useState(() => buildDraftMap(gmyList))
  const [kategoriDrafts, setKategoriDrafts] = useState(() => buildDraftMap(egitimKategorileri))
  const [catalogDrafts, setCatalogDrafts] = useState(() => buildCatalogDraftMap(katalog))
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef(null)

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

      const result = importTalepler(
        mapExcelRowsToTalepler(rows).map((payload) => ({
          ...payload,
          talepYili: selectedTalepYear,
        })),
      )

      setValidationIssues(result.issues || [])

      if (result.importedCount > 0 && result.issues.length > 0) {
        toast(`${result.importedCount} talep aktarıldı, ${result.issues.length} satır uyarıya düştü.`, {
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

  function handleIssuesModal(nextOpen) {
    if (!nextOpen) {
      setValidationIssues([])
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

      <Card>
        <div className="section-heading section-heading--tight">
          <div>
            <h3>Katalog yönetimi</h3>
            <p>Eğitim kodu, adı, kategori ve süre bilgilerini admin ekranından yönetin.</p>
          </div>
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
        <div className="admin-grid">
          {katalog.map((item) => (
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
      </Card>

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
              {isImporting ? 'İçe aktarılıyor...' : 'Excel Yükle'}
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
        open={showTalepForm}
        onOpenChange={setShowTalepForm}
        katalog={katalog}
        gmyList={gmyList}
        kategoriList={egitimKategorileri}
        onSubmit={handleCreateTalep}
        onIssues={setValidationIssues}
      />
      <Modal
        open={Boolean(validationIssues.length)}
        onOpenChange={handleIssuesModal}
        title="Uyarılı Satırlar"
        description="Eklenmeyen veya atlanan kayıtlar aşağıda listelenir."
        maxWidth={920}
      >
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