import { useParams } from 'react-router-dom'
import { formatDate, formatEgitimLabel } from '../utils/helpers'
import Badge from './ui/Badge'
import Card from './ui/Card'
import EmptyState from './ui/EmptyState'

export default function CalisanDetay({ talepler, planlar }) {
  const { sicilNo } = useParams()
  const calisanTalepleri = talepler.filter((talep) => talep.calisanSicil === sicilNo)
  const calisanPlanlari = planlar.filter((plan) => plan.calisanSicil === sicilNo)
  const profile = calisanTalepleri[0] || calisanPlanlari[0]

  if (!profile) {
    return (
      <EmptyState
        title="Çalışan bulunamadı"
        description="İstenen sicil numarasına ait talep veya plan kaydı yok."
      />
    )
  }

  return (
    <div className="page-stack">
      <section className="detail-grid">
        <Card className="detail-card detail-card--hero">
          <span>Çalışan</span>
          <strong>{profile.calisanAdi}</strong>
          <small>{`Sicil: ${profile.calisanSicil} • Kullanıcı Kodu: ${profile.calisanKullaniciKodu || '-'}`}</small>
        </Card>
        <Card className="detail-card detail-card--hero">
          <span>GMY</span>
          <strong>{profile.gmy}</strong>
          <small>Organizasyon kırılımı</small>
        </Card>
        <Card className="detail-card detail-card--hero">
          <span>Lokasyon</span>
          <strong>{profile.calisanLokasyon || 'Lokasyon Yok'}</strong>
          <small>Çalışanın bağlı olduğu lokasyon</small>
        </Card>
        <Card className="detail-card detail-card--hero">
          <span>Talep Sayısı</span>
          <strong>{calisanTalepleri.length}</strong>
          <small>Toplam açılmış talep kaydı</small>
        </Card>
        <Card className="detail-card detail-card--hero">
          <span>Plana Alınan Eğitim</span>
          <strong>{calisanPlanlari.length}</strong>
          <small>Aktif eğitim plan kayıtları</small>
        </Card>
      </section>

      <Card>
        <div className="section-heading">
          <div>
            <h3>Eğitim geçmişi ve planı</h3>
            <p>Talep edilen ve planlanan eğitimlerin tam görünümü</p>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Eğitim</th>
                <th>Tarih</th>
                <th>Tür</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {calisanPlanlari.map((plan) => (
                <tr key={plan.id}>
                  <td>{formatEgitimLabel(plan)}</td>
                  <td>{formatDate(plan.egitimTarihi)}</td>
                  <td>
                    <Badge value={plan.egitimTuru} />
                  </td>
                  <td>
                    <Badge value={plan.durum} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="section-heading">
          <div>
            <h3>Mini timeline</h3>
            <p>Çalışanın talep ve plan akışının kısa özeti</p>
          </div>
        </div>
        <div className="timeline-list">
          {calisanTalepleri.map((talep) => (
            <div key={talep.id} className="timeline-item">
              <span>Talep</span>
              <div>
                <strong>Talep açıldı</strong>
                <p>{talep.egitimler.map((egitim) => formatEgitimLabel(egitim)).join(', ')}</p>
              </div>
            </div>
          ))}
          {calisanPlanlari.map((plan) => (
            <div key={plan.id} className="timeline-item">
              <span>{formatDate(plan.egitimTarihi)}</span>
              <div>
                <strong>{formatEgitimLabel(plan)}</strong>
                <p>{`${plan.egitimTuru} • ${plan.durum}`}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}