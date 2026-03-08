import {
  BarChart3,
  CalendarRange,
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

export default function Sidebar() {
  return (
    <nav className="sidebar sidebar--top">
      <div className="sidebar-brand">
        <div className="sidebar-brand__icon">EP</div>
        <div>
          <strong>Eğitim Planı</strong>
          <span>Yönetim Sistemi</span>
        </div>
      </div>

      <div className="sidebar-nav sidebar-nav--top">
        {navigationItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`.trim()}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}