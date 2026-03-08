export default function StatCard({ label, value, accent, hint }) {
  return (
    <article className={`stat-card stat-card--${accent}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  )
}