export default function Card({ children, className = '' }) {
  return <section className={`surface-card ${className}`.trim()}>{children}</section>
}