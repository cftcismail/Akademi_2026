import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import { KeyRound, LogOut, Plus, Save, ShieldCheck, Trash2 } from 'lucide-react'
import Card from '../ui/Card'

const ADMIN_PASSWORD = 'Akademi.123'

function buildDraftMap(gmyList) {
  return Object.fromEntries(gmyList.map((gmy) => [gmy, gmy]))
}

export default function AdminPage({
  talepler,
  planlar,
  gmyList,
  addGmy,
  updateGmy,
  deleteGmy,
  isAdminAuthenticated,
  onAuthenticatedChange,
}) {
  const [password, setPassword] = useState('')
  const [newGmy, setNewGmy] = useState('')
  const [drafts, setDrafts] = useState(() => buildDraftMap(gmyList))

  useEffect(() => {
    setDrafts(buildDraftMap(gmyList))
  }, [gmyList])

  const usageByGmy = useMemo(() => {
    return gmyList.reduce((accumulator, gmy) => {
      accumulator[gmy] = {
        talep: talepler.filter((item) => item.gmy === gmy).length,
        plan: planlar.filter((item) => item.gmy === gmy).length,
      }
      return accumulator
    }, {})
  }, [gmyList, planlar, talepler])

  function handleLogin(event) {
    event.preventDefault()

    if (password !== ADMIN_PASSWORD) {
      toast.error('Admin şifresi hatalı.')
      return
    }

    onAuthenticatedChange(true)
    setPassword('')
    toast.success('Admin ekranına giriş yapıldı.')
  }

  function handleAddGmy() {
    try {
      addGmy(newGmy)
      setNewGmy('')
      toast.success('Yeni GMY eklendi.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  function handleRenameGmy(currentName) {
    try {
      updateGmy(currentName, drafts[currentName])
      toast.success('GMY güncellendi.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  function handleDeleteGmy(name) {
    try {
      deleteGmy(name)
      toast.success('GMY kaldırıldı.')
    } catch (error) {
      toast.error(error.message)
    }
  }

  if (!isAdminAuthenticated) {
    return (
      <div className="page-stack">
        <Card className="admin-auth-card">
          <div className="admin-auth-card__icon">
            <ShieldCheck size={28} />
          </div>
          <span className="eyebrow">Admin Akademi</span>
          <h2>Yönetim ekranına giriş yapın</h2>
          <p>Bu alan şifre korumalıdır. Yetkisiz kullanıcılar içeriği görüntüleyemez.</p>

          <form className="admin-auth-form" onSubmit={handleLogin}>
            <label>
              <span>Admin Şifresi</span>
              <div className="admin-password-row">
                <KeyRound size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Şifreyi girin"
                  required
                />
              </div>
            </label>
            <button className="button" type="submit">
              Giriş Yap
            </button>
          </form>
        </Card>
      </div>
    )
  }

  return (
    <div className="page-stack">
      <section className="page-toolbar">
        <Card className="surface-card--accent">
          <span className="eyebrow">Admin Akademi</span>
          <h2>Sistem ayarlarını ve GMY listesini yönetin</h2>
          <p>Yeni GMY ekleyebilir, isimlerini değiştirebilir ve kullanılmayan kayıtları kaldırabilirsiniz.</p>
        </Card>
        <div className="toolbar-actions">
          <Card className="mini-stat">
            <span>Aktif GMY</span>
            <strong>{gmyList.length}</strong>
          </Card>
          <button className="button button--secondary" onClick={() => onAuthenticatedChange(false)}>
            <LogOut size={16} />
            Çıkış Yap
          </button>
        </div>
      </section>

      <Card>
        <div className="section-heading section-heading--tight">
          <div>
            <h3>Yeni GMY ekle</h3>
            <p>Eklenen GMY anında talep formlarında ve raporlarda kullanılabilir.</p>
          </div>
        </div>
        <div className="admin-add-row">
          <input
            value={newGmy}
            onChange={(event) => setNewGmy(event.target.value)}
            placeholder="Örn. Pazarlama GMY"
          />
          <button className="button" onClick={handleAddGmy}>
            <Plus size={16} />
            GMY Ekle
          </button>
        </div>
      </Card>

      <div className="admin-grid">
        {gmyList.map((gmy) => (
          <Card key={gmy} className="admin-gmy-card">
            <div className="admin-gmy-card__meta">
              <span className="eyebrow">GMY</span>
              <strong>{gmy}</strong>
              <small>{`${usageByGmy[gmy]?.talep || 0} talep • ${usageByGmy[gmy]?.plan || 0} plan`}</small>
            </div>
            <label>
              <span>Yeni Ad</span>
              <input
                value={drafts[gmy] || ''}
                onChange={(event) => setDrafts((current) => ({ ...current, [gmy]: event.target.value }))}
              />
            </label>
            <div className="admin-gmy-card__actions">
              <button className="button" onClick={() => handleRenameGmy(gmy)}>
                <Save size={16} />
                Kaydet
              </button>
              <button className="button button--ghost" onClick={() => handleDeleteGmy(gmy)}>
                <Trash2 size={16} />
                Sil
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}