import { useState } from 'react'
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

function createFormForTalep(talep, egitmenListesi, kurumListesi, kurBilgileri, contextKey) {
  const baseForm = createInitialForm()

  return {
    ...baseForm,
    contextKey,
    selectedEgitimIds: talep?.egitimler?.map((egitim) => egitim.egitimId) || [],
    egitimci: baseForm.icEgitim ? baseForm.egitimci || getDefaultInternalTrainerName(egitmenListesi) : '',
    kurum: baseForm.icEgitim ? '' : getDefaultInstitutionName(kurumListesi),
    dovizKuru:
      baseForm.maliyetParaBirimi === 'TRY'
        ? 1
        : Number(kurBilgileri?.[baseForm.maliyetParaBirimi] || baseForm.dovizKuru || 1),
  }
}

export default function PlanEkleModal({ open, onOpenChange, talep, onSubmit, egitmenListesi, kurumListesi, kurBilgileri }) {
  const contextKey = talep ? `${talep.id}:${open ? 'open' : 'closed'}` : 'empty'
  const [form, setForm] = useState(() =>
    createFormForTalep(talep, egitmenListesi, kurumListesi, kurBilgileri, contextKey),
  )

  if (!talep) {
    return null
  }

  const activeForm =
    form.contextKey === contextKey
      ? form
      : createFormForTalep(talep, egitmenListesi, kurumListesi, kurBilgileri, contextKey)

  function updateForm(updater) {
    setForm((current) => {
      const baseForm =
        current.contextKey === contextKey
          ? current
          : createFormForTalep(talep, egitmenListesi, kurumListesi, kurBilgileri, contextKey)
      const nextForm = typeof updater === 'function' ? updater(baseForm) : updater

      return {
        ...nextForm,
        contextKey,
      }
    })
  }

  function handleToggle(egitimId) {
    updateForm((current) => ({
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
        selectedEgitimIds: activeForm.selectedEgitimIds,
        ortakAlanlar: {
          planlanmaTarihi: activeForm.planlanmaTarihi,
          egitimTarihi: activeForm.egitimTarihi,
          egitimTuru: activeForm.egitimTuru,
          sure: activeForm.sure,
          icEgitim: activeForm.icEgitim,
          egitimci: activeForm.icEgitim ? activeForm.egitimci : '',
          kurum: activeForm.icEgitim ? '' : activeForm.kurum,
          maliyet: activeForm.maliyet,
          maliyetParaBirimi: activeForm.maliyetParaBirimi,
          dovizKuru: activeForm.maliyetParaBirimi === 'TRY' ? 1 : Number(activeForm.dovizKuru || 1),
          durum: activeForm.durum,
          notlar: activeForm.notlar,
        },
      })
      toast.success('Talep eğitim planına eklendi.')
      onOpenChange(false)
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
              checked={activeForm.selectedEgitimIds.includes(egitim.egitimId)}
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
          <input type="date" value={activeForm.planlanmaTarihi} onChange={(event) => updateForm((current) => ({ ...current, planlanmaTarihi: event.target.value }))} />
        </label>
        <label>
          <span>Eğitim Tarihi</span>
          <input type="date" value={activeForm.egitimTarihi} onChange={(event) => updateForm((current) => ({ ...current, egitimTarihi: event.target.value }))} />
        </label>
        <label>
          <span>Eğitim Türü</span>
          <select value={activeForm.egitimTuru} onChange={(event) => updateForm((current) => ({ ...current, egitimTuru: event.target.value }))}>
            {EGITIM_TURLERI.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Süre</span>
          <input value={activeForm.sure} onChange={(event) => updateForm((current) => ({ ...current, sure: event.target.value }))} />
        </label>
        <label>
          <span>İç Eğitim</span>
          <div className="checkbox-card checkbox-card--inline">
            <input
              type="checkbox"
              checked={activeForm.icEgitim}
              onChange={(event) =>
                updateForm((current) => ({
                  ...current,
                  icEgitim: event.target.checked,
                  egitimci: event.target.checked ? current.egitimci || getDefaultInternalTrainerName(egitmenListesi) : '',
                  kurum: event.target.checked ? '' : current.kurum || getDefaultInstitutionName(kurumListesi),
                }))
              }
            />
            <div>
              <strong>{activeForm.icEgitim ? 'İç eğitmen listesi aktif' : 'Kurum listesi aktif'}</strong>
              <span>{activeForm.icEgitim ? 'Kurum alanı pasif.' : 'İç eğitmen alanı pasif.'}</span>
            </div>
          </div>
        </label>
        <label>
          <span>İç Eğitmen</span>
          <select
              value={activeForm.egitimci}
              disabled={!activeForm.icEgitim}
              onChange={(event) => updateForm((current) => ({ ...current, egitimci: event.target.value }))}
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
              value={activeForm.kurum}
              disabled={activeForm.icEgitim}
              onChange={(event) => updateForm((current) => ({ ...current, kurum: event.target.value }))}
            >
              <option value="">Kurum seçin</option>
              {(kurumListesi || []).map((institution) => (
                <option key={institution.id} value={institution.ad}>{institution.ad}</option>
              ))}
          </select>
        </label>
        <label>
          <span>Durum</span>
          <select value={activeForm.durum} onChange={(event) => updateForm((current) => ({ ...current, durum: event.target.value }))}>
            {DURUM_LISTESI.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Maliyet</span>
          <input type="number" min="0" value={activeForm.maliyet} onChange={(event) => updateForm((current) => ({ ...current, maliyet: Number(event.target.value) }))} />
        </label>
        <label>
          <span>Para Birimi</span>
          <select
            value={activeForm.maliyetParaBirimi}
            onChange={(event) =>
              updateForm((current) => ({
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
            disabled={activeForm.maliyetParaBirimi === 'TRY'}
            value={activeForm.dovizKuru}
            onChange={(event) => updateForm((current) => ({ ...current, dovizKuru: Number(event.target.value) }))}
          />
        </label>
        <label className="form-grid--full">
          <span>Notlar</span>
          <textarea value={activeForm.notlar} onChange={(event) => updateForm((current) => ({ ...current, notlar: event.target.value }))} rows={3} />
        </label>
      </div>
    </Modal>
  )
}