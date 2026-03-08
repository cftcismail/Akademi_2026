import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Bell, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { ADMIN_ROUTE, ROUTE_BASLIKLARI } from '../../data/constants'

function getHeaderContent(pathname) {
  if (pathname.startsWith('/calisanlar/')) {
    return {
      title: 'Çalışan Detayı',
      description: 'Seçili çalışanın talep ve plan geçmişi.',
    }
  }

  if (pathname.startsWith(ADMIN_ROUTE)) {
    return {
      title: 'Admin Akademi',
      description: 'GMY ayarlarını ve yönetim erişimini kontrol edin.',
    }
  }

  return ROUTE_BASLIKLARI[pathname] || ROUTE_BASLIKLARI['/']
}

export default function Header({ metrics }) {
  const { pathname } = useLocation()
  const content = getHeaderContent(pathname)

  return (
    <header className="topbar">
      <div className="topbar__intro">
        <div>
          <span className="eyebrow">Eğitim Yönetimi</span>
          <h1>{content.title}</h1>
          <p>{content.description}</p>
        </div>
      </div>

      <div className="topbar__actions">
        <div className="searchbox">
          <Search size={16} />
          <span>Plan: {metrics.planSayisi} • Talep: {metrics.talepSayisi}</span>
        </div>
        <div className="topbar__meta">
          <span>{format(new Date(), "d MMMM yyyy, EEEE", { locale: tr })}</span>
          <button className="icon-button">
            <Bell size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}