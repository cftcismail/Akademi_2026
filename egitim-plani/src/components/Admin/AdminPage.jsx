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

export default function AdminPage({
  talepler,
  planlar,
  gmyList,
  katalog,
  addTalep,
  importTalepler,
  addGmy,
  updateGmy,
  deleteGmy,
  isAdminAuthenticated,
  onAuthenticatedChange,
}) {
  const [password, setPassword] = useState('')
  const [newGmy, setNewGmy] = useState('')
  const [selectedTalepYear, setSelectedTalepYear] = useState(new Date().getFullYear())
  const [showTalepForm, setShowTalepForm] = useState(false)
  const [validationIssues, setValidationIssues] = useState([])
  const [drafts, setDrafts] = useState(() => buildDraftMap(gmyList))
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    setDrafts(buildDraftMap(gmyList))
  }, [gmyList])

  const usageByGmy = useMemo(() => {
    return gmyList.reduce((accumulator, gmy) => {
      accumulator[gmy] = {
        talep: talepler.filter((item) => item.gmy === gmy).length,
        plan: planlar.filter((item) => item.gmy === gmy).length,
      }
      return accumulator
    }, {})
  }, [gmyList, planlar, talepler])

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
      updateGmy(currentName, drafts[currentName])
      toast.success('GMY güncellendi.')
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

  function handleIssuesModal(nextOpen) {
    if (!nextOpen) {
      setValidationIssues([])
    }
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
          <button className="button button--secondary" onClick={() => onAuthenticatedChange(false)}>
            <LogOut size={16} />
            Çıkış Yap
          </button>
        </div>
      </section>

      <Card>
        <div className="section-heading section-heading--tight">
          <div>
            <h3>Yeni GMY ekle</h3>
            <p>Eklenen GMY anında talep formlarında ve raporlarda kullanılabilir.</p>
          </div>
        </div>
        <div className="admin-add-row">
          <input
            value={newGmy}
            onChange={(event) => setNewGmy(event.target.value)}
            placeholder="Örn. Pazarlama GMY"
          />
          <button className="button" onClick={handleAddGmy}>
            <Plus size={16} />
            GMY Ekle
          </button>
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
              </tr>
            </thead>
            <tbody>
              {talepYearSummary.map((item) => (
                <tr key={item.year}>
                  <td>{item.year}</td>
                  <td>{item.talep}</td>
                  <td>{item.bekleyen}</td>
                  <td>{item.planlanan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="admin-grid">
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
                value={drafts[gmy] || ''}
                onChange={(event) => setDrafts((current) => ({ ...current, [gmy]: event.target.value }))}
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
    </div>
  )
}