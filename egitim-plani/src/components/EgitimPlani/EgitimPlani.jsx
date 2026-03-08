import { useDeferredValue, useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { DURUM_LISTESI, EGITIM_TURLERI } from '../../data/constants'
import { formatDate, getEmployeeRoute, getMonthLabel, getUniqueYears, includesText } from '../../utils/helpers'
import Badge from '../ui/Badge'
import Card from '../ui/Card'
import Modal from '../ui/Modal'
import PlanFiltrele from './PlanFiltrele'

function EditPlanModal({ plan, open, onOpenChange, onSave }) {
  const [draft, setDraft] = useState(plan)

  useEffect(() => {
    setDraft(plan)
  }, [plan])

  if (!plan || !draft) {
    return null
  }

  function handleSave() {
    onSave(plan.id, draft)
    toast.success('Plan kaydı güncellendi.')
    onOpenChange(false)
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Plan kaydını düzenle"
      description={`${plan.calisanAdi} için plan bilgilerini güncelleyin`}
      footer={
        <>
          <button className="button button--secondary" onClick={() => onOpenChange(false)}>
            Kapat
          </button>
          <button className="button" onClick={handleSave}>
            Değişiklikleri Kaydet
          </button>
        </>
      }
      maxWidth={860}
    >
      <div className="form-grid">
        <label>
          <span>Eğitim Türü</span>
          <select value={draft.egitimTuru} onChange={(event) => setDraft({ ...draft, egitimTuru: event.target.value })}>
            {EGITIM_TURLERI.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Eğitim Tarihi</span>
          <input type="date" value={draft.egitimTarihi} onChange={(event) => setDraft({ ...draft, egitimTarihi: event.target.value })} />
        </label>
        <label>
          <span>Süre</span>
          <input value={draft.sure} onChange={(event) => setDraft({ ...draft, sure: event.target.value })} />
        </label>
        <label>
          <span>Eğitimci</span>
          <input value={draft.egitimci} onChange={(event) => setDraft({ ...draft, egitimci: event.target.value })} />
        </label>
        <label>
          <span>Durum</span>
          <select value={draft.durum} onChange={(event) => setDraft({ ...draft, durum: event.target.value })}>
            {DURUM_LISTESI.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Maliyet</span>
          <input type="number" value={draft.maliyet} onChange={(event) => setDraft({ ...draft, maliyet: Number(event.target.value) })} />
        </label>
        <label className="form-grid--full">
          <span>Notlar</span>
          <textarea rows={4} value={draft.notlar} onChange={(event) => setDraft({ ...draft, notlar: event.target.value })} />
        </label>
      </div>
    </Modal>
  )
}

export default function EgitimPlaniPage({ planlar, updatePlan, deletePlan }) {
  const years = getUniqueYears(planlar)
  const [filters, setFilters] = useState({
    year: years[0],
    month: 0,
    gmy: 'Tümü',
    type: 'Tümü',
    status: 'Tümü',
    employee: '',
  })
  const [editingPlan, setEditingPlan] = useState(null)
  const deferredEmployee = useDeferredValue(filters.employee)

  const filteredPlanlar = planlar.filter((plan) => {
    const matchesYear = filters.year === 0 || plan.egitimYili === filters.year
    const matchesMonth = filters.month === 0 || plan.egitimAyi === filters.month
    const matchesGmy = filters.gmy === 'Tümü' || plan.gmy === filters.gmy
    const matchesType = filters.type === 'Tümü' || plan.egitimTuru === filters.type
    const matchesStatus = filters.status === 'Tümü' || plan.durum === filters.status
    const matchesEmployee = !deferredEmployee || includesText(plan.calisanAdi, deferredEmployee)

    return matchesYear && matchesMonth && matchesGmy && matchesType && matchesStatus && matchesEmployee
  })

  function handleDelete(planId) {
    if (!window.confirm('Bu plan kaydı silinsin mi?')) {
      return
    }

    deletePlan(planId)
    toast.success('Plan kaydı silindi.')
  }

  return (
    <div className="page-stack">
      <section className="page-toolbar">
        <Card className="surface-card--accent">
          <span className="eyebrow">Master Plan</span>
          <h2>Yıl içindeki tüm plan kayıtlarını tek tabloda yönetin</h2>
          <p>Filtreleri kullanarak eğitim türü, ay, durum ve çalışan kırılımında planı daraltın.</p>
        </Card>
      </section>

      <Card>
        <PlanFiltrele
          filters={filters}
          years={years}
          onChange={(field, value) => setFilters((current) => ({ ...current, [field]: value }))}
        />
      </Card>

      <Card>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Çalışan Adı</th>
                <th>Sicil</th>
                <th>GMY</th>
                <th>Birim</th>
                <th>Eğitim Adı</th>
                <th>Kategori</th>
                <th>Eğitim Türü</th>
                <th>Planlanan Tarih</th>
                <th>Ay</th>
                <th>Süre</th>
                <th>Eğitimci</th>
                <th>Durum</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlanlar.map((plan) => (
                <tr key={plan.id}>
                  <td>
                    <Link className="table-link" to={getEmployeeRoute(plan.calisanSicil)}>
                      {plan.calisanAdi}
                    </Link>
                  </td>
                  <td>{plan.calisanSicil}</td>
                  <td>{plan.gmy}</td>
                  <td>{plan.birim}</td>
                  <td>{plan.egitimAdi}</td>
                  <td>{plan.kategori}</td>
                  <td>
                    <Badge value={plan.egitimTuru} />
                  </td>
                  <td>{formatDate(plan.planlanmaTarihi)}</td>
                  <td>{getMonthLabel(plan.egitimAyi)}</td>
                  <td>{plan.sure}</td>
                  <td>{plan.egitimci}</td>
                  <td>
                    <Badge value={plan.durum} />
                  </td>
                  <td>
                    <div className="action-row">
                      <button className="button button--secondary" onClick={() => setEditingPlan(plan)}>
                        Düzenle
                      </button>
                      <button className="button button--ghost" onClick={() => handleDelete(plan.id)}>
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-summary">Filtreye göre toplam kayıt sayısı: {filteredPlanlar.length}</div>
      </Card>

      <EditPlanModal
        plan={editingPlan}
        open={Boolean(editingPlan)}
        onOpenChange={() => setEditingPlan(null)}
        onSave={updatePlan}
      />
    </div>
  )
}