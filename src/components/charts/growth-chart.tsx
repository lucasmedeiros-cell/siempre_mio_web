"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

const data = [
  { name: "Ene", LoteA: 150, LoteB: 140 },
  { name: "Feb", LoteA: 180, LoteB: 165 },
  { name: "Mar", LoteA: 210, LoteB: 195 },
  { name: "Abr", LoteA: 245, LoteB: 230 },
  { name: "May", LoteA: 290, LoteB: 275 },
  { name: "Jun", LoteA: 330, LoteB: 310 },
  { name: "Jul", LoteA: 360, LoteB: 345 },
]

export function GrowthChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{
          top: 10,
          right: 30,
          left: 0,
          bottom: 0,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.2)" />
        <XAxis 
          dataKey="name" 
          stroke="hsl(var(--muted-foreground))" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false} 
        />
        <YAxis 
          stroke="hsl(var(--muted-foreground))" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false} 
          tickFormatter={(value) => `${value}kg`} 
        />
        <Tooltip 
          contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
          itemStyle={{ color: 'hsl(var(--foreground))' }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="LoteA"
          stroke="hsl(var(--primary))"
          strokeWidth={3}
          activeDot={{ r: 8 }}
        />
        <Line type="monotone" dataKey="LoteB" stroke="hsl(var(--chart-2))" strokeWidth={3} />
      </LineChart>
    </ResponsiveContainer>
  )
}
