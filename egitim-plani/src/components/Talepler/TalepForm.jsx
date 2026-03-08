import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { EGITIM_KATEGORILERI, GMY_LISTESI } from '../../data/constants'
import Modal from '../ui/Modal'

function createBlankEgitim(index = 0) {
  return {
    egitimId: '',
    egitimAdi: '',
    kategori: EGITIM_KATEGORILERI[0],
    oncelik: index + 1,
  }
}

function createInitialForm() {
  return {
    yoneticiAdi: '',
    yoneticiEmail: '',
    gmy: GMY_LISTESI[0],
    birim: '',
    calisanAdi: '',
    calisanSicil: '',
    egitimler: [createBlankEgitim(0)],
    notlar: '',
  }
}

export default function TalepForm({ open, onOpenChange, katalog, onSubmit }) {
  const [form, setForm] = useState(createInitialForm())

  useEffect(() => {
    if (!open) {
      setForm(createInitialForm())
    }
  }, [open])

  function updateEgitim(index, field, value) {
    setForm((current) => {
      const nextEgitimler = current.egitimler.map((egitim, egitimIndex) => {
        if (egitimIndex !== index) {
          return egitim
        }

        const matchedCatalog = katalog.find((item) => item.ad === value)

        if (field === 'egitimAdi' && matchedCatalog) {
          return {
            ...egitim,
            egitimId: matchedCatalog.id,
            egitimAdi: matchedCatalog.ad,
            kategori: matchedCatalog.kategori,
          }
        }

        return {
          ...egitim,
          [field]: value,
        }
      })

      return {
        ...current,
        egitimler: nextEgitimler,
      }
    })
  }

  function handleSave(event) {
    event.preventDefault()

    try {
      onSubmit(form)
      toast.success('Yeni talep eklendi.')
      onOpenChange(false)
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Yeni talep ekle"
      description="Yöneticiden gelen talebi sisteme kaydedin"
      footer={
        <>
          <button className="button button--secondary" onClick={() => onOpenChange(false)}>
            Vazgeç
          </button>
          <button className="button" onClick={handleSave}>
            Talebi Kaydet
          </button>
        </>
      }
      maxWidth={900}
    >
      <form className="form-grid" onSubmit={handleSave}>
        <label>
          <span>Yönetici Adı</span>
          <input value={form.yoneticiAdi} onChange={(event) => setForm({ ...form, yoneticiAdi: event.target.value })} required />
        </label>
        <label>
          <span>Yönetici E-posta</span>
          <input type="email" value={form.yoneticiEmail} onChange={(event) => setForm({ ...form, yoneticiEmail: event.target.value })} required />
        </label>
        <label>
          <span>GMY</span>
          <select value={form.gmy} onChange={(event) => setForm({ ...form, gmy: event.target.value })}>
            {GMY_LISTESI.map((gmy) => (
              <option key={gmy} value={gmy}>
                {gmy}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Birim</span>
          <input value={form.birim} onChange={(event) => setForm({ ...form, birim: event.target.value })} required />
        </label>
        <label>
          <span>Çalışan Adı</span>
          <input value={form.calisanAdi} onChange={(event) => setForm({ ...form, calisanAdi: event.target.value })} required />
        </label>
        <label>
          <span>Çalışan Sicil No</span>
          <input value={form.calisanSicil} onChange={(event) => setForm({ ...form, calisanSicil: event.target.value })} required />
        </label>

        <div className="form-grid form-grid--full">
          <div className="section-heading section-heading--tight">
            <div>
              <h3>Eğitimler</h3>
              <p>Minimum 1, maksimum 4 eğitim tanımlayın</p>
            </div>
            <button
              type="button"
              className="button button--secondary"
              disabled={form.egitimler.length >= 4}
              onClick={() => setForm({ ...form, egitimler: [...form.egitimler, createBlankEgitim(form.egitimler.length)] })}
            >
              + Eğitim Ekle
            </button>
          </div>

          <datalist id="catalog-options">
            {katalog.map((item) => (
              <option key={item.id} value={item.ad} />
            ))}
          </datalist>

          {form.egitimler.map((egitim, index) => (
            <div key={`${egitim.egitimAdi}-${index}`} className="education-row">
              <label>
                <span>Eğitim Adı</span>
                <input
                  list="catalog-options"
                  value={egitim.egitimAdi}
                  onChange={(event) => updateEgitim(index, 'egitimAdi', event.target.value)}
                  required
                />
              </label>
              <label>
                <span>Kategori</span>
                <select value={egitim.kategori} onChange={(event) => updateEgitim(index, 'kategori', event.target.value)}>
                  {EGITIM_KATEGORILERI.map((kategori) => (
                    <option key={kategori} value={kategori}>
                      {kategori}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Öncelik</span>
                <select value={egitim.oncelik} onChange={(event) => updateEgitim(index, 'oncelik', Number(event.target.value))}>
                  {[1, 2, 3, 4].map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="button button--ghost"
                disabled={form.egitimler.length === 1}
                onClick={() =>
                  setForm({
                    ...form,
                    egitimler: form.egitimler.filter((_, itemIndex) => itemIndex !== index),
                  })
                }
              >
                Kaldır
              </button>
            </div>
          ))}
        </div>

        <label className="form-grid--full">
          <span>Notlar</span>
          <textarea value={form.notlar} onChange={(event) => setForm({ ...form, notlar: event.target.value })} rows={4} />
        </label>
      </form>
    </Modal>
  )
}