import { getBadgeVariant } from '../../utils/helpers'

export default function Badge({ value }) {
  return <span className={`badge badge-${getBadgeVariant(value)}`}>{value}</span>
}