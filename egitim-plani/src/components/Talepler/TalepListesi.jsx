import { useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { Download, FileSpreadsheet, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'
import Badge from '../ui/Badge'
import Card from '../ui/Card'
import EmptyState from '../ui/EmptyState'
import PlanEkleModal from '../EgitimPlani/PlanEkleModal'
import { getEmployeeRoute } from '../../utils/helpers'
import TalepDetay from './TalepDetay'
import TalepForm from './TalepForm'

const COLUMN_ALIASES = {
  yoneticiadi: 'yoneticiAdi',
  yoneticieposta: 'yoneticiEmail',
  yoneticiemail: 'yoneticiEmail',
  gmy: 'gmy',
  calisanadi: 'calisanAdi',
  calisankullanicikodu: 'calisanKullaniciKodu',
  calisankod: 'calisanKullaniciKodu',
  kullanicikodu: 'calisanKullaniciKodu',
  calisansicil: 'calisanSicil',
  calisansicilno: 'calisanSicil',
  notlar: 'notlar',
}

function normalizeHeader(value) {
  return `${value || ''}`
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replaceAll('ı', 'i')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

function mapExcelRowsToTalepler(rows) {
  return rows.map((row, index) => {
    const mapped = {
      yoneticiAdi: '',
      yoneticiEmail: '',
      gmy: '',
      calisanAdi: '',
      calisanSicil: '',
      calisanKullaniciKodu: '',
      notlar: '',
      egitimler: [],
      rowNumber: index + 2,
    }

    Object.entries(row).forEach(([rawKey, rawValue]) => {
      const key = normalizeHeader(rawKey)
      const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue

      const directField = COLUMN_ALIASES[key]

      if (directField) {
        mapped[directField] = `${value || ''}`
        return
      }

      const egitimMatch = key.match(/^egitim([1-4])(adi|kategori)$/)

      if (!egitimMatch) {
        return
      }

      const egitimIndex = Number(egitimMatch[1]) - 1
      const egitimField = egitimMatch[2]
      const nextEgitim = mapped.egitimler[egitimIndex] || {
        egitimAdi: '',
        kategori: 'Teknik',
      }

      if (egitimField === 'adi') {
        nextEgitim.egitimAdi = `${value || ''}`.trim()
      }

      if (egitimField === 'kategori') {
        nextEgitim.kategori = `${value || ''}`.trim() || 'Teknik'
      }

      mapped.egitimler[egitimIndex] = nextEgitim
    })

    mapped.egitimler = mapped.egitimler.filter(Boolean)
    return mapped
  })
}

export default function TaleplerPage({ katalog, talepler, planlar, addTalep, importTalepler, planTalep }) {
  const [showForm, setShowForm] = useState(false)
  const [selectedTalep, setSelectedTalep] = useState(null)
  const [planningTalep, setPlanningTalep] = useState(null)
  const [isImporting, setIsImporting] = useState(false)
  const [validationIssues, setValidationIssues] = useState([])
  const fileInputRef = useRef(null)

  const bekleyenTalepSayisi = talepler.filter((talep) => talep.durum === 'beklemede').length
  const planlananTalepSayisi = talepler.filter((talep) => talep.durum === 'plana_eklendi').length

  function handleCreateTalep(payload) {
    const result = addTalep(payload)
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
      const result = importTalepler(mapExcelRowsToTalepler(rows))
      setValidationIssues(result.issues || [])

      if (result.importedCount > 0 && result.issues.length > 0) {
        toast(`${result.importedCount} talep aktarıldı, ${result.issues.length} satır uyarıya düştü.`, {
          icon: '!' ,
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

  return (
    <div className="page-stack">
      <section className="page-toolbar">
        <Card className="surface-card--accent">
          <span className="eyebrow">Talep Yönetimi</span>
          <h2>Yöneticilerden gelen talepleri yönetin</h2>
          <p>Talebi açın, detayını inceleyin ve tek adımda eğitim planına dönüştürün.</p>
        </Card>
        <div className="toolbar-actions">
          <Card className="mini-stat">
            <span>Bekleyen Talep</span>
            <strong>{bekleyenTalepSayisi}</strong>
          </Card>
          <Card className="mini-stat">
            <span>Planlanan Talep</span>
            <strong>{planlananTalepSayisi}</strong>
          </Card>
          <Card className="mini-stat">
            <span>Üretilen Plan Kaydı</span>
            <strong>{planlar.length}</strong>
          </Card>
          <button className="button" onClick={() => setShowForm(true)}>
            Yeni Talep Ekle
          </button>
        </div>
      </section>

      <Card className="import-panel">
        <div className="import-panel__content">
          <div>
            <span className="eyebrow">Excel İçeri Aktarma</span>
            <h3>Talepleri toplu olarak yükleyin</h3>
            <p>
              İlk sayfadan veri okunur. Desteklenen kolonlar: Yönetici Adı, Yönetici E-posta,
              GMY, Çalışan Adı, Çalışan Sicil No, Çalışan Kullanıcı Kodu, Notlar ve Eğitim 1-4
              için Adı ile Kategori alanları.
            </p>
          </div>
          <div className="import-panel__actions">
            <a className="button button--secondary" href="/ornek-talep-aktarim.xlsx" download>
              <Download size={16} />
              Örnek Excel İndir
            </a>
            <button
              className="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              <Upload size={16} />
              {isImporting ? 'İçe aktarılıyor...' : 'Excel Dosyası Yükle'}
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
          <span>Örnek başlıklar: Eğitim 1 Adı, Eğitim 1 Kategori</span>
        </div>
      </Card>

      {validationIssues.length ? (
        <Card className="warning-panel">
          <div className="section-heading section-heading--tight">
            <div>
              <span className="eyebrow">Uyarılı Satırlar</span>
              <h3>Eklenmeyen veya atlanan kayıtlar</h3>
              <p>Mükerrer ya da kurala uymayan satırlar aşağıda listelenir.</p>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
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
        </Card>
      ) : null}

      {talepler.length ? (
        <Card>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Çalışan Adı</th>
                  <th>Sicil No</th>
                  <th>Kullanıcı Kodu</th>
                  <th>GMY</th>
                  <th>Talep Edilen Eğitimler</th>
                  <th>Durum</th>
                  <th>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {talepler.map((talep) => (
                  <tr key={talep.id}>
                    <td>
                      <Link className="table-link" to={getEmployeeRoute(talep.calisanSicil)}>
                        {talep.calisanAdi}
                      </Link>
                    </td>
                    <td>{talep.calisanSicil}</td>
                    <td>{talep.calisanKullaniciKodu || '-'}</td>
                    <td>{talep.gmy}</td>
                    <td>
                      <div className="chip-list">
                        {talep.egitimler.map((egitim) => (
                          <span key={egitim.egitimId} className="chip">
                            {egitim.egitimAdi}
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
        </Card>
      ) : (
        <EmptyState
          title="Henüz talep bulunmuyor"
          description="İlk eğitim talebini ekleyerek tabloyu doldurun."
          action={<button className="button" onClick={() => setShowForm(true)}>Talep Oluştur</button>}
        />
      )}

      <TalepForm open={showForm} onOpenChange={setShowForm} katalog={katalog} onSubmit={handleCreateTalep} />
      <TalepDetay open={Boolean(selectedTalep)} onOpenChange={() => setSelectedTalep(null)} talep={selectedTalep} />
      <PlanEkleModal
        open={Boolean(planningTalep)}
        onOpenChange={() => setPlanningTalep(null)}
        talep={planningTalep}
        onSubmit={planTalep}
      />
    </div>
  )
}