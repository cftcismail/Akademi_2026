import { AYLAR, DURUM_LISTESI, EGITIM_TURLERI } from '../../data/constants'

export default function PlanFiltrele({ filters, years, gmyList, onChange }) {
  return (
    <div className="filter-panel">
      <label>
        <span>Yıl</span>
        <select value={filters.year} onChange={(event) => onChange('year', Number(event.target.value))}>
          <option value={0}>Tümü</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Ay</span>
        <select value={filters.month} onChange={(event) => onChange('month', Number(event.target.value))}>
          <option value={0}>Tümü</option>
          {AYLAR.map((month, index) => (
            <option key={month} value={index + 1}>
              {month}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>GMY</span>
        <select value={filters.gmy} onChange={(event) => onChange('gmy', event.target.value)}>
          <option value="Tümü">Tümü</option>
          {gmyList.map((gmy) => (
            <option key={gmy} value={gmy}>
              {gmy}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Eğitim Türü</span>
        <select value={filters.type} onChange={(event) => onChange('type', event.target.value)}>
          <option value="Tümü">Tümü</option>
          {EGITIM_TURLERI.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Durum</span>
        <select value={filters.status} onChange={(event) => onChange('status', event.target.value)}>
          <option value="Tümü">Tümü</option>
          {DURUM_LISTESI.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Çalışan Adı</span>
        <input value={filters.employee} onChange={(event) => onChange('employee', event.target.value)} placeholder="Arama yapın" />
      </label>
    </div>
  )
}