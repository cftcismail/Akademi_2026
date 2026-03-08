import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { DURUM_LISTESI, EGITIM_TURLERI } from '../../data/constants'
import { formatEgitimLabel } from '../../utils/helpers'
import Modal from '../ui/Modal'

function createInitialForm() {
  return {
    selectedEgitimIds: [],
    planlanmaTarihi: new Date().toISOString().slice(0, 10),
    egitimTarihi: new Date().toISOString().slice(0, 10),
    egitimTuru: EGITIM_TURLERI[0],
    sure: '1 gün',
    egitimci: 'İç Eğitim',
    maliyet: 0,
    durum: DURUM_LISTESI[0],
    notlar: '',
  }
}

export default function PlanEkleModal({ open, onOpenChange, talep, onSubmit }) {
  const [form, setForm] = useState(createInitialForm())

  useEffect(() => {
    if (open && talep) {
      setForm((current) => ({
        ...current,
        selectedEgitimIds: talep.egitimler.map((egitim) => egitim.egitimId),
      }))
    }
  }, [open, talep])

  if (!talep) {
    return null
  }

  function handleToggle(egitimId) {
    setForm((current) => ({
      ...current,
      selectedEgitimIds: current.selectedEgitimIds.includes(egitimId)
        ? current.selectedEgitimIds.filter((item) => item !== egitimId)
        : [...current.selectedEgitimIds, egitimId],
    }))
  }

  function handleSave() {
    try {
      onSubmit({
        talepId: talep.id,
        selectedEgitimIds: form.selectedEgitimIds,
        ortakAlanlar: {
          planlanmaTarihi: form.planlanmaTarihi,
          egitimTarihi: form.egitimTarihi,
          egitimTuru: form.egitimTuru,
          sure: form.sure,
          egitimci: form.egitimci,
          maliyet: form.maliyet,
          durum: form.durum,
          notlar: form.notlar,
        },
      })
      toast.success('Talep eğitim planına eklendi.')
      onOpenChange(false)
      setForm(createInitialForm())
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Talebi plana ekle"
      description={`${talep.calisanAdi} için seçili eğitimleri planlayın`}
      footer={
        <>
          <button className="button button--secondary" onClick={() => onOpenChange(false)}>
            Vazgeç
          </button>
          <button className="button" onClick={handleSave}>
            Plana Kaydet
          </button>
        </>
      }
      maxWidth={860}
    >
      <div className="detail-grid detail-grid--compact">
        <div className="detail-card">
          <span>Çalışan</span>
          <strong>{talep.calisanAdi}</strong>
          <small>{`${talep.calisanSicil} • ${talep.calisanKullaniciKodu || 'Kullanıcı kodu yok'}`}</small>
        </div>
        <div className="detail-card">
          <span>Yönetici</span>
          <strong>{talep.yoneticiAdi}</strong>
          <small>{talep.yoneticiEmail}</small>
        </div>
        <div className="detail-card">
          <span>GMY</span>
          <strong>{talep.gmy}</strong>
          <small>Talep üzerinden planlanacak</small>
        </div>
      </div>

      <div className="section-heading section-heading--tight">
        <div>
          <h3>Planlanacak eğitimler</h3>
          <p>Talep edilen eğitimlerden istediklerinizi seçin</p>
        </div>
      </div>
      <div className="checkbox-list">
        {talep.egitimler.map((egitim) => (
          <label key={egitim.egitimId} className="checkbox-card">
            <input
              type="checkbox"
              checked={form.selectedEgitimIds.includes(egitim.egitimId)}
              onChange={() => handleToggle(egitim.egitimId)}
            />
            <div>
              <strong>{formatEgitimLabel(egitim)}</strong>
              <span>{egitim.kategori}</span>
            </div>
          </label>
        ))}
      </div>

      <div className="form-grid">
        <label>
          <span>Planlanma Tarihi</span>
          <input type="date" value={form.planlanmaTarihi} onChange={(event) => setForm({ ...form, planlanmaTarihi: event.target.value })} />
        </label>
        <label>
          <span>Eğitim Tarihi</span>
          <input type="date" value={form.egitimTarihi} onChange={(event) => setForm({ ...form, egitimTarihi: event.target.value })} />
        </label>
        <label>
          <span>Eğitim Türü</span>
          <select value={form.egitimTuru} onChange={(event) => setForm({ ...form, egitimTuru: event.target.value })}>
            {EGITIM_TURLERI.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Süre</span>
          <input value={form.sure} onChange={(event) => setForm({ ...form, sure: event.target.value })} />
        </label>
        <label>
          <span>Eğitimci</span>
          <input value={form.egitimci} onChange={(event) => setForm({ ...form, egitimci: event.target.value })} />
        </label>
        <label>
          <span>Durum</span>
          <select value={form.durum} onChange={(event) => setForm({ ...form, durum: event.target.value })}>
            {DURUM_LISTESI.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Maliyet</span>
          <input type="number" min="0" value={form.maliyet} onChange={(event) => setForm({ ...form, maliyet: Number(event.target.value) })} />
        </label>
        <label className="form-grid--full">
          <span>Notlar</span>
          <textarea value={form.notlar} onChange={(event) => setForm({ ...form, notlar: event.target.value })} rows={3} />
        </label>
      </div>
    </Modal>
  )
}