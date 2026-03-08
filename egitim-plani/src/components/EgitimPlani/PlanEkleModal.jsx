import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { DURUM_LISTESI, EGITIM_TURLERI, PARA_BIRIMLERI } from '../../data/constants'
import { formatEgitimLabel } from '../../utils/helpers'
import Modal from '../ui/Modal'

function createInitialForm() {
  return {
    selectedEgitimIds: [],
    planlanmaTarihi: new Date().toISOString().slice(0, 10),
    egitimTarihi: new Date().toISOString().slice(0, 10),
    egitimTuru: EGITIM_TURLERI[0],
    sure: '1 gün',
    icEgitim: true,
    egitimci: 'İç Eğitim',
    kurum: '',
    maliyet: 0,
    maliyetParaBirimi: 'TRY',
    dovizKuru: 1,
    durum: DURUM_LISTESI[0],
    notlar: '',
  }
}

function getDefaultInternalTrainerName(egitmenListesi = []) {
  return egitmenListesi[0]?.ad || ''
}

function getDefaultInstitutionName(kurumListesi = []) {
  return kurumListesi[0]?.ad || ''
}

export default function PlanEkleModal({ open, onOpenChange, talep, onSubmit, egitmenListesi, kurumListesi, kurBilgileri }) {
  const [form, setForm] = useState(createInitialForm())

  useEffect(() => {
    if (open && talep) {
      setForm((current) => ({
        ...current,
        selectedEgitimIds: talep.egitimler.map((egitim) => egitim.egitimId),
        egitimci: current.icEgitim
          ? current.egitimci || getDefaultInternalTrainerName(egitmenListesi)
          : '',
        kurum: current.icEgitim
          ? ''
          : current.kurum || getDefaultInstitutionName(kurumListesi),
        dovizKuru:
          current.maliyetParaBirimi === 'TRY'
            ? 1
            : Number(kurBilgileri?.[current.maliyetParaBirimi] || current.dovizKuru || 1),
      }))
    }
  }, [egitmenListesi, kurumListesi, kurBilgileri, open, talep])

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
          icEgitim: form.icEgitim,
          egitimci: form.icEgitim ? form.egitimci : '',
          kurum: form.icEgitim ? '' : form.kurum,
          maliyet: form.maliyet,
          maliyetParaBirimi: form.maliyetParaBirimi,
          dovizKuru: form.maliyetParaBirimi === 'TRY' ? 1 : Number(form.dovizKuru || 1),
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
          <span>İç Eğitim</span>
          <div className="checkbox-card checkbox-card--inline">
            <input
              type="checkbox"
              checked={form.icEgitim}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  icEgitim: event.target.checked,
                  egitimci: event.target.checked ? current.egitimci || getDefaultInternalTrainerName(egitmenListesi) : '',
                  kurum: event.target.checked ? '' : current.kurum || getDefaultInstitutionName(kurumListesi),
                }))
              }
            />
            <div>
              <strong>{form.icEgitim ? 'İç eğitmen listesi aktif' : 'Kurum listesi aktif'}</strong>
              <span>{form.icEgitim ? 'Kurum alanı pasif.' : 'İç eğitmen alanı pasif.'}</span>
            </div>
          </div>
        </label>
        <label>
          <span>İç Eğitmen</span>
          <select
              value={form.egitimci}
              disabled={!form.icEgitim}
              onChange={(event) => setForm({ ...form, egitimci: event.target.value })}
            >
              <option value="">İç eğitmen seçin</option>
              {(egitmenListesi || []).map((trainer) => (
                <option key={trainer.id} value={trainer.ad}>{`${trainer.ad}${trainer.birim ? ` • ${trainer.birim}` : ''}`}</option>
              ))}
          </select>
        </label>
        <label>
          <span>Kurum</span>
          <select
              value={form.kurum}
              disabled={form.icEgitim}
              onChange={(event) => setForm({ ...form, kurum: event.target.value })}
            >
              <option value="">Kurum seçin</option>
              {(kurumListesi || []).map((institution) => (
                <option key={institution.id} value={institution.ad}>{institution.ad}</option>
              ))}
          </select>
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
        <label>
          <span>Para Birimi</span>
          <select
            value={form.maliyetParaBirimi}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                maliyetParaBirimi: event.target.value,
                dovizKuru:
                  event.target.value === 'TRY'
                    ? 1
                    : Number(kurBilgileri?.[event.target.value] || current.dovizKuru || 1),
              }))
            }
          >
            {PARA_BIRIMLERI.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Kur</span>
          <input
            type="number"
            min="0"
            step="0.01"
            disabled={form.maliyetParaBirimi === 'TRY'}
            value={form.dovizKuru}
            onChange={(event) => setForm({ ...form, dovizKuru: Number(event.target.value) })}
          />
        </label>
        <label className="form-grid--full">
          <span>Notlar</span>
          <textarea value={form.notlar} onChange={(event) => setForm({ ...form, notlar: event.target.value })} rows={3} />
        </label>
      </div>
    </Modal>
  )
}