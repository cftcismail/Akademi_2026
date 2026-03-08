import { useState } from 'react'
import { Link } from 'react-router-dom'
import Badge from '../ui/Badge'
import Card from '../ui/Card'
import EmptyState from '../ui/EmptyState'
import PlanEkleModal from '../EgitimPlani/PlanEkleModal'
import { formatDate, getEmployeeRoute } from '../../utils/helpers'
import TalepDetay from './TalepDetay'
import TalepForm from './TalepForm'

export default function TaleplerPage({ katalog, talepler, planlar, addTalep, planTalep }) {
  const [showForm, setShowForm] = useState(false)
  const [selectedTalep, setSelectedTalep] = useState(null)
  const [planningTalep, setPlanningTalep] = useState(null)

  const bekleyenTalepSayisi = talepler.filter((talep) => talep.durum === 'beklemede').length
  const planlananTalepSayisi = talepler.filter((talep) => talep.durum === 'plana_eklendi').length

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

      {talepler.length ? (
        <Card>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Çalışan Adı</th>
                  <th>Sicil No</th>
                  <th>Birim</th>
                  <th>GMY</th>
                  <th>Talep Edilen Eğitimler</th>
                  <th>Talep Tarihi</th>
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
                    <td>{talep.birim}</td>
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
                    <td>{formatDate(talep.talepTarihi)}</td>
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

      <TalepForm open={showForm} onOpenChange={setShowForm} katalog={katalog} onSubmit={addTalep} />
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