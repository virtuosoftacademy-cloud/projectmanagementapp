"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TaskStatus } from "@/lib/domain";
import { taskStatusColor } from "@/lib/status";
import { formatPkr } from "@/lib/utils";

const axisProps = {
  stroke: "hsl(var(--muted-foreground))",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

const tooltipStyle = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "var(--radius)",
  color: "hsl(var(--popover-foreground))",
  fontSize: 12,
} as const;

export function HoursAreaChart({ data }: { data: { date: string; hours: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="date" {...axisProps} />
        <YAxis {...axisProps} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [`${Number(value)} h`, "Hours"]}
        />
        <Area
          type="monotone"
          dataKey="hours"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#hoursGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TaskDistributionChart({
  data,
}: {
  data: { status: TaskStatus; label: string; count: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          innerRadius={50}
          outerRadius={75}
          paddingAngle={2}
          stroke="none"
        >
          {data.map((entry) => (
            <Cell key={entry.status} fill={taskStatusColor[entry.status]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(value) => [Number(value), "Tasks"]} />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          iconSize={8}
          // Recharts sorts legend items alphabetically by default; keep status order.
          itemSorter={null}
          formatter={(value) => (
            <span style={{ color: "hsl(var(--muted-foreground))", fontSize: 11 }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ProjectEffortChart({
  data,
}: {
  data: { name: string; hours: number; cost: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="name"
          {...axisProps}
          tickFormatter={(value: string) =>
            value.length > 14 ? `${value.slice(0, 13)}…` : value
          }
        />
        <YAxis {...axisProps} />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
          formatter={(value, name) =>
            name === "Cost (PKR)"
              ? [formatPkr(Number(value)), name]
              : [`${Number(value)} h`, name]
          }
        />
        <Legend
          iconType="circle"
          iconSize={8}
          itemSorter={null}
          formatter={(value) => (
            <span style={{ color: "hsl(var(--muted-foreground))", fontSize: 11 }}>{value}</span>
          )}
        />
        <Bar dataKey="hours" name="Hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        <Bar dataKey="cost" name="Cost (PKR)" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
