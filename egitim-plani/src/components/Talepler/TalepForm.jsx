import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import Modal from '../ui/Modal'

function createBlankEgitim(kategoriList) {
  return {
    egitimId: '',
    egitimKodu: '',
    egitimAdi: '',
    kategori: kategoriList[0] || 'Teknik',
  }
}

function createInitialForm(gmyList, kategoriList) {
  return {
    talepYili: new Date().getFullYear(),
    yoneticiAdi: '',
    yoneticiEmail: '',
    gmy: gmyList[0] || '',
    calisanAdi: '',
    calisanSicil: '',
    calisanKullaniciKodu: '',
    egitimler: [createBlankEgitim(kategoriList)],
    notlar: '',
  }
}

export default function TalepForm({ open, onOpenChange, katalog, gmyList, kategoriList, onSubmit, onIssues }) {
  const [form, setForm] = useState(createInitialForm(gmyList, kategoriList))

  useEffect(() => {
    if (!open) {
      setForm(createInitialForm(gmyList, kategoriList))
    }
  }, [gmyList, kategoriList, open])

  useEffect(() => {
    if (!gmyList.length) {
      return
    }

    if (!gmyList.includes(form.gmy)) {
      setForm((current) => ({
        ...current,
        gmy: gmyList[0],
      }))
    }
  }, [form.gmy, gmyList])

  useEffect(() => {
    if (!kategoriList.length) {
      return
    }

    setForm((current) => ({
      ...current,
      egitimler: current.egitimler.map((egitim) =>
        kategoriList.includes(egitim.kategori)
          ? egitim
          : {
              ...egitim,
              kategori: kategoriList[0],
            },
      ),
    }))
  }, [kategoriList])

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
            egitimKodu: matchedCatalog.kod || '',
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
      const result = onSubmit(form)

      if (result?.issues?.length) {
        onIssues?.(result.issues)
        toast.error('Mükerrer kayıt bulundu. Uyarı listesini kontrol edin.')
        return
      }

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
      description="Yöneticiden gelen talebi seçilen yıl için sisteme kaydedin"
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
      <form className="talep-form" onSubmit={handleSave}>
        <section className="form-section">
          <div className="section-heading section-heading--tight">
            <div>
              <h3>Talep Bilgileri</h3>
              <p>Talebin bağlı olduğu yıl ve yönetici detayları</p>
            </div>
          </div>
          <div className="form-grid form-grid--section">
            <label>
              <span>Talep Yılı</span>
              <input
                type="number"
                min="2024"
                max="2100"
                value={form.talepYili}
                onChange={(event) => setForm({ ...form, talepYili: Number(event.target.value) })}
                required
              />
            </label>
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
                {gmyList.map((gmy) => (
                  <option key={gmy} value={gmy}>
                    {gmy}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="form-section">
          <div className="section-heading section-heading--tight">
            <div>
              <h3>Çalışan Bilgileri</h3>
              <p>Planlama ve raporlama için temel çalışan bilgileri</p>
            </div>
          </div>
          <div className="form-grid form-grid--section">
            <label>
              <span>Çalışan Adı</span>
              <input value={form.calisanAdi} onChange={(event) => setForm({ ...form, calisanAdi: event.target.value })} required />
            </label>
            <label>
              <span>Çalışan Sicil No</span>
              <input value={form.calisanSicil} onChange={(event) => setForm({ ...form, calisanSicil: event.target.value })} required />
            </label>
            <label>
              <span>Çalışan Kullanıcı Kodu</span>
              <input value={form.calisanKullaniciKodu} onChange={(event) => setForm({ ...form, calisanKullaniciKodu: event.target.value })} required />
            </label>
          </div>
        </section>

        <section className="form-section">
          <div className="section-heading section-heading--tight">
            <div>
              <h3>Eğitimler</h3>
              <p>Minimum 1, maksimum 4 eğitim tanımlayın</p>
            </div>
            <button
              type="button"
              className="button button--secondary"
              disabled={form.egitimler.length >= 4}
              onClick={() => setForm({ ...form, egitimler: [...form.egitimler, createBlankEgitim(kategoriList)] })}
            >
              + Eğitim Ekle
            </button>
          </div>

          <datalist id="catalog-options">
            {katalog.map((item) => (
              <option key={item.id} value={item.ad} />
            ))}
          </datalist>

          <div className="education-list">
            {form.egitimler.map((egitim, index) => (
              <div key={`${egitim.egitimAdi}-${index}`} className="education-row">
              <label>
                <span>Eğitim Kodu</span>
                <input
                  value={egitim.egitimKodu}
                  onChange={(event) => updateEgitim(index, 'egitimKodu', event.target.value.toUpperCase())}
                  placeholder="Örn. TE_001"
                />
              </label>
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
                  {kategoriList.map((kategori) => (
                    <option key={kategori} value={kategori}>
                      {kategori}
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
        </section>

        <section className="form-section">
          <label>
            <span>Notlar</span>
            <textarea value={form.notlar} onChange={(event) => setForm({ ...form, notlar: event.target.value })} rows={4} />
          </label>
        </section>
      </form>
    </Modal>
  )
}