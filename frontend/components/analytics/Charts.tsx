"use client"

import * as React from "react"
import { TrendingUp, PieChart as PieChartIcon } from "lucide-react"
import { CartesianGrid, Line, LineChart, XAxis, Label, Pie, PieChart, Sector } from "recharts"
import { type PieSectorDataItem } from "recharts/types/polar/Pie"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

// --- 1. Spending Trend Chart (Interactive Line) ---

export function SpendingTrendChart({ data, members }: { data: any[], members: string[] }) {
  // distinct colors
  const COLORS = [
      "#2563eb", // Blue
      "#16a34a", // Green
      "#db2777", // Pink
      "#9333ea", // Purple
      "#ea580c", // Orange
      "#0891b2", // Cyan
      "#ca8a04", // Yellow
  ];

  // 1. Map members to safe keys for Recharts/CSS vars
  const memberMap = React.useMemo(() => {
      const map: Record<string, string> = {};
      members.forEach(m => {
          map[m] = m.replace(/[^a-zA-Z0-9]/g, '_'); // "Friend 2" -> "Friend_2"
      });
      return map;
  }, [members]);

  // 2. Process data to include safe keys
  const processedData = React.useMemo(() => {
     return data.map(item => {
         const newItem = { ...item };
         members.forEach(m => {
             const safeKey = memberMap[m];
             newItem[safeKey] = item[m];
         });
         return newItem;
     });
  }, [data, members, memberMap]);

  // 3. Config
  const chartConfig = React.useMemo(() => {
      const config: ChartConfig = {
          views: { label: "Total Spending" },
      };
      members.forEach((m, i) => {
          const safeKey = memberMap[m];
          config[safeKey] = {
              label: m,
              color: COLORS[i % COLORS.length]
          };
      });
      return config;
  }, [members, memberMap]);

  // Default active chart to first member
  const [activeMember, setActiveMember] = React.useState<string>(members[0] || "");
  const activeKey = memberMap[activeMember] || "";

  // Calculate totals
  const total = React.useMemo(() => {
      const t: Record<string, number> = {};
      members.forEach(m => {
          t[m] = data.reduce((acc, curr) => acc + (curr[m] || 0), 0);
      });
      return t;
  }, [data, members]);

  // 4. Prepare data for smooth animation (stable dataKey)
  // We map the active member's data to a fixed key "amount" so the Line component doesn't remount
  const chartData = React.useMemo(() => {
      return processedData.map(item => ({
          ...item,
          amount: item[activeKey] || 0, // Map active data to 'amount'
      }));
  }, [processedData, activeKey]);

  if (!data || data.length === 0) return <div className="text-center p-10 text-muted-foreground">Not enough data</div>;

  return (
    <Card className="py-4 sm:py-0">
      <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0">
          <CardTitle>Spending Trend</CardTitle>
          <CardDescription>
            Showing monthly spending for each member
          </CardDescription>
        </div>
        <div className="flex overflow-x-auto">
          {members.map((m) => {
            const safeKey = memberMap[m];
            return (
              <button
                key={m}
                data-active={activeMember === m}
                className="data-[active=true]:bg-muted/50 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6 min-w-[100px]"
                onClick={() => setActiveMember(m)}
              >
                <span className="text-muted-foreground text-xs truncate w-full">
                  {chartConfig[safeKey]?.label}
                </span>
                <span className="text-lg leading-none font-bold sm:text-3xl">
                  ${total[m]?.toLocaleString()}
                </span>
              </button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey="amount" 
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  }}
                  formatter={(value, name, item, index) => {
                      // Custom formatter to show the Member Name instead of "amount"
                      return (
                          <>
                              <div
                                  className="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-[--color-bg]"
                                  style={
                                      {
                                      "--color-bg": chartConfig[activeKey]?.color,
                                      } as React.CSSProperties
                                  }
                              />
                              <div className="flex min-w-[130px] items-center gap-2 text-xs text-muted-foreground">
                                  {chartConfig[activeKey]?.label || activeMember}
                                  <div className="ml-auto flex items-baseline gap-0.5 font-mono font-medium tabular-nums text-foreground">
                                      {Number(value).toLocaleString()}
                                  </div>
                              </div>
                          </>
                      );
                  }}
                />
              }
            />
            <Line
              dataKey="amount"
              type="monotone"
              stroke={chartConfig[activeKey]?.color}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// --- 2. Category Donut Chart (Active) ---

export function CategoryDonutChart({ data }: { data: any[] }) {
  
  // Create config from data
  // Data: [{name: "Food", value: 50, fill: "var(--color-food)"}]
  // Config expects keys to match dataKey or nameKey?
  const chartConfig: ChartConfig = {
      visitors: { label: "Amount" }, // Generic label
  };
  
  // Map data names to config (normalize keys)
  // We need to pass `color` in config.
  // The backend sends `fill: var(--color-food)`.
  data.forEach((item, index) => {
      // Normalize key
      const key = item.name.toLowerCase().replace(/\s+/g, '-');
      chartConfig[key] = {
          label: item.name,
          color: `hsl(var(--chart-${(index % 5) + 1}))`
      };
      // Override data fill to match Shadcn CSS var if not set? 
      // Actually backend sends `var(--color-...)` which might not exist if we don't define it.
      // Better to rely on ChartContainer's color generation or pass explicit hex.
      // Let's use the ChartContainer approach.
      // We need to MUTATE data to use a `fill` that matches config CSS var?
      // Or just let ChartContainer handle it by matching name?
      // Recharts Pie uses `fill` prop on cell.
      // The example uses `fill: "var(--color-chrome)"` in CHART DATA.
      
      // Let's overwrite backend fill with our local indexed class var
      item.fill = `var(--color-${key})`;
      // And ensure item has a key we can key off? `browser` in example.
      item.categoryKey = key; 
  });

  const totalAmount = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.value, 0)
  }, [data])
  
  if (!data || data.length === 0) return <div className="text-center p-10 text-muted-foreground">No data</div>;

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Expense Breakdown</CardTitle>
        <CardDescription>By Category</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="categoryKey" 
              innerRadius={60}
              strokeWidth={5}
              activeIndex={0}
              activeShape={({
                outerRadius = 0,
                ...props
              }: PieSectorDataItem) => (
                <Sector {...props} outerRadius={outerRadius + 10} />
              )}
            >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-3xl font-bold"
                          >
                            ${totalAmount.toLocaleString()}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 24}
                            className="fill-muted-foreground"
                          >
                            Total
                          </tspan>
                        </text>
                      )
                    }
                  }}
                />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Showing total expenses for selected period
        </div>
      </CardFooter>
    </Card>
  )
}

// --- 3. Empty State Helper ---
import { BarChart as BarChartIcon } from 'lucide-react';

export const EmptyState = ({ icon: Icon, message }: { icon: any, message: string }) => (
    <div className="h-[300px] w-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 dark:bg-gray-800/20 rounded-lg border border-dashed border-gray-200 dark:border-gray-700">
        <Icon className="h-10 w-10 mb-3 opacity-20" />
        <p className="text-sm font-medium opacity-60">{message}</p>
    </div>
);
