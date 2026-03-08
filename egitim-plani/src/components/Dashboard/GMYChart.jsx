import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Card from '../ui/Card'

export default function GMYChart({ data }) {
  return (
    <Card className="chart-card">
      <div className="section-heading">
        <div>
          <h3>GMY Bazlı Yoğunluk</h3>
          <p>Her GMY için eğitim ve çalışan yoğunluğu</p>
        </div>
      </div>
      <div className="chart-area">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="gmy" width={130} />
            <Tooltip formatter={(value, name) => [value, name === 'count' ? 'Eğitim' : name]} />
            <Bar dataKey="count" fill="#2d5f8a" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}