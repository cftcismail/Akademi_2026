import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Badge from '../ui/Badge'
import Card from '../ui/Card'
import EmptyState from '../ui/EmptyState'
import PlanEkleModal from '../EgitimPlani/PlanEkleModal'
import { formatEgitimLabel, getEmployeeRoute } from '../../utils/helpers'
import TalepDetay from './TalepDetay'
export default function TaleplerPage({ talepler, planlar, planTalep }) {
  const [selectedTalep, setSelectedTalep] = useState(null)
  const [planningTalep, setPlanningTalep] = useState(null)
  const talepYillari = useMemo(
    () => [...new Set(talepler.map((talep) => talep.talepYili || new Date().getFullYear()))].sort((a, b) => b - a),
    [talepler],
  )
  const [selectedYear, setSelectedYear] = useState(talepYillari[0] || new Date().getFullYear())

  const activeYear = talepYillari.includes(selectedYear) ? selectedYear : talepYillari[0] || new Date().getFullYear()
  const visibleTalepler = talepler.filter((talep) => (talep.talepYili || new Date().getFullYear()) === activeYear)

  const bekleyenTalepSayisi = visibleTalepler.filter((talep) => talep.durum === 'beklemede').length
  const planlananTalepSayisi = visibleTalepler.filter((talep) => talep.durum === 'plana_eklendi').length

  return (
    <div className="page-stack">
      <section className="page-toolbar">
        <Card className="surface-card--accent">
          <span className="eyebrow">Talep Yönetimi</span>
          <h2>Yıllara göre yüklenen talepleri yönetin</h2>
          <p>Talep girişleri admin ekranından yapılır. Bu ekranda yıllara göre geçmiş listeyi izleyin ve plan akışını takip edin.</p>
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
          <Card className="mini-stat">
            <span>Aktif Yıl</span>
            <strong>{activeYear}</strong>
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
      <PlanEkleModal
        open={Boolean(planningTalep)}
        onOpenChange={() => setPlanningTalep(null)}
        talep={planningTalep}
        onSubmit={planTalep}
      />
    </div>
  )
}