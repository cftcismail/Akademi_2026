import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import Card from '../ui/Card'

export default function AylikPlanChart({ data }) {
  return (
    <Card className="chart-card">
      <div className="section-heading">
        <div>
          <h3>Aylık Dağılım</h3>
          <p>Yıllık plan ve plan dışı eğitim yoğunluğu</p>
        </div>
      </div>
      <div className="chart-area">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="ay" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="yillikPlan" name="Yıllık Plan" fill="#1e3a5f" radius={[8, 8, 0, 0]} />
            <Bar dataKey="planDisi" name="Yıllık Plan Dışı" fill="#f59e0b" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}