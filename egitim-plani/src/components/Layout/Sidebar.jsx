import {
  LockKeyhole,
  BarChart3,
  CalendarRange,
  ClipboardList,
  GraduationCap,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { ADMIN_ROUTE } from '../../data/constants'

const navigationItems = [
  { to: '/', label: 'Dashboard', icon: BarChart3 },
  { to: '/talepler', label: 'Talepler', icon: ClipboardList },
  { to: '/plan', label: 'Eğitim Planı', icon: CalendarRange },
  { to: '/raporlar', label: 'Raporlar', icon: GraduationCap },
]

export default function Sidebar({ isAdminAuthenticated }) {
  const items = isAdminAuthenticated
    ? [...navigationItems, { to: ADMIN_ROUTE, label: 'Admin', icon: LockKeyhole }]
    : navigationItems

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
        {items.map(({ to, label, icon: Icon }) => (
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