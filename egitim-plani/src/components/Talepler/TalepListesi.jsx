import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Badge from '../ui/Badge'
import Card from '../ui/Card'
import EmptyState from '../ui/EmptyState'
import PlanEkleModal from '../EgitimPlani/PlanEkleModal'
import { formatEgitimLabel, getEmployeeRoute, getTalepKaynagiLabel } from '../../utils/helpers'
import TalepDetay from './TalepDetay'
import TalepForm from './TalepForm'

export default function TaleplerPage({
  talepler,
  planTalep,
  addTalep,
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
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedManager, setSelectedManager] = useState('Tümü')
  const [selectedLocation, setSelectedLocation] = useState('Tümü')
  const [selectedSource, setSelectedSource] = useState('Tümü')
  const [selectedStatus, setSelectedStatus] = useState('Tümü')
  const talepYillari = useMemo(
    () => [...new Set(talepler.map((talep) => talep.talepYili || new Date().getFullYear()))].sort((a, b) => b - a),
    [talepler],
  )
  const [selectedYear, setSelectedYear] = useState(talepYillari[0] || new Date().getFullYear())

  const activeYear = talepYillari.includes(selectedYear) ? selectedYear : talepYillari[0] || new Date().getFullYear()
  const yearTalepler = talepler.filter((talep) => (talep.talepYili || new Date().getFullYear()) === activeYear)
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
                {visibleTalepler.map((talep) => (
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
        </Card>
      ) : (
        <EmptyState
          title="Filtreye uygun talep bulunmuyor"
          description="Arama ve filtreleri değiştirin ya da bu yıl için yeni talep ekleyin."
        />
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