"use client"

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"

interface FinanceSpeedometerProps {
  value: number
  target: number
}

export function FinanceSpeedometer({ value, target }: FinanceSpeedometerProps) {
  const percentage = Math.min(100, Math.max(0, (value / target) * 100))
  
  const data = [
    { name: "Progress", value: percentage },
    { name: "Remaining", value: 100 - percentage },
  ]

  const COLORS = ["hsl(var(--primary))", "hsl(var(--muted))"]

  return (
    <div className="relative w-full h-[200px] flex flex-col items-center justify-end">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius="70%"
            outerRadius="100%"
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute flex flex-col items-center justify-end bottom-4">
        <span className="text-3xl font-bold">{value.toLocaleString()} BOB</span>
        <span className="text-xs text-muted-foreground">de {target.toLocaleString()} BOB (Meta)</span>
      </div>
    </div>
  )
}
