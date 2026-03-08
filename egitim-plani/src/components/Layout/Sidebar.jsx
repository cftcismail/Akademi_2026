import {
  BarChart3,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  GraduationCap,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

const navigationItems = [
  { to: '/', label: 'Dashboard', icon: BarChart3 },
  { to: '/talepler', label: 'Talepler', icon: ClipboardList },
  { to: '/plan', label: 'Eğitim Planı', icon: CalendarRange },
  { to: '/raporlar', label: 'Raporlar', icon: GraduationCap },
]

export default function Sidebar({ sidebarOpen }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand__icon">EP</div>
        {sidebarOpen ? (
          <div>
            <strong>Eğitim Planı</strong>
            <span>Yönetim Sistemi</span>
          </div>
        ) : null}
      </div>

      <nav className="sidebar-nav">
        {navigationItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`.trim()}
          >
            <Icon size={18} />
            {sidebarOpen ? <span>{label}</span> : null}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {sidebarOpen ? <span>Kurumsal görünüm</span> : null}
        {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </div>
    </aside>
  )
}