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
  const talepYillari = useMemo(
    () => [...new Set(talepler.map((talep) => talep.talepYili || new Date().getFullYear()))].sort((a, b) => b - a),
    [talepler],
  )
  const [selectedYear, setSelectedYear] = useState(talepYillari[0] || new Date().getFullYear())

  const activeYear = talepYillari.includes(selectedYear) ? selectedYear : talepYillari[0] || new Date().getFullYear()
  const visibleTalepler = talepler.filter((talep) => (talep.talepYili || new Date().getFullYear()) === activeYear)

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
                  <th>GMY</th>
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
                    <td>{talep.gmy}</td>
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
          title="Seçili yıl için talep bulunmuyor"
          description="Bu yılın taleplerini admin ekranından ekleyin veya Excel ile yükleyin."
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