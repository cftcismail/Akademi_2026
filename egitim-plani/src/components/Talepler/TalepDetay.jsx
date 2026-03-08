import Badge from '../ui/Badge'
import Modal from '../ui/Modal'
import { formatEgitimLabel } from '../../utils/helpers'

export default function TalepDetay({ open, onOpenChange, talep }) {
  if (!talep) {
    return null
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`${talep.calisanAdi} talep detayı`}
      description="Talep edilen eğitimler, yönetici bilgisi ve notlar"
      maxWidth={720}
    >
      <div className="detail-grid">
        <div className="detail-card">
          <span>Çalışan</span>
          <strong>{talep.calisanAdi}</strong>
          <small>{`${talep.calisanSicil} • ${talep.calisanKullaniciKodu || 'Kullanıcı kodu yok'}`}</small>
        </div>
        <div className="detail-card">
          <span>Organizasyon</span>
          <strong>{talep.gmy}</strong>
          <small>Yönetici talebi</small>
        </div>
        <div className="detail-card">
          <span>Yönetici</span>
          <strong>{talep.yoneticiAdi}</strong>
          <small>{talep.yoneticiEmail}</small>
        </div>
        <div className="detail-card">
          <span>Durum</span>
          <Badge value={talep.durum === 'plana_eklendi' ? 'plana_eklendi' : 'beklemede'} />
          <small>Planlama akışında güncel durum</small>
        </div>
      </div>

      <div className="stack-list">
        <div>
          <h4>Talep Edilen Eğitimler</h4>
          <div className="chip-list">
            {talep.egitimler.map((egitim) => (
              <span key={egitim.egitimId} className="chip">
                {formatEgitimLabel(egitim)}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h4>Notlar</h4>
          <p>{talep.notlar || 'Not eklenmemiş.'}</p>
        </div>
      </div>
    </Modal>
  )
}