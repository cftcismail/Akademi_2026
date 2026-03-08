import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Card from '../ui/Card'

export default function TopEgitimlerChart({ data }) {
  return (
    <Card className="chart-card">
      <div className="section-heading">
        <div>
          <h3>En Çok Talep Edilen Eğitimler</h3>
          <p>Talep yoğunluğuna göre ilk 10 eğitim</p>
        </div>
      </div>
      <div className="chart-area">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="etiket" angle={-16} textAnchor="end" height={72} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="talepSayisi" fill="#0f766e" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}