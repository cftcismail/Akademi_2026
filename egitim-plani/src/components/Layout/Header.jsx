import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Bell, Menu, PanelLeftClose, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { ROUTE_BASLIKLARI } from '../../data/constants'

function getHeaderContent(pathname) {
  if (pathname.startsWith('/calisanlar/')) {
    return {
      title: 'Çalışan Detayı',
      description: 'Seçili çalışanın talep ve plan geçmişi.',
    }
  }

  return ROUTE_BASLIKLARI[pathname] || ROUTE_BASLIKLARI['/']
}

export default function Header({ onToggleSidebar, sidebarOpen, metrics }) {
  const { pathname } = useLocation()
  const content = getHeaderContent(pathname)

  return (
    <header className="topbar">
      <div className="topbar__intro">
        <button className="icon-button icon-button--ghost" onClick={onToggleSidebar}>
          {sidebarOpen ? <PanelLeftClose size={18} /> : <Menu size={18} />}
        </button>
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