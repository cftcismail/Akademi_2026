import {
  LockKeyhole,
  BarChart3,
  CalendarRange,
  ClipboardList,
  GraduationCap,
  Trophy,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { ADMIN_ROUTE, IC_EGITMEN_DASHBOARD_ROUTE } from '../../data/constants'

const navigationItems = [
  { to: '/', label: 'Dashboard', icon: BarChart3 },
  { to: '/talepler', label: 'Talepler', icon: ClipboardList },
  { to: '/plan', label: 'Eğitim Planı', icon: CalendarRange },
  { to: '/raporlar', label: 'Raporlar', icon: GraduationCap },
  { to: IC_EGITMEN_DASHBOARD_ROUTE, label: 'İç Eğitmen', icon: Trophy },
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
        {items.map((item) => {
          const NavIcon = item.icon

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`.trim()}
            >
              <NavIcon size={18} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}