import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import Card from '../ui/Card'

const chartColors = ['#1e3a5f', '#10b981', '#ef4444', '#f59e0b']

export default function EgitimDurumChart({ data }) {
  return (
    <Card className="chart-card">
      <div className="section-heading">
        <div>
          <h3>Eğitim Durumu</h3>
          <p>Planlanan kayıtların anlık durum dağılımı</p>
        </div>
      </div>
      <div className="chart-area chart-area--compact">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={4}>
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="legend-list">
        {data.map((item, index) => (
          <div key={item.name} className="legend-item">
            <span className="legend-color" style={{ background: chartColors[index % chartColors.length] }} />
            <span>{item.name}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </Card>
  )
}